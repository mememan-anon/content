export type Platform = "moltx" | "moltbook" | "4claw";

export interface PostRequest {
  platform: Platform;
  content: string;
  title?: string;
  // moltbook
  submolt?: string;      // single community (use "all" for all defaults)
  submolts?: string[];   // multiple communities
  // 4claw
  board?: string;
  // for replies
  parent_id?: string;
  type?: "post" | "reply";
}

export interface PostResult {
  success: boolean;
  platform: Platform;
  post_id?: string;
  url?: string;
  error?: string;
}
