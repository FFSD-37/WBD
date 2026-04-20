import ActivityLog from "../models/activityLogSchema.js";
import Chat from "../models/chatSchema.js";
import User from "../models/users_schema.js";

const REWARD_TIMEZONE = "Asia/Kolkata";

const COIN_REWARD_RULES = {
  post_create: {
    coins: 10,
    normalLimit: 3,
    premiumLimit: 10,
  },
  engagement: {
    coins: 0.5,
    dailyLimit: 20,
  },
  chat: {
    coins: 1,
    dailyLimit: 10,
  },
  game_play: {
    coins: 1,
    dailyLimit: 5,
  },
};

const getTodayKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: REWARD_TIMEZONE,
  }).format(date);

const getDayBounds = (todayKey = getTodayKey()) => {
  const start = new Date(`${todayKey}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const normalizeStats = (user, todayKey = getTodayKey()) => {
  const stats = user.coinRewardStats || {};

  if (stats.date !== todayKey) {
    user.coinRewardStats = {
      date: todayKey,
      postsCreated: 0,
      engagements: 0,
      gamesPlayed: 0,
      chatPeers: [],
    };
  } else {
    user.coinRewardStats = {
      date: stats.date || todayKey,
      postsCreated: Number(stats.postsCreated || 0),
      engagements: Number(stats.engagements || 0),
      gamesPlayed: Number(stats.gamesPlayed || 0),
      chatPeers: Array.isArray(stats.chatPeers) ? stats.chatPeers : [],
    };
  }

  return user.coinRewardStats;
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

const maybeCreateRewardLog = async (username, message) => {
  if (!message) return;

  await ActivityLog.create({
    username,
    id: `#${Date.now()}`,
    message,
  });
};

const rewardUserDocument = async (
  user,
  { activity, peerKey = null, forcePremiumPostLimit = false, logMessage = "" }
) => {
  if (!user) {
    return { awarded: false, reason: "user_not_found" };
  }

  const stats = normalizeStats(user);
  let awarded = false;

  switch (activity) {
    case "post_create": {
      const rule = COIN_REWARD_RULES.post_create;
      const limit =
        forcePremiumPostLimit || user.isPremium
          ? rule.premiumLimit
          : rule.normalLimit;

      if (stats.postsCreated >= limit) {
        return { awarded: false, reason: "daily_limit_reached", limit };
      }

      stats.postsCreated += 1;
      user.coins = Number(user.coins || 0) + rule.coins;
      awarded = true;
      break;
    }
    case "engagement": {
      const rule = COIN_REWARD_RULES.engagement;
      if (stats.engagements >= rule.dailyLimit) {
        return { awarded: false, reason: "daily_limit_reached", limit: rule.dailyLimit };
      }

      stats.engagements += 1;
      user.coins = Number(user.coins || 0) + rule.coins;
      awarded = true;
      break;
    }
    case "game_play": {
      const rule = COIN_REWARD_RULES.game_play;
      if (stats.gamesPlayed >= rule.dailyLimit) {
        return { awarded: false, reason: "daily_limit_reached", limit: rule.dailyLimit };
      }

      stats.gamesPlayed += 1;
      user.coins = Number(user.coins || 0) + rule.coins;
      awarded = true;
      break;
    }
    case "chat": {
      const rule = COIN_REWARD_RULES.chat;
      if (!peerKey) {
        return { awarded: false, reason: "missing_peer_key" };
      }

      if (stats.chatPeers.includes(peerKey)) {
        return { awarded: false, reason: "already_rewarded_today", limit: rule.dailyLimit };
      }

      if (stats.chatPeers.length >= rule.dailyLimit) {
        return { awarded: false, reason: "daily_limit_reached", limit: rule.dailyLimit };
      }

      stats.chatPeers.push(peerKey);
      user.coins = Number(user.coins || 0) + rule.coins;
      awarded = true;
      break;
    }
    default:
      return { awarded: false, reason: "unknown_activity" };
  }

  if (!awarded) {
    return { awarded: false, reason: "not_awarded" };
  }

  user.markModified("coinRewardStats");
  await user.save();
  await maybeCreateRewardLog(user.username, logMessage);

  return { awarded: true, coins: user.coins };
};

const rewardUserByUsername = async (username, options) => {
  const user = await User.findOne({ username });
  if (!user) {
    return { awarded: false, reason: "user_not_found" };
  }

  return rewardUserDocument(user, options);
};

const rewardChatParticipantsIfEligible = async ({
  from,
  fromType,
  to,
  toType,
}) => {
  const supportedUserType = (type) => type !== "Channel" && type !== "Kids";

  if (!supportedUserType(fromType) && !supportedUserType(toType)) {
    return;
  }

  const todayKey = getTodayKey();
  const { start, end } = getDayBounds(todayKey);

  const pairMessages = await Chat.find({
    $or: [
      { from, fromType, to, toType },
      { from: to, fromType: toType, to: from, toType: fromType },
    ],
  })
    .select("from fromType to toType createdAt")
    .lean();

  const todaysMessages = pairMessages.filter((message) => {
    const parsedDate = parseChatTimestamp(message.createdAt);
    return parsedDate && parsedDate >= start && parsedDate < end;
  });

  const senderHasMessageToday = todaysMessages.some(
    (message) => message.from === from && message.fromType === fromType
  );
  const receiverHasMessageToday = todaysMessages.some(
    (message) => message.from === to && message.fromType === toType
  );

  if (!senderHasMessageToday || !receiverHasMessageToday) {
    return;
  }

  if (supportedUserType(fromType)) {
    await rewardUserByUsername(from, {
      activity: "chat",
      peerKey: `${toType}:${to}`,
    });
  }

  if (supportedUserType(toType)) {
    await rewardUserByUsername(to, {
      activity: "chat",
      peerKey: `${fromType}:${from}`,
    });
  }
};

export {
  COIN_REWARD_RULES,
  getTodayKey,
  rewardChatParticipantsIfEligible,
  rewardUserByUsername,
  rewardUserDocument,
};
