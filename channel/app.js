import express from "express";
import { getChannel } from "./index.js";

export function createChannelApp() {
  const app = express();

  app.get("/api/channel/:id", async (req, res) => {
    try {
      res.json(await getChannel(req.params.id, req.query));
    } catch (err) {
      console.error(
        `チャンネル[${req.params.id}]情報取得エラー:`,
        err?.message || err
      );

      res.status(err.statusCode || 500).json({
        error:
          err.statusCode === 400
            ? err.message
            : "チャンネル情報の取得中にエラーが発生しました",
      });
    }
  });

  return app;
}

export default createChannelApp();
