import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";

import { ErrorHandler } from "./middlewares/Errorhandler.js";
import { requireAdminAuth } from "./middlewares/authGuard.js";
import { home } from "./routes/home.js";
import { user } from "./routes/userlist.js";
import { feedback } from "./routes/feedbacks.js";
import { reports } from "./routes/reports.js";
import { payment } from "./routes/payments.js";
import { channel } from "./routes/channels.js";
import { manager } from "./routes/managers.js";
import { posts } from "./routes/posts.js";
import { connectDB } from "./DB/Connection.js";
import { setting } from "./routes/settings.js";
import { adminLogger } from "./middlewares/adminLogger.js";
import { setupSwagger } from "./docs/swagger.js";
import auth from "./routes/auth.js";

dotenv.config();

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: "https://wbd-one.vercel.app",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== "test") {
    connectDB();
    setupSwagger(app);
    app.use(adminLogger);
  }

  app.get("/healthCheck", (req, res) => {
    return res.json({
      success: true,
      msg: "admin server is healthy",
    });
  });

  app.use("/auth", auth);
  app.use(requireAdminAuth);
  app.use("/home", home);
  app.use("/user", user);
  app.use("/feedback", feedback);
  app.use("/report", reports);
  app.use("/payment", payment);
  app.use("/channel", channel);
  app.use("/post", posts);
  app.use("/setting", setting);
  app.use("/manager", manager);

  app.use(ErrorHandler);

  return app;
};

export const app = createApp();

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    console.log(`Admin at service at: http://localhost:${PORT}`);
  });
}
