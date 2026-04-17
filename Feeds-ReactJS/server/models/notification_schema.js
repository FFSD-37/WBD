import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    mainUser: {
        type: String,
        required: true
    },

    mainUserType: {
        type: String,
        enum: ["Kids", "Normal", "Channel"],
        default: 'Normal'
    },

    msgSerial: {
        type: Number,
        required: true
    },
    userInvolved: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index({ mainUser: 1, createdAt: -1 });
notificationSchema.index({ mainUser: 1, seen: 1 });
notificationSchema.index({ mainUser: 1, msgSerial: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
