import express from "express";
import {
  getComments,
  getRawCommentData,
  getReplies,
} from "./index.js";

export function createCommentApp() {
  const app = express();

  app.get("/api/comments", async (req, res) => {
    try {
      res.json(await getComments(req.query));
    } catch (err) {
      console.error("[Comments API Error]", err.message);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/replies", async (req, res) => {
    try {
      res.json(await getReplies(req.query));
    } catch (err) {
      console.error("[Replies API Error]", err.message);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/api/raw", async (req, res) => {
    try {
      res.json(await getRawCommentData(req.query));
    } catch (err) {
      console.error("[Raw API Error]", err.message);
      res
        .status(err.statusCode || 500)
        .json({ error: err.message || "Internal server error" });
    }
  });

  app.get("/", (_, res) => {
    res.json({ ok: true, service: "youtube-comments-api" });
  });

  return app;
}

export default createCommentApp();
