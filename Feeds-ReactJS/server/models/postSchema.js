import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },

    type:{
        type:String,
        enum:['Reels','Img'],
        required:true
    },

    url: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: [true,'Author is required']
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    ispublic: {
        type: Boolean,
        default: true
    },
    warnings: {
        type: Number,
        default: 0
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }]
}, { timestamps: true });

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ type: 1, isArchived: 1, ispublic: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
