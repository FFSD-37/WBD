import express from 'express';
import {createNotification} from '../controllers/notification.js';
import { isAuthuser } from '../middleware/isAuthuser.js';

const router=express.Router();

// All routes require authentication
router.use(isAuthuser);

router.post('/',createNotification);

export default router;