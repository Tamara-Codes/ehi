// Runs in its own background thread, separate from any open tab — this is
// what lets a push notification arrive even when the app isn't open.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Dnevnik radova";
  const body = data.body || "";

  event.waitUntil(
    self.registration.showNotification(title, { body, icon: "/icons/icon-192.png" }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
