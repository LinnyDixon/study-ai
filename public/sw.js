self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; }
  catch { message = { body: event.data ? event.data.text() : "Tienes una novedad en STUDY AI." }; }

  event.waitUntil(self.registration.showNotification(message.title || "STUDY AI", {
    body: message.body || "Tienes una novedad en STUDY AI.",
    icon: message.icon || "/study-ai-icon-192.png",
    badge: "/study-ai-icon-192.png",
    data: { url: message.url || "/app" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/app", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        if ("navigate" in client) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
