/**
 * IWKBU Terminal — Service Worker
 *
 * Strategies:
 *   - App shell (/login)      → precache on install
 *   - Static assets (/_next)  → cache-first (immutable, fingerprinted)
 *   - Supabase storage images → stale-while-revalidate
 *   - Navigation requests     → network-first, offline fallback to cache
 *   - API (/api/*)            → network-only
 *
 * Web Push:
 *   - 'push' event   → show Notification with JR icon
 *   - 'notificationclick' → focus tab or open link
 */

const CACHE_VERSION = "iwkbu-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Routes to precache on install (app shell)
const SHELL_ROUTES = ["/login", "/"];

// Static asset patterns (cache-first)
const STATIC_PATTERNS = ["/_next/static/"];

// Image patterns (stale-while-revalidate)
const IMAGE_PATTERNS = ["/_next/image", "supabase.co/storage/v1/object/"];

// ════════════════════════════════════════════════════════════
// INSTALL — precache app shell
// ════════════════════════════════════════════════════════════
self.addEventListener("install", (event) => {
   event.waitUntil(
      (async () => {
         const cache = await caches.open(SHELL_CACHE);
         await cache.addAll(SHELL_ROUTES).catch(() => {});
         self.skipWaiting();
      })(),
   );
});

// ════════════════════════════════════════════════════════════
// ACTIVATE — cleanup old caches
// ════════════════════════════════════════════════════════════
self.addEventListener("activate", (event) => {
   event.waitUntil(
      (async () => {
         const keys = await caches.keys();
         await Promise.all(
            keys
               .filter((key) => !key.startsWith(CACHE_VERSION))
               .map((key) => caches.delete(key)),
         );
         await self.clients.claim();
      })(),
   );
});

// ════════════════════════════════════════════════════════════
// FETCH — route to cache strategy
// ════════════════════════════════════════════════════════════
self.addEventListener("fetch", (event) => {
   const { request } = event;

   // Only handle GET
   if (request.method !== "GET") return;

   const url = new URL(request.url);

   // Skip cross-origin requests (except Supabase storage)
   if (url.origin !== self.location.origin && !IMAGE_PATTERNS.some((p) => url.href.includes(p))) {
      return;
   }

   // Skip API routes (network-only)
   if (url.pathname.startsWith("/api/")) return;

   // Skip Supabase Realtime (wss://)
   if (url.protocol === "ws:" || url.protocol === "wss:") return;

   // Static assets → cache-first
   if (STATIC_PATTERNS.some((p) => url.pathname.startsWith(p))) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
   }

   // Supabase images → stale-while-revalidate
   if (IMAGE_PATTERNS.some((p) => url.href.includes(p))) {
      event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
      return;
   }

   // Navigation requests → network-first with offline fallback
   if (request.mode === "navigate") {
      event.respondWith(networkFirstNavigation(request));
      return;
   }
});

// ════════════════════════════════════════════════════════════
// PUSH — show notification
// ════════════════════════════════════════════════════════════
self.addEventListener("push", (event) => {
   let payload = { title: "IWKBU Terminal", body: "Notifikasi baru", url: "/" };
   try {
      if (event.data) payload = { ...payload, ...event.data.json() };
   } catch {
      if (event.data) payload.body = event.data.text();
   }

   const options = {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag || "iwkbu",
      data: { url: payload.url || "/" },
      requireInteraction: false,
      silent: false,
   };

   event.waitUntil(self.registration.showNotification(payload.title, options));
});

// ════════════════════════════════════════════════════════════
// NOTIFICATION CLICK — focus tab or open link
// ════════════════════════════════════════════════════════════
self.addEventListener("notificationclick", (event) => {
   event.notification.close();
   const targetUrl = event.notification.data?.url || "/";

   event.waitUntil(
      (async () => {
         const allClients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
         });

         // Focus existing tab if one is open on same origin
         for (const client of allClients) {
            if (client.url.includes(self.location.origin)) {
               if ("focus" in client) {
                  client.focus();
                  if ("navigate" in client) {
                     await client.navigate(targetUrl);
                  }
                  return;
               }
            }
         }

         // No existing tab → open new window
         if (self.clients.openWindow) {
            await self.clients.openWindow(targetUrl);
         }
      })(),
   );
});

// ════════════════════════════════════════════════════════════
// MESSAGE — handle SKIP_WAITING from page
// ════════════════════════════════════════════════════════════
self.addEventListener("message", (event) => {
   if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ════════════════════════════════════════════════════════════
// Cache strategy helpers
// ════════════════════════════════════════════════════════════

async function cacheFirst(request, cacheName) {
   const cache = await caches.open(cacheName);
   const cached = await cache.match(request);
   if (cached) return cached;
   try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
   } catch {
      return cached || new Response("Offline", { status: 503 });
   }
}

async function staleWhileRevalidate(request, cacheName) {
   const cache = await caches.open(cacheName);
   const cached = await cache.match(request);
   const fetchPromise = fetch(request)
      .then((response) => {
         if (response.ok) cache.put(request, response.clone());
         return response;
      })
      .catch(() => cached);
   return cached || fetchPromise;
}

async function networkFirstNavigation(request) {
   const cache = await caches.open(SHELL_CACHE);
   try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
   } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      // Fallback to /login if nothing cached
      const loginPage = await cache.match("/login");
      if (loginPage) return loginPage;
      return new Response(
         "<html><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8'><div style='text-align:center'><h2>Anda sedang offline</h2><p>Periksa koneksi internet dan coba lagi.</p></div></body></html>",
         { headers: { "Content-Type": "text/html" } },
      );
   }
}
