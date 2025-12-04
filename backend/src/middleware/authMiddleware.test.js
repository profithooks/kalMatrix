// src/middleware/authMiddleware.test.js
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterAll,
} from "@jest/globals";
import jwt from "jsonwebtoken";
import { auth } from "./authMiddleware.js";

describe("auth middleware", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, JWT_SECRET: "test-secret" };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const createRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.body = body;
      return res;
    };
    return res;
  };

  test("returns 401 if authorization header is missing", () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Missing authorization header" });
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 401 if token is invalid format", () => {
    const req = { headers: { authorization: "Bearer " } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Invalid token" });
    expect(next).not.toHaveBeenCalled();
  });

  test("sets req.user and calls next for valid token", () => {
    const payload = { userId: "u123", workspaceId: "w456" };
    const token = jwt.sign(payload, process.env.JWT_SECRET);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(req.user).toEqual({
      id: "u123",
      workspaceId: "w456",
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("returns 401 if jwt.verify throws", () => {
    const req = { headers: { authorization: "Bearer invalid.token" } };
    const res = createRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});
