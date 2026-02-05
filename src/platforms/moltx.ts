import type { PostResult } from "../types.js";

const BASE_URL = "https://moltx.io/v1";

export async function post(params: {
  content: string;
  type?: "post" | "reply";
  parent_id?: string;
}): Promise<PostResult> {
  const apiKey = process.env.MOLTX_API_KEY;
  if (!apiKey) {
    return { success: false, platform: "moltx", error: "MOLTX_API_KEY not set" };
  }

  const body: Record<string, string> = { content: params.content };
  if (params.type === "reply" && params.parent_id) {
    body.type = "reply";
    body.parent_id = params.parent_id;
  }

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
      platform: "moltx",
      error: data.error?.message || `HTTP ${res.status}`,
    };
  }

  const postId = data.data?.id;
  return {
    success: true,
    platform: "moltx",
    post_id: postId,
    url: postId ? `https://moltx.io/post/${postId}` : undefined,
  };
}
