(function () {
"use strict";
// Contract Manufacturing page — page intro, per-partner reveals, card hovers, index.
const { boot, state } = window.Brew;
const { DUR, STAGGER, EASE, drawBox } = window.Brew.motion;
const { splitLines, linesIn } = window.Brew.split;

const { gsap, ScrollTrigger } = window;
const $ = (sel, root) => root.querySelector(sel);
const $$ = (sel, root) => [...root.querySelectorAll(sel)];

boot({
  preloader: false,
  init(c) {
    const cleanups = [initIntro(c), ...$$("[data-partner]", document).map((p) => initPartner(p, c)), initIndex(c)];
    return () => cleanups.forEach((fn) => typeof fn === "function" && fn());
  },
});

/* Page intro ----------------------------------------------------------------- */
function initIntro(c) {
  const header = document.querySelector(".cm-hero");
  const navInner = document.querySelector(".nav__inner");
  if (!header) return;
  if (c.reduce) {
    gsap.set(navInner, { autoAlpha: 1 });
    return;
  }

  const split = splitLines($(".cm-hero__title", header));
  const tl = gsap.timeline({ paused: true, delay: 0.1 })
    .add(linesIn(split.lines), 0)
    .fromTo($(".cm-hero__aside", header), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE }, 0.5)
    .fromTo(navInner, { autoAlpha: 0, yPercent: -60 }, { autoAlpha: 1, yPercent: 0, duration: DUR.body, ease: EASE }, 0.8);
  state.introReady.then(() => tl.play()); // waits for the age gate when it's shown

  return () => split.revert();
}

/* Partner block ---------------------------------------------------------------- */
function initPartner(section, c) {
  const index = $(".partner__index", section);
  const name = $(".partner__name", section);
  const panel = $(".brand-panel", section);
  const logo = $("img", panel);
  const cards = $$(".pcard", section);
  const desc = $(".partner__desc", section);
  const boxes = [...cards.map((card) => $(".line-box", card)), $(".line-box", desc)];

  if (c.reduce) return;

  // Label and name from opposite sides.
  gsap.timeline({ scrollTrigger: { trigger: section, start: "top 80%", toggleActions: "play none none none" } })
    .fromTo(index, { xPercent: -60, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: DUR.macro, ease: EASE }, 0)
    .fromTo(name, { xPercent: 30, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: DUR.macro, ease: EASE }, 0);

  // Brand panel wipes in, logo settles.
  gsap.timeline({ scrollTrigger: { trigger: panel, start: "top 82%", toggleActions: "play none none none" } })
    .fromTo(panel, { clipPath: "inset(0% 100% 0% 0% round 8px)" }, { clipPath: "inset(0% 0% 0% 0% round 8px)", duration: DUR.macro, ease: "power3.inOut" })
    .fromTo(logo, { scale: 0.85, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: DUR.macro, ease: EASE }, 0.5);

  // Product cards: border draws, then content staggers, bottles rise and settle.
  cards.forEach((card, i) => {
    const img = $(".pcard__lift img", card);
    const text = $$(".pcard__name, .pcard__size", card);
    const dot = $(".pcard__dot", card);
    gsap.timeline({ delay: (i % 2) * STAGGER.cards, scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" } })
      .add(drawBox($(".line-box", card)), 0)
      .fromTo(img, { y: 60, rotation: 4, autoAlpha: 0 }, { y: 0, rotation: 0, autoAlpha: 1, duration: DUR.macro, ease: EASE }, 0.35)
      .fromTo(text, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: DUR.body, ease: EASE, stagger: 0.08 }, 0.55)
      .fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2.5)" }, 0.8);
  });

  // Description strip: border, text, then the two corner dots.
  gsap.timeline({ scrollTrigger: { trigger: desc, start: "top 88%", toggleActions: "play none none none" } })
    .add(drawBox($(".line-box", desc)), 0)
    .fromTo($("p", desc), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: DUR.body, ease: EASE }, 0.4)
    .fromTo($$(".partner__dot", desc), { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2.5)", stagger: 0.12 }, 0.9);

  // Card hover: product lifts and tilts, soft shadow, dot grows.
  const offs = [];
  if (c.finePointer) {
    cards.forEach((card) => {
      const lift = $(".pcard__lift", card);
      const dot = $(".pcard__dot", card);
      const enter = () => {
        gsap.to(lift, { y: -10, rotation: -3, filter: "drop-shadow(0px 18px 16px rgba(60, 35, 10, 0.22))", duration: DUR.micro, ease: EASE, overwrite: "auto" });
        gsap.to(dot, { scale: 1.5, duration: DUR.micro, ease: EASE, overwrite: "auto" });
      };
      const leave = () => {
        gsap.to(lift, { y: 0, rotation: 0, filter: "drop-shadow(0px 0px 0px rgba(60, 35, 10, 0))", duration: DUR.micro, ease: EASE, overwrite: "auto" });
        gsap.to(dot, { scale: 1, duration: DUR.micro, ease: EASE, overwrite: "auto" });
      };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointerleave", leave);
      offs.push(() => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointerleave", leave);
      });
    });
  }

  return () => {
    offs.forEach((f) => f());
    boxes.forEach((b) => b.classList.remove("is-drawable"));
  };
}

/* Partner index ---------------------------------------------------------------- */
function initIndex(c) {
  const links = $$(".cm-index a", document);
  if (!links.length) return;
  const triggers = links.map((a) => {
    const section = document.getElementById(a.dataset.index);
    return ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => a.classList.toggle("is-active", self.isActive),
    });
  });
  if (!c.reduce) {
    gsap.from(links, { autoAlpha: 0, x: -12, duration: DUR.body, ease: EASE, stagger: 0.08, delay: 1 });
  }
  return () => triggers.forEach((t) => t.kill());
}
})();
