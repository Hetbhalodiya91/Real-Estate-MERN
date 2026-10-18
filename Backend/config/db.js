import mongoose from 'mongoose';


const connectDB = async () => {
    await mongoose.connect("mongodb+srv://24ceuxg009_db_user:NQSfL5UaQEysfdBg@het.iwmm7pk.mongodb.net/?appName=Het"

    ).then(() => {
        console.log("MongoDB connected successfully");
    }).catch((err) => {
        console.error("MongoDB connection error:", err);
    });
}

export default connectDB;
