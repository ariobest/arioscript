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
  | "theme"
  | "hover"
  | "press"
  | "success2"
  | "warning"
  | "unlock"
  | "delete"
  | "navigate";

const KEY = "ario-ui-sounds";
const VOLUME_KEY = "ario-ui-volume";

let audio: AudioContext | null = null;
let lastHoverAt = 0;

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
      hover: [420, 470],
      press: [220, 300],
      success2: [520, 760],
      warning: [310, 250],
      unlock: [520, 1040],
      delete: [240, 150],
      navigate: [390, 590],
    };

    const [first, second] = notes[kind];

    for (const [i, frequency] of [first, second].entries()) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + i * 0.055;

      oscillator.type = kind === "error" || kind === "delete" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        0.075 * getSoundVolume(),
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.095);

      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.1);
    }
  } catch {
    // Sound is optional when browser audio is unavailable.
  }
}

function getInteractive(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const control = target.closest(
    'button, a, [role="button"], [role="tab"], [role="switch"], summary',
  );

  if (!control || control.matches(":disabled, [aria-disabled='true']")) {
    return null;
  }

  // Keep actual editable/copyable content fully usable.
  if (
    control.closest(
      'input, textarea, pre, code, [contenteditable="true"], [data-allow-copy="true"]',
    )
  ) {
    return null;
  }

  return control;
}

function vibrate(duration = 8) {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Haptics are optional.
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

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;

    const control = getInteractive(event.target);
    if (!control) return;

    const now = performance.now();
    if (now - lastHoverAt < 70) return;

    lastHoverAt = now;
    playSound("hover");
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;

    const control = getInteractive(event.target);
    if (!control) return;

    playSound("press");
    vibrate(8);
  };

  const onContextMenu = (event: MouseEvent) => {
    const control = getInteractive(event.target);
    if (!control) return;

    // Prevent long-press/right-click menus on UI controls, while
    // preserving copy/select everywhere users actually edit or copy text.
    event.preventDefault();
  };

  const onSelectStart = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const control = getInteractive(target);
    if (control) {
      event.preventDefault();
    }
  };

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("pointerover", onPointerOver, { passive: true });
  document.addEventListener("pointerdown", onPointerDown, { passive: true });
  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("selectstart", onSelectStart);

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("change", onChange);
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("selectstart", onSelectStart);
  };
}
