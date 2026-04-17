import User from "../../models/users_schema.js";
import Adpost from "../../models/ad_schema.js";
import Post from "../../models/postSchema.js";
import Comment from "../../models/comment_schema.js";
import Report from "../../models/reports.js";
import ActivityLog from "../../models/activityLogSchema.js";
import Channel from "../../models/channelSchema.js";

const getFriends = async (req, res) => {
  const { data } = req.userDetails;
  const user = await User.findOne({ username: data[0] });

  let friends = user.followings.filter((f) =>
    user.followers.some((fr) => fr.username === f.username)
  );

  friends = await User.find({
    username: { $in: friends.map((f) => f.username) },
  })
    .select("username profilePicture -_id")
    .lean()
    .then((docs) =>
      docs.map(({ username, profilePicture }) => ({
        username,
        avatarUrl: profilePicture,
      }))
    );

  return res.status(200).json({ success: true, friends });
};

const handlegetads = async (req, res) => {
  const ads = await Adpost.find({}).lean();
  return res.json({ success: true, allAds: ads });
};

const handlegetComments = async (req, res) => {
  const postID = req.body.postID;
  const post = await Post.findOne({ id: req.body.postID });
  let comment_array = [];
  for (let i = 0; i < post.comments.length; i++) {
    const comment = await Comment.findOne({ _id: post.comments[i] });
    let reply_array = [];
    if (comment?.reply_array.length > 0) {
      for (let j = 0; j < comment.reply_array.length; j++) {
        reply_array.push(
          await Comment.findOne({ _id: comment.reply_array[j] })
        );
      }
    }
    comment_array.push([comment, reply_array]);
  }

  return res.json({ success: true, comment_array });
};

const handlepostreply = async (req, res) => {
  if (!req.userDetails || !req.userDetails.data) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const { data } = req.userDetails;
  const { commentId, reply, postID } = req.body;

  if (!commentId || !reply || !postID) {
    const err = new Error("Missing required fields");
    err.statusCode = 400;
    throw err;
  }

  const user = await Comment.create({
    text: reply,
    parentCommntID: commentId,
    username: data[0],
    avatarUrl: data[2],
  });

  const parentComment = await Comment.findOneAndUpdate(
    { _id: commentId },
    { $push: { reply_array: user._id } },
    { new: true }
  );

  if (!parentComment) {
    const err = new Error("Parent comment not found");
    err.statusCode = 404;
    throw err;
  }

  return res.json({
    success: true,
    reply: user,
  });
};

const handlecommentreport = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const reporterUsername = data[0];
    const { commentId } = req.body;

    if (!commentId) {
      return res.status(400).json({
        success: false,
        message: "commend ID and reason are required.",
      });
    }

    // Check if post exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    // Classify chat/comment report:
    // normal user chat => 5, channel chat => 6
    const isChannelComment = Boolean(
      await Channel.findOne({ channelName: comment.username }).select("channelName")
    );
    const reportId = isChannelComment ? 6 : 5;

    // Create new report entry
    const report = await Report.create({
      report_id: reportId,
      post_id: commentId,
      report_number: Date.now(),
      user_reported: comment.username,
      reason: "REPORT",
      status: "Pending",
    });

    // Add to activity log
    await ActivityLog.create({
      username: reporterUsername,
      id: `#${Date.now()}`,
      message: `You reported a comment.`,
    });

    return res.status(201).json({
      success: true,
      message: "comment reported successfully",
      reportId: report._id,
    });
  } catch (error) {
    console.error("❌ Error in handlereportpost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while reporting comment.",
    });
  }
};

export {
  getFriends,
  handlegetads,
  handlegetComments,
  handlepostreply,
  handlecommentreport,
};
