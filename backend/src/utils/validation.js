// src/utils/validation.js
import mongoose from "mongoose";

export function isValidObjectId(value) {
  if (!value) return false;
  return mongoose.Types.ObjectId.isValid(value);
}
