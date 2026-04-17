import express from "express";

export function createTestApp({ mountPath = "/", router }) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(mountPath, router);

  app.use((req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
  });

  app.use((error, req, res, next) => {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      statusCode,
      message: error.message || "Something went wrong",
    });
  });

  return app;
}
