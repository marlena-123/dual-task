/* ============================================================================
   Service worker for the Dual-Task Probe (Flash) PWA.
   Precaches the app so it launches fully offline from the iPad home screen.
   Bump CACHE_VERSION whenever any cached file changes, then re-open the
   installed app once while online to refresh the cache.
   ============================================================================ */
"use strict";

const CACHE_VERSION = "dualtask-flash-v1";

// All paths relative to this file's location (scope "./").
const PRECACHE_URLS = [
  "./dual_task_mobile_flash.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

// Precache everything on install.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Drop old caches on activate and take control immediately.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cache-first with network fallback. Falls back to the cached app shell for
// navigations when offline (e.g. launching the installed app with no network).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          // Runtime-cache same-origin GETs so repeat visits work offline.
          if (resp && resp.ok && new URL(req.url).origin === self.location.origin) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("./dual_task_mobile_flash.html");
          }
          return Response.error();
        });
    })
  );
});
