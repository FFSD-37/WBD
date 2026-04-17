import request from "supertest";
import { jest } from "@jest/globals";

const loadUserApp = async () => {
  jest.resetModules();

  const adminModel = {
    findById: jest.fn(),
  };

  const userModel = {
    find: jest.fn(),
  };

  const jwtMock = {
    verify: jest.fn(() => ({ id: "admin-id" })),
    sign: jest.fn(() => "signed-token"),
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
  return { app, adminModel, userModel };
};

describe("User Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 and user list", async () => {
    const { app, adminModel, userModel } = await loadUserApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    userModel.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ username: "u1" }, { username: "u2" }]),
    });

    const response = await request(app)
      .get("/user/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
  });

  it("returns 404 when user query throws", async () => {
    const { app, adminModel, userModel } = await loadUserApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      role: "admin",
      status: "active",
    });

    userModel.find.mockImplementation(() => {
      throw new Error("failed to fetch");
    });

    const response = await request(app)
      .get("/user/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/error while fetching users/i);
  });
});
