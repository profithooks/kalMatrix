import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { z } from "zod";
import { logError } from "../utils/logger.js";

const signupSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
});

export const signup = async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { name, email, password } = parsed.data;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Create workspace
    const workspace = await Workspace.create({
      name: `${name}'s Workspace`,
    });

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      workspaceId: workspace._id,
    });

    const token = jwt.sign(
      { userId: user._id, workspaceId: workspace._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId,
      },
    });
  } catch (err) {
    logError("signup error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, workspaceId: user.workspaceId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        workspaceId: user.workspaceId,
      },
    });
  } catch (err) {
    logError("login error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};
