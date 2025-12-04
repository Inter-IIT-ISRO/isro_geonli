import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import ErrorHandler from "../middlewares/error.js";
import { tryCatch } from "../utils/utils.js";
import { sendCookie } from "../utils/sendCookie.js";

export const signup = tryCatch(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isWhitelisted) return next(new ErrorHandler("Please contact your admin", 400));

    if (user.password) {
        return next(new ErrorHandler("User already exists", 409));
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();
    sendCookie(user, res, "You have signed up successfully", 201);
});

export const login = tryCatch(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new ErrorHandler("User does not exist", 404));

    if (!user.isWhitelisted) {
        return next(new ErrorHandler("Please contact your admin", 400));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ErrorHandler("Invalid email or password"));
    sendCookie(user, res, `Welcome back!`, 200);
});

export const logout = async (req, res, next) => {
    try {
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            sameSite: "lax",
            secure: false
        })
        res.status(200).json("Logged out successfully");
    } catch (error) {
        next(error);
    }
}

export const getMe = tryCatch(async (req, res, next) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return next(new ErrorHandler("User not found", 404));
    }
    res.status(200).json({
        email: user.email,
        role: user.role,
        isWhitelisted: user.isWhitelisted
    });
});
