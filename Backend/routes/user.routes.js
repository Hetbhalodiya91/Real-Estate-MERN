import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { getProfile, getPublicProfile, updateProfile } from '../controller/user.controller.js';
import upload from '../middleware/upload.middleware.js';

const userRoutes = express.Router();

userRoutes.get("/profile" , protect , getProfile);
userRoutes.put("/profile" , protect , upload.single("profilePic", updateProfile));
userRoutes.get("/public/:id",getPublicProfile);

export default userRoutes;