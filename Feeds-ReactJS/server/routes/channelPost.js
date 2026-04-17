import express from "express";
import {
  handlechannelPostupload,
  handleGetcategories,
} from "../controllers/channelPost.js";
import { isAuthuser } from "../middleware/isAuthuser.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthuser);

router.post("/post", handlechannelPostupload);
router.get("/categories", handleGetcategories);

export default router;
