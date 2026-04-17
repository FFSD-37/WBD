import request from "supertest";
import { jest } from "@jest/globals";

const loadAuthApp = async () => {
  jest.resetModules();

  const adminModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const jwtMock = {
    sign: jest.fn(() => "signed-jwt"),
    verify: jest.fn(() => ({ id: "admin-id" })),
  };

  jest.unstable_mockModule("../models/admin.js", () => ({
    default: adminModel,
  }));

  jest.unstable_mockModule("jsonwebtoken", () => ({
    default: jwtMock,
  }));

  const { app } = await import("../index.js");
  return { app, adminModel, jwtMock };
};

describe("Auth Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 for login with valid admin credentials", async () => {
    const { app, adminModel, jwtMock } = await loadAuthApp();
    adminModel.findOne.mockResolvedValue({
      _id: "admin-id",
      username: "admin",
      password: "pass123",
      role: "admin",
      status: "active",
    });

    const response = await request(app).post("/auth/login").send({
      username: "admin",
      password: "pass123",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(jwtMock.sign).toHaveBeenCalledTimes(1);
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("returns 401 for login with invalid credentials", async () => {
    const { app, adminModel } = await loadAuthApp();
    adminModel.findOne.mockResolvedValue({
      _id: "admin-id",
      username: "admin",
      password: "other-pass",
      role: "admin",
      status: "active",
    });

    const response = await request(app).post("/auth/login").send({
      username: "admin",
      password: "wrong",
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid credentials/i);
  });

  it("returns 400 when login query fails", async () => {
    const { app, adminModel } = await loadAuthApp();
    adminModel.findOne.mockRejectedValue(new Error("mongo down"));

    const response = await request(app).post("/auth/login").send({
      username: "admin",
      password: "pass123",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("returns 401 for status check without auth cookie", async () => {
    const { app } = await loadAuthApp();

    const response = await request(app).get("/auth/status");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/not authenticated/i);
  });

  it("returns 401 when token verification fails on status", async () => {
    const { app, jwtMock } = await loadAuthApp();
    jwtMock.verify.mockImplementation(() => {
      throw new Error("bad token");
    });

    const response = await request(app)
      .get("/auth/status")
      .set("Cookie", ["auth_token=broken-token"]);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("returns 200 for logout", async () => {
    const { app } = await loadAuthApp();

    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.headers["set-cookie"]?.join(";")).toMatch(/auth_token=;/i);
  });
});
