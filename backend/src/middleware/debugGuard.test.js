// src/middleware/debugGuard.test.js
import { jest, describe, test, expect, afterEach } from "@jest/globals";
import { debugGuard } from "./debugGuard.js";

describe("debugGuard middleware", () => {
  const OLD_ENV = process.env;

  afterEach(() => {
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

  test("allows all requests when NODE_ENV is not production", () => {
    process.env = { ...OLD_ENV, NODE_ENV: "development" };

    const req = {};
    const res = createRes();
    const next = jest.fn();

    debugGuard(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("forbids non-admin in production", () => {
    process.env = { ...OLD_ENV, NODE_ENV: "production" };

    const req = { user: { id: "u1", role: "member" } };
    const res = createRes();
    const next = jest.fn();

    debugGuard(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      ok: false,
      error: "Forbidden: debug endpoints restricted",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("allows admin in production", () => {
    process.env = { ...OLD_ENV, NODE_ENV: "production" };

    const req = { user: { id: "u1", role: "admin" } };
    const res = createRes();
    const next = jest.fn();

    debugGuard(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
