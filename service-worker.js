const CACHE_NAME = "study-timer-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Instala e cria cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Intercepta fetch (offline)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Recebe mensagens do script.js e mostra notificação
self.addEventListener("message", event => {
  if (event.data && event.data.type === "notify") {
    self.registration.showNotification("Study Timer", {
      body: event.data.text,
      icon: "icon-192.png",
      badge: "icon-192.png",
      vibrate: [300, 150, 300],
      tag: "study-timer",
      renotify: true
    });
  }
});
