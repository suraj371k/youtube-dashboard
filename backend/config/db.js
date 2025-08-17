import mongoose from "mongoose";

const connectDb = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("MongoDB connection successful");
	} catch (error) {
		console.error("MongoDB connection error:", error.message);
	}
};

export default connectDb;
