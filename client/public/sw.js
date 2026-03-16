self.addEventListener("push", (event) => {
  let data = { title: "Orbia", body: "Your agent has an update." };
  try {
    data = event.data.json();
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Orbia", {
      body: data.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
