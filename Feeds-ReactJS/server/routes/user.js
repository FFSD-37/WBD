import express from "express";
import {
  handleSignup,
  // handleLogin,
  handleContact,
  handledelacc,
  handlelogout,
  handlegetHome,
  handlegetpayment,
  handlegetprofile,
  handleadminlogin,
  handlegeteditprofile,
  handlegetcreatepost,
  handlecreatepost,
  handlegetcreatepost2,
  updateUserProfile,
  fetchOverlayUser,
  followSomeone,
  acceptFollowRequest,
  unfollowSomeone,
  unRequestSomeone,
  handlegetnotification,
  handlegetsettings,
  togglePP,
  signupChannel,
  registerChannel,
  handlegetlog,
  createPostfinalize,
  uploadFinalPost,
  reportAccount,
  handleloginchannel,
  handlegetallnotifications,
  markNotificationsAsSeen,
  getUnseenCounts,
  handleloginsecond,
  handlelikereel,
  handlereportpost,
  handleReportChat,
  handlegetads,
  handlelikecomment,
  handleblockuser,
  handledeletepost,
  handlearchivepost,
  handleunarchivepost,
  handleunsavepost,
  handlepostcomment,
  handleGetEditChannel,
  updateChannelProfile,
} from "../controllers/user.js";
import {
  handlegetUserPost,
  handlegetBasicDetails,
  handlegetsensitive,
  handleisfriend,
  handleCheckParentalPass,
  getCoins,
  handlechangepassKids,
  handlechangeparentalpass,
  handlegetkidsTime,
  handlesetkidsTime,
  handledeactivateKid,
  handlegetBlcokedUsers,
} from "../controllers/Gourav/profile.js";
import {
  updateTime
} from "../controllers/Gourav/games.js";
import {
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
} from "../controllers/Ayush/channel.js";
import {
  getAllChannelPosts,
  likeChannelPost,
  saveChannelPost,
  commentOnChannelPost,
  getSingleChannelPost,
  getKidsHomePosts,
  getChannelCommentReplies,
} from "../controllers/Ayush/home.js";
import {
  handleGetConnect,
  getSearch,
  followEntity,
  unfollowEntity,
} from "../controllers/Ayush/connect.js";
import {
  getReelsFeed,
  likeReel,
  unlikeReel,
  saveReel,
  unsaveReel,
  commentReel,
  replyReel,
  getReelComments,
} from "../controllers/Ayush/reels.js";
import { handleimagKitauth } from "../services/imagKit.js";
import { isAuthuser } from "../middleware/isAuthuser.js";
import { checkOut, verify_payment } from "../controllers/payment.js";
import { getChat, getFriendList, deleteChat, markChatSeen } from "../controllers/chat.js";
import { getDailyusage } from "../controllers/timout.js";
import { handlegetstories } from "../controllers/userStory.js";
import { claimGamePlayReward } from "../controllers/rewards.js";
import Channel from "../models/channelSchema.js";
import homeRouter from "./home.js";

const router = express.Router();

// Public routes (no authentication required)
router.post("/signup", handleSignup);
router.get("/imagKitauth", handleimagKitauth);
router.post("/fetchUserOverlay", fetchOverlayUser);
router.post("/atin_job", handleloginsecond);
router.post("/adminLogin", handleadminlogin);

router.get("/healthCheck", (req, res) => {
  return res.json({
    "success": true,
    "msg": "Server running healthy"
  }).status(200);
});

// Protected routes (require authentication)
router.use(isAuthuser);

router.get("/", (req, res) => {
  res.redirect("/login");
});


router.get("/home", handlegetHome);

router.get("/payment", handlegetpayment);

router.post("/games/updateTime", updateTime);

router.get("/connect", handleGetConnect);

router.get("/stories", handlegetstories);

router.get("/create_post", handlegetcreatepost);

router.get("/create_post_2", handlegetcreatepost2);

router.get("/notifications", handlegetnotification);

router.get("/login", (req, res) => {
  res.render("login", {
    loginType: null,
    msg: null,
  });
});

router.get("/verify", async (req, res) => {
  try {
    const type = req.userDetails?.data?.[3];
    const username = req.userDetails?.data?.[0];

    if (type === "Channel") {
      const channel = await Channel.findOne({ channelName: username }).select("isDeactivated").lean();
      if (!channel || channel.isDeactivated) {
        res.clearCookie("cuid", { httpOnly: true, sameSite: "strict", secure: true });
        return res.status(401).json({ message: "Channel is deactivated" });
      }
    }

    return res.json({
      username: req.userDetails.data[0],
      email: req.userDetails.data[1],
      profileUrl: req.userDetails.data[2],
      type: req.userDetails.data[3],
      isPremium: req.userDetails.data[4],
    });
  } catch (error) {
    console.error("Error in /verify:", error);
    return res.status(500).json({ message: "Failed to verify user" });
  }
});

// router.post("/login", handleLogin);

router.post("/contact", handleContact);

router.post("/delacc", handledelacc);

router.post("/logout", handlelogout);

router.post("/createpost", handlecreatepost);

router.get("/edit_profile", handlegeteditprofile);

router.post("/checkout_razorpay", checkOut);

router.post("/payment", checkOut);

router.post("/verify_payment", verify_payment);

router.post("/updateUserDetails", updateUserProfile);

router.post("/follow/:username", followSomeone);

router.post("/follow-request/accept/:username", acceptFollowRequest);

router.post("/unfollow/:username", unfollowSomeone);

router.post("/unrequest/:username", unRequestSomeone);

router.get("/chat/:username", getChat);
router.post("/chat/:username/seen", markChatSeen);
router.delete("/chat/:username", deleteChat);

router.get("/friends", getFriendList);

router.get("/connect/search", getSearch);

router.get("/dailyUsage", getDailyusage);

router.get("/settings", handlegetsettings);

router.get("/togglePublicPrivate", togglePP);

router.get("/create_channel", signupChannel);

router.post("/signupChannel", registerChannel);

router.post("/finalSubmit", createPostfinalize);

router.get("/activityLog", handlegetlog);

router.post("/shareFinalPost", uploadFinalPost);

router.post("/report/:username", reportAccount);
router.post("/report_channel/:username", reportAccount);

router.post("/postloginchannel", handleloginchannel);

router.get("/GetAllNotifications", handlegetallnotifications);
router.post("/notifications/mark-seen", markNotificationsAsSeen);
router.get("/unseen-counts", getUnseenCounts);

router.get("/profile/:username", handlegetUserPost);

router.post("/posts/like", handlelikereel);

router.post("/comment", handlepostcomment);

router.post("/report_post", handlereportpost);
router.post("/report_chat", handleReportChat);

router.get("/ads", handlegetads);

router.post("/comment/like/:id", handlelikecomment);

router.post("/block/:username", handleblockuser);

router.get("/block", handlegetBlcokedUsers);

router.post("/delete/:id", handledeletepost);

router.post("/archive/:id", handlearchivepost);

router.post("/unarchive/:id", handleunarchivepost);

router.post("/unsave/:id", handleunsavepost);

router.get("/getchannel/:channelName", handlegetchannel);

router.get("/getchannelposts", getChannelPosts);

router.get("/edit_channel", handleGetEditChannel);

router.post("/updateChannelDetails", updateChannelProfile);

router.get("/getAllChannelPosts", getAllChannelPosts);

router.get("/channelPost/:id", getSingleChannelPost);

router.post("/channel/like", likeChannelPost);

router.post("/channel/save", saveChannelPost);

router.post("/channel/comment", commentOnChannelPost);

router.get("/channel/comment/replies/:commentId", getChannelCommentReplies);

router.post("/follow_channel/:channelName", followChannel);

router.post("/unfollow_channel/:channelName", unfollowChannel);

router.post("/channel/archive/:postId", archivePost);

router.post("/channel/unarchive/:postId", unarchivePost);

router.delete("/channel/delete/:postId", deletePost);
router.get("/channel/settings", getChannelSettings);
router.post("/channel/deactivate", deactivateChannel);
router.delete("/channel/delete-account", deleteChannelAccount);

router.post("/connect/follow", followEntity);

router.post("/connect/unfollow", unfollowEntity);

router.use("/home", homeRouter);

router.get("/profile/getbasic/:username", handlegetBasicDetails);

router.get("/profile/sensitive/:username", handlegetsensitive);

router.get("/isfriend/:username", handleisfriend);

router.post("/checkParentPassword", handleCheckParentalPass);

router.get("/kidshome", getKidsHomePosts);

router.get("/getCoins", getCoins);
router.post("/games/reward", claimGamePlayReward);

router.post("/kids/change-password", handlechangepassKids);

router.post("/kids/change-parental-password", handlechangeparentalpass);

router.get("/kids/time-control", handlegetkidsTime);

router.post("/kids/time-control", handlesetkidsTime);

router.post("/kids/deactivate", handledeactivateKid);

router.get("/reels", getReelsFeed);

router.post("/likereel", likeReel);

router.post("/unlikereel", unlikeReel);

router.post("/savereel", saveReel);

router.post("/unsavereel", unsaveReel);

router.post("/commentreel", commentReel);

router.post("/replyreel", replyReel);

router.get("/reelcomments/:id", getReelComments);

export default router;
