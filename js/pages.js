(function () {
"use strict";
// Shared motion for the Careers + Contact pages, in the site's vocabulary:
// header lines mask up, section headings reveal, hairline cards draw in.

const { state } = window.Brew;
const { DUR, STAGGER, EASE, drawBox } = window.Brew.motion;
const { splitLines, linesIn, headlineReveal } = window.Brew.split;
const { gsap } = window;

/** Page header: title lines, aside, then the nav — after the age gate if shown. */
function intro(c) {
  const header = document.querySelector(".page-hero");
  const navInner = document.querySelector(".nav__inner");
  if (!header) return;
  if (c.reduce) {
    gsap.set(navInner, { autoAlpha: 1 });
    return;
  }
  const split = splitLines(header.querySelector(".page-hero__title"));
  const tl = gsap.timeline({ paused: true, delay: 0.1 })
    .add(linesIn(split.lines), 0)
    .fromTo(header.querySelector(".page-hero__aside"), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE }, 0.5)
    .fromTo(navInner, { autoAlpha: 0, yPercent: -60 }, { autoAlpha: 1, yPercent: 0, duration: DUR.body, ease: EASE }, 0.8);
  state.introReady.then(() => tl.play());
  return () => split.revert();
}

/** Section headings (every [data-split] except the page title). */
function headings(c) {
  if (c.reduce) return;
  document.querySelectorAll("main [data-split]").forEach((el) => {
    if (!el.closest(".page-hero")) headlineReveal(el);
  });
}

/** Hairline cards: border draws (top+left, then right+bottom), content rises.
 *  Cards that sit side by side in a row cascade by STAGGER.cards. */
function cards(c) {
  const all = [...document.querySelectorAll("[data-card]")];
  if (c.reduce) return;
  all.forEach((card) => {
    const siblings = [...card.parentElement.querySelectorAll(":scope > [data-card]")];
    const content = [...card.children].filter((el) => !el.classList.contains("line-box") && !el.hidden);
    gsap.timeline({
      delay: siblings.length > 1 ? siblings.indexOf(card) * STAGGER.cards : 0,
      scrollTrigger: { trigger: card.parentElement, start: "top 85%", toggleActions: "play none none none" },
    })
      .add(drawBox(card.querySelector(".line-box")), 0)
      .fromTo(content, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: STAGGER.lines }, 0.35);
  });
  return () => all.forEach((card) => card.querySelector(".line-box")?.classList.remove("is-drawable"));
}

/** Images (and placeholder slots): clip-path wipes up while the picture settles
 *  from 1.2× scale (the site's image reveal), then a gentle scroll parallax. */
function media(c) {
  if (c.reduce) return;
  document.querySelectorAll("[data-media]").forEach((fig, i) => {
    const inner = fig.querySelector(".media__inner");
    const pic = inner.firstElementChild;
    const row = fig.parentElement.classList.contains("gallery") ? [...fig.parentElement.children].indexOf(fig) : 0;
    gsap.timeline({ delay: row * STAGGER.cards, scrollTrigger: { trigger: fig, start: "top 85%", toggleActions: "play none none none" } })
      .fromTo(fig, { clipPath: "inset(100% 0% 0% 0% round 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: DUR.macro, ease: "power3.inOut" })
      .fromTo(pic, { scale: 1.2 }, { scale: 1, duration: 1.6, ease: EASE }, 0);
    gsap.fromTo(inner, { yPercent: -5 }, {
      yPercent: 5,
      ease: "none",
      scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

window.Brew.pages = { intro, headings, cards, media };
})();
