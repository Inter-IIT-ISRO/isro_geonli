import express from "express";
import isAuthenticated from "../middlewares/auth.js";
import { createUser, deleteUser, getUsers, updateRole, updateWhitelist } from "../controllers/admin.js";

const router = express.Router();

router.post("/create-user", isAuthenticated, createUser);
router.get("/get-users", isAuthenticated, getUsers);
router.patch("/update-role", isAuthenticated, updateRole);
router.delete("/delete-user", isAuthenticated, deleteUser);
router.patch("/update-whitelist", isAuthenticated, updateWhitelist);

export default router;
