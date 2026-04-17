import mongoose from 'mongoose';

const validChannelCategories = [
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

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },

    username: {
        type: String,
        required: true,
        unique: [true, "Username already exists"],
        trim: true
    },

    display_name: {
        type: String,
        default: function () {
            return this.fullName;
        }
    },

    email: {
        type: String,
        required: true,
        unique: [true, "Email already exists"],
        lowercase: true,
        trim: true
    },

    phone: {
        type: String,
        required: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    dob: {
        type: Date,
        required: true
    },

    visibility: {
        type: String,
        enum: ["Public", "Private"],
        default: "Public"
    },

    profilePicture: {
        type: String,
        default: process.env.DEFAULT_USER_IMG
    },

    followers: [{
        username: {
            type: String
        }
    }],

    requested: [{
        username: {
            type: String
        }
    }],

    followings: [{
        username: {
            type: String
        }
    }],

    channelFollowings: [{
        channelName: {
            type: String
        }
    }],

    blockedUsers: [{
        type: String
    }],

    bio: {
        type: String,
        trim: true
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true
    },

    termsAccepted: {
        type: Boolean,
        default: false
    },

    isPremium: {
        type: Boolean,
        default: false
    },

    coins: {
        type: Number,
        default: 0
    },

    coinRewardStats: {
        date: {
            type: String,
            default: ""
        },
        postsCreated: {
            type: Number,
            default: 0
        },
        engagements: {
            type: Number,
            default: 0
        },
        gamesPlayed: {
            type: Number,
            default: 0
        },
        chatPeers: [{
            type: String
        }]
    },

    type: {
        type: String,
        enum: ["Kids", "Normal", "Admin"],
        default: 'Normal'
    },

    links: [{
        type: String
    }],

    savedPostsIds: [{
        type: String
    }],

    likedPostsIds: [{
        type: String
    }],

    likedStoriesIds: [{
        type: String
    }],

    archivedPostsIds: [{
        type: String
    }],

    postIds: [{
        type: String
    }],

    socketId: {
        type: String,
        default: null
    },

    channelName: [{
        type: String
    }],
    parentPassword: {
        type: String,
        required: function () {
            return this.type === "Kids";
        },
        default: null
    },

    timeLimit: {
        type: Number,
        required: function () {
            return this.type === "Kids";
        },
        default: 180
    },

    timeUsed: {
        type: Number,
        required: function () {
            return this.type === "Kids";
        },
        default: 0
    },

    lastActiveDate: {
        type: String
    },

    kidPreferredCategories: {
        type: [String],
        default: [],
        validate: {
            validator: function (categories) {
                if (this.type !== "Kids") return true;
                if (!Array.isArray(categories)) return false;
                return categories.every(cat => validChannelCategories.includes(cat));
            },
            message: "Invalid category found in kidPreferredCategories"
        }
    },
}, { timestamps: true });

userSchema.index({ createdAt: -1 });

const User = mongoose.model("User", userSchema);

export default User;
