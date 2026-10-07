(function () {
"use strict";
// SplitText helpers — the one headline reveal reused everywhere.
const { DUR, STAGGER, START, EASE } = window.Brew.motion;

/**
 * Scroll-triggered headline reveal. Lines mask up (yPercent 110 → 0).
 * autoSplit re-splits on resize / font load and rebuilds the tween.
 */
function headlineReveal(el, { trigger = el, start = START, delay = 0, onComplete } = {}) {
  const { gsap, SplitText } = window;
  return SplitText.create(el, {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { visibility: "visible" });
      return gsap.from(self.lines, {
        yPercent: 110,
        duration: DUR.macro,
        ease: EASE,
        stagger: STAGGER.lines,
        delay,
        onComplete,
        scrollTrigger: { trigger, start, toggleActions: "play none none none" },
      });
    },
  });
}

/**
 * Split once (no autoSplit) and hand the lines back so a caller can place the
 * reveal inside its own timeline. Use for headings with hard <br> breaks.
 */
function splitLines(el) {
  const { gsap, SplitText } = window;
  const split = SplitText.create(el, { type: "lines", mask: "lines" });
  gsap.set(el, { visibility: "visible" });
  gsap.set(split.lines, { yPercent: 110 });
  return split;
}

/** Tween for lines produced by splitLines(). */
function linesIn(lines, vars = {}) {
  const { gsap } = window;
  return gsap.to(lines, {
    yPercent: 0,
    duration: DUR.macro,
    ease: EASE,
    stagger: STAGGER.lines,
    ...vars,
  });
}

/** Split into masked characters (footer wordmark). */
function splitChars(el) {
  const { SplitText } = window;
  return SplitText.create(el, { type: "chars", mask: "chars" });
}
window.Brew.split = { headlineReveal, splitLines, linesIn, splitChars };
})();
