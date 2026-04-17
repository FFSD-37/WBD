import Post from "../../models/postSchema.js";
import channelPost from "../../models/channelPost.js";
import User from "../../models/users_schema.js";
import Channel from "../../models/channelSchema.js";
import ChannelComment from "../../models/channelPost_comment.js";
import Comment from "../../models/comment_schema.js";
import Notification from "../../models/notification_schema.js";
import { rewardUserByUsername } from "../../services/coinRewards.js";

// NORMAL POST → use post.id
// CHANNEL POST → use post._id
function getStoreId(post, postType) {
    return postType === "channel"
        ? post._id.toString()
        : post.id; 
}

// markLikedSaved() fixed for correct ID matching
function markLikedSaved(reels, actor, forceType = null) {
    const liked = actor.likedPostsIds?.map(String) || [];
    const saved = actor.savedPostsIds?.map(String) || [];

    return reels.map(r => {
        const type = r.postType || forceType || "normal";

        const idToMatch = type === "channel"
            ? r._id.toString()
            : r.id;

        return {
            ...r,
            postType: type,
            _liked: liked.includes(idToMatch),
            _saved: saved.includes(idToMatch)
        };
    });
}

// GET FEED WITH PAGINATION
const getReelsFeed = async (req, res) => {
    try {
        const username = req.userDetails.data[0];
        const userType = req.userDetails.data[3];

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        // ACTOR
        const actor =
            userType === "Channel"
                ? await Channel.findOne({ channelName: username }).lean()
                : await User.findOne({ username }).lean();

        if (!actor) return res.json({ success: false, message: "User not found" });

        // ---------------- KIDS ----------------
        if (actor.type === "Kids") {
            let reels = await channelPost
                .find({
                    type: "Reels",
                    isArchived: false,
                    category: { $in: actor.kidPreferredCategories }
                })
                .sort({ createdAt: -1 })
                .lean();

            reels = markLikedSaved(reels, actor, "channel");

            return res.json({
                success: true,
                reels: reels.slice(skip, skip + limit),
                hasMore: skip + limit < reels.length
            });
        }

        // ---------------- CHANNEL LOGIN ----------------
        if (userType === "Channel") {
            const own = actor.channelName || [];

            let reels = await channelPost
                .find({
                    type: "Reels",
                    isArchived: false,
                    channel: { $nin: own }
                })
                .sort({ createdAt: -1 })
                .lean();

            reels = markLikedSaved(reels, actor, "channel");

            return res.json({
                success: true,
                reels: reels.slice(skip, skip + limit),
                hasMore: skip + limit < reels.length
            });
        }

        // ---------------- NORMAL USER FEED ----------------
        const followedChannels = actor.channelFollowings.map(c => c.channelName);
        const followedUsers = actor.followings.map(f => f.username);

        const chReels = await channelPost
            .find({
                type: "Reels",
                isArchived: false,
                channel: { $in: followedChannels }
            })
            .lean();

        const pubReels = await Post.find({
            type: "Reels",
            isArchived: false,
            ispublic: true
        }).lean();

        const privReels = await Post.find({
            type: "Reels",
            isArchived: false,
            ispublic: false,
            author: { $in: followedUsers }
        }).lean();

        let combined = [
            ...chReels.map(r => ({ ...r, postType: "channel" })),
            ...pubReels.map(r => ({ ...r, postType: "normal" })),
            ...privReels.map(r => ({ ...r, postType: "normal" }))
        ];

        // Remove duplicates
        const seen = new Set();
        combined = combined.filter(r => {
            const id = r._id.toString();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        combined = markLikedSaved(combined, actor);

        return res.json({
            success: true,
            reels: combined.slice(skip, skip + limit),
            hasMore: skip + limit < combined.length
        });

    } catch (err) {
        console.log("FEED ERROR:", err);
        return res.status(500).json({ success: false });
    }
};

// LIKE
const likeReel = async (req, res) => {
    try {
        const { postId, postType } = req.body;
        const username = req.userDetails.data[0];
        const userType = req.userDetails.data[3];

        const postModel = postType === "channel" ? channelPost : Post;
        const post = await postModel.findById(postId);

        if (!post) return res.json({ success: false, message: "Not found" });

        const storeId = getStoreId(post, postType);

        if (userType === "Channel") {
            const channel = await Channel.findOne({ channelName: username });
            if (channel.likedPostsIds.includes(storeId))
                return res.json({ success: false, message: "Already liked" });

            post.likes++;
            await post.save();

            await Channel.updateOne(
                { channelName: username },
                { $addToSet: { likedPostsIds: storeId } }
            );

            // Notification for channel post like
            if (postType === "channel" && post.channel && post.channel !== username) {
                await Notification.create({
                    mainUser: post.channel,
                    mainUserType: "Channel",
                    msgSerial: 13, // Channel likes a channel-post
                    userInvolved: username,
                });
            }

        } else {
            const user = await User.findOne({ username });
            if (user.likedPostsIds.includes(storeId))
                return res.json({ success: false, message: "Already liked" });

            post.likes++;
            await post.save();

            await User.updateOne(
                { username },
                { $addToSet: { likedPostsIds: storeId } }
            );

            if (userType !== "Kids") {
                await rewardUserByUsername(username, {
                    activity: "engagement"
                });
            }

            // Notification for post like
            if (postType === "channel") {
                // Normal/kids user likes a channel-post
                if (post.channel && post.channel !== username) {
                    await Notification.create({
                        mainUser: post.channel,
                        mainUserType: "Channel",
                        msgSerial: 11, // Normal/kids user likes a channel-post
                        userInvolved: username,
                    });
                }
            } else {
                // Normal user likes a normal post
                if (post.author && post.author !== username) {
                    await Notification.create({
                        mainUser: post.author,
                        mainUserType: "Normal",
                        msgSerial: 3, // Normal user likes a normal post
                        userInvolved: username,
                    });
                }
            }
        }

        res.json({ success: true, likes: post.likes });

    } catch (err) {
        console.log("LIKE ERROR:", err);
        res.status(500).json({ success: false });
    }
};

// UNLIKE
const unlikeReel = async (req, res) => {
    try {
        const { postId, postType } = req.body;
        const username = req.userDetails.data[0];
        const userType = req.userDetails.data[3];

        const postModel = postType === "channel" ? channelPost : Post;
        const post = await postModel.findById(postId);
        if (!post) return res.json({ success: false });

        const storeId = getStoreId(post, postType);

        if (userType === "Channel") {
            const channel = await Channel.findOne({ channelName: username });
            if (!channel.likedPostsIds.includes(storeId))
                return res.json({ success: false, message: "Not liked" });

            post.likes = Math.max(0, post.likes - 1);
            await post.save();

            await Channel.updateOne(
                { channelName: username },
                { $pull: { likedPostsIds: storeId } }
            );

        } else {
            const user = await User.findOne({ username });
            if (!user.likedPostsIds.includes(storeId))
                return res.json({ success: false, message: "Not liked" });

            post.likes = Math.max(0, post.likes - 1);
            await post.save();

            await User.updateOne(
                { username },
                { $pull: { likedPostsIds: storeId } }
            );
        }

        res.json({ success: true, likes: post.likes });

    } catch (err) {
        console.log("UNLIKE ERROR:", err);
        res.status(500).json({ success: false });
    }
};

// SAVE / UNSAVE
const saveReel = async (req, res) => {
    try {
        const { postId, postType } = req.body;
        const username = req.userDetails.data[0];
        const userType = req.userDetails.data[3];

        const postModel = postType === "channel" ? channelPost : Post;
        const post = await postModel.findById(postId);

        const storeId = getStoreId(post, postType);

        if (userType === "Channel") {
            await Channel.updateOne(
                { channelName: username },
                { $addToSet: { savedPostsIds: storeId } }
            );
        } else {
            await User.updateOne(
                { username },
                { $addToSet: { savedPostsIds: storeId } }
            );

            if (userType !== "Kids") {
                await rewardUserByUsername(username, {
                    activity: "engagement"
                });
            }
        }

        res.json({ success: true, saved: true });

    } catch (err) {
        console.log("SAVE ERROR:", err);
        res.status(500).json({ success: false });
    }
};

const unsaveReel = async (req, res) => {
    try {
        const { postId, postType } = req.body;
        const username = req.userDetails.data[0];
        const userType = req.userDetails.data[3];

        const postModel = postType === "channel" ? channelPost : Post;
        const post = await postModel.findById(postId);

        const storeId = getStoreId(post, postType);

        if (userType === "Channel") {
            await Channel.updateOne(
                { channelName: username },
                { $pull: { savedPostsIds: storeId } }
            );
        } else {
            await User.updateOne(
                { username },
                { $pull: { savedPostsIds: storeId } }
            );
        }

        res.json({ success: true, saved: false });

    } catch (err) {
        console.log("UNSAVE ERROR:", err);
        res.status(500).json({ success: false });
    }
};

// COMMENT
const commentReel = async (req, res) => {
    try {
        const { postId, postType, text } = req.body;
        if (!text.trim()) return res.json({ success: false });

        const user = req.userDetails.data;
        const username = user[0];
        const avatarUrl = user[2];
        const type = user[3];

        if (postType === "channel") {
            const comment = await ChannelComment.create({
                postId,
                name: username,
                avatarUrl,
                type,
                text,
            });

            const post = await channelPost.findById(postId);
            await channelPost.findByIdAndUpdate(postId, {
                $push: { comments: comment._id }
            });

            // Notification for channel post comment
            if (post && post.channel && post.channel !== username) {
                if (type === "Channel") {
                    await Notification.create({
                        mainUser: post.channel,
                        mainUserType: "Channel",
                        msgSerial: 16, // Channel comments on channel-post
                        userInvolved: username,
                    });
                } else {
                    await Notification.create({
                        mainUser: post.channel,
                        mainUserType: "Channel",
                        msgSerial: 15, // Normal/kids user comments on channel-post
                        userInvolved: username,
                    });
                }
            }

            if (type !== "Channel" && type !== "Kids") {
                await rewardUserByUsername(username, {
                    activity: "engagement"
                });
            }

            return res.json({ success: true, comment });
        }

        const post = await Post.findById(postId);
        const comment = await Comment.create({
            id: postId,
            username,
            avatarUrl,
            text,
        });

        await Post.findByIdAndUpdate(postId, { $push: { comments: comment._id } });

        // Notification for normal post comment
        if (post && post.author && post.author !== username) {
            await Notification.create({
                mainUser: post.author,
                mainUserType: "Normal",
                msgSerial: 8, // Normal user comments on normal posts
                userInvolved: username,
            });
        }

        if (type !== "Channel" && type !== "Kids") {
            await rewardUserByUsername(username, {
                activity: "engagement"
            });
        }

        return res.json({ success: true, comment });

    } catch (err) {
        console.log("COMMENT ERROR:", err);
        res.status(500).json({ success: false });
    }
};

// REPLY
const replyReel = async (req, res) => {
    try {
        const { parentCommentId, postType, text } = req.body;

        const user = req.userDetails.data;
        const username = user[0];
        const avatarUrl = user[2];
        const type = user[3];

        if (postType === "channel") {
            const parent = await ChannelComment.findById(parentCommentId);
            if (!parent) return res.json({ success: false });

            const reply = await ChannelComment.create({
                postId: parent.postId,
                parentCommentId,
                name: username,
                avatarUrl,
                type,
                text,
            });

            if (type !== "Channel" && type !== "Kids") {
                await rewardUserByUsername(username, {
                    activity: "engagement"
                });
            }

            await parent.updateOne({ $push: { replies: reply._id } });

            return res.json({ success: true, reply });
        }

        const parent = await Comment.findById(parentCommentId);
        if (!parent) return res.json({ success: false });

        const reply = await Comment.create({
            id: parent.id,
            parentCommntID: parentCommentId,
            username,
            avatarUrl,
            text,
        });

        if (type !== "Channel" && type !== "Kids") {
            await rewardUserByUsername(username, {
                activity: "engagement"
            });
        }

        await parent.updateOne({ $push: { reply_array: reply._id } });

        return res.json({ success: true, reply });

    } catch (err) {
        console.log("REPLY ERROR:", err);
        res.status(500).json({ success: false });
    }
};

// GET COMMENTS
const getReelComments = async (req, res) => {
    try {
        const postId = req.params.id;
        const postType = req.query.postType;

        if (postType === "channel") {
            const comments = await ChannelComment.find({
                postId,
                parentCommentId: null
            })
                .populate("replies")
                .sort({ createdAt: -1 });

            return res.json({ success: true, comments });
        }

        const post = await Post.findById(postId).lean();
        if (!post) return res.json({ success: false, message: "Post not found" });

        const rootIds = post.comments || [];

        const comments = await Comment.find({
            _id: { $in: rootIds },
            parentCommntID: null
        })
            .populate("reply_array")
            .sort({ createdAt: -1 });

        return res.json({ success: true, comments });

    } catch (err) {
        console.log("GET COMMENTS ERROR:", err);
        res.status(500).json({ success: false });
    }
};

export {
    getReelsFeed,
    likeReel,
    unlikeReel,
    saveReel,
    unsaveReel,
    commentReel,
    replyReel,
    getReelComments,
};
