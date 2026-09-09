// Runs in its own background thread, separate from any open tab — this is
// what lets a push notification arrive even when the app isn't open.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Dnevnik radova";
  const body = data.body || "";

  // No custom icon yet — the browser falls back to its own default. Add an
  // `icon: "/icon.png"` option here once the client has real branding assets.
  event.waitUntil(self.registration.showNotification(title, { body }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
