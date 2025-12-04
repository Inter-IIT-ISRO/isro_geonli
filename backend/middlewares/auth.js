import { User } from "../models/user.js";
import jwt from "jsonwebtoken";
import ErrorHandler from "./error.js";

const isAuthenticated = async (req,res,next) => {
    if (!req.cookies || !req.cookies.token) return next(new ErrorHandler("Please Login first", 400));

    const {token} = req.cookies;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded);
    next();
}

export const forwardAuthenticatedUser = async (req,res,next) => {
    if (req.cookies && req.cookies.token) {
        const {token} = req.cookies;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded);
    }
    next();
}

export default isAuthenticated;
