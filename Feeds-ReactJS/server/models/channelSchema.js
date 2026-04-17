import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
    channelName: {
        type: String,
        required: true,
        unique: [true, "Channel name already exists"],
        trim: true
    },

    channelDescription: {
        type: String,
        required: true
    },

    channelCategory: {
        type: [String],
        required: true,
        validate: {
            validator: function (categories) {
                const validOptions = [
                    "All",
                    "Entertainment",
                    "Comedy",
                    "Education",
                    "Science",
                    "Tech",
                    "Gaming",
                    "Animations",
                    "Memes",
                    "Music",
                    "Sports",
                    "Fitness",
                    "Lifestyle",
                    "Fashion",
                    "Beauty",
                    "Food",
                    "Travel",
                    "Vlog",
                    "Nature",
                    "DIY",
                    "Art",
                    "Photography",
                    "Business",
                    "Finance",
                    "Marketing",
                    "News",
                    "Movies",
                    "Pets",
                    "Automotive"
                ];
                return categories.every(cat => validOptions.includes(cat));
            },
            message: "Invalid category found in the list"
        }
    },

    channelLogo: {
        type: String,
        default: process.env.DEFAULT_USER_IMG
    },

    channelPassword: {
        type: String,
        required: true
    },

    channelAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    links: [{
        type: String
    }],

    channelMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    isDeactivated: {
        type: Boolean,
        default: false
    },

    socketId: {
        type: String,
        default: null
    },

    archivedPostsIds: [{
        type: String
    }],

    likedPostsIds: [{
        type: String
    }],

    savedPostsIds: [{
        type: String
    }],

    postIds: [{
        type: String
    }],

    channelSettings: {
        allowProfileSharing: {
            type: Boolean,
            default: true
        },
        supportEmail: {
            type: String,
            default: ""
        },
        supportPhone: {
            type: String,
            default: ""
        },
        supportUrl: {
            type: String,
            default: ""
        }
    }
}, { timestamps: true });

channelSchema.index({ channelCategory: 1, isDeactivated: 1 });

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;
