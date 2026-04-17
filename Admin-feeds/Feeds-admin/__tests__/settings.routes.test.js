import request from "supertest";
import { jest } from "@jest/globals";

const loadSettingsApp = async () => {
  jest.resetModules();

  const adminModel = {
    findById: jest.fn(),
  };

  const jwtMock = {
    verify: jest.fn(() => ({ id: "admin-id" })),
    sign: jest.fn(() => "signed-token"),
  };

  const speakeasyMock = {
    generateSecret: jest.fn(() => ({ base32: "ABC", otpauth_url: "otpauth://otp" })),
    totp: {
      verify: jest.fn(() => false),
    },
  };

  const qrCodeMock = {
    toDataURL: jest.fn(async () => "data:image/png;base64,mock"),
  };

  jest.unstable_mockModule("../models/admin.js", () => ({
    default: adminModel,
  }));

  jest.unstable_mockModule("jsonwebtoken", () => ({
    default: jwtMock,
  }));

  jest.unstable_mockModule("speakeasy", () => ({
    default: speakeasyMock,
  }));

  jest.unstable_mockModule("qrcode", () => ({
    default: qrCodeMock,
  }));

  const { app } = await import("../index.js");
  return { app, adminModel, jwtMock, speakeasyMock };
};

describe("Settings Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when update settings is called without token", async () => {
    const { app } = await loadSettingsApp();

    const response = await request(app).post("/setting/updateSettings").send({
      tab: "profile",
      data: { name: "admin", email: "admin@example.com" },
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("returns 201 when profile details are updated", async () => {
    const { app, adminModel } = await loadSettingsApp();

    const save = jest.fn().mockResolvedValue(undefined);
    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      username: "old-admin",
      email: "old@example.com",
      password: "pass123",
      save,
    });

    const response = await request(app)
      .post("/setting/updateSettings")
      .set("Cookie", ["auth_token=valid-token"])
      .send({ tab: "profile", data: { name: "new-admin", email: "new@example.com" } });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when security password confirmation mismatches", async () => {
    const { app, adminModel } = await loadSettingsApp();

    adminModel.findById.mockResolvedValue({
      _id: "admin-id",
      password: "current-pass",
      twoFactorEnabled: false,
      save: jest.fn().mockResolvedValue(undefined),
    });

    const response = await request(app)
      .post("/setting/updateSettings")
      .set("Cookie", ["auth_token=valid-token"])
      .send({
        tab: "security",
        data: {
          currentPassword: "current-pass",
          newPassword: "new-pass",
          confirmPassword: "different-pass",
          twoFactorEnabled: false,
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/both passwords should match/i);
  });

  it("returns 400 when 2fa otp is invalid", async () => {
    const { app, adminModel, speakeasyMock } = await loadSettingsApp();

    adminModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ twoFactorSecret: "ABCDEF123456", _id: "admin-id" }),
    });

    speakeasyMock.totp.verify.mockReturnValue(false);

    const response = await request(app)
      .post("/setting/verify-2fa")
      .set("Cookie", ["auth_token=valid-token"])
      .send({ otp: "123456" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/invalid otp/i);
  });

  it("returns 401 when jwt verification fails before reaching settings route", async () => {
    const { app, jwtMock } = await loadSettingsApp();

    jwtMock.verify.mockImplementation(() => {
      throw new Error("token failed");
    });

    const response = await request(app)
      .post("/setting/updateSettings")
      .set("Cookie", ["auth_token=bad-token"])
      .send({ tab: "profile", data: { name: "x", email: "x@y.com" } });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
