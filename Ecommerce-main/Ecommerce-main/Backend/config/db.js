import mongoose from "mongoose";
export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://siddhart7371:user1234@cluster0.ovoru.mongodb.net/Ecom').then(() => console.log("DB Connected"))
}