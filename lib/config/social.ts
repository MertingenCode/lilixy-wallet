export const SOCIAL_LINKS = {
  x: "https://x.com/lilixywallet",
  discord: "https://discord.gg/lilixy",
  email: "hello@lilixy.app",
} as const;

export type SocialLinkKey = keyof typeof SOCIAL_LINKS;
