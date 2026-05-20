import express from "express";
import cors from "cors";
import { getVideo } from "./index.js";

export function createVideoApp() {
  const app = express();

  app.use(cors());

  app.get("/api/video/:id", async (req, res) => {
    try {
      res.json(await getVideo(req.params.id, req.query));
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error:
          error.statusCode === 400
            ? error.message
            : error.message === "Failed to parse internal data"
              ? error.message
              : "Internal Server Error",
        ...(error.statusCode === 500 ? { detail: error.message } : {}),
      });
    }
  });

  app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
}

export default createVideoApp();
