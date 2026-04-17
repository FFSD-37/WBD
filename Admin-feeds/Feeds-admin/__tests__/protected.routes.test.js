import request from "supertest";
import { jest } from "@jest/globals";

const loadProtectedApp = async () => {
  jest.resetModules();

  const adminModel = {
    findById: jest.fn(),
  };

  const userModel = {
    find: jest.fn(),
  };

  const jwtMock = {
    sign: jest.fn(() => "signed-jwt"),
    verify: jest.fn(() => ({ id: "admin-id" })),
  };

  jest.unstable_mockModule("../models/admin.js", () => ({
    default: adminModel,
  }));

  jest.unstable_mockModule("../models/user_schema.js", () => ({
    default: userModel,
  }));

  jest.unstable_mockModule("jsonwebtoken", () => ({
    default: jwtMock,
  }));

  const { app } = await import("../index.js");
  return { app, adminModel, userModel, jwtMock };
};

describe("Protected Routes Authentication", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 for protected route without token", async () => {
    const { app } = await loadProtectedApp();

    const response = await request(app).get("/user/list");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/not authenticated/i);
  });

  it("returns 200 for protected route with valid admin token", async () => {
    const { app, adminModel, userModel } = await loadProtectedApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    userModel.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ username: "alice" }]),
    });

    const response = await request(app)
      .get("/user/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("returns 403 when authenticated actor is not admin", async () => {
    const { app, adminModel } = await loadProtectedApp();

    adminModel.findById.mockResolvedValue({
      _id: "manager-id",
      role: "manager",
      status: "active",
    });

    const response = await request(app)
      .get("/user/list")
      .set("Cookie", ["auth_token=manager-token"]);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/admin role required/i);
  });
});
