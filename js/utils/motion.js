(function () {
"use strict";
// Shared motion vocabulary. Keep this small — consistency over variety.

const DUR = {
  micro: 0.6,
  macro: 1.2,
  body: 0.8,
};

const STAGGER = {
  lines: 0.08,
  cards: 0.12,
};

const START = "top 80%";

const EASE = "brew"; // registered in main.js → CustomEase "0.22,1,0.36,1"

const BREAKPOINTS = {
  isDesktop: "(min-width: 1024px)",
  isMobile: "(max-width: 1023px)",
  isSmall: "(max-width: 767px)",
  finePointer: "(hover: hover) and (pointer: fine)",
  reduce: "(prefers-reduced-motion: reduce)",
};

const prefersReducedMotion = () =>
  window.matchMedia(BREAKPOINTS.reduce).matches;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Body reveal: fade + rise. */
function bodyReveal(targets, vars = {}) {
  const { gsap } = window;
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, ...vars }
  );
}

/** Reduced-motion reveal: simple 0.3s fade, content otherwise in its final state. */
function simpleFade(targets, trigger) {
  const { gsap } = window;
  return gsap.fromTo(
    targets,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      duration: 0.3,
      ease: "none",
      scrollTrigger: trigger ? { trigger, start: "top 90%", toggleActions: "play none none none" } : undefined,
    }
  );
}

/**
 * Counter: tween a proxy and write formatted numbers, snapping to the exact final value.
 */
function countUp(el, vars = {}) {
  const { gsap } = window;
  const end = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const proxy = { v: 0 };
  el.textContent = (0).toFixed(decimals);
  return gsap.to(proxy, {
    v: end,
    duration: 1.8,
    ease: "power2.out",
    ...vars,
    onUpdate() {
      el.textContent = proxy.v.toFixed(decimals);
    },
    onComplete() {
      el.textContent = end.toFixed(decimals);
    },
  });
}

/**
 * Four-hairline box draw: top + left first, then right + bottom.
 * Returns a timeline; caller decides when it plays.
 */
function drawBox(box, vars = {}) {
  const { gsap } = window;
  const [top, left, right, bottom] = box.querySelectorAll(":scope > i");
  const corners = box.querySelector(":scope > b");
  box.classList.add("is-drawable");
  const tl = gsap.timeline(vars);
  tl.fromTo([top, left], { scaleX: 0, scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: EASE })
    .fromTo(corners, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: "none" }, 0.15)
    .fromTo([right, bottom], { scaleX: 0, scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: EASE }, 0.45);
  return tl;
}

/**
 * Split an inline SVG into things to draw (strokes) and things to pop (filled dots).
 */
function svgParts(svg) {
  const all = [...svg.querySelectorAll("path, line, circle, rect, polyline, polygon")];
  const pops = [];
  const strokes = [];
  all.forEach((el) => {
    const fill = el.getAttribute("fill");
    const filled = fill && fill !== "none";
    if (filled && (el.tagName === "circle" || !el.getAttribute("stroke"))) pops.push(el);
    else if (filled) pops.push(el);
    else strokes.push(el);
  });
  return { strokes, pops };
}
window.Brew = window.Brew || {};
window.Brew.motion = { DUR, STAGGER, START, EASE, BREAKPOINTS, prefersReducedMotion, wait, bodyReveal, simpleFade, countUp, drawBox, svgParts };
})();
