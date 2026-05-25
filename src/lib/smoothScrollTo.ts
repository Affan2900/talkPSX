import { animate, type AnimationPlaybackControls } from "framer-motion";

let activeScroll: AnimationPlaybackControls | null = null;

export function smoothScrollToY(targetY: number, duration = 0.8) {
  activeScroll?.stop();
  activeScroll = animate(window.scrollY, targetY, {
    duration,
    ease: [0.22, 1, 0.36, 1],
    onUpdate: (y) => window.scrollTo(0, y),
    onComplete: () => {
      activeScroll = null;
    },
  });
}

export function smoothScrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY;
  smoothScrollToY(y);
}
