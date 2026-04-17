import { beforeAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";

var mockAdmin = {
  findOne: jest.fn(),
  findById: jest.fn(),
};

var mockUser = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

var mockReport = {
  find: jest.fn(),
  findById: jest.fn(),
};

var mockPost = {
  findOne: jest.fn(),
};

var mockTokenSign = jest.fn(() => "fake-jwt-token");
var mockTokenVerify = jest.fn(() => ({ id: "manager-id" }));

jest.unstable_mockModule("../models/admin.js", () => ({
  __esModule: true,
  default: mockAdmin,
}));
jest.unstable_mockModule("../models/user_schema.js", () => ({
  __esModule: true,
  default: mockUser,
}));
jest.unstable_mockModule("../models/report_schema.js", () => ({
  __esModule: true,
  default: mockReport,
}));
jest.unstable_mockModule("../models/post.js", () => ({
  __esModule: true,
  default: mockPost,
}));
jest.unstable_mockModule("jsonwebtoken", () => ({
  __esModule: true,
  default: {
    sign: mockTokenSign,
    verify: mockTokenVerify,
  },
}));

let authRouter;
let home;
let user;
let reports;

beforeAll(async () => {
  const authModule = await import("../routes/auth.js");
  const homeModule = await import("../routes/home.js");
  const userModule = await import("../routes/userlist.js");
  const reportsModule = await import("../routes/reports.js");

  authRouter = authModule.default;
  home = homeModule.home;
  user = userModule.user;
  reports = reportsModule.reports;
});

const createTestApp = (actor) => {
  const app = express();
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use((req, res, next) => {
    req.actor = actor;
    next();
  });
  app.use("/auth", authRouter);
  app.use("/home", home);
  app.use("/user", user);
  app.use("/report", reports);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
};

describe("Major route contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /home returns a healthy payload", async () => {
    const app = createTestApp({ managerType: "users" });
    const response = await request(app).get("/home");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      msg: "Home page came",
    });
  });

  test("GET /home/getUsers returns a list when manager type is users", async () => {
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ username: "alice" }]),
    };

    mockUser.find.mockReturnValue(findChain);
    const app = createTestApp({ managerType: "users" });

    const response = await request(app).get("/home/getUsers");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [{ username: "alice" }],
    });
    expect(mockUser.find).toHaveBeenCalledWith({ type: { $in: ["Normal", "Kids"] } });
  });

  test("POST /auth/login rejects invalid credentials", async () => {
    mockAdmin.findOne.mockResolvedValue(null);
    const app = createTestApp();

    const response = await request(app)
      .post("/auth/login")
      .send({ username: "invalid", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid credentials" });
  });

  test("POST /auth/login accepts valid manager credentials", async () => {
    mockAdmin.findOne.mockResolvedValue({
      _id: "123",
      username: "manager",
      password: "secret",
      role: "manager",
      managerType: "users",
      status: "active",
    });

    const app = createTestApp();
    const response = await request(app)
      .post("/auth/login")
      .send({ username: "manager", password: "secret" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, msg: "Successfully extracted manager" });
    expect(response.headers["set-cookie"][0]).toContain("auth_token=fake-jwt-token");
    expect(mockTokenSign).toHaveBeenCalled();
  });

  test("POST /auth/logout clears the auth cookie", async () => {
    const app = createTestApp();
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, msg: "Logged out" });
    expect(response.headers["set-cookie"][0]).toContain("auth_token=;");
  });

  test("GET /user/list returns users from the route", async () => {
    mockUser.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ username: "bob" }]) });
    const app = createTestApp({ managerType: "users" });

    const response = await request(app).get("/user/list");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ username: "bob" }] });
  });

  test("GET /report/list denies access for non-post managers", async () => {
    const app = createTestApp({ managerType: "users" });
    const response = await request(app).get("/report/list");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Access denied for this module" });
  });

  test("GET /report/list returns reports for post manager", async () => {
    const report = {
      _id: "report-1",
      post_id: "post-1",
      report_id: 3,
      toObject: function () {
        return { _id: this._id, post_id: this.post_id, report_id: this.report_id };
      },
    };
    const reportSort = { sort: jest.fn().mockResolvedValue([report]) };
    mockReport.find.mockReturnValue(reportSort);
    mockPost.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        id: "post-1",
        author: "author-1",
        type: "normal",
        url: "http://test",
        content: "text",
      }),
    });

    const app = createTestApp({ managerType: "posts" });
    const response = await request(app).get("/report/list");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.reports)).toBe(true);
    expect(response.body.reports[0].scopeType).toBe("normal_or_kids_post");
  });
});
