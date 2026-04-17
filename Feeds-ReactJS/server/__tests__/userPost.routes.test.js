import request from "supertest";
import { jest } from "@jest/globals";
import { createTestApp } from "./helpers/createTestApp.js";

const authGate = jest.fn((req, res, next) => {
  if (req.headers.authorization === "Bearer valid-token") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized Access" });
});

const controller = {
  handleGetpost: jest.fn((req, res) => res.status(200).json({ success: true, id: req.params.id })),
  handleLikePost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlePostDelete: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlePostupload: jest.fn((req, res) => {
    if (!req.body?.caption) {
      return res.status(400).json({ success: false, message: "caption is required" });
    }
    return res.status(201).json({ success: true });
  }),
  handleSavePost: jest.fn((req, res) => res.status(200).json({ success: true })),
  suggestedPost: jest.fn((req, res) => res.status(200).json({ success: true })),
  suggestedReels: jest.fn((req, res) => res.status(200).json({ success: true })),
};

await jest.unstable_mockModule("../middleware/isAuthuser.js", () => ({
  isAuthuser: (req, res, next) => authGate(req, res, next),
}));
await jest.unstable_mockModule("../controllers/userPost.js", () => controller);

const { default: postRouter } = await import("../routes/userPost.js");
const app = createTestApp({ mountPath: "/post", router: postRouter });

describe("User post routes", () => {
  it("returns 200 for public GET /post/123", async () => {
    const response = await request(app).get("/post/123");
    expect(response.status).toBe(200);
  });

  it("returns 201 for protected POST /post with valid token", async () => {
    const response = await request(app)
      .post("/post")
      .set("Authorization", "Bearer valid-token")
      .send({ caption: "hello world" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("returns 400 for invalid protected payload", async () => {
    const response = await request(app)
      .post("/post")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 401 for protected POST /post without token", async () => {
    const response = await request(app).post("/post").send({ caption: "blocked" });
    expect(response.status).toBe(401);
  });

  it("returns 500 when protected controller fails", async () => {
    controller.handlePostupload.mockImplementationOnce(() => {
      throw new Error("upload failed");
    });

    const response = await request(app)
      .post("/post")
      .set("Authorization", "Bearer valid-token")
      .send({ caption: "should fail" });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain("upload failed");
  });

  it("returns 404 for unknown route", async () => {
    const response = await request(app)
      .get("/post/unknown/route")
      .set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(404);
  });
});
