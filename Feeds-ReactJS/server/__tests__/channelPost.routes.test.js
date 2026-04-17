import request from "supertest";
import { jest } from "@jest/globals";
import { createTestApp } from "./helpers/createTestApp.js";

const authGate = jest.fn((req, res, next) => {
  if (req.headers.authorization === "Bearer valid-token") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized Access" });
});

const handlechannelPostupload = jest.fn((req, res) => {
  if (!req.body?.content) {
    return res.status(400).json({ success: false, message: "content is required" });
  }
  return res.status(201).json({ success: true });
});

const handleGetcategories = jest.fn((req, res) => {
  return res.status(200).json({ success: true, categories: ["news", "sports"] });
});

await jest.unstable_mockModule("../middleware/isAuthuser.js", () => ({
  isAuthuser: (req, res, next) => authGate(req, res, next),
}));
await jest.unstable_mockModule("../controllers/channelPost.js", () => ({
  handlechannelPostupload,
  handleGetcategories,
}));

const { default: channelPostRouter } = await import("../routes/channelPost.js");
const app = createTestApp({ mountPath: "/channel", router: channelPostRouter });

describe("Channel post routes", () => {
  it("returns 200 for GET /channel/categories with token", async () => {
    const response = await request(app)
      .get("/channel/categories")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
  });

  it("returns 201 for POST /channel/post with valid payload", async () => {
    const response = await request(app)
      .post("/channel/post")
      .set("Authorization", "Bearer valid-token")
      .send({ content: "new channel post" });

    expect(response.status).toBe(201);
  });

  it("returns 400 for POST /channel/post invalid payload", async () => {
    const response = await request(app)
      .post("/channel/post")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 401 for /channel/categories without token", async () => {
    const response = await request(app).get("/channel/categories");
    expect(response.status).toBe(401);
  });

  it("returns 500 when category fetch fails", async () => {
    handleGetcategories.mockImplementationOnce(() => {
      throw new Error("category query failed");
    });

    const response = await request(app)
      .get("/channel/categories")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(500);
  });

  it("returns 404 for unknown channel route", async () => {
    const response = await request(app)
      .get("/channel/missing")
      .set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(404);
  });
});
