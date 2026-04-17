import request from "supertest";
import { jest } from "@jest/globals";

const loadPaymentApp = async () => {
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

describe("Payment Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with payment list", async () => {
    const { app, adminModel, paymentModel } = await loadPaymentApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    paymentModel.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ id: "TX-1", status: "Completed" }]),
    });

    const response = await request(app)
      .get("/payment/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.payments)).toBe(true);
  });

  it("returns 500 when payment query fails", async () => {
    const { app, adminModel, paymentModel } = await loadPaymentApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    paymentModel.find.mockImplementation(() => {
      throw new Error("db error");
    });

    const response = await request(app)
      .get("/payment/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/internal server error/i);
  });
});
