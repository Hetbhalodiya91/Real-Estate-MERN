import User from "../model/userModel.js";
import { uploadToCloudinary } from "../util/uploadToCloudinary.js"

// get profile

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// get public profile

export const getPublicProfile = async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select(
      "name profilePic role createdAt",
    );
    

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// update a profile
export const updateProfile = async (req, res) => {
    try {
        const { name, phone, address, removeProfilePic } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if(req.file){
            const result = await uploadToCloudinary(req.file.buffer , "profiles");
            user.profilePic = result.secure_url;
        }else if(removeProfilePic === "true"){
                user.profilePic = null;
        }

        if(name != undefined) user.name = name;
        if(phone != undefined) user.phone = phone;
        if(address != undefined) user.address = address;

        const Updateduser = await user.save();

        res.status(200).json({
          success : true,
          Updateduser
        });

    } catch (error) {
        res.status(500).json({
          success : false,
          message :  `Details are not updated`
        });
    }
};

