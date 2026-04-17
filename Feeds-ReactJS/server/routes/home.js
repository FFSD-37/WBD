import express from "express";
import { getFriends, handlegetads, handlegetComments, handlepostreply, handlecommentreport } from "../controllers/Gourav/home.js";
import { isAuthuser } from "../middleware/isAuthuser.js";
import { suggestedPost2 } from "../controllers/userPost.js"
import { getChannels } from "../controllers/Gourav/profile.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthuser);

router.get("/getFriends", getFriends);

router.get("/getAllPosts", suggestedPost2);

router.get("/ads", handlegetads);

router.post("/userpost_comments", handlegetComments);

router.post("/userpost_reply", handlepostreply);

router.post("/comment_report", handlecommentreport);

router.get("/getChannels", getChannels);

export default router;