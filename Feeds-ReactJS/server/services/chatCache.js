import "dotenv/config";
import { createClient } from "redis";
import Chat from "../models/chatSchema.js";

let redisClient = null;
let redisConnectPromise = null;
let redisUnavailableReason = null;

const normalizeParticipantType = (type = "") => {
  if (type === "Channel") return "Channel";
  if (type === "Kids") return "Kids";
  return "Normal";
};

const getChatThreadCacheKey = ({ meName, meType, target, targetType }) => {
  const participants = [
    `${normalizeParticipantType(meType)}:${encodeURIComponent(String(meName || ""))}`,
    `${normalizeParticipantType(targetType)}:${encodeURIComponent(String(target || ""))}`,
  ].sort();

  return `chat:thread:${participants.join("|")}`;
};

const getChatThreadQuery = ({ meName, meType, target, targetType }) => ({
  $or: [
    { from: meName, fromType: meType, to: target, toType: targetType },
    { from: target, fromType: targetType, to: meName, toType: meType },
  ],
});

const getCacheTtlSeconds = () => {
  const ttl = Number(process.env.CHAT_CACHE_TTL_SECONDS || 900);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 900;
};

const shouldValidateWrites = () =>
  process.env.CHAT_CACHE_VALIDATE_WRITES !== "false";

const buildFingerprint = (chats = []) => {
  const lastChat = chats[chats.length - 1];
  return {
    count: chats.length,
    lastId: lastChat?._id ? String(lastChat._id) : "",
    lastCreatedAt: lastChat?.createdAt ? String(lastChat.createdAt) : "",
    lastText: lastChat?.text ? String(lastChat.text) : "",
  };
};

const parseChatTimestamp = (value) => {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);

  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const parsed = new Date(Number(raw));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sortChatsChronologically = (chats = []) =>
  [...chats].sort((left, right) => {
    const leftDate = parseChatTimestamp(left?.dateTime || left?.createdAt);
    const rightDate = parseChatTimestamp(right?.dateTime || right?.createdAt);

    const leftTime = leftDate?.getTime?.() ?? 0;
    const rightTime = rightDate?.getTime?.() ?? 0;

    if (leftTime !== rightTime) return leftTime - rightTime;

    const leftId = String(left?._id || "");
    const rightId = String(right?._id || "");
    return leftId.localeCompare(rightId);
  });

const fingerprintsMatch = (left, right) =>
  left?.count === right?.count &&
  left?.lastId === right?.lastId &&
  left?.lastCreatedAt === right?.lastCreatedAt &&
  left?.lastText === right?.lastText;

const isValidCachedChat = (chat) =>
  chat &&
  typeof chat === "object" &&
  typeof chat.from === "string" &&
  typeof chat.to === "string" &&
  typeof chat.text === "string";

const parseCachedThread = (rawValue) => {
  try {
    const parsed = JSON.parse(rawValue);
    const chats = Array.isArray(parsed?.chats) ? parsed.chats : null;

    if (!chats || !chats.every(isValidCachedChat)) {
      return { ok: false, reason: "invalid-chat-shape" };
    }

    const expectedFingerprint = buildFingerprint(chats);
    const cachedFingerprint = parsed?.fingerprint || expectedFingerprint;

    if (!fingerprintsMatch(cachedFingerprint, expectedFingerprint)) {
      return { ok: false, reason: "fingerprint-mismatch" };
    }

    return {
      ok: true,
      chats,
      fingerprint: expectedFingerprint,
      cachedAt: parsed?.cachedAt || null,
    };
  } catch (error) {
    return { ok: false, reason: error.message || "invalid-json" };
  }
};

const getRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    redisUnavailableReason = "missing REDIS_URL";
    return null;
  }

  if (redisClient?.isOpen) return redisClient;
  if (redisConnectPromise) return redisConnectPromise;

  redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (error) => {
    redisUnavailableReason = error.message;
    console.error("Redis chat cache error:", error.message);
  });

  redisConnectPromise = redisClient
    .connect()
    .then(() => {
      redisUnavailableReason = null;
      return redisClient;
    })
    .catch((error) => {
      redisUnavailableReason = error.message || "redis-unavailable";
      console.error("Redis chat cache unavailable:", error.message);
      redisClient = null;
      return null;
    })
    .finally(() => {
      redisConnectPromise = null;
    });

  return redisConnectPromise;
};

const readChatThreadCache = async (participants) => {
  const key = getChatThreadCacheKey(participants);
  const client = await getRedisClient();

  if (!client) {
    return {
      hit: false,
      key,
      source: "unavailable",
      reason: redisUnavailableReason || "redis-unavailable",
    };
  }

  try {
    const rawValue = await client.get(key);
    if (!rawValue) {
      return { hit: false, key, source: "redis", reason: "miss" };
    }

    const parsed = parseCachedThread(rawValue);
    if (!parsed.ok) {
      await client.del(key);
      return { hit: false, key, source: "redis", reason: parsed.reason };
    }

    return {
      hit: true,
      key,
      source: "redis",
      chats: parsed.chats,
      verified: true,
      cachedAt: parsed.cachedAt,
    };
  } catch (error) {
    return {
      hit: false,
      key,
      source: "unavailable",
      reason: error.message || "redis-read-failed",
    };
  }
};

const writeChatThreadCache = async (participants, chats) => {
  const key = getChatThreadCacheKey(participants);
  const client = await getRedisClient();

  if (!client) {
    return {
      cached: false,
      verified: false,
      key,
      reason: redisUnavailableReason || "redis-unavailable",
    };
  }

  const payload = JSON.stringify({
    chats,
    fingerprint: buildFingerprint(chats),
    cachedAt: new Date().toISOString(),
  });

  try {
    await client.setEx(key, getCacheTtlSeconds(), payload);

    if (!shouldValidateWrites()) {
      return { cached: true, verified: false, key, reason: "write-validation-disabled" };
    }

    const storedValue = await client.get(key);
    const parsed = storedValue ? parseCachedThread(storedValue) : { ok: false, reason: "empty-after-write" };
    const verified = parsed.ok && fingerprintsMatch(parsed.fingerprint, buildFingerprint(chats));

    if (!verified) {
      await client.del(key);
    }

    return {
      cached: verified,
      verified,
      key,
      reason: verified ? "validated" : parsed.reason,
    };
  } catch (error) {
    return {
      cached: false,
      verified: false,
      key,
      reason: error.message || "redis-write-failed",
    };
  }
};

const fetchChatThreadFromDb = async (participants) => {
  const chats = await Chat.find(getChatThreadQuery(participants))
    .sort({ createdAt: 1 })
    .lean();

  return sortChatsChronologically(chats);
};

const getChatThread = async (participants) => {
  const cachedThread = await readChatThreadCache(participants);
  if (cachedThread.hit) {
    return {
      chats: cachedThread.chats,
      cache: {
        source: "redis",
        hit: true,
        verified: cachedThread.verified,
        key: cachedThread.key,
        cachedAt: cachedThread.cachedAt,
      },
    };
  }

  const chats = await fetchChatThreadFromDb(participants);
  const cacheWrite = await writeChatThreadCache(participants, chats);

  return {
    chats,
    cache: {
      source: "mongodb",
      hit: false,
      stored: cacheWrite.cached,
      verified: cacheWrite.verified,
      key: cacheWrite.key,
      reason: cacheWrite.reason,
    },
  };
};

const refreshChatThreadCache = async (participants) => {
  const chats = await fetchChatThreadFromDb(participants);
  return writeChatThreadCache(participants, chats);
};

const invalidateChatThreadCache = async (participants) => {
  const key = getChatThreadCacheKey(participants);
  const client = await getRedisClient();

  if (!client) {
    return {
      cleared: false,
      key,
      reason: redisUnavailableReason || "redis-unavailable",
    };
  }

  try {
    await client.del(key);
    return { cleared: true, key };
  } catch (error) {
    return {
      cleared: false,
      key,
      reason: error.message || "redis-delete-failed",
    };
  }
};

const syncSeenStateToChatCache = async ({ meName, meType, target, targetType }) => {
  const cachedThread = await readChatThreadCache({
    meName,
    meType,
    target,
    targetType,
  });

  if (!cachedThread.hit) {
    return {
      updated: false,
      key: cachedThread.key,
      reason: cachedThread.reason,
    };
  }

  let changed = false;
  const chats = cachedThread.chats.map((chat) => {
    if (
      chat.from === target &&
      normalizeParticipantType(chat.fromType) === normalizeParticipantType(targetType) &&
      chat.to === meName &&
      normalizeParticipantType(chat.toType) === normalizeParticipantType(meType) &&
      chat.seen === false
    ) {
      changed = true;
      return { ...chat, seen: true };
    }
    return chat;
  });

  if (!changed) {
    return {
      updated: true,
      verified: true,
      key: cachedThread.key,
      reason: "already-in-sync",
    };
  }

  const writeResult = await writeChatThreadCache(
    { meName, meType, target, targetType },
    chats
  );

  return {
    updated: writeResult.cached,
    verified: writeResult.verified,
    key: writeResult.key,
    reason: writeResult.reason,
  };
};

export {
  getChatThread,
  refreshChatThreadCache,
  invalidateChatThreadCache,
  syncSeenStateToChatCache,
};
