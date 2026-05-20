import express from "express";
import { getSuggestions } from "./index.js";

export function createSuggestApp() {
  const app = express();

  app.get("/", async (req, res) => {
    try {
      res.json(await getSuggestions(req.query.keyword, req.query));
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error:
          error.statusCode === 400
            ? "keywordクエリが必要です"
            : "外部リクエストでエラーが発生しました",
      });
    }
  });

  return app;
}

export default createSuggestApp();
