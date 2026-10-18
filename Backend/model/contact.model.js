import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        require:true
    },
    phone:{
        type: String,
        enum: ["buyer" , "seller"],
        require: true
    },
    message: {
        type: String,
        require:true
    }
},{
    timestamps: true
});

const contact = mongoose.model("Contact" , contactSchema);

export default contact;