import Channel from "../../models/channelSchema.js";
import User from "../../models/users_schema.js";
import channelPost from "../../models/channelPost.js";
import ChannelComment from "../../models/channelPost_comment.js";
import Notification from "../../models/notification_schema.js";
import ActivityLog from "../../models/activityLogSchema.js";
import bcrypt from "bcrypt";

const CHANNEL_SETTINGS_DEFAULTS = {
  allowProfileSharing: true,
  supportEmail: "",
  supportPhone: "",
  supportUrl: "",
};

const CHANNEL_INTERACTION_SERIALS = [9, 10, 11, 12, 13, 14, 15, 16];

const toDateKey = (dateValue) => {
  const d = new Date(dateValue);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const ensureChannelSettingsDefaults = async (channelDoc) => {
  const existing = channelDoc?.channelSettings || {};
  const merged = {
    ...CHANNEL_SETTINGS_DEFAULTS,
    ...existing,
    allowProfileSharing: true,
  };

  const changed =
    existing.allowProfileSharing !== merged.allowProfileSharing ||
    (existing.supportEmail || "") !== merged.supportEmail ||
    (existing.supportPhone || "") !== merged.supportPhone ||
    (existing.supportUrl || "") !== merged.supportUrl;

  if (changed && channelDoc?._id) {
    await Channel.updateOne(
      { _id: channelDoc._id },
      {
        $set: {
          channelSettings: merged,
        },
      }
    );
  }

  return merged;
};

// GET /getchannel/:channelName
// GET /getchannel/:channelName
const handlegetchannel = async (req, res) => {
  try {
    const { channelName } = req.params;
    const { data } = req.userDetails || {};
    // console.log(data);
    // console.log("data:", data);

    // data = [channelName, adminName, logo, type, isPremium]
    // data = [username, email, profileUrl, type, isPremium]

    const channel = await Channel.findOne({
      channelName: { $regex: new RegExp(`^${channelName}$`, "i") }
    })
      .populate("channelAdmin", "username profilePicture")
      .populate("channelMembers", "username profilePicture")
      .lean();

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }
    if (channel.isDeactivated) {
      return res.status(403).json({ error: "Channel is currently deactivated" });
    }
    // console.log(channel.channelName);
    // 🔔 PREVENT SELF-VIEW NOTIFICATION
    if (data[3] === "Channel" && data[0] === channel.channelName) {
      // console.log("HERE");
      // skip creating notification
    } else {
      // 🔔 CREATE NOTIFICATION
      let msgSerial = data[3] === "Channel" ? 17 : 18;

      let userInvolved = data[0]; 
      await Notification.create({
        mainUser: channel.channelName,
        mainUserType: "Channel",
        msgSerial,
        userInvolved,
      });
    }

    return res.status(200).json({
      channel_name: channel.channelName,
      channel_description: channel.channelDescription,
      channel_logo: channel.channelLogo,
      channel_admin: channel.channelAdmin?.username || "Unknown",
      channel_admin_pic: channel.channelAdmin?.profilePicture || null,
      channel_category: channel.channelCategory,
      channel_members: channel.channelMembers?.map(m => ({
        username: m.username,
        profilePicture: m.profilePicture
      })) || [],
      channel_posts: channel.postIds || [],
      channel_archived: channel.archivedPostsIds || [],
      channel_liked: channel.likedPostsIds || [],
      channel_saved: channel.savedPostsIds || [],
      channel_links: channel.links || [],
      created_at: channel.createdAt
    });

  } catch (error) {
    console.error("❌ Error fetching channel:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /getchannelposts
const getChannelPosts = async (req, res) => {
  try {
    const { postIds } = req.query;
    if (!postIds) return res.status(400).json({ error: "Missing postIds" });

    const idsArray = postIds.split(",").map(id => id.trim());

    const posts = await channelPost.find({
      $or: [
        { _id: { $in: idsArray } },
        { id: { $in: idsArray } }
      ]
    }).lean();

    return res.status(200).json(posts);
  } catch (error) {
    console.error("❌ Error fetching channel posts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /follow_channel/:channelName
const followChannel = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const username = data[0];
    const userType = data[3];
    const { channelName } = req.params;

    if (userType === "Channel") {
      return res
        .status(400)
        .json({ success: false, message: "Channels cannot follow other channels" });
    }

    const user = await User.findOne({ username });
    const channel = await Channel.findOne({ channelName });

    if (!channel)
      return res.status(404).json({ success: false, message: "Channel not found" });
    if (channel.isDeactivated) {
      return res.status(403).json({ success: false, message: "Channel is deactivated" });
    }

    const alreadyFollowing = user.channelFollowings.some(
      f => f.channelName === channelName
    );

    if (alreadyFollowing) {
      return res.json({ success: false, message: "Already following" });
    }

    await User.updateOne(
      { username },
      { $addToSet: { channelFollowings: { channelName } } }
    );

    await Channel.updateOne(
      { channelName },
      { $addToSet: { channelMembers: user._id } }
    );

    await Notification.create({
      mainUser: channelName,
      mainUserType: "Channel",
      msgSerial: 9, // Normal/kids user follows a channel
      userInvolved: username,
    });

    res.json({ success: true, message: `Now following ${channelName}` });
  } catch (error) {
    console.error("Error following channel:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /unfollow_channel/:channelName
const unfollowChannel = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const username = data[0];
    const userType = data[3];
    const { channelName } = req.params;

    if (userType === "Channel") {
      return res
        .status(400)
        .json({ success: false, message: "Channels cannot unfollow channels" });
    }

    const user = await User.findOne({ username });

    await User.updateOne(
      { username },
      { $pull: { channelFollowings: { channelName } } }
    );

    await Channel.updateOne(
      { channelName },
      { $pull: { channelMembers: user._id } }
    );

    await Notification.create({
      mainUser: channelName,
      mainUserType: "Channel",
      msgSerial: 10, // Normal/kids user unfollows a channel
      userInvolved: username,
    });

    res.json({ success: true, message: `Unfollowed ${channelName}` });
  } catch (error) {
    console.error("Error unfollowing channel:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const archivePost = async (req, res) => {
  try {
    const { postId } = req.params; // this is custom id (string)

    // 1️⃣ get channel
    const channel = await Channel.findOne({
      channelName: req.userDetails.data[0]
    });

    if (!channel)
      return res.status(404).json({ message: "Channel not found" });

    // 2️⃣ Find post using "id" and get "_id"
    const post = await channelPost.findOne({ id: postId });
    if (!post)
      return res.status(404).json({ message: "Post not found" });

    const mongoId = post._id.toString(); // actual ID stored in your channel arrays

    // 3️⃣ Check if this post belongs to channel
    if (!channel.postIds.includes(mongoId)) {
      return res.status(403).json({ message: "Not your post" });
    }

    // 4️⃣ Move from postIds → archivedPostsIds
    channel.archivedPostsIds.push(mongoId);
    channel.postIds = channel.postIds.filter(id => id !== mongoId);

    // remove from liked / saved if needed
    channel.likedPostsIds = channel.likedPostsIds.filter(id => id !== mongoId);
    channel.savedPostsIds = channel.savedPostsIds.filter(id => id !== mongoId);

    // 5️⃣ update archive flag
    post.isArchived = true;

    await channel.save();
    await post.save();

    return res.json({ message: "Archived successfully" });

  } catch (err) {
    console.log("ARCHIVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const unarchivePost = async (req, res) => {
  try {
    const { postId } = req.params; // custom id

    // 1️⃣ Get channel by channelName
    const channel = await Channel.findOne({
      channelName: req.userDetails.data[0]
    });

    if (!channel)
      return res.status(404).json({ message: "Channel not found" });

    // 2️⃣ Find post using custom id → get Mongo _id
    const post = await channelPost.findOne({ id: postId });
    if (!post)
      return res.status(404).json({ message: "Post not found" });

    const mongoId = post._id.toString();

    // 3️⃣ Ensure it's in archived list
    if (!channel.archivedPostsIds.includes(mongoId)) {
      return res.status(403).json({ message: "Post is not archived" });
    }

    // 4️⃣ Move archived → posts
    channel.postIds.push(mongoId);
    channel.archivedPostsIds = channel.archivedPostsIds.filter(
      id => id !== mongoId
    );

    // 5️⃣ Update post flag
    post.isArchived = false;

    await channel.save();
    await post.save();

    return res.json({ message: "Unarchived successfully" });
  } catch (err) {
    console.log("UNARCHIVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params; // custom id (Ayush-xxxx)

    // 🔍 1️⃣ Fetch the channel
    const channel = await Channel.findOne({
      channelName: req.userDetails.data[0]
    });

    if (!channel)
      return res.status(404).json({ message: "Channel not found" });

    // 🔍 2️⃣ Find the post using custom id
    const post = await channelPost.findOne({ id: postId });
    if (!post)
      return res.status(404).json({ message: "Post not found" });

    const mongoId = post._id.toString();

    // 🧹 3️⃣ Remove post from channel arrays
    channel.postIds = channel.postIds.filter(id => id !== mongoId);
    channel.archivedPostsIds = channel.archivedPostsIds.filter(id => id !== mongoId);
    channel.likedPostsIds = channel.likedPostsIds.filter(id => id !== mongoId);
    channel.savedPostsIds = channel.savedPostsIds.filter(id => id !== mongoId);

    await channel.save();

    // 🗑️ 4️⃣ Remove post from every user's liked/saved lists
    await User.updateMany(
      {},
      {
        $pull: {
          likedChannelPosts: mongoId,
          savedChannelPosts: mongoId
        }
      }
    );

    // 🧹 5️⃣ Delete all comments of this post (including replies)
    await ChannelComment.deleteMany({ postId: mongoId });

    // 🗑️ 6️⃣ Delete the post itself
    await channelPost.findOneAndDelete({ id: postId });

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const getChannelSettings = async (req, res) => {
  try {
    const channelName = req.userDetails?.data?.[0];
    const accountType = req.userDetails?.data?.[3];

    if (accountType !== "Channel") {
      return res.status(403).json({
        success: false,
        message: "Only channel accounts can access channel settings",
      });
    }

    const channel = await Channel.findOne({ channelName })
      .populate("channelAdmin", "username profilePicture email")
      .lean();

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    const channelSettings = await ensureChannelSettingsDefaults(channel);

    const posts = await channelPost
      .find({ channel: channelName })
      .select("id content url likes comments createdAt isArchived category type")
      .sort({ createdAt: -1 })
      .lean();

    const postIds = posts.map((p) => String(p._id));

    const [userSavedAgg, channelSavedAgg, recentNotifications, activityLogs] =
      await Promise.all([
        User.aggregate([
          {
            $match: {
              savedPostsIds: { $exists: true, $ne: [] },
            },
          },
          { $unwind: "$savedPostsIds" },
          { $match: { savedPostsIds: { $in: postIds } } },
          {
            $group: {
              _id: "$savedPostsIds",
              count: { $sum: 1 },
            },
          },
        ]),
        Channel.aggregate([
          {
            $match: {
              savedPostsIds: { $exists: true, $ne: [] },
            },
          },
          { $unwind: "$savedPostsIds" },
          { $match: { savedPostsIds: { $in: postIds } } },
          {
            $group: {
              _id: "$savedPostsIds",
              count: { $sum: 1 },
            },
          },
        ]),
        Notification.find({
          mainUser: channelName,
          msgSerial: { $in: CHANNEL_INTERACTION_SERIALS },
        })
          .select("msgSerial userInvolved createdAt")
          .sort({ createdAt: -1 })
          .limit(2000)
          .lean(),
        ActivityLog.find({ username: channelName })
          .sort({ createdAt: -1 })
          .limit(15)
          .lean(),
      ]);

    const savesByPost = {};
    userSavedAgg.forEach((entry) => {
      savesByPost[String(entry._id)] =
        (savesByPost[String(entry._id)] || 0) + (entry.count || 0);
    });
    channelSavedAgg.forEach((entry) => {
      savesByPost[String(entry._id)] =
        (savesByPost[String(entry._id)] || 0) + (entry.count || 0);
    });

    const postStats = posts.map((post) => {
      const mongoId = String(post._id);
      const likes = Number(post.likes || 0);
      const saves = Number(savesByPost[mongoId] || 0);
      const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;

      return {
        id: post.id,
        mongoId,
        type: post.type,
        category: post.category,
        url: post.url || "",
        contentPreview: (post.content || "").slice(0, 90),
        likes,
        saves,
        commentsCount,
        createdAt: post.createdAt,
        isArchived: Boolean(post.isArchived),
      };
    });

    const totalLikesReceived = postStats.reduce((sum, p) => sum + p.likes, 0);
    const totalSavesReceived = postStats.reduce((sum, p) => sum + p.saves, 0);
    const totalCommentsReceived = postStats.reduce(
      (sum, p) => sum + p.commentsCount,
      0
    );

    const dailyMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = toDateKey(date);
      dailyMap.set(key, {
        date: key,
        postsCreated: 0,
        interactions: 0,
      });
    }

    posts.forEach((post) => {
      const key = toDateKey(post.createdAt);
      if (dailyMap.has(key)) {
        dailyMap.get(key).postsCreated += 1;
      }
    });

    const interactionByUser = new Map();
    const interactionTypeCounts = {
      follows: 0,
      unfollows: 0,
      likes: 0,
      comments: 0,
      others: 0,
    };

    recentNotifications.forEach((entry) => {
      const key = toDateKey(entry.createdAt);
      if (dailyMap.has(key)) {
        dailyMap.get(key).interactions += 1;
      }

      const actor = entry.userInvolved || "Unknown";
      interactionByUser.set(actor, (interactionByUser.get(actor) || 0) + 1);

      if (entry.msgSerial === 9) interactionTypeCounts.follows += 1;
      else if (entry.msgSerial === 10) interactionTypeCounts.unfollows += 1;
      else if (entry.msgSerial === 11 || entry.msgSerial === 13) {
        interactionTypeCounts.likes += 1;
      } else if (entry.msgSerial === 15 || entry.msgSerial === 16) {
        interactionTypeCounts.comments += 1;
      } else {
        interactionTypeCounts.others += 1;
      }
    });

    const topActiveUsers = [...interactionByUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, interactions]) => ({ username, interactions }));

    const topPostsByLikes = [...postStats]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5);

    const topPostsBySaves = [...postStats]
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      settings: {
        profileSharing: {
          enabled: true,
          profileUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/channel/${channel.channelName}`,
        },
        channelInformation: {
          channelName: channel.channelName,
          channelDescription: channel.channelDescription || "",
          channelCategory: channel.channelCategory || [],
          channelLogo: channel.channelLogo || process.env.DEFAULT_USER_IMG,
          links: channel.links || [],
          membersCount: Array.isArray(channel.channelMembers)
            ? channel.channelMembers.length
            : 0,
          createdAt: channel.createdAt,
          adminUsername: channel.channelAdmin?.username || "",
          adminProfilePicture: channel.channelAdmin?.profilePicture || "",
          supportEmail: channelSettings.supportEmail || "",
          supportPhone: channelSettings.supportPhone || "",
          supportUrl: channelSettings.supportUrl || "",
        },
        dashboard: {
          overview: {
            totalPosts: posts.filter((p) => !p.isArchived).length,
            archivedPosts: posts.filter((p) => p.isArchived).length,
            membersCount: Array.isArray(channel.channelMembers)
              ? channel.channelMembers.length
              : 0,
            totalLikesReceived,
            totalSavesReceived,
            totalCommentsReceived,
          },
          dailyUsage: [...dailyMap.values()],
          userActivity: {
            topActiveUsers,
            interactionTypeCounts,
          },
          topPosts: {
            byLikes: topPostsByLikes,
            bySaves: topPostsBySaves,
          },
        },
        activityLog: {
          total: activityLogs.length,
          entries: activityLogs,
        },
      },
    });
  } catch (error) {
    console.error("Error in getChannelSettings:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading channel settings",
    });
  }
};

const deactivateChannel = async (req, res) => {
  try {
    const channelName = req.userDetails?.data?.[0];
    const accountType = req.userDetails?.data?.[3];
    const { password } = req.body || {};

    if (accountType !== "Channel") {
      return res.status(403).json({
        success: false,
        message: "Only channel accounts can deactivate a channel",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Channel password is required",
      });
    }

    const channel = await Channel.findOne({ channelName });
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, channel.channelPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid channel password",
      });
    }

    if (!channel.isDeactivated) {
      channel.isDeactivated = true;
      await channel.save();
      await ActivityLog.create({
        username: channelName,
        mainUserType: "Channel",
        id: `#${Date.now()}`,
        message: "Channel account deactivated",
      });
    }

    res.clearCookie("cuid", { httpOnly: true, sameSite: "strict", secure: true });
    res.clearCookie("uuid", { httpOnly: true, sameSite: "strict", secure: true });

    return res.status(200).json({
      success: true,
      message: "Channel deactivated successfully",
    });
  } catch (error) {
    console.error("Error in deactivateChannel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deactivating channel",
    });
  }
};

const deleteChannelAccount = async (req, res) => {
  try {
    const channelName = req.userDetails?.data?.[0];
    const accountType = req.userDetails?.data?.[3];
    const { password, confirmation } = req.body || {};

    if (accountType !== "Channel") {
      return res.status(403).json({
        success: false,
        message: "Only channel accounts can delete a channel",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Channel password is required",
      });
    }

    if ((confirmation || "").toUpperCase() !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE" to confirm',
      });
    }

    const channel = await Channel.findOne({ channelName });
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, channel.channelPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid channel password",
      });
    }

    const postDocs = await channelPost.find({ channel: channelName }).select("_id").lean();
    const postMongoIds = postDocs.map((p) => p._id);
    const postIdsAsString = postMongoIds.map((id) => String(id));

    if (postMongoIds.length) {
      await ChannelComment.deleteMany({ postId: { $in: postMongoIds } });
    }

    await Promise.all([
      channelPost.deleteMany({ channel: channelName }),
      User.updateMany(
        {},
        {
          $pull: {
            channelFollowings: { channelName },
            likedPostsIds: { $in: postIdsAsString },
            savedPostsIds: { $in: postIdsAsString },
          },
        }
      ),
      Channel.updateMany(
        { channelName: { $ne: channelName } },
        { $pull: { likedPostsIds: { $in: postIdsAsString }, savedPostsIds: { $in: postIdsAsString } } }
      ),
      User.updateOne(
        { _id: channel.channelAdmin },
        { $pull: { channelName: channelName } }
      ),
      Notification.deleteMany({
        $or: [{ mainUser: channelName }, { userInvolved: channelName }],
      }),
      ActivityLog.deleteMany({ username: channelName }),
      Channel.deleteOne({ _id: channel._id }),
    ]);

    res.clearCookie("cuid", { httpOnly: true, sameSite: "strict", secure: true });
    res.clearCookie("uuid", { httpOnly: true, sameSite: "strict", secure: true });

    return res.status(200).json({
      success: true,
      message: "Channel deleted permanently",
    });
  } catch (error) {
    console.error("Error in deleteChannelAccount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting channel",
    });
  }
};

export {
  handlegetchannel,
  getChannelPosts,
  followChannel,
  unfollowChannel,
  archivePost,
  unarchivePost,
  deletePost,
  getChannelSettings,
  deactivateChannel,
  deleteChannelAccount,
};
