let staticCacheName = "v1";
let allCaches = [
  "./index.html",
  "./restaurant.html",
  "./css/styles.css",
  "./js/main.js",
  "./js/dbhelper.js",
  "./js/restaurant_info.js",
  "./img/1.jpg",
  "./img/2.jpg",
  "./img/3.jpg",
  "./img/4.jpg",
  "./img/5.jpg",
  "./img/6.jpg",
  "./img/7.jpg",
  "./img/8.jpg",
  "./img/9.jpg",
  "./img/10.jpg",
  "./data/restaurants.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(staticCacheName).then(cache => {
      return cache.addAll(allCaches);
    })
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== staticCacheName) {
            console.log("deleting cacheName");
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(response => {
      if (response) return response;
      return fetch(e.request);
    })
  );
});
