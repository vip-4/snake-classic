/* Shared arcade helpers: storage, synthesised audio, accessibility and PWA.
   Each game still owns its rules; this file only removes boilerplate. */
(() => {
  "use strict";

  const script = document.currentScript;
  let root = (script && script.dataset.root) || "./";
  if (!root.endsWith("/")) root += "/";

  const Arcade = (window.Arcade = window.Arcade || {});
  Arcade.root = root;
  Arcade.debug = new URLSearchParams(window.location.search).has("debug");

  const SOUND_KEY = "arcade:sound";

  function read(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      /* private mode or storage disabled: keep the session working */
    }
  }

  Arcade.storage = {
    get(key, fallback = null) {
      return read(key, fallback);
    },
    set: write,
    getNumber(key, fallback = 0) {
      const value = Number(read(key, fallback));
      return Number.isFinite(value) ? value : fallback;
    },
    setNumber(key, value) {
      write(key, Math.round(Number(value) || 0));
    },
    getBool(key, fallback = false) {
      const value = read(key, null);
      return value === null ? fallback : value === "1" || value === "true";
    },
    setBool(key, value) {
      write(key, value ? "1" : "0");
    },
    getJSON(key, fallback = null) {
      const value = read(key, null);
      if (value === null) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    setJSON(key, value) {
      write(key, JSON.stringify(value));
    }
  };

  let audioCtx = null;
  const sound = {
    enabled: Arcade.storage.getBool(SOUND_KEY, true),
    ensure() {
      if (!sound.enabled) return null;
      if (audioCtx) {
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }
        return audioCtx;
      }
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      try {
        audioCtx = new AudioCtor();
        return audioCtx;
      } catch {
        return null;
      }
    },
    tone(freq, duration = 0.08, type = "square", volume = 0.04, endFreq = null) {
      if (!sound.enabled) return;
      const ac = sound.ensure();
      if (!ac) return;
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const now = ac.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, freq), now);
        if (endFreq) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
        }
        gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain).connect(ac.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
      } catch {
        /* audio is a progressive enhancement */
      }
    },
    setEnabled(value) {
      sound.enabled = Boolean(value);
      Arcade.storage.setBool(SOUND_KEY, sound.enabled);
      if (sound.enabled) sound.ensure();
    },
    toggle() {
      sound.setEnabled(!sound.enabled);
      return sound.enabled;
    }
  };
  Arcade.sound = sound;

  Arcade.bindSound = function bindSound(button, label) {
    if (!button) return;
    const sync = () => {
      button.setAttribute("aria-pressed", String(sound.enabled));
      const icon = button.querySelector("[data-sound-icon]");
      if (icon) icon.textContent = sound.enabled ? "🔊" : "🔇";
      if (label) label.textContent = sound.enabled ? "音效开" : "音效关";
      button.setAttribute("aria-label", sound.enabled ? "音效开，点击关闭音效" : "音效关，点击开启音效");
    };
    sync();
    button.addEventListener("click", () => {
      const on = sound.toggle();
      sync();
      if (on) sound.tone(620, 0.06, "sine", 0.03, 840);
    });
  };

  Arcade.announce = function announce(element, message) {
    if (!element) return;
    element.textContent = "";
    window.setTimeout(() => {
      element.textContent = message;
    }, 20);
  };

  Arcade.formatTime = function formatTime(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  };

  Arcade.shuffle = function shuffle(items) {
    const list = items.slice();
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  Arcade.reducedMotion = function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  Arcade.focusWithoutScroll = function focusWithoutScroll(element) {
    if (element && typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
  };

  Arcade.bindHeader = function bindHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  };

  Arcade.registerServiceWorker = function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(root + "sw.js").catch(() => {
        /* offline support is optional */
      });
    });
  };

  Arcade.bindHeader();
  Arcade.registerServiceWorker();
})();
