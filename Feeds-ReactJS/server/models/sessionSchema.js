import mongoose from 'mongoose'

const onlineSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  logoutAt: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const OnlineSession = mongoose.model('OnlineSession', onlineSessionSchema);

export default OnlineSession;