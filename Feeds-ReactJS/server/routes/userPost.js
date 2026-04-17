import express from 'express';
import {
    handleGetpost,
    handleLikePost,
    handlePostDelete,
    handlePostupload,
    handleSavePost,
    suggestedPost,
    suggestedReels
} from '../controllers/userPost.js';
import { isAuthuser } from '../middleware/isAuthuser.js';

const router=express.Router();

// Public routes (no authentication required)
router.get('/:id',handleGetpost);
router.get('/suggestedPost/get',suggestedPost);
router.get('/suggested/reels',suggestedReels);

// Protected routes (require authentication)
router.use(isAuthuser);

router.post('/', handlePostupload);
router.delete('/:id', handlePostDelete);
router.post('/liked/:id', handleLikePost);
router.post('/saved/:id', handleSavePost);

// fake route to test error handling middleware

export default router;