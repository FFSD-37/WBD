import request from "supertest";
import { jest } from "@jest/globals";
import { createTestApp } from "./helpers/createTestApp.js";

const authGate = jest.fn((req, res, next) => {
  if (req.headers.authorization === "Bearer valid-token") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized Access" });
});

const create_channel = jest.fn((req, res) => {
  if (!req.body?.channelName) {
    return res.status(400).json({ success: false, message: "channelName is required" });
  }
  return res.status(201).json({ success: true, channelName: req.body.channelName });
});

await jest.unstable_mockModule("../middleware/isAuthuser.js", () => ({
  isAuthuser: (req, res, next) => authGate(req, res, next),
}));
await jest.unstable_mockModule("../controllers/channel.js", () => ({
  create_channel,
}));

const { default: channelRouter } = await import("../routes/channel.js");
const app = createTestApp({ mountPath: "/channel-auth", router: channelRouter });

describe("Channel routes", () => {
  it("returns 201 for POST /channel-auth with valid token and payload", async () => {
    const response = await request(app)
      .post("/channel-auth")
      .set("Authorization", "Bearer valid-token")
      .send({ channelName: "TechTalks" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("returns 400 for invalid channel payload", async () => {
    const response = await request(app)
      .post("/channel-auth")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 401 for missing token", async () => {
    const response = await request(app).post("/channel-auth").send({ channelName: "NoAuth" });
    expect(response.status).toBe(401);
  });

  it("returns 500 when create_channel throws", async () => {
    create_channel.mockImplementationOnce(() => {
      throw new Error("create channel failed");
    });

    const response = await request(app)
      .post("/channel-auth")
      .set("Authorization", "Bearer valid-token")
      .send({ channelName: "FailCase" });

    expect(response.status).toBe(500);
  });

  it("returns 404 for unknown channel endpoint", async () => {
    const response = await request(app)
      .get("/channel-auth/unknown")
      .set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(404);
  });
});
