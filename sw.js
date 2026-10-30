const CACHE = "snake-classic-v14";
const V = "?v=20261030-1";
const ARCADE_V = "?v=20261027-2";
const ARCADE_V3 = "?v=20261027-3";
const GAME_V = "?v=20261026-5";
const CASINO_V = "?v=20261027-5";
const CASINO_CSS_V = "?v=20261027-6";
const ASSETS = [
  "./",
  "./index.html",
  "./arcade/",
  "./games/merge-2048/",
  "./games/minesweeper/",
  "./games/memory-match/",
  "./games/paddle-duel/",
  "./games/wordle/",
  "./games/tetris/",
  "./games/breakout/",
  "./games/sokoban/",
  "./games/gomoku/",
  "./games/game-of-life/",
  "./games/space-shooter/",
  "./games/tower-defense/",
  "./games/endless-runner/",
  "./games/falling-sand/",
  "./games/hangman/",
  "./games/connect-four/",
  "./games/sudoku/",
  "./games/slide-puzzle/",
  "./games/maze/",
  "./games/pong/",
  "./games/tic-tac-toe/",
  "./casino/",
  "./casino/blackjack/",
  "./casino/roulette/",
  "./casino/video-poker/",
  "./404.html",
  "./assets/style.css" + V,
  "./assets/game.js" + GAME_V,
  "./assets/shared/arcade.css" + ARCADE_V,
  "./assets/shared/arcade.js" + ARCADE_V,
  "./assets/shared/arcade.css" + ARCADE_V3,
  "./assets/shared/arcade.js" + ARCADE_V3,
  "./assets/games/merge-2048.js" + ARCADE_V,
  "./assets/games/minesweeper.js" + ARCADE_V,
  "./assets/games/memory-match.js" + ARCADE_V,
  "./assets/games/paddle-duel.js" + ARCADE_V,
  "./assets/games/wordle.js" + V,
  "./assets/games/tetris.js" + V,
  "./assets/games/breakout.js" + V,
  "./assets/games/sokoban.js" + V,
  "./assets/games/gomoku.js" + V,
  "./assets/games/game-of-life.js" + V,
  "./assets/games/space-shooter.js" + V,
  "./assets/games/tower-defense.js" + V,
  "./assets/games/endless-runner.js" + V,
  "./assets/games/falling-sand.js" + V,
  "./assets/games/hangman.js" + V,
  "./assets/games/connect-four.js" + V,
  "./assets/games/sudoku.js" + V,
  "./assets/games/slide-puzzle.js" + V,
  "./assets/games/maze.js" + V,
  "./assets/games/pong.js" + V,
  "./assets/games/tic-tac-toe.js" + V,
  "./assets/casino/casino.css" + CASINO_CSS_V,
  "./assets/casino/casino.js" + CASINO_V,
  "./assets/casino/blackjack.js" + CASINO_V,
  "./assets/casino/roulette.js" + CASINO_V,
  "./assets/casino/video-poker.js" + CASINO_V,
  "./assets/favicon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./assets/og-image.png",
  "./assets/arcade-og.png",
  "./assets/casino-og.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => cached || caches.match("./").then((home) => home || Response.error()))
    );
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
      }
      return response;
    });
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
