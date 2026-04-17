import ActivityLog from "../models/activityLogSchema.js";
import channelPost from "../models/channelPost.js";
import Channel from "../models/channelSchema.js";
import { rewardUserByUsername } from "../services/coinRewards.js";

const categories = [
  "Entertainment",
  "Comedy",
  "Education",
  "Science",
  "Tech",
  "Gaming",
  "Animations",
  "Memes",
  "Music",
  "Sports",
  "Fitness",
  "Lifestyle",
  "Fashion",
  "Beauty",
  "Food",
  "Travel",
  "Vlog",
  "Nature",
  "DIY",
  "Art",
  "Photography",
  "Business",
  "Finance",
  "Marketing",
  "News",
  "Movies",
  "Pets",
  "Automotive"
];

// ============================
// UPLOAD CHANNEL POST
// ============================
const handlechannelPostupload = async (req, res) => {
  try {
    const { data } = req.userDetails;

    if (
      !req.body?.title?.length ||
      !req.body?.url?.length ||
      !req.body?.content?.length ||
      !req.body?.category?.length ||
      !req.body?.type?.length
    ) {
      return res.status(400).json({ err: "All fields are required" });
    }

    const id = `${data[0]}-${Date.now()}`;
    const channelDetails = await Channel.findOne({
      channelName: data[0],
    }).lean();

    // Determine allowed categories
    let allowedCategory = channelDetails?.channelCategory.includes("All")
      ? categories
      : channelDetails?.channelCategory;

    // Validate category
    if (!allowedCategory.includes(req.body.category)) {
      return res.status(400).json({ err: "Invalid category selected" });
    }

    const postObj = {
      id,
      type: req.body.type,
      url: req.body.url,
      content: req.body.content,
      channel: data[0],
      category: req.body.category,
    };

    const post = await channelPost.create(postObj);

    await Channel.findOneAndUpdate(
      { channelName: data[0] },
      { $push: { postIds: post._id } },
      { new: true }
    );

    await ActivityLog.create({
      username: data[0],
      id: `#${Date.now()}`,
      message: `You uploaded a new ${
        post.type === "Reel" ? "reel" : "post"
      }!`,
    });

    if (channelDetails?.channelAdmin) {
      const adminChannel = await Channel.findOne({ channelName: data[0] })
        .populate("channelAdmin", "username")
        .lean();
      const adminUsername = adminChannel?.channelAdmin?.username;

      if (adminUsername) {
        await rewardUserByUsername(adminUsername, {
          activity: "post_create",
          forcePremiumPostLimit: true,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${
        post.type === "Reel" ? "Reel" : "Post"
      } uploaded successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ err: error.message });
  }
};

// ============================
// GET AVAILABLE CHANNEL CATEGORIES
// ============================
const handleGetcategories = async (req, res) => {
  try {
    const channelDetails = await Channel.findOne({
      channelName: req.userDetails.data[0],
    }).lean();

    if (!channelDetails?.channelName?.length) {
      return res.status(404).json({ err: "Channel not found" });
    }

    return res.status(200).json({
      category: channelDetails?.channelCategory.includes("All")
        ? categories
        : channelDetails?.channelCategory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ err: error.message });
  }
};

export { handlechannelPostupload, handleGetcategories };
