export const SOCIAL_LINKS = {
  x: "https://x.com/lilixywallet",
  discord: "https://discord.gg/uuNGu47RDy",
  email: "lilixywallet@proton.me",
} as const;

export type SocialLinkKey = keyof typeof SOCIAL_LINKS;
