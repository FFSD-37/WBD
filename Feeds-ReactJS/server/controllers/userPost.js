import { verify_JWTtoken } from "cookie-string-parser";
import Post from "../models/postSchema.js";
import User from "../models/users_schema.js";
import channelPost from "../models/channelPost.js";
import Notification from "../models/notification_schema.js";
import { rewardUserByUsername } from "../services/coinRewards.js";

const handlePostupload=async(req,res)=>{
    try {
    const authorDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
    
    if(!authorDetails) return res.status(401).json({ err: "Unauthorized" });
    if(!req.body.title || !req.body.url || !req.body.content) return res.status(400).json({ err: "All fields are required" });

    const id=`${authorDetails.data[0]}-${Date.now()}`

    await User.updateOne({ username: authorDetails.data[0] }, { $push: { postIds: id } });
    await Post.insertOne({
        id,
        title:req.body.title,
        url:req.body.url,
        type:req.body.type,
        content:req.body.content,
        author:authorDetails.data[0],
        avatarUrl:authorDetails.data[2]
    });

    return res.status(200).json({ msg: "Post uploaded successfully" });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: error.message });
    }
};


const handlePostDelete = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ err: "Post ID is required" });
        }

        const authorDetails = verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!authorDetails||authorDetails.data[0]!==id.split("-")[0]) return res.status(401).json({ err: "Unauthorized" });

        await User.updateOne({ username: authorDetails.data[0] }, { $pull: { postIds: id } });
        const deletedPost = await Post.deleteOne({ id });

        if (deletedPost.deletedCount === 0) {
            return res.status(404).json({ err: "Post not found" });
        }

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: error.message });
    }
};

const handleGetpost=async(req,res)=>{
    try{
    const {id}=req.params;
    if(!id) return res.status(400).json({ err: "Post ID is required" });
    const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
    if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
    const userType=userDetails.data[3];
    
    const postDetails=await Post.findOne({
        id
    });

    if(!postDetails) return res.status(404).json({ err: "Post not found" });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }

}

const suggestedPost=async(req,res)=>{
    try{
        const createdAt=req.query.createdAt || new Date();

        const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
        const userType=userDetails.data[3];
        
        let posts = await (
            userType === "Kids"
              ? channelPost.find({ createdAt: { $lt: createdAt } })
              : Post.find({ createdAt: { $lt: createdAt } })
          )
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        if (!posts) return res.status(404).json({ err: "Post not found" });

        const user=await User.findOne({username:userDetails.data[0]}).lean();
        posts=posts.map((post)=>{
        
            if(user.likedPostsIds?.includes(post.id)){
                post={...post,liked:true};
                // console.log('post',post);                
            }
            if(user.savedPostsIds?.includes(post.id)){
                post={...post,saved:true};
            }
            return post;
        })

        if(!posts) return res.status(404).json({ err: "Post not found" });
        
        return res.json({posts})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }
}

const suggestedReels=async(req,res)=>{
    try{
        const createdAt=req.query.createdAt || new Date();

        const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
        const userType=userDetails.data[3];
        const posts=await Post.find({
            type:"Reels",
            createdAt: { $lt: createdAt },
        }).sort({createdAt:-1}).limit(5);
        if(!posts) return res.status(404).json({ err: "Post not found" });
        return res.json({posts})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }
}

const handleLikePost=async(req,res)=>{
    try{
        const {id}=req.params;
        // console.log(id);
        if(!id) return res.status(400).json({ err: "Post ID is required" });
        const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
        const userType=userDetails.data[3];
        const username = userDetails.data[0];
        let shouldRewardEngagement = false;

        let user=await User.findOne({username});
        let isUserliked=user.likedPostsIds.find((postId)=>postId===id);
        if(isUserliked){
            // Unlike
            user.likedPostsIds=user.likedPostsIds.filter((postId)=>postId!==id);
            await Post.findOneAndUpdate({id},{
                $inc:{likes:-1}
            })
        }
        else{
            // Like
            user.likedPostsIds.push(id);
            await Post.findOneAndUpdate({id},{
                $inc:{likes:1}
            })
            shouldRewardEngagement = userType !== "Kids";
            
            // Get post author to send notification
            const post = await Post.findOne({id});
            if (post && post.author && post.author !== username) {
                await Notification.create({
                    mainUser: post.author,
                    mainUserType: "Normal",
                    msgSerial: 3, // Normal user likes a normal post
                    userInvolved: username,
                });
                await User.findOneAndUpdate(
                    { username: post.author },
                    { $inc: { coins: 1 } }
                );
            }
        }

        await user.save();
        if (shouldRewardEngagement) {
            await rewardUserByUsername(username, {
                activity: "engagement"
            });
        }
        return res.json({success:true})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }
}

const handleSavePost=async(req,res)=>{
    try{
        const {id}=req.params;
        if(!id) return res.status(400).json({ err: "Post ID is required" });
        const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
        const userType=userDetails.data[3];

        const post=await Post.findOne({id});
        if(!post) return res.status(404).json({ err: "Post not found" });

        let user=await User.findOne({username:userDetails.data[0]});
        const isUserSaved = user.savedPostsIds?.includes(id);

        user.savedPostsIds = isUserSaved
          ? user.savedPostsIds.filter(postId => postId !== id)
          : [...(user.savedPostsIds || []), id];

        await user.save();
        if (!isUserSaved && userType !== "Kids") {
          await rewardUserByUsername(userDetails.data[0], {
            activity: "engagement"
          });
        }
        return res.json({success:true})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }
}

async function getAuthorAvatar(username){
    const u = await User.findOne({username: username});
    return u?.profilePicture || process.env.DEFAULT_USER_IMG;
}

const suggestedPost2 = async (req, res) => {
    try{
        const createdAt=req.query.createdAt || new Date();

        const userDetails=verify_JWTtoken(req.cookies.uuid, process.env.USER_SECRET);
        if(!userDetails) return res.status(401).json({ err: "Unauthorized" });
        const userType=userDetails.data[3];
        
        let posts = await (
            userType === "Kids"
              ? channelPost.find({ createdAt: { $lt: createdAt } })
              : Post.find({ createdAt: { $lt: createdAt } })
          )
            .sort({ createdAt: -1 })
            .lean();

        if (!posts) return res.status(404).json({ err: "Post not found" });

        const user=await User.findOne({username:userDetails.data[0]}).lean();
        posts = await Promise.all(
            posts.map(async (post) => {
              if (user.likedPostsIds?.includes(post.id.toString())) {
                post.liked = true;
              }
              else{
                post.liked = false;
              }
      
              if (user.savedPostsIds?.includes(post.id.toString())) {
                post.saved = true;
              }
              else {
                post.saved = false;
              }
      
              post.authorAvatar = await getAuthorAvatar(post.author);
      
              return post;
            })
          );
        if(!posts) return res.status(404).json({ err: "Post not found" });
        
        return res.json({success:true, posts})
    }
    catch(error){
        console.log(error);
        return res.status(500).json({err:error.message})
    }
}

export {
    handlePostupload,
    handlePostDelete,
    handleGetpost,
    suggestedPost,
    suggestedReels,
    handleLikePost,
    handleSavePost,
    suggestedPost2,
};
