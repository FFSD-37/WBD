import User from "../../models/users_schema.js";

const updateTime = async (req, res) => {
    const timeSpent = Number(req.body.timeSpent);
    const { data } = req.userDetails;
    if (timeSpent >= 30){
        if (data[3] === "Kids"){
            await User.findOneAndUpdate({username: data[0]}, {$inc: {timeUsed: Math.floor(timeSpent/60)}}, { new:true, setDefaultsOnInsert: false });
        }
    }
    return res.status(201).json({
        msg: "User updated"
    })
}

export {
    updateTime
}