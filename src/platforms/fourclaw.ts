import type { PostResult } from "../types.js";

const BASE_URL = "https://www.4claw.org/api/v1";

// All boards except crypto
const DEFAULT_BOARDS = [
  "singularity",
  "b",
  "pol",
  "religion",
  "tinfoil",
  "milady",
  "confession",
  "job",
  // "crypto" - excluded
  // "nsfw" - excluded (keep it SFW)
];

interface MultiPostResult extends PostResult {
  results?: { board: string; success: boolean; post_id?: string; error?: string }[];
}

export async function post(params: {
  content: string;
  title?: string;
  board?: string;
  boards?: string[];  // Post to multiple boards
  parent_id?: string;
  type?: "post" | "reply";
}): Promise<MultiPostResult> {
  const apiKey = process.env.FOURCLAW_API_KEY;
  if (!apiKey) {
    return { success: false, platform: "4claw", error: "FOURCLAW_API_KEY not set" };
  }

  // Reply to a thread
  if (params.type === "reply" && params.parent_id) {
    const res = await fetch(`${BASE_URL}/threads/${params.parent_id}/replies`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: params.content,
        anon: false,
        bump: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        platform: "4claw",
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      platform: "4claw",
      post_id: data.reply?.id,
    };
  }

  // Determine which boards to post to
  let targetBoards: string[];
  if (params.boards && params.boards.length > 0) {
    targetBoards = params.boards.flatMap(b => b === "all" ? DEFAULT_BOARDS : [b]);
  } else if (params.board === "all") {
    targetBoards = DEFAULT_BOARDS;
  } else {
    targetBoards = [params.board || "singularity"];
  }

  // Remove duplicates
  targetBoards = [...new Set(targetBoards)];

  // Post to multiple boards
  if (targetBoards.length > 1) {
    const results: { board: string; success: boolean; post_id?: string; error?: string }[] = [];

    for (const board of targetBoards) {
      try {
        const res = await fetch(`${BASE_URL}/boards/${board}/threads`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: params.title || params.content.slice(0, 60),
            content: params.content,
            anon: false,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          results.push({ board, success: false, error: data.error || `HTTP ${res.status}` });
        } else {
          results.push({ board, success: true, post_id: data.thread?.id });
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        results.push({ board, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      platform: "4claw",
      results,
    };
  }

  // Single board post
  const board = targetBoards[0];
  const res = await fetch(`${BASE_URL}/boards/${board}/threads`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: params.title || params.content.slice(0, 60),
      content: params.content,
      anon: false,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      platform: "4claw",
      error: data.error || `HTTP ${res.status}`,
    };
  }

  const threadId = data.thread?.id;
  return {
    success: true,
    platform: "4claw",
    post_id: threadId,
    url: threadId ? `https://www.4claw.org/thread/${threadId}` : undefined,
  };
}
