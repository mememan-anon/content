import type { PostResult } from "../types.js";

const BASE_URL = "https://www.moltbook.com/api/v1";

// Default communities to post to when using "all"
const DEFAULT_SUBMOLTS = [
  "general",
  "introductions",
  "todayilearned",
  "blesstheirhearts",
  "announcements",
];

interface MultiPostResult extends PostResult {
  results?: { submolt: string; success: boolean; post_id?: string; error?: string }[];
}

export async function post(params: {
  content: string;
  title?: string;
  submolt?: string;
  submolts?: string[];  // Post to multiple communities
  parent_id?: string;
  type?: "post" | "reply";
}): Promise<MultiPostResult> {
  const apiKey = process.env.MOLTBOOK_API_KEY;
  if (!apiKey) {
    return { success: false, platform: "moltbook", error: "MOLTBOOK_API_KEY not set" };
  }

  // Reply to a post
  if (params.type === "reply" && params.parent_id) {
    const res = await fetch(`${BASE_URL}/posts/${params.parent_id}/comments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: params.content }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        platform: "moltbook",
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      platform: "moltbook",
      post_id: data.data?.id,
    };
  }

  // Determine which submolts to post to
  let targetSubmolts: string[];
  if (params.submolts && params.submolts.length > 0) {
    // Use provided array, expand "all" if present
    targetSubmolts = params.submolts.flatMap(s => s === "all" ? DEFAULT_SUBMOLTS : [s]);
  } else if (params.submolt === "all") {
    targetSubmolts = DEFAULT_SUBMOLTS;
  } else {
    targetSubmolts = [params.submolt || "general"];
  }

  // Remove duplicates
  targetSubmolts = [...new Set(targetSubmolts)];

  // Post to multiple communities
  if (targetSubmolts.length > 1) {
    const results: { submolt: string; success: boolean; post_id?: string; error?: string }[] = [];

    for (const submolt of targetSubmolts) {
      try {
        const res = await fetch(`${BASE_URL}/posts`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: params.content,
            submolt,
            title: params.title || params.content.slice(0, 100),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          results.push({ submolt, success: false, error: data.error || `HTTP ${res.status}` });
        } else {
          results.push({ submolt, success: true, post_id: data.data?.id });
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        results.push({ submolt, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      platform: "moltbook",
      results,
    };
  }

  // Single submolt post
  const body: Record<string, string> = {
    content: params.content,
    submolt: targetSubmolts[0],
    title: params.title || params.content.slice(0, 100),
  };

  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      success: false,
      platform: "moltbook",
      error: data.error || `HTTP ${res.status}`,
    };
  }

  const postId = data.data?.id;
  return {
    success: true,
    platform: "moltbook",
    post_id: postId,
    url: postId ? `https://www.moltbook.com/post/${postId}` : undefined,
  };
}
