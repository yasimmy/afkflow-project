/**
 * Lightweight sound hook.
 * Sounds are loaded once, cached, and replayed on demand.
 */

const cache = new Map<string, HTMLAudioElement>();

function getAudio(src: string): HTMLAudioElement {
  if (!cache.has(src)) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    cache.set(src, audio);
  }
  return cache.get(src)!;
}

function play(src: string, volume = 1, allowOverlap = true) {
  try {
    const audio = getAudio(src);
    audio.volume = Math.max(0, Math.min(1, volume));
    if (!allowOverlap) {
      audio.currentTime = 0;
      void audio.play();
    } else if (!audio.paused) {
      // Allow rapid re-play by cloning if currently playing
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = audio.volume;
      void clone.play();
    } else {
      audio.currentTime = 0;
      void audio.play();
    }
  } catch {
    // Ignore: user hasn't interacted yet or file missing
  }
}

let lastHoverSoundAt = 0;
const HOVER_SOUND_COOLDOWN_MS = 70;

function playHoverSound() {
  const now = performance.now();
  if (now - lastHoverSoundAt < HOVER_SOUND_COOLDOWN_MS) return;
  lastHoverSoundAt = now;
  play('/sounds/hover.wav', 0.3, false);
}

export const Sounds = {
  hover:    playHoverSound,
  click:    () => play('/sounds/click.wav',    0.2),
  botStart: () => play('/sounds/bot_start.mp3', 0.5),
} as const;

// ─── Global hover sound ───────────────────────────────────────────────────────
// Call once at app startup. Sounds are delegated here so dynamically rendered
// controls and controls outside the shared UI components behave consistently.

const HOVER_SELECTOR = 'button:not(:disabled), a[href], [role="button"], select, [data-sound-hover]';
const CLICK_SELECTOR = 'button:not(:disabled), a[href], [role="button"], select';

let _globalHoverInstalled = false;

export function installGlobalHoverSound(): void {
  if (_globalHoverInstalled || typeof document === 'undefined') return;
  _globalHoverInstalled = true;

  document.addEventListener('mouseover', (e) => {
    const target = e.target as Element | null;
    if (!target) return;
    const el = target.closest(HOVER_SELECTOR) as HTMLElement | null;
    if (!el) return;
    // Skip if pointer is still over the same element (avoid re-firing on child enter)
    const related = e.relatedTarget as Element | null;
    if (related && el.contains(related)) return;
    Sounds.hover();
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const el = target?.closest(CLICK_SELECTOR) as HTMLElement | null;
    if (!el || el.hasAttribute('data-sound-click')) return;
    Sounds.click();
  }, { passive: true });
}
