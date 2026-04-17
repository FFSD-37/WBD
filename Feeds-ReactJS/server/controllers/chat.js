import Chat from "../models/chatSchema.js";
import User from "../models/users_schema.js";
import Channel from "../models/channelSchema.js";
import {
  getChatThread,
  invalidateChatThreadCache,
  syncSeenStateToChatCache,
} from "../services/chatCache.js";

const getAuthIdentity = (req) => {
  const { data } = req.userDetails || {};
  return {
    name: data?.[0],
    type: data?.[3],
  };
};

const normalizeTargetType = (targetType = "") => {
  if (targetType === "Channel") return "Channel";
  return "Normal";
};

const markConversationAsSeen = async ({ meName, meType, target, targetType }) => {
  await Chat.updateMany(
    {
      from: target,
      fromType: targetType,
      to: meName,
      toType: meType,
      seen: false,
    },
    { $set: { seen: true } }
  );

  try {
    await syncSeenStateToChatCache({ meName, meType, target, targetType });
  } catch (error) {
    console.error("Failed to sync seen state to Redis cache:", error.message);
  }
};

const getFriendList = async (req, res) => {
  try {
    const me = getAuthIdentity(req);
    if (me.type === "Kids") return res.json({ friends: [] });
    const friendsMap = new Map();

    if (me.type === "Channel") {
      const chats = await Chat.find({
        $or: [
          { from: me.name, fromType: "Channel" },
          { to: me.name, toType: "Channel" },
        ],
      })
        .select("from fromType to toType")
        .lean();

      const counterpartSet = new Set();
      chats.forEach((c) => {
        if (c.from === me.name && c.fromType === "Channel") {
          const t = c.toType === "Channel" ? "Channel" : "Normal";
          if (t !== "Kids") counterpartSet.add(`${t}:${c.to}`);
        } else if (c.to === me.name && c.toType === "Channel") {
          const t = c.fromType === "Channel" ? "Channel" : "Normal";
          if (t !== "Kids") counterpartSet.add(`${t}:${c.from}`);
        }
      });

      const counterparts = [...counterpartSet].map((v) => {
        const [type, username] = v.split(":");
        return { type, username };
      });

      const userTargets = counterparts
        .filter((c) => c.type === "Normal")
        .map((c) => c.username);
      const channelTargets = counterparts
        .filter((c) => c.type === "Channel")
        .map((c) => c.username);

      const [userDocs, channelDocs] = await Promise.all([
        userTargets.length
          ? User.find({ username: { $in: userTargets }, type: { $ne: "Kids" } })
              .select("username profilePicture")
              .lean()
          : [],
        channelTargets.length
          ? Channel.find({
              channelName: { $in: channelTargets },
              isDeactivated: { $ne: true },
            })
              .select("channelName channelLogo")
              .lean()
          : [],
      ]);

      userDocs.forEach((u) => {
        friendsMap.set(`Normal:${u.username}`, {
          username: u.username,
          avatarUrl: u.profilePicture || process.env.DEFAULT_USER_IMG,
          type: "Normal",
        });
      });

      channelDocs.forEach((c) => {
        friendsMap.set(`Channel:${c.channelName}`, {
          username: c.channelName,
          avatarUrl: c.channelLogo || process.env.DEFAULT_USER_IMG,
          type: "Channel",
        });
      });
    } else {
      const user = await User.findOne({ username: me.name }).lean();
      if (!user) return res.json({ friends: [] });

      const mutualUsernames = (user.followings || [])
        .filter((f) => (user.followers || []).some((fr) => fr.username === f.username))
        .map((f) => f.username);

      if (mutualUsernames.length) {
        const userDocs = await User.find({ username: { $in: mutualUsernames } })
          .select("username profilePicture type")
          .lean();

        userDocs.forEach((u) => {
          const normalizedType = u.type === "Kids" ? "Kids" : "Normal";
          if (normalizedType === "Kids") return;
          friendsMap.set(`${normalizedType}:${u.username}`, {
            username: u.username,
            avatarUrl: u.profilePicture || process.env.DEFAULT_USER_IMG,
            type: normalizedType,
          });
        });
      }

      const followedChannelNames = (user.channelFollowings || []).map((c) => c.channelName);
      if (followedChannelNames.length) {
        const channels = await Channel.find({
          channelName: { $in: followedChannelNames },
          isDeactivated: { $ne: true },
        })
          .select("channelName channelLogo")
          .lean();

        channels.forEach((c) => {
          friendsMap.set(`Channel:${c.channelName}`, {
            username: c.channelName,
            avatarUrl: c.channelLogo || process.env.DEFAULT_USER_IMG,
            type: "Channel",
          });
        });
      }
    }

    return res.json({ friends: [...friendsMap.values()] });
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
};

const getChat = async (req, res) => {
  try {
    const me = getAuthIdentity(req);
    if (me.type === "Kids") {
      return res.status(403).json({ err: "Kids accounts cannot access chat" });
    }
    const target = req.params.username;
    const targetType = normalizeTargetType(req.query.targetType);

    await markConversationAsSeen({
      meName: me.name,
      meType: me.type,
      target,
      targetType,
    });

    const thread = await getChatThread({
      meName: me.name,
      meType: me.type,
      target,
      targetType,
    });

    return res.json(thread);
  } catch (err) {
    return res.status(500).json({ err: err.message });
  }
};

const deleteChat = async (req, res) => {
  try {
    const me = getAuthIdentity(req);
    if (me.type === "Kids") {
      return res.status(403).json({ success: false, message: "Kids accounts cannot access chat" });
    }
    const target = req.params.username;
    const targetType = normalizeTargetType(req.query.targetType);

    await Chat.deleteMany({
      $or: [
        { from: me.name, fromType: me.type, to: target, toType: targetType },
        { from: target, fromType: targetType, to: me.name, toType: me.type },
      ],
    });

    try {
      await invalidateChatThreadCache({
        meName: me.name,
        meType: me.type,
        target,
        targetType,
      });
    } catch (error) {
      console.error("Failed to invalidate Redis chat cache:", error.message);
    }

    return res.json({ success: true, message: "Chat deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const markChatSeen = async (req, res) => {
  try {
    const me = getAuthIdentity(req);
    if (me.type === "Kids") {
      return res.status(403).json({ success: false, message: "Kids accounts cannot access chat" });
    }
    const target = req.params.username;
    const targetType = normalizeTargetType(req.query.targetType);

    await markConversationAsSeen({
      meName: me.name,
      meType: me.type,
      target,
      targetType,
    });

    return res.json({ success: true, message: "Chat marked as seen" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export { getChat, getFriendList, deleteChat, markChatSeen };
