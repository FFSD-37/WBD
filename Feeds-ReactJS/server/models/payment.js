import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  status:{
    type: String,
    required: true
  },
  reference_id: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  }
}, {timestamps: true});

paymentSchema.index({ reference_id: 1 }, { unique: true });
paymentSchema.index({ username: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
