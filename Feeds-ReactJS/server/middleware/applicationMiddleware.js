import morgan from "morgan";
import { Logs } from "../models/FeedsLogs.js";

export const Logger = morgan(
  function (tokens, req, res) {
    const logData = {
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      responseTime: Number(tokens["response-time"](req, res)),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    Logs.create(logData).catch(() => {});
  },
  {
    skip: (req, res) => req.method !== "POST",
  }
);
