import Story from "../models/storiesSchema.js";
import User from "../models/users_schema.js";

const handlegetstories = async(req, res) => {
    try{
    const { data } = req.userDetails;
    const user = await User.findOne({ username: data[0] });

    let friends = user.followings.filter(f => user.followers.some(fr => fr.username === f.username));
    
    friends = await User
        .find({ username: { $in: friends.map(f => f.username) } })
        .select('username profilePicture -_id')
        .lean()
        .then(docs =>
            docs.map(({ username, profilePicture }) => ({
                username,
                avatarUrl: profilePicture
            }))
        );
    const story=await Story.find({
        username:{ $in: friends.map(f => f.username) },
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({createdAt:-1}).lean();
    const mapFrient_story=story.map((s)=>({...s,avatarUrl:friends.find(f=>f.username===s.username).avatarUrl}));
    return res.json({success: true, allStories: mapFrient_story});
    // return res.render("stories", { img: data[2], currUser: data[0],  stories:mapFrient_story});
    }catch(err){
        console.log(err);
        return res.status(500).json({err:err.message})
    }
}

export {
    handlegetstories
}