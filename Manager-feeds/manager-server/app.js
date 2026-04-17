import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { graphqlHTTP } from "express-graphql";

import { ErrorHandler } from "./middlewares/Errorhandler.js";
import { requireManagerAuth } from "./middlewares/authGuard.js";
import { requireManagerTypes } from "./middlewares/managerScope.js";
import { home } from "./routes/home.js";
import { user } from "./routes/userlist.js";
import { feedback } from "./routes/feedbacks.js";
import { reports } from "./routes/reports.js";
import { channel } from "./routes/channels.js";
import { payment } from "./routes/payments.js";
import { moderation } from "./routes/moderation.js";
import auth from "./routes/auth.js";
import { managerGraphQLSchema } from "./graphql/schema.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = YAML.load(path.join(__dirname, "swagger.openapi.yaml"));

export const app = express();

app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/healthCheck", (req, res) => {
  return res.json({
    success: true,
    msg: "manager server is healthy",
  });
});

app.get("/api-docs.json", (req, res) => {
  return res.status(200).json(swaggerDocument);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/auth", auth);
app.use(requireManagerAuth);
app.use(
  "/graphql",
  graphqlHTTP((req) => ({
    schema: managerGraphQLSchema,
    graphiql: true,
    context: {
      actor: req.actor,
    },
    customFormatErrorFn: (error) => ({
      message: error.originalError?.message || error.message,
      statusCode: error.originalError?.statusCode || 500,
    }),
  }))
);
app.use("/home", home);
app.use("/user", requireManagerTypes(["users"]), user);
app.use("/channel", requireManagerTypes(["users"]), channel);
app.use("/report", requireManagerTypes(["posts"]), reports);
app.use("/moderation", requireManagerTypes(["users", "posts"]), moderation);
app.use("/feedback", requireManagerTypes(["feedback and revenue"]), feedback);
app.use("/payment", requireManagerTypes(["feedback and revenue"]), payment);

app.use(ErrorHandler);
