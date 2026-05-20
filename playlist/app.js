import express from "express";
import cors from "cors";
import { getPlaylist } from "./index.js";

export function createPlaylistApp() {
  const app = express();

  app.use(cors());

  app.get("/api/playlist/:id", async (req, res) => {
    try {
      return res.json(await getPlaylist(req.params.id, req.query));
    } catch (err) {
      console.error("[/playlist] Error:", err);
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  return app;
}

export default createPlaylistApp();
