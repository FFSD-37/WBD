import Payment from "../models/payment.js";
import User from "../models/users_schema.js"
import { instance } from "../services/razorpay.js"

const checkOut = async (req, res) => {
    try {
        const { data } = req.userDetails;
        const username = data[0];
        let order;
        let amount;
        if (req.body.plan_name === "Semi-Annualy") {
            amount = 169 * 100 * 6;
        }
        if (req.body.plan_name === "Monthly") {
            amount = 199 * 100;
        }
        if (req.body.plan_name === "Yearly") {
            amount = 149 * 100 * 12;
        }

        order = await instance.orders.create({
            amount
        })

        await Payment.create({
            id: `${username}-${Date.now()}`,
            username,
            type: req.body.plan_name,
            amount: amount/100,
            status: 'Pending',
            reference_id: order.id
        })

        return res.status(200).json({ order });
    }
    catch (error) {

        console.log(error);

    }
}

const verify_payment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        await Payment.findOneAndUpdate(
            { reference_id: razorpay_order_id },
            { status: "Completed" },
            { new: true }
        );

        const { data } = req.userDetails;
        

        await User.findOneAndUpdate(
            { username: data[0]},
            { isPremium: true },
            { new: true }
        )
    }
    catch (error) {
        return res.status(500).json({ error });
    }
}

export { checkOut, verify_payment }