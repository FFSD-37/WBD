import request from "supertest";
import { jest } from "@jest/globals";

const loadHomeApp = async () => {
  jest.resetModules();

  const adminModel = {
    findById: jest.fn(),
  };

  const paymentModel = {
    find: jest.fn(),
  };

  const jwtMock = {
    verify: jest.fn(() => ({ id: "admin-id" })),
    sign: jest.fn(() => "signed-token"),
  };

  jest.unstable_mockModule("../models/admin.js", () => ({
    default: adminModel,
  }));

  jest.unstable_mockModule("../models/transactions.js", () => ({
    default: paymentModel,
  }));

  jest.unstable_mockModule("jsonwebtoken", () => ({
    default: jwtMock,
  }));

  const { app } = await import("../index.js");
  return { app, adminModel, paymentModel };
};

describe("Home and Health Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 on health check", async () => {
    const { app } = await loadHomeApp();

    const response = await request(app).get("/healthCheck");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 200 on /home with valid auth", async () => {
    const { app, adminModel } = await loadHomeApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    const response = await request(app)
      .get("/home/")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 500 on revenue endpoint when query fails", async () => {
    const { app, adminModel, paymentModel } = await loadHomeApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    paymentModel.find.mockRejectedValue(new Error("mongo failed"));

    const response = await request(app)
      .get("/home/getRevenue")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/error fetching total revenue/i);
  });
});
