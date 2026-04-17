import {
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import User from "../models/users_schema.js";
import Channel from "../models/channelSchema.js";
import Post from "../models/postSchema.js";
import channelPost from "../models/channelPost.js";
import Adpost from "../models/ad_schema.js";
import Story from "../models/storiesSchema.js";
import Comment from "../models/comment_schema.js";
import Report from "../models/reports.js";
import ActivityLog from "../models/activityLogSchema.js";
import Notification from "../models/notification_schema.js";
import { rewardUserByUsername } from "../services/coinRewards.js";
import { searchUsersWithFallback } from "../services/userSearch.js";

function serializeTimestamp(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function withSerializedTimestamps(document) {
  if (!document) {
    return document;
  }

  return {
    ...document,
    createdAt: serializeTimestamp(document.createdAt),
    updatedAt: serializeTimestamp(document.updatedAt),
  };
}

const adType = new GraphQLObjectType({
  name: "HomeAd",
  fields: {
    _id: { type: GraphQLString },
    url: { type: GraphQLString },
    ad_url: { type: GraphQLString },
  },
});

const friendType = new GraphQLObjectType({
  name: "HomeFriend",
  fields: {
    username: { type: GraphQLString },
    avatarUrl: { type: GraphQLString },
  },
});

const channelType = new GraphQLObjectType({
  name: "HomeChannel",
  fields: {
    _id: { type: GraphQLString },
    channelName: { type: GraphQLString },
    channelLogo: { type: GraphQLString },
  },
});

const storyType = new GraphQLObjectType({
  name: "HomeStory",
  fields: {
    _id: { type: GraphQLString },
    username: { type: GraphQLString },
    url: { type: GraphQLString },
    likes: { type: GraphQLInt },
    avatarUrl: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

const postType = new GraphQLObjectType({
  name: "HomePost",
  fields: {
    _id: { type: GraphQLString },
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    url: { type: GraphQLString },
    content: { type: GraphQLString },
    author: { type: GraphQLString },
    authorAvatar: { type: GraphQLString },
    likes: { type: GraphQLInt },
    commentCount: { type: GraphQLInt },
    liked: { type: GraphQLBoolean },
    saved: { type: GraphQLBoolean },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

const channelHomePostType = new GraphQLObjectType({
  name: "ChannelHomePost",
  fields: {
    _id: { type: GraphQLString },
    id: { type: GraphQLString },
    type: { type: GraphQLString },
    url: { type: GraphQLString },
    content: { type: GraphQLString },
    channel: { type: GraphQLString },
    category: { type: GraphQLString },
    likes: { type: GraphQLInt },
    commentCount: { type: GraphQLInt },
    liked: { type: GraphQLBoolean },
    saved: { type: GraphQLBoolean },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

const homeFeedType = new GraphQLObjectType({
  name: "HomeFeed",
  fields: {
    posts: { type: new GraphQLList(postType) },
    friends: { type: new GraphQLList(friendType) },
    ads: { type: new GraphQLList(adType) },
    channels: { type: new GraphQLList(channelType) },
    stories: { type: new GraphQLList(storyType) },
  },
});

const channelHomeFeedType = new GraphQLObjectType({
  name: "ChannelHomeFeed",
  fields: {
    posts: { type: new GraphQLList(channelHomePostType) },
    totalCount: { type: GraphQLInt },
    hasMore: { type: GraphQLBoolean },
  },
});

const commentType = new GraphQLObjectType({
  name: "HomeComment",
  fields: {
    _id: { type: GraphQLString },
    username: { type: GraphQLString },
    avatarUrl: { type: GraphQLString },
    text: { type: GraphQLString },
    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

const commentThreadType = new GraphQLObjectType({
  name: "HomeCommentThread",
  fields: {
    main: { type: commentType },
    replies: { type: new GraphQLList(commentType) },
  },
});

const addCommentPayloadType = new GraphQLObjectType({
  name: "AddCommentPayload",
  fields: {
    success: { type: GraphQLBoolean },
    message: { type: GraphQLString },
    comment: { type: commentType },
    commentCount: { type: GraphQLInt },
  },
});

const simpleActionPayloadType = new GraphQLObjectType({
  name: "SimpleActionPayload",
  fields: {
    success: { type: GraphQLBoolean },
    message: { type: GraphQLString },
    reportId: { type: GraphQLString },
  },
});

const addReplyPayloadType = new GraphQLObjectType({
  name: "AddReplyPayload",
  fields: {
    success: { type: GraphQLBoolean },
    reply: { type: commentType },
  },
});

const connectItemType = new GraphQLObjectType({
  name: "ConnectItem",
  fields: {
    type: { type: GraphQLString },
    username: { type: GraphQLString },
    name: { type: GraphQLString },
    avatarUrl: { type: GraphQLString },
    logo: { type: GraphQLString },
    display_name: { type: GraphQLString },
    category: { type: GraphQLString },
    members: { type: GraphQLInt },
    followers: { type: GraphQLInt },
    following: { type: GraphQLInt },
    visibility: { type: GraphQLString },
    isFollowing: { type: GraphQLBoolean },
    requested: { type: GraphQLBoolean },
  },
});

const connectFeedType = new GraphQLObjectType({
  name: "ConnectFeed",
  fields: {
    mode: { type: GraphQLString },
    items: { type: new GraphQLList(connectItemType) },
    message: { type: GraphQLString },
  },
});

async function getCurrentUser(req) {
  const username = req.userDetails?.data?.[0];
  if (!username) {
    throw new Error("Unauthorized");
  }

  const user = await User.findOne({ username }).lean();
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function getViewerForChannelPosts(req) {
  const identifier = req.userDetails?.data?.[0];
  const type = req.userDetails?.data?.[3];

  if (!identifier || !type) {
    throw new Error("Unauthorized");
  }

  if (type === "Channel") {
    const viewer = await Channel.findOne({ channelName: identifier }).lean();
    if (!viewer) {
      throw new Error("Channel not found");
    }

    return { identifier, type, viewer };
  }

  const viewer = await User.findOne({ username: identifier }).lean();
  if (!viewer) {
    throw new Error("User not found");
  }

  return { identifier, type, viewer };
}

async function getActor(req) {
  const identifier = req.userDetails?.data?.[0];
  const type = req.userDetails?.data?.[3];

  if (!identifier || !type) {
    throw new Error("Unauthorized");
  }

  if (type === "Channel") {
    const channel = await Channel.findOne({ channelName: identifier });
    if (!channel) {
      throw new Error("Channel not found");
    }

    return { actor: channel, type, identifier };
  }

  const user = await User.findOne({ username: identifier });
  if (!user) {
    throw new Error("User not found");
  }

  return { actor: user, type, identifier };
}

async function getFriendsForUser(user) {
  const mutualUsernames = user.followings
    .filter(following =>
      user.followers.some(follower => follower.username === following.username),
    )
    .map(friend => friend.username);

  const friends = await User.find({
    username: { $in: mutualUsernames },
  })
    .select("username profilePicture -_id")
    .lean();

  return friends.map(({ username, profilePicture }) => ({
    username,
    avatarUrl: profilePicture,
  }));
}

async function getStoriesForUser(friends) {
  if (friends.length === 0) {
    return [];
  }

  const stories = await Story.find({
    username: { $in: friends.map(friend => friend.username) },
    createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .sort({ createdAt: -1 })
    .lean();

  return stories.map(story => ({
    ...withSerializedTimestamps(story),
    avatarUrl:
      friends.find(friend => friend.username === story.username)?.avatarUrl || "",
  }));
}

async function getPostsForUser(user, req) {
  const createdAt = req.query.createdAt || new Date();
  const userType = req.userDetails?.data?.[3];

  let posts = await (
    userType === "Kids"
      ? channelPost.find({ createdAt: { $lt: createdAt } })
      : Post.find({ createdAt: { $lt: createdAt } })
  )
    .sort({ createdAt: -1 })
    .lean();

  if (userType === "Kids") {
    return posts.map(post => ({
      ...withSerializedTimestamps(post),
      id: post.id || post._id?.toString(),
      author: post.author || post.channel,
      authorAvatar: post.channelLogo || "",
      commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
      liked: user.likedPostsIds?.includes(post._id?.toString()),
      saved: user.savedPostsIds?.includes(post._id?.toString()),
    }));
  }

  const authors = [...new Set(posts.map(post => post.author).filter(Boolean))];
  const authorDocs = await User.find({
    username: { $in: authors },
  })
    .select("username profilePicture -_id")
    .lean();

  const avatarByAuthor = new Map(
    authorDocs.map(({ username, profilePicture }) => [username, profilePicture]),
  );

  return posts.map(post => ({
    ...withSerializedTimestamps(post),
    commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
    liked: user.likedPostsIds?.includes(post.id?.toString()) || false,
    saved: user.savedPostsIds?.includes(post.id?.toString()) || false,
    authorAvatar: avatarByAuthor.get(post.author) || process.env.DEFAULT_USER_IMG,
  }));
}

async function getChannelPostsFeed(req, { skip = 0, limit = 5, kidsOnly = false } = {}) {
  const parsedSkip = Math.max(0, Number.parseInt(skip, 10) || 0);
  const parsedLimit = Math.max(1, Math.min(20, Number.parseInt(limit, 10) || 5));
  const { identifier, type, viewer } = await getViewerForChannelPosts(req);

  if (kidsOnly && type !== "Kids") {
    throw new Error("Only Kids can access Kids Home");
  }

  const baseQuery = { isArchived: false };

  if (kidsOnly) {
    const categories = viewer.kidPreferredCategories || [];

    if (!categories.length) {
      return { posts: [], totalCount: 0, hasMore: false };
    }

    baseQuery.category = { $in: categories };
  } else {
    baseQuery.channel = { $ne: identifier };
  }

  const [posts, totalCount] = await Promise.all([
    channelPost.find(baseQuery).sort({ createdAt: -1 }).skip(parsedSkip).limit(parsedLimit).lean(),
    channelPost.countDocuments(baseQuery),
  ]);

  const likedPosts = viewer.likedPostsIds || [];
  const savedPosts = viewer.savedPostsIds || [];

  return {
    posts: posts.map(post => ({
      ...withSerializedTimestamps(post),
      commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
      liked: likedPosts.includes(post._id.toString()),
      saved: savedPosts.includes(post._id.toString()),
    })),
    totalCount,
    hasMore: parsedSkip + posts.length < totalCount,
  };
}

async function getCommentThreads(postId) {
  const post = await Post.findOne({ id: postId }).lean();

  if (!post) {
    throw new Error("Post not found");
  }

  const threads = [];

  for (const commentId of post.comments || []) {
    const main = await Comment.findOne({ _id: commentId }).lean();
    if (!main) {
      continue;
    }

    const replies = [];
    for (const replyId of main.reply_array || []) {
      const reply = await Comment.findOne({ _id: replyId }).lean();
      if (reply) {
        replies.push(reply);
      }
    }

    threads.push({
      main: withSerializedTimestamps(main),
      replies: replies.map(reply => withSerializedTimestamps(reply)),
    });
  }

  return threads;
}

const togglePostPayloadType = new GraphQLObjectType({
  name: "TogglePostPayload",
  fields: {
    success: { type: GraphQLBoolean },
    id: { type: GraphQLString },
    liked: { type: GraphQLBoolean },
    saved: { type: GraphQLBoolean },
    likes: { type: GraphQLInt },
  },
});

async function getChannelsForUser(user) {
  const followedChannels = user.channelFollowings.map(
    channel => channel.channelName,
  );

  return Channel.find({
    channelName: { $in: followedChannels },
  })
    .select("channelName channelLogo")
    .lean();
}

async function getConnectContext(req) {
  const { data } = req.userDetails || {};
  if (!data?.length) {
    throw new Error("Unauthorized access");
  }

  const [identifier, , , userType] = data;
  const current =
    userType === "Channel"
      ? await Channel.findOne({ channelName: identifier }).lean()
      : await User.findOne({ username: identifier }).lean();

  if (!current) {
    throw new Error(`${userType === "Channel" ? "Channel" : "User"} not found`);
  }

  return { identifier, userType, current };
}

async function buildDefaultConnectFeed(req, mode) {
  const { identifier, userType, current } = await getConnectContext(req);
  const followingUsernames = (current.followings || []).map(f => f.username);
  const requestedUsernames = (current.requested || []).map(r => r.username);
  const followedChannelNames = (current.channelFollowings || []).map(
    f => f.channelName,
  );

  if (userType === "Kids") {
    const allChannels = await Channel.find({}).lean();
    return {
      mode: "channels",
      items: allChannels.map(c => ({
        type: "Channel",
        name: c.channelName,
        logo: c.channelLogo,
        category: Array.isArray(c.channelCategory)
          ? c.channelCategory[0]
          : c.channelCategory,
        members: (c.channelMembers || []).length,
        isFollowing: followedChannelNames.includes(c.channelName),
      })),
    };
  }

  if (userType === "Channel") {
    const allChannels = await Channel.find({
      channelName: { $ne: identifier },
    }).lean();

    return {
      mode: "channels",
      items: allChannels.map(c => ({
        type: "Channel",
        name: c.channelName,
        logo: c.channelLogo,
        category: Array.isArray(c.channelCategory)
          ? c.channelCategory[0]
          : c.channelCategory,
        members: (c.channelMembers || []).length,
        isFollowing: followedChannelNames.includes(c.channelName),
      })),
    };
  }

  if (mode === "channels") {
    const followedChannels = await Channel.find({
      channelName: { $in: followedChannelNames },
    }).lean();

    return {
      mode: "channels",
      items: followedChannels.map(c => ({
        type: "Channel",
        name: c.channelName,
        logo: c.channelLogo,
        category: Array.isArray(c.channelCategory)
          ? c.channelCategory[0]
          : c.channelCategory,
        members: (c.channelMembers || []).length,
        isFollowing: true,
      })),
    };
  }

  const followings = current.followings || [];
  const mutualFollowersArrays = await Promise.all(
    followings.map(async f => {
      const followedUser = await User.findOne({ username: f.username }).lean();
      return followedUser?.followers?.filter(x => x.username !== identifier) || [];
    }),
  );

  const mutualUsernames = [
    ...new Set(mutualFollowersArrays.flat().map(u => u.username)),
  ];
  const users = await User.find({ username: { $in: mutualUsernames } }).lean();

  return {
    mode: "users",
    items: users.map(u => ({
      type: "User",
      username: u.username,
      avatarUrl: u.profilePicture,
      display_name: u.display_name,
      followers: (u.followers || []).length,
      following: (u.followings || []).length,
      visibility: u.visibility,
      isFollowing: followingUsernames.includes(u.username),
      requested: requestedUsernames.includes(u.username),
    })),
  };
}

async function searchConnectFeed(req, { query = "", type = "all", category = "All" }) {
  const { identifier, userType, current } = await getConnectContext(req);

  const followings = current.followings || [];
  const requested = current.requested || [];
  const channelFollowings = current.channelFollowings || [];

  const regex =
    query && query.trim().length > 0 ? new RegExp(query, "i") : /.*/;

  const followingUsernames = followings.map(f => f.username);
  const requestedUsernames = requested.map(r => r.username);
  const followedChannelNames = channelFollowings.map(c => c.channelName);

  let users = [];
  let channels = [];

  // 🔹 CHANNEL SEARCH
  if (type === "channel" || type === "all") {
    const filter = { channelName: regex };

    if (category && category !== "All") {
      filter.channelCategory = category;
    }

    channels = await Channel.find(filter).limit(50).lean();
  }

  // 🔹 USER SEARCH (restrict for Channel accounts)
  if ((type === "user" || type === "all") && userType !== "Channel") {
    users = await searchUsersWithFallback({
      query,
      excludeUsername: identifier,
      limit: 50,
    });
  }

  // ❌ Channel accounts cannot search users
  if (userType === "Channel" && type === "user") {
    return {
      mode: "users",
      items: [],
      message: "Channel accounts cannot search for users.",
    };
  }

  // 🔥 Kids restriction (optional improvement)
  if (userType === "Kids") {
    // Only allow safe categories
    const allowedCategories = current.kidPreferredCategories || [];

    channels = channels.filter(c =>
      allowedCategories.length === 0 ||
      allowedCategories.includes(
        Array.isArray(c.channelCategory)
          ? c.channelCategory[0]
          : c.channelCategory
      )
    );
  }

  // 🔹 FORMAT USERS
  const userItems = users.map(u => ({
    type: "User",
    username: u.username,
    avatarUrl: u.profilePicture,
    display_name: u.display_name,
    followers: Array.isArray(u.followers) ? u.followers.length : 0,
    following: Array.isArray(u.followings) ? u.followings.length : 0,
    visibility: u.visibility,
    isFollowing: followingUsernames.includes(u.username),
    requested: requestedUsernames.includes(u.username),
  }));

  // 🔹 FORMAT CHANNELS
  const channelItems = channels.map(c => ({
    type: "Channel",
    name: c.channelName,
    logo: c.channelLogo,
    category: Array.isArray(c.channelCategory)
      ? c.channelCategory[0]
      : c.channelCategory,
    members: Array.isArray(c.channelMembers)
      ? c.channelMembers.length
      : 0,
    isFollowing: followedChannelNames.includes(c.channelName),
  }));

  // 🔥 RETURN BASED ON TYPE
  if (type === "user") {
    return { mode: "users", items: userItems };
  }

  if (type === "channel") {
    return { mode: "channels", items: channelItems };
  }

  // 🔥 NEW: MIXED SEARCH
  return {
    mode: "all",
    items: [...userItems, ...channelItems],
  };
}

const queryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    homeFeed: {
      type: homeFeedType,
      resolve: async (_, __, { req }) => {
        const user = await getCurrentUser(req);
        const friends = await getFriendsForUser(user);

        const [posts, ads, channels, stories] = await Promise.all([
          getPostsForUser(user, req),
          Adpost.find({}).lean(),
          getChannelsForUser(user),
          getStoriesForUser(friends),
        ]);

        return {
          posts,
          friends,
          ads,
          channels,
          stories,
        };
      },
    },
    postComments: {
      type: new GraphQLList(commentThreadType),
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId }, { req }) => {
        await getCurrentUser(req);
        return getCommentThreads(postId);
      },
    },
    channelHomeFeed: {
      type: channelHomeFeedType,
      args: {
        skip: { type: GraphQLInt },
        limit: { type: GraphQLInt },
      },
      resolve: async (_, { skip, limit }, { req }) =>
        getChannelPostsFeed(req, { skip, limit, kidsOnly: false }),
    },
    kidsHomeFeed: {
      type: channelHomeFeedType,
      args: {
        skip: { type: GraphQLInt },
        limit: { type: GraphQLInt },
      },
      resolve: async (_, { skip, limit }, { req }) =>
        getChannelPostsFeed(req, { skip, limit, kidsOnly: true }),
    },
    connectFeed: {
      type: connectFeedType,
      args: {
        mode: { type: GraphQLString },
      },
      resolve: async (_, { mode }, { req }) => buildDefaultConnectFeed(req, mode),
    },
    searchConnect: {
      type: connectFeedType,
      args: {
        query: { type: GraphQLString },
        type: { type: GraphQLString },
        category: { type: GraphQLString },
      },
      resolve: async (_, args, { req }) => searchConnectFeed(req, args),
    },
  },
});

const toggleFollowPayloadType = new GraphQLObjectType({
  name: "ToggleFollowPayload",
  fields: {
    success: { type: GraphQLBoolean },
    status: { type: GraphQLString },
    message: { type: GraphQLString },
    target: { type: GraphQLString },
    targetType: { type: GraphQLString },
  },
});

const mutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    toggleLikePost: {
      type: togglePostPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const post = await Post.findOne({ id: postId });

        if (!post) {
          throw new Error("Post not found");
        }

        const hasLiked = actor.likedPostsIds?.includes(postId);
        let shouldRewardEngagement = false;

        if (hasLiked) {
          actor.likedPostsIds = actor.likedPostsIds.filter(id => id !== postId);
          post.likes = Math.max(0, (post.likes || 0) - 1);
        } else {
          actor.likedPostsIds = [...(actor.likedPostsIds || []), postId];
          post.likes = (post.likes || 0) + 1;
          shouldRewardEngagement = type !== "Kids";

          if (post.author && post.author !== identifier) {
            await Notification.create({
              mainUser: post.author,
              mainUserType: "Normal",
              msgSerial: 3,
              userInvolved: identifier,
            });

            await User.findOneAndUpdate(
              { username: post.author },
              { $inc: { coins: 1 } },
            );
          }
        }

        await actor.save();
        await post.save();

        if (shouldRewardEngagement) {
          await rewardUserByUsername(identifier, {
            activity: "engagement",
          });
        }

        return {
          success: true,
          id: postId,
          liked: !hasLiked,
          saved: actor.savedPostsIds?.includes(postId) || false,
          likes: post.likes,
        };
      },
    },
    toggleSavePost: {
      type: togglePostPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const post = await Post.findOne({ id: postId }).select("id likes");

        if (!post) {
          throw new Error("Post not found");
        }

        const hasSaved = actor.savedPostsIds?.includes(postId);

        actor.savedPostsIds = hasSaved
          ? actor.savedPostsIds.filter(id => id !== postId)
          : [...(actor.savedPostsIds || []), postId];

        await actor.save();

        if (!hasSaved && type !== "Kids") {
          await rewardUserByUsername(identifier, {
            activity: "engagement",
          });
        }

        return {
          success: true,
          id: postId,
          liked: actor.likedPostsIds?.includes(postId) || false,
          saved: !hasSaved,
          likes: post.likes || 0,
        };
      },
    },
    toggleLikeChannelPost: {
      type: togglePostPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const post = await channelPost.findById(postId);

        if (!post) {
          throw new Error("Post not found");
        }

        const hasLiked = actor.likedPostsIds?.includes(postId);
        const postChannel = post.channel;

        if (hasLiked) {
          post.likes = Math.max(0, (post.likes || 0) - 1);
          actor.likedPostsIds = (actor.likedPostsIds || []).filter(id => id !== postId);

          if (postChannel && postChannel !== identifier) {
            await Notification.create({
              mainUser: postChannel,
              mainUserType: "Channel",
              msgSerial: type === "Channel" ? 14 : 12,
              userInvolved: identifier,
            });
          }
        } else {
          post.likes = (post.likes || 0) + 1;
          actor.likedPostsIds = [...(actor.likedPostsIds || []), postId];

          if (type !== "Kids") {
            await rewardUserByUsername(identifier, {
              activity: "engagement",
            });
          }

          if (postChannel && postChannel !== identifier) {
            await Notification.create({
              mainUser: postChannel,
              mainUserType: "Channel",
              msgSerial: type === "Channel" ? 13 : 11,
              userInvolved: identifier,
            });
          }
        }

        await actor.save();
        await post.save();

        return {
          success: true,
          id: post._id.toString(),
          liked: !hasLiked,
          saved: actor.savedPostsIds?.includes(postId) || false,
          likes: post.likes || 0,
        };
      },
    },
    toggleSaveChannelPost: {
      type: togglePostPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const post = await channelPost.findById(postId).select("_id likes");

        if (!post) {
          throw new Error("Post not found");
        }

        const hasSaved = actor.savedPostsIds?.includes(postId);
        actor.savedPostsIds = hasSaved
          ? (actor.savedPostsIds || []).filter(id => id !== postId)
          : [...(actor.savedPostsIds || []), postId];

        await actor.save();

        if (!hasSaved && type !== "Kids") {
          await rewardUserByUsername(identifier, {
            activity: "engagement",
          });
        }

        return {
          success: true,
          id: post._id.toString(),
          liked: actor.likedPostsIds?.includes(postId) || false,
          saved: !hasSaved,
          likes: post.likes || 0,
        };
      },
    },
    toggleFollowEntity: {
      type: toggleFollowPayloadType,
      args: {
        target: { type: new GraphQLNonNull(GraphQLString) },
        targetType: { type: new GraphQLNonNull(GraphQLString) },
        currentState: { type: GraphQLString },
      },
      resolve: async (_, { target, targetType, currentState }, { req }) => {
        const { data } = req.userDetails;
        const [username] = data;
        const isFollowing =
          currentState === "following" || currentState === "requested";

        if (!isFollowing) {
          if (targetType === "Channel") {
            const channel = await Channel.findOne({ channelName: target });
            if (!channel) throw new Error("Channel not found");

            const targetUser = await User.findOne({ username });

            await Promise.all([
              User.updateOne(
                { username },
                { $addToSet: { channelFollowings: { channelName: target } } },
              ),
              Channel.updateOne(
                { channelName: target },
                { $addToSet: { channelMembers: targetUser._id } },
              ),
            ]);

            await ActivityLog.create({
              username,
              id: `#${Date.now()}`,
              message: `You started following #${target}!!`,
            });

            await Notification.create({
              mainUser: target,
              mainUserType: "Channel",
              msgSerial: 9,
              userInvolved: username,
            });

            return { success: true, status: "following", target, targetType };
          }

          const other = await User.findOne({ username: target });
          if (!other) throw new Error("User not found");

          if (other.visibility === "Private") {
            await User.updateOne(
              { username: target },
              { $addToSet: { requested: { username } } },
            );

            await Notification.create({
              mainUser: target,
              mainUserType: "Normal",
              msgSerial: 4,
              userInvolved: username,
            });

            await ActivityLog.create({
              username,
              id: `#${Date.now()}`,
              message: `You requested to follow #${target}!!`,
            });

            return { success: true, status: "requested", target, targetType };
          }

          await Promise.all([
            User.updateOne(
              { username },
              { $addToSet: { followings: { username: target } } },
            ),
            User.updateOne(
              { username: target },
              { $addToSet: { followers: { username } } },
            ),
          ]);

          await Notification.create({
            mainUser: target,
            mainUserType: "Normal",
            msgSerial: 1,
            userInvolved: username,
          });

          await ActivityLog.create({
            username,
            id: `#${Date.now()}`,
            message: `You started following #${target}!!`,
          });

          return { success: true, status: "following", target, targetType };
        }

        if (targetType === "Channel") {
          const channel = await Channel.findOne({ channelName: target });
          if (!channel) throw new Error("Channel not found");

          const targetUser = await User.findOne({ username });

          await Promise.all([
            User.updateOne(
              { username },
              { $pull: { channelFollowings: { channelName: target } } },
            ),
            Channel.updateOne(
              { channelName: target },
              { $pull: { channelMembers: targetUser._id } },
            ),
          ]);

          await Notification.create({
            mainUser: target,
            mainUserType: "Channel",
            msgSerial: 10,
            userInvolved: username,
          });

          await ActivityLog.create({
            username,
            id: `#${Date.now()}`,
            message: `You have unfollowed #${target}!!`,
          });

          return {
            success: true,
            status: "unfollowed",
            message: `Unfollowed ${target}`,
            target,
            targetType,
          };
        }

        const targetUser = await User.findOne({ username: target });
        if (!targetUser) throw new Error("User not found");

        const requestedByMe = targetUser.requested.some(r =>
          typeof r === "string" ? r === username : r.username === username,
        );

        if (requestedByMe) {
          await User.updateOne(
            { username: target },
            { $pull: { requested: { username } } },
          );
          await User.updateOne(
            { username: target },
            { $pull: { requested: username } },
          );
          await Notification.deleteMany({
            mainUser: target,
            userInvolved: username,
            msgSerial: 4,
          });

          return {
            success: true,
            status: "request_canceled",
            message: "Follow request canceled",
            target,
            targetType,
          };
        }

        await Promise.all([
          User.updateOne(
            { username },
            { $pull: { followings: { username: target } } },
          ),
          User.updateOne(
            { username: target },
            { $pull: { followers: { username } } },
          ),
        ]);

        await Notification.create({
          mainUser: target,
          mainUserType: "Normal",
          msgSerial: 7,
          userInvolved: username,
        });

        await ActivityLog.create({
          username,
          id: `#${Date.now()}`,
          message: `You have unfollowed #${target}!!`,
        });

        return {
          success: true,
          status: "unfollowed",
          message: `Unfollowed @${target}`,
          target,
          targetType,
        };
      },
    },
    addPostComment: {
      type: addCommentPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
        commentText: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId, commentText }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const text = commentText.trim();

        if (!text) {
          throw new Error("Comment cannot be empty");
        }

        const post = await Post.findOne({ id: postId });
        if (!post) {
          throw new Error("Post not found");
        }

        const actionId = `#${Date.now()}`;

        const comment = await Comment.create({
          text,
          username: identifier,
          avatarUrl:
            type === "Channel"
              ? actor.channelLogo || process.env.DEFAULT_USER_IMG
              : actor.profilePicture || process.env.DEFAULT_USER_IMG,
          postID: post._id,
          reply_array: [],
        });

        post.comments = [...(post.comments || []), comment._id];
        await post.save();

        await ActivityLog.create({
          username: identifier,
          id: actionId,
          message: `You commented on a post by #${post.author}!`,
        });

        if (identifier !== post.author) {
          await Notification.create({
            mainUser: post.author,
            mainUserType: "Normal",
            msgSerial: 8,
            userInvolved: identifier,
          });
        }

        if (type !== "Kids") {
          await rewardUserByUsername(identifier, {
            activity: "engagement",
          });
        }

        return {
          success: true,
          message: "Comment added successfully",
          comment,
          commentCount: post.comments.length,
        };
      },
    },
    addCommentReply: {
      type: addReplyPayloadType,
      args: {
        commentId: { type: new GraphQLNonNull(GraphQLString) },
        postId: { type: new GraphQLNonNull(GraphQLString) },
        replyText: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { commentId, postId, replyText }, { req }) => {
        const { actor, type, identifier } = await getActor(req);
        const text = replyText.trim();

        if (!text || !commentId || !postId) {
          throw new Error("Missing required fields");
        }

        const post = await Post.findOne({ id: postId }).select("id");
        if (!post) {
          throw new Error("Post not found");
        }

        const reply = await Comment.create({
          text,
          parentCommntID: commentId,
          username: identifier,
          avatarUrl:
            type === "Channel"
              ? actor.channelLogo || process.env.DEFAULT_USER_IMG
              : actor.profilePicture || process.env.DEFAULT_USER_IMG,
        });

        const parentComment = await Comment.findOneAndUpdate(
          { _id: commentId },
          { $push: { reply_array: reply._id } },
          { new: true },
        );

        if (!parentComment) {
          throw new Error("Parent comment not found");
        }

        return {
          success: true,
          reply,
        };
      },
    },
    reportPost: {
      type: simpleActionPayloadType,
      args: {
        postId: { type: new GraphQLNonNull(GraphQLString) },
        reason: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { postId, reason }, { req }) => {
        const reporterUsername = req.userDetails?.data?.[0];
        if (!reporterUsername) {
          throw new Error("Unauthorized");
        }

        const [userPost, reportedChannelPost] = await Promise.all([
          Post.findOne({ id: postId }),
          channelPost.findOne({ id: postId }),
        ]);

        if (!userPost && !reportedChannelPost) {
          throw new Error("Post not found");
        }

        const isChannelPost = Boolean(reportedChannelPost);
        const reportNumber = Date.now();
        const reportedOwner = isChannelPost
          ? reportedChannelPost.channel
          : userPost.author;

        const report = await Report.create({
          report_id: isChannelPost ? 4 : 3,
          post_id: postId,
          report_number: reportNumber,
          user_reported: reportedOwner,
          reason,
          status: "Pending",
        });

        await ActivityLog.create({
          username: reporterUsername,
          id: `#${reportNumber}`,
          message: `You reported a post by @${reportedOwner} for "${reason}".`,
        });

        return {
          success: true,
          message: "Post reported successfully.",
          reportId: report._id.toString(),
        };
      },
    },
    reportComment: {
      type: simpleActionPayloadType,
      args: {
        commentId: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_, { commentId }, { req }) => {
        const reporterUsername = req.userDetails?.data?.[0];
        if (!reporterUsername) {
          throw new Error("Unauthorized");
        }

        const comment = await Comment.findById(commentId);
        if (!comment) {
          throw new Error("Comment not found");
        }

        const isChannelComment = Boolean(
          await Channel.findOne({ channelName: comment.username }).select(
            "channelName",
          ),
        );
        const reportNumber = Date.now();
        const report = await Report.create({
          report_id: isChannelComment ? 6 : 5,
          post_id: commentId,
          report_number: reportNumber,
          user_reported: comment.username,
          reason: "REPORT",
          status: "Pending",
        });

        await ActivityLog.create({
          username: reporterUsername,
          id: `#${reportNumber}`,
          message: "You reported a comment.",
        });

        return {
          success: true,
          message: "comment reported successfully",
          reportId: report._id.toString(),
        };
      },
    },
  },
});

const homeSchema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});

export default homeSchema;
