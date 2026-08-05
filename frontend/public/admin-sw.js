// Minimal service worker, scoped to /admin only, required by Chrome for the
// "Add to Home screen" / installable-PWA criteria. No offline caching of API
// data on purpose: admin data (stock, orders) must always be fresh.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass-through network fetch; presence of a fetch handler is what
  // satisfies the installability requirement.
  event.respondWith(fetch(event.request));
});
