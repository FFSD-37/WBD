import express from "express";
import request from "supertest";
import { jest } from "@jest/globals";
import { createTestApp } from "./helpers/createTestApp.js";

const authGate = jest.fn((req, res, next) => {
  if (req.headers.authorization === "Bearer valid-token") {
    req.userDetails = {
      data: ["demo-user", "demo@example.com", "img", "Normal", false],
    };
    return next();
  }

  return res.status(401).json({ message: "Unauthorized Access" });
});

const userController = {
  handleSignup: jest.fn((req, res) => {
    if (!req.body?.username || !req.body?.password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    return res.status(201).json({ success: true, message: "Account created" });
  }),
  sendotp: jest.fn((req, res) => res.status(200).json({ success: true })),
  verifyotp: jest.fn((req, res) => res.status(200).json({ success: true })),
  updatepass: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleContact: jest.fn((req, res) => res.status(200).json({ success: true })),
  handledelacc: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlelogout: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetHome: jest.fn((req, res) => res.status(200).json({ success: true, page: "home" })),
  handlegetpayment: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetprofile: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleadminlogin: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlefpadmin: jest.fn((req, res) => res.status(200).json({ success: true })),
  adminPassUpdate: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegeteditprofile: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetcreatepost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlecreatepost: jest.fn((req, res) => res.status(201).json({ success: true })),
  handlegetcreatepost2: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateUserProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
  fetchOverlayUser: jest.fn((req, res) => res.status(200).json({ success: true })),
  followSomeone: jest.fn((req, res) => res.status(200).json({ success: true })),
  acceptFollowRequest: jest.fn((req, res) => res.status(200).json({ success: true })),
  unfollowSomeone: jest.fn((req, res) => res.status(200).json({ success: true })),
  unRequestSomeone: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetnotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetsettings: jest.fn((req, res) => res.status(200).json({ success: true })),
  togglePP: jest.fn((req, res) => res.status(200).json({ success: true })),
  signupChannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  registerChannel: jest.fn((req, res) => res.status(201).json({ success: true })),
  handlegetlog: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPostfinalize: jest.fn((req, res) => res.status(201).json({ success: true })),
  uploadFinalPost: jest.fn((req, res) => res.status(201).json({ success: true })),
  reportAccount: jest.fn((req, res) => res.status(201).json({ success: true })),
  handleloginchannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetallnotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  markNotificationsAsSeen: jest.fn((req, res) => res.status(200).json({ success: true })),
  getUnseenCounts: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleloginsecond: jest.fn((req, res) => {
    const { username, password } = req.body || {};
    if (username === "valid-user" && password === "valid-pass") {
      return res.status(200).json({ success: true, token: "mock-token" });
    }
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }),
  handlelikereel: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlereportpost: jest.fn((req, res) => res.status(201).json({ success: true })),
  handleReportChat: jest.fn((req, res) => res.status(201).json({ success: true })),
  handlegetads: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlelikecomment: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleblockuser: jest.fn((req, res) => res.status(200).json({ success: true })),
  handledeletepost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlearchivepost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleunarchivepost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleunsavepost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlepostcomment: jest.fn((req, res) => res.status(201).json({ success: true })),
  handleGetEditChannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  updateChannelProfile: jest.fn((req, res) => res.status(200).json({ success: true })),
};

const profileController = {
  handlegetUserPost: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetBasicDetails: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetsensitive: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleisfriend: jest.fn((req, res) => res.status(200).json({ success: true })),
  handleCheckParentalPass: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCoins: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlechangepassKids: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlechangeparentalpass: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetkidsTime: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlesetkidsTime: jest.fn((req, res) => res.status(200).json({ success: true })),
  handledeactivateKid: jest.fn((req, res) => res.status(200).json({ success: true })),
  handlegetBlcokedUsers: jest.fn((req, res) => res.status(200).json({ success: true })),
};

const channelController = {
  handlegetchannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  getChannelPosts: jest.fn((req, res) => res.status(200).json({ success: true })),
  followChannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  unfollowChannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  archivePost: jest.fn((req, res) => res.status(200).json({ success: true })),
  unarchivePost: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePost: jest.fn((req, res) => res.status(200).json({ success: true })),
  getChannelSettings: jest.fn((req, res) => res.status(200).json({ success: true })),
  deactivateChannel: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteChannelAccount: jest.fn((req, res) => res.status(200).json({ success: true })),
};

const ayushHomeController = {
  getAllChannelPosts: jest.fn((req, res) => res.status(200).json({ success: true })),
  likeChannelPost: jest.fn((req, res) => res.status(200).json({ success: true })),
  saveChannelPost: jest.fn((req, res) => res.status(200).json({ success: true })),
  commentOnChannelPost: jest.fn((req, res) => res.status(201).json({ success: true })),
  getSingleChannelPost: jest.fn((req, res) => res.status(200).json({ success: true })),
  getKidsHomePosts: jest.fn((req, res) => res.status(200).json({ success: true })),
  getChannelCommentReplies: jest.fn((req, res) => res.status(200).json({ success: true })),
};

const connectController = {
  handleGetConnect: jest.fn((req, res) => res.status(200).json({ success: true })),
  getSearch: jest.fn((req, res) => res.status(200).json({ success: true })),
  followEntity: jest.fn((req, res) => res.status(200).json({ success: true })),
  unfollowEntity: jest.fn((req, res) => res.status(200).json({ success: true })),
};

const reelsController = {
  getReelsFeed: jest.fn((req, res) => res.status(200).json({ success: true })),
  likeReel: jest.fn((req, res) => res.status(200).json({ success: true })),
  unlikeReel: jest.fn((req, res) => res.status(200).json({ success: true })),
  saveReel: jest.fn((req, res) => res.status(200).json({ success: true })),
  unsaveReel: jest.fn((req, res) => res.status(200).json({ success: true })),
  commentReel: jest.fn((req, res) => res.status(201).json({ success: true })),
  replyReel: jest.fn((req, res) => res.status(201).json({ success: true })),
  getReelComments: jest.fn((req, res) => res.status(200).json({ success: true })),
};

await jest.unstable_mockModule("../middleware/isAuthuser.js", () => ({
  isAuthuser: (req, res, next) => authGate(req, res, next),
}));

await jest.unstable_mockModule("../controllers/user.js", () => userController);
await jest.unstable_mockModule("../controllers/Gourav/profile.js", () => profileController);
await jest.unstable_mockModule("../controllers/Gourav/games.js", () => ({
  updateTime: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../controllers/Ayush/channel.js", () => channelController);
await jest.unstable_mockModule("../controllers/Ayush/home.js", () => ayushHomeController);
await jest.unstable_mockModule("../controllers/Ayush/connect.js", () => connectController);
await jest.unstable_mockModule("../controllers/Ayush/reels.js", () => reelsController);
await jest.unstable_mockModule("../services/imagKit.js", () => ({
  handleimagKitauth: jest.fn((req, res) => res.status(200).json({ token: "imgkit-token" })),
}));
await jest.unstable_mockModule("../controllers/payment.js", () => ({
  checkOut: jest.fn((req, res) => res.status(201).json({ success: true })),
  verify_payment: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../controllers/chat.js", () => ({
  getChat: jest.fn((req, res) => res.status(200).json({ success: true })),
  getFriendList: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteChat: jest.fn((req, res) => res.status(200).json({ success: true })),
  markChatSeen: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../controllers/timout.js", () => ({
  getDailyusage: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../controllers/userStory.js", () => ({
  handlegetstories: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../controllers/rewards.js", () => ({
  claimGamePlayReward: jest.fn((req, res) => res.status(200).json({ success: true })),
}));
await jest.unstable_mockModule("../routes/home.js", () => ({
  default: express.Router(),
}));

const { default: userRouter } = await import("../routes/user.js");
const app = createTestApp({ mountPath: "/", router: userRouter });

describe("User routes", () => {
  describe("Public routes", () => {
    it("creates a user on POST /signup (201)", async () => {
      const response = await request(app).post("/signup").send({
        username: "new-user",
        password: "safe-pass",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it("returns 400 for invalid signup payload", async () => {
      const response = await request(app).post("/signup").send({
        username: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("handles login success on POST /atin_job", async () => {
      const response = await request(app).post("/atin_job").send({
        username: "valid-user",
        password: "valid-pass",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(userController.handleloginsecond).toHaveBeenCalledTimes(1);
    });

    it("handles login failure on POST /atin_job (bonus invalid credentials)", async () => {
      const response = await request(app).post("/atin_job").send({
        username: "bad-user",
        password: "bad-pass",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("Protected routes", () => {
    it("returns 200 for GET /home with valid token (bonus protected route)", async () => {
      const response = await request(app)
        .get("/home")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("returns 401 for GET /home without token", async () => {
      const response = await request(app).get("/home");
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized Access");
    });

    it("returns 500 when a protected controller throws", async () => {
      userController.handlegetHome.mockImplementationOnce(() => {
        throw new Error("forced controller error");
      });

      const response = await request(app)
        .get("/home")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("forced controller error");
    });
  });

  describe("Fallback route", () => {
    it("returns 404 for unknown endpoint", async () => {
      const response = await request(app)
        .get("/route-does-not-exist")
        .set("Authorization", "Bearer valid-token");
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
