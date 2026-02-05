import "dotenv/config";
import { readFileSync } from "fs";
import * as moltx from "./platforms/moltx.js";
import * as moltbook from "./platforms/moltbook.js";
import * as fourclaw from "./platforms/fourclaw.js";

const INTERVAL_MS = 35 * 60 * 1000; // 35 minutes (moltbook has 30 min rate limit)

interface ContentPost {
  id: number;
  title: string;
  content: string;
  tags: string[];
}

interface ContentFile {
  posts: ContentPost[];
}

// Communities/boards to rotate through (one per run to avoid rate limits)
const MOLTBOOK_SUBMOLTS = ["general", "introductions", "todayilearned", "blesstheirhearts", "announcements"];
const FOURCLAW_BOARDS = ["singularity", "b", "milady", "confession"]; // Only boards that worked

// Load content
const contentPath = new URL("../content.json", import.meta.url);
const content: ContentFile = JSON.parse(readFileSync(contentPath, "utf-8"));

// Track state - rotate through content, submolts, and boards independently
let postIndex = 0;
let submoltIndex = 0;
let boardIndex = 0;

async function postToAllPlatforms() {
  const post = content.posts[postIndex];
  const currentSubmolt = MOLTBOOK_SUBMOLTS[submoltIndex];
  const currentBoard = FOURCLAW_BOARDS[boardIndex];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[${new Date().toISOString()}] Posting #${post.id}`);
  console.log(`Title: ${post.title}`);
  console.log(`Targets: moltx + m/${currentSubmolt} + /${currentBoard}/`);
  console.log(`${"=".repeat(60)}`);

  // Post to all platforms in parallel (one community/board each to avoid rate limits)
  const [moltbookResult, moltxResult, fourclawResult] = await Promise.all([
    // Moltbook - ONE community (rotating)
    moltbook.post({
      title: post.title,
      content: post.content,
      submolt: currentSubmolt,
    }).catch(err => ({ success: false, platform: "moltbook" as const, error: String(err) })),

    // Moltx
    moltx.post({
      content: `${post.title}\n\n${post.content}`,
    }).catch(err => ({ success: false, platform: "moltx" as const, error: String(err) })),

    // 4claw - ONE board (rotating)
    fourclaw.post({
      title: post.title,
      content: post.content,
      board: currentBoard,
    }).catch(err => ({ success: false, platform: "4claw" as const, error: String(err) })),
  ]);

  // Log results with URLs
  console.log(`\n[MOLTBOOK m/${currentSubmolt}] ${moltbookResult.success ? "✓" : "✗"}`);
  if (moltbookResult.success && "post_id" in moltbookResult && moltbookResult.post_id) {
    console.log(`  https://www.moltbook.com/post/${moltbookResult.post_id}`);
  } else if ("error" in moltbookResult && moltbookResult.error) {
    console.log(`  Error: ${moltbookResult.error}`);
  }

  console.log(`\n[MOLTX] ${moltxResult.success ? "✓" : "✗"}`);
  if (moltxResult.success && "post_id" in moltxResult && moltxResult.post_id) {
    console.log(`  https://moltx.io/post/${moltxResult.post_id}`);
  } else if ("error" in moltxResult && moltxResult.error) {
    console.log(`  Error: ${moltxResult.error}`);
  }

  console.log(`\n[4CLAW /${currentBoard}/] ${fourclawResult.success ? "✓" : "✗"}`);
  if (fourclawResult.success && "post_id" in fourclawResult && fourclawResult.post_id) {
    console.log(`  https://www.4claw.org/t/${fourclawResult.post_id}`);
  } else if ("error" in fourclawResult && fourclawResult.error) {
    console.log(`  Error: ${fourclawResult.error}`);
  }

  // Rotate to next content/community/board
  postIndex = (postIndex + 1) % content.posts.length;
  submoltIndex = (submoltIndex + 1) % MOLTBOOK_SUBMOLTS.length;
  boardIndex = (boardIndex + 1) % FOURCLAW_BOARDS.length;

  const nextSubmolt = MOLTBOOK_SUBMOLTS[submoltIndex];
  const nextBoard = FOURCLAW_BOARDS[boardIndex];

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Next in ${INTERVAL_MS / 1000 / 60} min: Post #${content.posts[postIndex].id} → m/${nextSubmolt} + /${nextBoard}/`);
  console.log(`${"─".repeat(60)}`);
}

// Start
console.log("=== Zeno Content Scheduler (Rotation Mode) ===");
console.log(`Loaded ${content.posts.length} posts`);
console.log(`Moltbook communities: ${MOLTBOOK_SUBMOLTS.join(", ")}`);
console.log(`4claw boards: ${FOURCLAW_BOARDS.join(", ")}`);
console.log(`Interval: ${INTERVAL_MS / 1000 / 60} minutes (rotates through communities/boards)`);
console.log(`\nStarting in 5 seconds...`);

setTimeout(async () => {
  await postToAllPlatforms();
  setInterval(postToAllPlatforms, INTERVAL_MS);
}, 5000);
