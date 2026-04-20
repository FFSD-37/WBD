import express from "express";
import Post from "../models/post.js";
import User from "../models/user_schema.js";
import Channel from "../models/channelSchema.js";
import Comment from "../models/comment.js";
import ChannelPost from "../models/channelPost.js";
import ChannelComment from "../models/channelComment.js";

export const posts = express.Router();

const getPagination = (req) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
};

const buildPaginatedResponse = (items, page, limit) => {
  const total = items.length;
  return {
    items: items.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
    },
  };
};

const attachPostType = (items, postType) =>
  items.map((item) => ({
    ...item.toObject(),
    postType,
  }));

const sortByCreatedAtDesc = (items) =>
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const getUserPostComments = async (post) => {
  const commentIds = Array.isArray(post.comments) ? post.comments.filter(Boolean) : [];

  if (commentIds.length) {
    const comments = await Comment.find({
      _id: { $in: commentIds },
      $or: [{ parentCommntID: null }, { parentCommntID: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (comments.length) {
      return comments;
    }
  }

  return Comment.find({
    $and: [
      { $or: [{ id: post._id }, { postId: post._id }] },
      { $or: [{ parentCommntID: null }, { parentCommntID: { $exists: false } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
};

const getChannelPostComments = async (post) => {
  const commentIds = Array.isArray(post.comments) ? post.comments.filter(Boolean) : [];

  if (commentIds.length) {
    const comments = await ChannelComment.find({
      _id: { $in: commentIds },
      $or: [{ parentCommentId: null }, { parentCommentId: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (comments.length) {
      return comments;
    }
  }

  return ChannelComment.find({
    postId: post._id,
    $or: [{ parentCommentId: null }, { parentCommentId: { $exists: false } }],
  })
    .sort({ createdAt: -1 })
    .lean();
};

posts.get("/list", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req);
    const query = (req.query.search || "").trim().toLowerCase();
    const typeFilter = (req.query.type || "all").toLowerCase();

    const [userPosts, channelPosts] = await Promise.all([
      typeFilter === "channel" ? Promise.resolve([]) : Post.find({}).sort({ createdAt: -1 }),
      typeFilter === "user" ? Promise.resolve([]) : ChannelPost.find({}).sort({ createdAt: -1 }),
    ]);

    const mergedPosts = sortByCreatedAtDesc([
      ...attachPostType(userPosts, "user"),
      ...attachPostType(channelPosts, "channel"),
    ]).filter((post) => {
      if (!query) return true;
      return [post.id, post.content, post.author, post.channel, post.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });

    const paginated = buildPaginatedResponse(mergedPosts, page, limit);

    return res.status(200).json({
      success: true,
      posts: paginated.items,
      pagination: paginated.pagination,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching posts";
    return next(e);
  }
});

posts.get("/user/:username", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req);
    const userPosts = await Post.find({ author: req.params.username }).sort({ createdAt: -1 });
    const withType = attachPostType(userPosts, "user");
    const paginated = buildPaginatedResponse(withType, page, limit);

    return res.status(200).json({
      success: true,
      posts: paginated.items,
      pagination: paginated.pagination,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching user posts";
    return next(e);
  }
});

posts.get("/channel/:channelName", async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req);
    const channelPosts = await ChannelPost.find({ channel: req.params.channelName }).sort({
      createdAt: -1,
    });
    const withType = attachPostType(channelPosts, "channel");
    const paginated = buildPaginatedResponse(withType, page, limit);

    return res.status(200).json({
      success: true,
      posts: paginated.items,
      pagination: paginated.pagination,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching channel posts";
    return next(e);
  }
});

posts.get("/:id/comments", async (req, res, next) => {
  try {
    const post = await Post.findOne({ id: req.params.id }).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comments = await getUserPostComments(post);

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching post comments";
    return next(e);
  }
});

posts.get("/channel-post/:id/comments", async (req, res, next) => {
  try {
    const post = await ChannelPost.findOne({ id: req.params.id }).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Channel post not found",
      });
    }

    const comments = await getChannelPostComments(post);

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error fetching channel post comments";
    return next(e);
  }
});

posts.patch("/:id/archive", async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { id: req.params.id },
      { isArchived: true },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    await User.updateMany(
      { username: post.author },
      { $addToSet: { archivedPostsIds: post.id } }
    );

    return res.status(200).json({ success: true, post });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error archiving post";
    return next(e);
  }
});

posts.patch("/:id/restore", async (req, res, next) => {
  try {
    const post = await Post.findOneAndUpdate(
      { id: req.params.id },
      { isArchived: false },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    await User.updateMany(
      { username: post.author },
      { $pull: { archivedPostsIds: post.id } }
    );

    return res.status(200).json({ success: true, post });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error restoring post";
    return next(e);
  }
});

posts.delete("/:id", async (req, res, next) => {
  try {
    const post = await Post.findOneAndDelete({ id: req.params.id });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    await Promise.all([
      Comment.deleteMany({ id: post._id }),
      User.updateMany(
        {},
        {
          $pull: {
            postIds: post.id,
            archivedPostsIds: post.id,
            likedPostsIds: post.id,
            savedPostsIds: post.id,
          },
        }
      ),
    ]);

    return res.status(200).json({ success: true, message: "Post deleted" });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error deleting post";
    return next(e);
  }
});

posts.patch("/channel-post/:id/archive", async (req, res, next) => {
  try {
    const post = await ChannelPost.findOneAndUpdate(
      { id: req.params.id },
      { isArchived: true },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: "Channel post not found" });
    }

    await Channel.updateMany(
      { channelName: post.channel },
      { $addToSet: { archivedPostsIds: post.id } }
    );

    return res.status(200).json({ success: true, post });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error archiving channel post";
    return next(e);
  }
});

posts.patch("/channel-post/:id/restore", async (req, res, next) => {
  try {
    const post = await ChannelPost.findOneAndUpdate(
      { id: req.params.id },
      { isArchived: false },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ success: false, message: "Channel post not found" });
    }

    await Channel.updateMany(
      { channelName: post.channel },
      { $pull: { archivedPostsIds: post.id } }
    );

    return res.status(200).json({ success: true, post });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error restoring channel post";
    return next(e);
  }
});

posts.delete("/channel-post/:id", async (req, res, next) => {
  try {
    const post = await ChannelPost.findOneAndDelete({ id: req.params.id });

    if (!post) {
      return res.status(404).json({ success: false, message: "Channel post not found" });
    }

    await Promise.all([
      ChannelComment.deleteMany({ postId: post._id }),
      Channel.updateMany(
        {},
        {
          $pull: {
            postIds: post.id,
            archivedPostsIds: post.id,
            likedPostsIds: post.id,
            savedPostsIds: post.id,
          },
        }
      ),
      User.updateMany(
        {},
        {
          $pull: {
            likedPostsIds: post.id,
            savedPostsIds: post.id,
          },
        }
      ),
    ]);

    return res.status(200).json({ success: true, message: "Channel post deleted" });
  } catch (e) {
    e.statusCode = 500;
    e.message = "Error deleting channel post";
    return next(e);
  }
});
