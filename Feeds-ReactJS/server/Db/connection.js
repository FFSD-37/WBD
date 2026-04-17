import mongoose from "mongoose";

async function connectToMongo() {
    try {
        await mongoose.connect(`mongodb+srv://ffsdteam37:${process.env.MONGOPASS}@cluster0.hlq20.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`);
    } catch (err) {
        console.log(err);
    }
}

export default connectToMongo;