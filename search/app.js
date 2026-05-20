import express from "express";
import { searchVideos } from "./index.js";

export function createSearchApp() {
  const app = express();
  const nodeEnv = process.env.NODE_ENV || "development";

  app.get("/search", async (req, res) => {
    try {
      return res.status(200).json(await searchVideos(req.query));
    } catch (error) {
      const errorResponse = {
        error:
          error.statusCode === 400
            ? "Bad Request"
            : error.statusCode === 502
              ? "Bad Gateway"
              : "Internal Server Error",
      };

      if (error.statusCode) {
        res.status(error.statusCode);
      } else {
        res.status(500);
      }

      if (nodeEnv === "development") {
        errorResponse.message = error.message;
      }

      return res.json(errorResponse);
    }
  });

  return app;
}

export default createSearchApp();
