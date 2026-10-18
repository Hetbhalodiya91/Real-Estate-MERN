import jwt from 'jsonwebtoken';
import User from '../model/userModel.js';

//protect routes

export const protect = async (req, res, next) => {
    try{
        if(!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')){
            return res.status(401).json({message:"Unauthorized access"});
        }
        const token = req.headers.authorization.split(' ')[1];
        if(!token){
            return res.status(401).json({message:"token not found"});
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password');
        if(!req.user || req.user.isBlock){
            return res.status(403).json({message:"Your account is blocked. Please contact support."});
        }
        next();
    }catch(err){
        return res.status(401).json({message:"Invalid token",error:err.message});
    }
}

// role based access

export const authorize = (...roles) => async (req, res, next) => {
    if(!roles.includes(req.user.role)){
        return res.status(403).json({message:"Access denied. You do not have permission to perform this action."});
    }
    next();
}