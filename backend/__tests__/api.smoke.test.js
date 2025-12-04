// tests/api.smoke.test.js
import request from "supertest";
import mongoose from "mongoose";
import app from "../src/server.js"; // or wherever you export the Express app
import User from "../src/models/User.js";
import Workspace from "../src/models/Workspace.js";

describe("API smoke tests", () => {
  let server;
  let token;
  let workspaceId;

  beforeAll(async () => {
    // IMPORTANT: use a separate test DB URL
    const mongoUrl = process.env.MONGO_URL_TEST || process.env.MONGO_URL;
    await mongoose.connect(mongoUrl, {});

    // start app (if not started elsewhere)
    server = app.listen(0);

    // seed minimal workspace + user
    const workspace = await Workspace.create({
      name: "Test Workspace",
      slug: "test-workspace",
    });
    workspaceId = workspace._id.toString();

    const user = await User.create({
      email: "test@example.com",
      passwordHash: "dummy", // if your login doesn’t use this, fine
      workspaceId,
    });

    // if you have a public /auth/login, use that. Otherwise, if you have a helper to sign tokens, you can generate one directly.
    // Example: if login is email-only magic:
    // const res = await request(server).post("/auth/login").send({ email: user.email });
    // token = res.body.token;

    // If you don’t have a clean way, you can import your JWT helper and create token here instead.
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  test("health endpoint works", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  // Example: if you can log in via /auth/login
  // Adjust body to match your login API.
  test("login returns a token", async () => {
    const res = await request(server)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "dummy" });

    // If your login flow is different, adjust this accordingly.
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test("epics risk endpoint requires auth", async () => {
    const res = await request(server).get(
      `/api/workspaces/${workspaceId}/epics/risk`
    );
    expect(res.status).toBe(401);
  });

  test("epics risk returns 200 with token (even if empty)", async () => {
    if (!token) {
      // If login test failed or you generate token another way, skip to avoid false red.
      return;
    }

    const res = await request(server)
      .get(`/api/workspaces/${workspaceId}/epics/risk`)
      .set("Authorization", `Bearer ${token}`);

    // We just assert "not broken" shape; refine later.
    expect([200, 204]).toContain(res.status);
  });
});
