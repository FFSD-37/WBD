import express from "express";
import { isAuthuser } from "../middleware/isAuthuser.js";
import{
    create_channel
} from "../controllers/channel.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthuser);

router.post('/',create_channel);

export default router;