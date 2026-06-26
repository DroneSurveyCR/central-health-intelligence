import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co").host;
  } catch {
    return "placeholder.supabase.co";
  }
})();

// CSP tuned for this app: Next inline bootstrap, three.js/WebGL (wasm + blob workers),
// heavy inline styles, Google Fonts (@import in globals.css), Supabase REST+Realtime, and
// Supabase Storage images (practice logo / media).
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `img-src 'self' data: blob: https://${supabaseHost}`,
  `media-src 'self' blob: https://${supabaseHost}`,
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

// /bodymap is the self-hosted three.js anatomy viewer (real organ GLBs). It loads
// three@0.160 from unpkg via an ES importmap and must be framable same-origin by the
// app's /body pages — so it gets its own relaxed CSP + SAMEORIGIN framing.
const bodymapCsp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://unpkg.com`,
  `worker-src 'self' blob:`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `img-src 'self' data: blob:`,
  `connect-src 'self' https://unpkg.com`,
  `frame-ancestors 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

const bodymapHeaders = [
  { key: "Content-Security-Policy", value: bodymapCsp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // pdf-parse uses Node-only C++ bindings (@napi-rs/canvas); exclude from bundle
  // so Next.js requires it at runtime rather than trying to webpack it.
  serverExternalPackages: ["pdf-parse"],

  // Run middleware on the Node.js runtime — the Supabase SSR client isn't accepted
  // by Vercel's Edge bundler. (Pairs with `runtime: "nodejs"` in middleware.ts.)
  experimental: { nodeMiddleware: true },

  async headers() {
    return [
      { source: "/bodymap/:path*", headers: bodymapHeaders },
      { source: "/((?!bodymap).*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
