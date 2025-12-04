// src/config/env.js
import dotenv from "dotenv";

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || "4000",

  // DB + auth – REQUIRED
  MONGO_URL: requireEnv("MONGO_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),

  // Optional but good to have typed
  CORS_ORIGINS: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
