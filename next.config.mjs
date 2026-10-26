import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * Old entry pages now live in the A5 hubs. Sources are exact paths (no `:path*`),
 * so session URLs such as /pronunciation/<id> never match; Next.js forwards the
 * original query string (?topic=, ?search=, ?level=) to the destination.
 */
export const hubRedirects = [
  { source: "/vocabulary-learning", destination: "/vocabulary?mode=learn", permanent: true },
  { source: "/pronunciation", destination: "/vocabulary?mode=pronounce", permanent: true },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["ffmpeg-static"],
  async redirects() {
    return hubRedirects;
  },
};

export default (phase) => ({
  ...nextConfig,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});
