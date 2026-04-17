import request from "supertest";
import { jest } from "@jest/globals";

const loadReportsApp = async () => {
  jest.resetModules();

  const adminModel = {
    findById: jest.fn(),
  };

  const reportModel = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  const userModel = {
    findOne: jest.fn(),
  };

  const jwtMock = {
    verify: jest.fn(() => ({ id: "admin-id" })),
    sign: jest.fn(() => "signed-token"),
  };

  const mailerMock = {
    transporter: {
      sendMail: jest.fn(),
    },
  };

  jest.unstable_mockModule("../models/admin.js", () => ({
    default: adminModel,
  }));

  jest.unstable_mockModule("../models/report_schema.js", () => ({
    default: reportModel,
  }));

  jest.unstable_mockModule("../models/user_schema.js", () => ({
    default: userModel,
  }));

  jest.unstable_mockModule("../utils/mailer.js", () => mailerMock);

  jest.unstable_mockModule("jsonwebtoken", () => ({
    default: jwtMock,
  }));

  const { app } = await import("../index.js");
  return { app, adminModel, reportModel, userModel, mailerMock };
};

describe("Report Routes", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 200 with reports list", async () => {
    const { app, adminModel, reportModel } = await loadReportsApp();

    adminModel.findById.mockResolvedValue({ role: "admin", status: "active" });
    reportModel.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ report_number: 1 }]),
    });

    const response = await request(app)
      .get("/report/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 404 when report to update is not found", async () => {
    const { app, adminModel, reportModel } = await loadReportsApp();

    adminModel.findById.mockResolvedValue({ role: "admin", status: "active" });
    reportModel.findById.mockResolvedValue(null);

    const response = await request(app)
      .post("/report/updateReportStatus")
      .set("Cookie", ["auth_token=valid-token"])
      .send({ reportId: "r-404", status: "Resolved" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/report not found/i);
  });

  it("returns 200 when report status updates and sends email", async () => {
    const { app, adminModel, reportModel, userModel, mailerMock } =
      await loadReportsApp();

    adminModel.findById.mockResolvedValue({ role: "admin", status: "active" });

    const save = jest.fn().mockResolvedValue(undefined);
    reportModel.findById.mockResolvedValue({
      _id: "r-1",
      status: "Pending",
      report_number: 101,
      user_reported: "alice",
      save,
    });

    userModel.findOne.mockResolvedValue({ username: "alice", email: "alice@example.com" });

    const response = await request(app)
      .post("/report/updateReportStatus")
      .set("Cookie", ["auth_token=valid-token"])
      .send({ reportId: "r-1", status: "Resolved" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(mailerMock.transporter.sendMail).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when report listing fails", async () => {
    const { app, adminModel, reportModel } = await loadReportsApp();

    adminModel.findById.mockResolvedValue({ role: "admin", status: "active" });
    reportModel.find.mockImplementation(() => {
      throw new Error("list failed");
    });

    const response = await request(app)
      .get("/report/list")
      .set("Cookie", ["auth_token=valid-token"]);

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
});
