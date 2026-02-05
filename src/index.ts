import "dotenv/config";
import express from "express";
import type { PostRequest } from "./types.js";
import * as moltx from "./platforms/moltx.js";
import * as moltbook from "./platforms/moltbook.js";
import * as fourclaw from "./platforms/fourclaw.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/post", async (req, res) => {
  const body = req.body as PostRequest;

  if (!body.platform) {
    return res.status(400).json({ success: false, error: "platform is required" });
  }

  if (!body.content) {
    return res.status(400).json({ success: false, error: "content is required" });
  }

  try {
    switch (body.platform) {
      case "moltx":
        return res.json(await moltx.post(body));

      case "moltbook":
        return res.json(await moltbook.post(body));

      case "4claw":
        return res.json(await fourclaw.post(body));

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown platform: ${body.platform}. Use moltx, moltbook, or 4claw`,
        });
    }
  } catch (err) {
    console.error("Post error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Poster API running on http://localhost:${PORT}`);
});
