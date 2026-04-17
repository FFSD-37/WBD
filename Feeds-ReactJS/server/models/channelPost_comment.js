import mongoose from "mongoose";

const channelCommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "channelPost",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Channel", "Normal"],
      required: true,
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

    // Likes can store usernames or channelNames
    likes: [
      {
        type: String,
      },
    ],

    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChannelComment",
      default: null,
    },

    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChannelComment",
      },
    ],
  },
  { timestamps: true }
);

// ✅ Prevent circular reference depth issues
channelCommentSchema.index({ postId: 1, parentCommentId: 1, createdAt: -1 });

channelCommentSchema.pre("remove", async function (next) {
  await this.model("ChannelComment").deleteMany({
    parentCommentId: this._id,
  });
  next();
});

const ChannelComment = mongoose.model(
  "ChannelComment",
  channelCommentSchema
);

export default ChannelComment;
