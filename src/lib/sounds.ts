export type SoundKind =
  | "click"
  | "toggle"
  | "tab"
  | "notification"
  | "open"
  | "close"
  | "success"
  | "error"
  | "copy"
  | "theme";

const KEY = "ario-ui-sounds";
const VOLUME_KEY = "ario-ui-volume";

let audio: AudioContext | null = null;

export function soundsEnabled() {
  return typeof window !== "undefined" && localStorage.getItem(KEY) === "on";
}

export function getSoundVolume() {
  if (typeof window === "undefined") return 0.45;

  const value = Number(localStorage.getItem(VOLUME_KEY));

  return Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0.45;
}

export function setSoundVolume(value: number) {
  const next = Math.min(1, Math.max(0, value));

  localStorage.setItem(VOLUME_KEY, String(next));
  window.dispatchEvent(new Event("ario-appearance"));
}

export function setSoundsEnabled(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event("ario-appearance"));

  if (enabled) {
    playSound("toggle", true);
  }
}

export function playSound(kind: SoundKind, force = false) {
  if ((!force && !soundsEnabled()) || typeof window === "undefined") {
    return;
  }

  try {
    audio ??= new AudioContext();

    if (audio.state === "suspended") {
      void audio.resume();
    }

    const now = audio.currentTime;

    const notes: Record<SoundKind, [number, number]> = {
      click: [490, 660],
      toggle: [440, 820],
      tab: [360, 560],
      notification: [700, 1040],
      open: [420, 760],
      close: [680, 360],
      success: [620, 920],
      error: [260, 180],
      copy: [560, 840],
      theme: [430, 780],
    };

    const [first, second] = notes[kind];

    for (const [i, frequency] of [first, second].entries()) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + i * 0.055);

      gain.gain.setValueAtTime(0.0001, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(
        0.045 * getSoundVolume(),
        now + i * 0.055 + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + i * 0.055 + 0.095,
      );

      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now + i * 0.055);
      oscillator.stop(now + i * 0.055 + 0.1);
    }
  } catch {
    // Sound is optional when browser audio is unavailable.
  }
}

export function installUISounds() {
  const onClick = (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    const control = target.closest(
      'button, a, [role="tab"], input[type="checkbox"], input[type="radio"], summary',
    );

    if (!control || control.matches(":disabled, [aria-disabled='true']")) {
      return;
    }

    if (control.matches('input[type="checkbox"], input[type="radio"]')) {
      return;
    }

    const kind: SoundKind =
      control.matches('[role="switch"]')
        ? "toggle"
        : control.matches('[role="tab"], a')
          ? "tab"
          : control.matches('[aria-expanded="true"]')
            ? "close"
            : control.matches('[aria-expanded="false"], [aria-haspopup]')
              ? "open"
              : "click";

    playSound(kind);
  };

  const onChange = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.matches(
        'select, input[type="checkbox"], input[type="radio"]',
      )
    ) {
      playSound("toggle");
    }
  };

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("change", onChange);
  };
}
