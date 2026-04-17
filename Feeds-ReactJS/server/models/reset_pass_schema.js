import mongoose from "mongoose";

const resetPasswordSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        auto: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

resetPasswordSchema.index({ email: 1 }, { unique: true });

const ResetPassword = mongoose.model("ResetPassword", resetPasswordSchema);

export default ResetPassword;
