import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },

    username: {
      type: String,
      required: true,
      trim: true,
    },

    avatarUrl: {
      type: String,
      default: process.env.DEFAULT_USER_IMG,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    likes: [
      {
        type: String,
      },
    ],

    parentCommntID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    reply_array: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
