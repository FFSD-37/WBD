import Post from "../../models/postSchema.js";
import User from "../../models/users_schema.js";
import Channel from "../../models/channelSchema.js";
import channelPost from "../../models/channelPost.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import mongoose from "mongoose";

const handlegetUserPost = async (req, res) => {
    const { data } = req.userDetails;
    const userAsking = req.params.username;
    const user = await User.findOne({ username: userAsking });
    const posts = await Post.find({ _id: { $in: user.postIds || [] } });
    return res.json({ posts: posts });
}

const handlegetBlcokedUsers = async (req, res) => {
  const { data } = req.userDetails;
  const user = await User.findOne({ username: data[0] });
  // console.log(user.blockedUsers);
  return res.json({success: true, list: user.blockedUsers});
}

const handleCheckParentalPass = async (req, res) => {
    const { data } = req.userDetails;
    const { password } = req.body;
    // console.log("password" , password);
    const user = await User.findOne({ username: data[0] });
    // console.log("user" , user);
    if (user.parentPassword === password) {
      return res.json({ success: true, message: "Password is correct" });
      } else {
      return res.json({ success: false, message: "Incorrect password" });
    }
}

const handlegetBasicDetails = async (req, res) => {
    const { data } = req.userDetails;
    const viewerName = data[0];
    const viewerType = data[3];
    const userAsking = req.params.username;
    const user = await User.findOne({ username: userAsking });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const viewerIsChannel = viewerType === "Channel";
    const isOwnProfile = !viewerIsChannel && viewerName === userAsking;
    const blockedByTarget = user.blockedUsers.includes(viewerName);
    const kidsBoundary =
      (viewerType === "Kids" && user.type !== "Kids") ||
      (viewerType !== "Kids" && user.type === "Kids");

    let mainFollowsSide = false;
    let viewerBlockedTarget = false;
    if (!viewerIsChannel) {
      const viewer = await User.findOne({ username: viewerName }).select("followings blockedUsers").lean();
      mainFollowsSide = viewer?.followings?.some((f) => f.username === userAsking) || false;
      viewerBlockedTarget = viewer?.blockedUsers?.includes(userAsking) || false;
    }

    const canViewPosts =
      !blockedByTarget &&
      !viewerBlockedTarget &&
      !kidsBoundary &&
      (isOwnProfile || user.visibility === "Public" || (!viewerIsChannel && mainFollowsSide));

    const canViewSocial =
      !viewerIsChannel &&
      !blockedByTarget &&
      !viewerBlockedTarget &&
      !kidsBoundary &&
      (isOwnProfile || user.visibility === "Public" || mainFollowsSide);

    const result = {
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
        pfp: user.profilePicture,
        bio: user.bio,
        gender: user.gender,
        isPremium: user.isPremium,
        type: user.type,
        visibility: user.visibility,
        links: user.links,
        display_name: user.display_name,
        coins: user.coins,
        createdAt: user.createdAt,
        access: {
          viewerType,
          isOwnProfile,
          blockedByTarget,
          viewerBlockedTarget,
          kidsBoundary,
          mainFollowsSide,
          canViewPosts,
          canViewSocial
        }
    }
    return res.json({ success: true, details: result });
}

const handlegetsensitive = async (req, res) => {
    const { data } = req.userDetails;
    const viewerName = data[0];
    const viewerType = data[3];
    const userAsking = req.params.username;
    const user = await User.findOne({ username: userAsking });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const viewerIsChannel = viewerType === "Channel";
    const isOwnProfile = !viewerIsChannel && viewerName === userAsking;
    const blockedByTarget = user.blockedUsers.includes(viewerName);
    const kidsBoundary =
      (viewerType === "Kids" && user.type !== "Kids") ||
      (viewerType !== "Kids" && user.type === "Kids");

    let mainFollowsSide = false;
    let viewerBlockedTarget = false;
    if (!viewerIsChannel) {
      const viewer = await User.findOne({ username: viewerName }).select("followings blockedUsers").lean();
      mainFollowsSide = viewer?.followings?.some((f) => f.username === userAsking) || false;
      viewerBlockedTarget = viewer?.blockedUsers?.includes(userAsking) || false;
    }

    const canViewPosts =
      !blockedByTarget &&
      !viewerBlockedTarget &&
      !kidsBoundary &&
      (isOwnProfile || user.visibility === "Public" || (!viewerIsChannel && mainFollowsSide));

    const canViewSocial =
      !viewerIsChannel &&
      !blockedByTarget &&
      !viewerBlockedTarget &&
      !kidsBoundary &&
      (isOwnProfile || user.visibility === "Public" || mainFollowsSide);

    let posts = [];
    let saved = [];
    let liked = [];
    let archived = [];

    if (canViewPosts) {
      const postIds = user.postIds || [];
      posts = await Post.find({ _id: { $in: postIds }, isArchived: false }).lean();
    }

    if (isOwnProfile) {
      const savedIds = (user.savedPostsIds || []).map(String);
      const likedIds = (user.likedPostsIds || []).map(String);
      const archiveIds = user.archivedPostsIds || [];
      const savedChannelIds = savedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      const likedChannelIds = likedIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

      const [
        savedNormal,
        savedChannel,
        likedNormal,
        likedChannel,
        archivedPosts,
      ] = await Promise.all([
        Post.find({ id: { $in: savedIds } }).lean(),
        channelPost.find({ _id: { $in: savedChannelIds } }).lean(),
        Post.find({ id: { $in: likedIds } }).lean(),
        channelPost.find({ _id: { $in: likedChannelIds } }).lean(),
        Post.find({ id: { $in: archiveIds } }).lean(),
      ]);

      saved = [...savedNormal, ...savedChannel];
      liked = [...likedNormal, ...likedChannel];
      archived = archivedPosts;
    }

    const result = {
        followers: canViewSocial ? user.followers : [],
        followings: canViewSocial ? user.followings : [],
        posts,
        saved,
        liked,
        archived,
        access: {
          viewerType,
          isOwnProfile,
          blockedByTarget,
          viewerBlockedTarget,
          kidsBoundary,
          mainFollowsSide,
          canViewPosts,
          canViewSocial
        }
    }
    return res.json({ success: true, details: result });
}

const handleisfriend = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const viewerType = data[3];
    const userAsking = req.params.username;

    if (viewerType === "Channel") {
      return res.status(200).json({
        relationship: "",
        href: "",
        canFollow: false,
        reason: "Channel accounts cannot follow users."
      });
    }

    const mainUser = await User.findOne({ username: data[0] });
    const sideUser = await User.findOne({ username: userAsking });

    if (!mainUser || !sideUser) {
      return res.status(404).json({
        relationship: "",
        href: "",
        canFollow: false,
        reason: "User not found"
      });
    }

    if (sideUser.blockedUsers.includes(mainUser.username)) {
      return res.status(200).json({
        relationship: "Blocked",
        href: "",
        canFollow: false,
        reason: "You are blocked by this user."
      });
    }

    if (mainUser.blockedUsers.includes(sideUser.username)) {
      return res.status(200).json({
        relationship: "Blocked",
        href: "",
        canFollow: false,
        reason: "You have blocked this user."
      });
    }

    const kidsBoundary =
      (mainUser.type === "Kids" && sideUser.type !== "Kids") ||
      (mainUser.type !== "Kids" && sideUser.type === "Kids");

    if (kidsBoundary) {
      return res.status(200).json({
        relationship: "",
        href: "",
        canFollow: false,
        reason: "Kids accounts cannot follow non-kids users and vice-versa."
      });
    }

    // Is main following side?
    const mainFollowsSide = mainUser.followings.some(
      (u) => u.username === sideUser.username
    );

    // Pending request is stored in side user's requested[] as incoming requests
    const mainRequestedSide = sideUser.requested.some(
      (u) => u.username === mainUser.username
    );

    // Does side follow main?
    const sideFollowsMain = sideUser.followings.some(
      (u) => u.username === mainUser.username
    );

    let relationship = "";
    let href = "";

    if (mainRequestedSide) {
      // Follow request sent
      relationship = "Requested";
      href = `/unrequest/${sideUser.username}`;
    } 
    else if (!mainRequestedSide && !mainFollowsSide) {
      // No follow / no request
      relationship = "Follow";
      href = `/follow/${sideUser.username}`;
    } 
    else if (mainFollowsSide) {
      // Already follow
      relationship = "Unfollow";
      href = `/unfollow/${sideUser.username}`;
    }

    if (sideFollowsMain && !mainFollowsSide && !mainRequestedSide) {
      // They follow you, you don’t follow them
      relationship = "Follow back";
      href = `/follow/${sideUser.username}`;
    }

    return res.status(200).json({ relationship, href, canFollow: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      relationship: "",
      href: "",
      canFollow: false,
      reason: "Failed to determine relationship"
    });
  }
};

const getCoins = async (req, res) => {
  const { data } = req.userDetails;
  const user = await User.findOne({ username: data[0] });
  return res.json({ coins: user.coins });
}

const getChannels = async (req, res) => {
  const { data } = req.userDetails;
  const user = await User.findOne({ username: data[0] });
  const channels = user.channelFollowings.map((channel) => channel.channelName);
  const channelsData = await Channel.find({ channelName: { $in: channels } });
  return res.json({ success: true, channels: channelsData });
}

import bcrypt from "bcrypt";

const handlechangepassKids = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const user = await User.findOne({ username: data[0] });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;

    // Check if both fields exist
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Compare current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Password change error:", error);
    return next(error);
  }
};

const handlechangeparentalpass = async (req, res) => {
  try {
    const { data } = req.userDetails;
    const { currentParentalPassword, newParentalPassword } = req.body;

    // Validate fields
    if (!currentParentalPassword || !newParentalPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ username: data[0] });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare current parental password (plain text comparison)
    if (user.parentPassword !== currentParentalPassword) {
      return res.status(401).json({ message: "Current parental password is incorrect" });
    }

    // Update parental password directly
    user.parentPassword = newParentalPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Parental password updated successfully"
    });

  } catch (error) {
    console.error("Error updating parental password:", error);
    return next(error);
  }
};

const handlegetkidsTime = async (req, res) => {
  const {data} = req.userDetails;
  const user = await User.findOne({username: data[0]});
  return res.status(200).json({dailyLimitMinutes: user.timeLimit});
}

const handlesetkidsTime = async (req, res) => {
  const {data} = req.userDetails;
  const {dailyLimitMinutes} = req.body;
  // console.log(dailyLimitMinutes);
  await User.updateOne({username: data[0]}, {timeLimit: dailyLimitMinutes});
  return res.json({success: true});
}

const handledeactivateKid = async (req, res) => {
  const {data} = req.userDetails;
  const {password, reason} = req.body;
  const user = await User.findOne({username: data[0]});
  const isMatch = await bcrypt.compare(password, user.password);
  if(isMatch){
    res.clearCookie("uuid", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    res.clearCookie("cuid", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return res.json({success: true})
  }
  else{
    return res.json({success: false, message: "Incorrect password!!"});
  }
}

const _handlegetUserPost = asyncHandler(handlegetUserPost);
const _handlegetBasicDetails = asyncHandler(handlegetBasicDetails);
const _handlegetsensitive = asyncHandler(handlegetsensitive);
const _handleisfriend = asyncHandler(handleisfriend);
const _handleCheckParentalPass = asyncHandler(handleCheckParentalPass);
const _getCoins = asyncHandler(getCoins);
const _getChannels = asyncHandler(getChannels);
const _handlechangepassKids = asyncHandler(handlechangepassKids);
const _handlechangeparentalpass = asyncHandler(handlechangeparentalpass);
const _handlegetkidsTime = asyncHandler(handlegetkidsTime);
const _handlesetkidsTime = asyncHandler(handlesetkidsTime);
const _handledeactivateKid = asyncHandler(handledeactivateKid);
const _handlegetBlcokedUsers = asyncHandler(handlegetBlcokedUsers);

export {
  _handlegetUserPost as handlegetUserPost,
  _handlegetBasicDetails as handlegetBasicDetails,
  _handlegetsensitive as handlegetsensitive,
  _handleisfriend as handleisfriend,
  _handleCheckParentalPass as handleCheckParentalPass,
  _getCoins as getCoins,
  _getChannels as getChannels,
  _handlechangepassKids as handlechangepassKids,
  _handlechangeparentalpass as handlechangeparentalpass,
  _handlegetkidsTime as handlegetkidsTime,
  _handlesetkidsTime as handlesetkidsTime,
  _handledeactivateKid as handledeactivateKid,
  _handlegetBlcokedUsers as handlegetBlcokedUsers
}
