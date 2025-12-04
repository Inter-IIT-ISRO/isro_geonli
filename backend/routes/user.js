import express from "express";
import { login, logout, signup, getMe } from "../controllers/auth.js";
import isAuthenticated from "../middlewares/auth.js";

const router = express.Router();
router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", isAuthenticated, getMe);

export default router;
