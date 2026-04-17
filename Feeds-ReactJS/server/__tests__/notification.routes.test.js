import request from "supertest";
import { jest } from "@jest/globals";
import { createTestApp } from "./helpers/createTestApp.js";

const authGate = jest.fn((req, res, next) => {
  if (req.headers.authorization === "Bearer valid-token") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized Access" });
});

const createNotification = jest.fn((req, res) => {
  if (!req.body?.title) {
    return res.status(400).json({ success: false, message: "title is required" });
  }
  return res.status(201).json({ success: true, id: "n1" });
});

await jest.unstable_mockModule("../middleware/isAuthuser.js", () => ({
  isAuthuser: (req, res, next) => authGate(req, res, next),
}));
await jest.unstable_mockModule("../controllers/notification.js", () => ({
  createNotification,
}));

const { default: notificationRouter } = await import("../routes/notification.js");
const app = createTestApp({ mountPath: "/notification", router: notificationRouter });

describe("Notification routes", () => {
  it("returns 201 for POST /notification with valid token", async () => {
    const response = await request(app)
      .post("/notification")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "new notification" });

    expect(response.status).toBe(201);
  });

  it("returns 400 for POST /notification invalid payload", async () => {
    const response = await request(app)
      .post("/notification")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(400);
  });

  it("returns 401 when token is missing", async () => {
    const response = await request(app).post("/notification").send({ title: "x" });
    expect(response.status).toBe(401);
  });

  it("returns 500 when createNotification throws", async () => {
    createNotification.mockImplementationOnce(() => {
      throw new Error("notification service down");
    });

    const response = await request(app)
      .post("/notification")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "boom" });

    expect(response.status).toBe(500);
  });

  it("returns 404 for unknown notification endpoint", async () => {
    const response = await request(app)
      .get("/notification/not-found")
      .set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(404);
  });
});
