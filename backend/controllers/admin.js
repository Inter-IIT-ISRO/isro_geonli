import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/user.js";
import { tryCatch } from "../utils/utils.js";

export const createUser = tryCatch(async (req, res, next) => {
    if (req.user.role < 2) {
        return next(new ErrorHandler("Access denied", 403));
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) return next(new ErrorHandler("User already exists", 409));

    await User.create({ email });
    res.status(201).json({ message: "User successfully created" });
})

export const getUsers = tryCatch(async (req, res, next) => {
    if (req.user.role < 2) {
        return next(new ErrorHandler("Access denied", 403));
    }

    const users = await User.find({});
    res.status(200).json(users);
})

export const updateRole = tryCatch(async (req, res, next) => {
    if (req.user.role < 2) {
        return next(new ErrorHandler("Access denied", 403));
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandler("User not found", 404));

    if (user._id.equals(req.user._id)) {
        return next(new ErrorHandler("Cannot change your own role", 400));
    }

    const { role } = req.body;
    const numericRole = Number(role);

    if (Number.isNaN(numericRole)) {
        return next(new ErrorHandler("Role must be a number", 400));
    }

    if (numericRole !== 1 && numericRole !== 2) {
        return next(new ErrorHandler("Invalid role", 400));
    }

    user.role = role;
    await user.save();
    res.status(200).json({ message: "Updated the user role successfully" });
});

export const deleteUser = tryCatch(async (req, res, next) => {
    if (req.user.role < 2) {
        return next(new ErrorHandler("Access denied", 403));
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandler("User not found", 404));

    if (user._id.equals(req.user._id)) {
        return next(new ErrorHandler("Cannot delete your own account", 400));
    }

    await user.deleteOne();
    res.status(200).json({ message: "Deleted the user successfully" });
})

export const updateWhitelist = tryCatch(async (req, res, next) => {
    if (req.user.role < 2) {
        return next(new ErrorHandler("Access denied", 403));
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return next(new ErrorHandler("User not found", 404));

    const { isWhitelisted } = req.body;
    if (typeof isWhitelisted !== "boolean") {
        return next(new ErrorHandler("isWhitelisted must be a boolean", 400));
    }

    user.isWhitelisted = isWhitelisted;
    await user.save();
    res.status(200).json({ message: `User has been ${user.isWhitelisted ? "whitelisted" : "blacklisted"} successfully` });
})
