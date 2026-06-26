/*
 * HealthSync minimal service worker.
 * Goals: safe, tiny, defensive. A broken SW is worse than no SW, so every
 * handler is wrapped in try/catch and anything unexpected falls through to
 * the network. Supabase / API / auth traffic is never touched.
 */

const CACHE = "healthsync-shell-v1";

// Only cache things that are very likely to exist. Failures are tolerated.
const APP_SHELL = ["/", "/home", "/today", "/offline"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        // Cache each entry independently so one 404 doesn't abort the rest.
        await Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch(() => {
              /* tolerate missing routes */
            })
          )
        );
      } catch (e) {
        /* never block install */
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Drop old shell caches from previous versions.
        const keys = await caches.keys();
        await Promise.all(
          keys.map((k) => (k !== CACHE ? caches.delete(k) : Promise.resolve()))
        );
      } catch (e) {
        /* ignore */
      }
      try {
        await self.clients.claim();
      } catch (e) {
        /* ignore */
      }
    })()
  );
});

function shouldBypass(request, url) {
  // Only ever touch GET requests.
  if (request.method !== "GET") return true;
  // Only same-origin; never cross-origin (CDNs, Supabase, fonts, etc.).
  if (url.origin !== self.location.origin) return true;
  // Never interfere with API / auth / Supabase-style paths.
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.hostname.endsWith(".supabase.co")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  let request;
  let url;
  try {
    request = event.request;
    url = new URL(request.url);
  } catch (e) {
    return; // can't parse — let the browser handle it
  }

  if (shouldBypass(request, url)) return; // default browser behaviour

  // Network-first for page navigations, with a cached / offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          try {
            const cache = await caches.open(CACHE);
            cache.put(request, fresh.clone());
          } catch (e) {
            /* ignore cache write errors */
          }
          return fresh;
        } catch (e) {
          // Offline: try this page from cache, then the offline page, then "/".
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          const root = await caches.match("/");
          if (root) return root;
          return new Response(
            "<h1>You're offline</h1>",
            { status: 503, headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
  }
  // For all other same-origin GETs (assets, etc.) we do nothing special and
  // let the browser handle them normally.
});
