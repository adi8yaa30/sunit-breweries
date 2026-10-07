(function () {
"use strict";
// Home page — one init function per section, each scoped to its own element.
const { boot, state } = window.Brew;
const { DUR, STAGGER, EASE, START, countUp, drawBox, bodyReveal, svgParts } = window.Brew.motion;
const { headlineReveal, splitLines, linesIn } = window.Brew.split;

const { gsap, ScrollTrigger } = window;
const $ = (sel, root) => root.querySelector(sel);
const $$ = (sel, root) => [...root.querySelectorAll(sel)];

boot({
  preloader: true,
  init(c) {
    const cleanups = [
      initHero(c),
      initAbout(c),
      initPortfolio(c),
      initFeatures(c),
      initDoje(c),
      initWhy(c),
      initFacility(c),
      initProcess(c),
      initMissionVision(c),
      initCta(c),
    ];
    return () => cleanups.forEach((fn) => typeof fn === "function" && fn());
  },
});

/* 01 — Hero ---------------------------------------------------------------- */
function initHero(c) {
  const section = document.querySelector(".hero");
  if (!section) return;
  const navInner = document.querySelector(".nav__inner");
  const title = $(".hero__title", section);
  const tagline = $(".hero__tagline", section);
  const buttons = $$(".hero__ctas .btn", section);
  const media = $(".hero__media", section);
  const mediaInner = $(".hero__media-inner", section);
  const img = $(".hero__img", section);

  if (c.reduce) {
    gsap.set(navInner, { autoAlpha: 1 });
    return;
  }

  const split = splitLines(title);
  gsap.set([tagline, ...buttons, navInner], { autoAlpha: 0 });
  gsap.set(media, { autoAlpha: 1, clipPath: "inset(100% 0% 0% 0%)" });
  gsap.set(img, { scale: 1.25 });

  const tl = gsap.timeline({ paused: true });
  tl.add(linesIn(split.lines), 0)
    .fromTo(tagline, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE }, 0.4)
    .fromTo(buttons, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: STAGGER.cards }, 0.6)
    .to(media, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "power3.inOut" }, 0.3)
    .to(img, { scale: 1, duration: 1.6, ease: EASE }, 0.3)
    .fromTo(navInner, { autoAlpha: 0, yPercent: -60 }, { autoAlpha: 1, yPercent: 0, duration: DUR.body, ease: EASE }, 1.2);

  state.introReady.then(() => tl.play());

  // Scroll: image parallaxes up and scales as it leaves.
  gsap.to(mediaInner, {
    yPercent: -15,
    scale: 1.08,
    ease: "none",
    scrollTrigger: { trigger: media, start: "top top", end: "bottom top", scrub: true },
  });

  return () => split.revert();
}

/* 02 — About --------------------------------------------------------------- */
function initAbout(c) {
  const section = document.querySelector(".about");
  if (!section) return;
  const title = $(".about__title", section);
  const gold = $$(".about__gold", section);
  const svg = $(".about__svg", section);
  const lines = $$(".map__line", svg);
  const district = $(".map__district", svg);
  const pin = $(".map__pin", svg);
  const cards = $$(".metric", section);
  const counters = $$("[data-count]", section);
  const closing = $(".about__closing", section);

  if (c.reduce) {
    gsap.set(gold, { color: "var(--accent-soft)" });
    return;
  }

  // 1. Headline, then gold words tint ink → gold.
  headlineReveal(title, {
    onComplete: () => gsap.to(gold, { color: "#CDA366", duration: DUR.micro, ease: "none", stagger: 0.1 }),
  });

  // 2–3. Map outline draws with scroll; district fills once the draw completes.
  gsap.set(district, { fillOpacity: 0 });
  gsap.set(pin, { autoAlpha: 0 });
  let filled = false;
  const fill = gsap.timeline({ paused: true })
    .to(district, { fillOpacity: 1, duration: 0.8, ease: "power2.out" })
    .fromTo(district, { filter: "drop-shadow(0 0 0px rgba(205,163,102,0))" }, {
      filter: "drop-shadow(0 0 18px rgba(205,163,102,0.95))",
      duration: 0.6, ease: "power2.out", yoyo: true, repeat: 1,
    }, 0.2)
    .to(pin, { autoAlpha: 1, duration: 0.4 }, 0.5)
    .fromTo($("circle", pin), { scale: 0.4 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" }, 0.5);

  gsap.fromTo(lines, { drawSVG: "0%" }, {
    drawSVG: "100%",
    duration: 2,
    ease: "none",
    scrollTrigger: {
      trigger: svg,
      start: "top 70%",
      end: "center center",
      scrub: 0.8,
      onUpdate(self) {
        if (!filled && self.progress > 0.985) {
          filled = true;
          fill.play();
        }
      },
    },
  });

  // 4. Metric cards rise, counters run.
  const metricsTl = gsap.timeline({ scrollTrigger: { trigger: cards[0], start: START, toggleActions: "play none none none" } });
  metricsTl.add(bodyReveal(cards, { y: 40, stagger: STAGGER.cards, duration: 1 }));
  counters.forEach((el, i) => metricsTl.add(countUp(el), 0.2 + Math.floor(i / 1) * 0.06));

  // 5. Closing line last.
  bodyReveal(closing, { scrollTrigger: { trigger: closing, start: "top 88%", toggleActions: "play none none none" } });
}

/* 03 — Portfolio ----------------------------------------------------------- */
function initPortfolio(c) {
  const section = document.querySelector(".portfolio");
  if (!section) return;
  const blocks = $$(".brand-block", section);
  const logos = blocks.map((b) => $("img", b));
  const sub = $(".portfolio__sub", section);

  if (c.reduce) return;

  headlineReveal($(".portfolio__title", section));
  bodyReveal(sub, { delay: 0.3, scrollTrigger: { trigger: sub, start: START, toggleActions: "play none none none" } });

  const from = {
    left: "inset(0% 100% 0% 0%)",
    bottom: "inset(100% 0% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
  };
  const tl = gsap.timeline({ scrollTrigger: { trigger: $(".portfolio__blocks", section), start: "top 75%", toggleActions: "play none none none" } });
  blocks.forEach((b, i) => {
    tl.fromTo(b, { clipPath: from[b.dataset.from] }, { clipPath: "inset(0% 0% 0% 0%)", duration: DUR.macro, ease: "power3.inOut" }, i * 0.15)
      .fromTo(logos[i], { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: DUR.macro, ease: EASE }, i * 0.15 + 0.7);
  });

  // Hover (desktop): hovered block grows, siblings shrink, logo lifts.
  if (!(c.isDesktop && c.finePointer)) return;
  const offs = [];
  const container = $(".portfolio__blocks", section);
  blocks.forEach((b, i) => {
    const enter = () => {
      blocks.forEach((o, j) => gsap.to(o, { flexGrow: j === i ? 1.45 : 0.78, duration: 0.9, ease: EASE, overwrite: "auto" }));
      gsap.to(logos[i], { y: -10, scale: 1.04, duration: DUR.micro, ease: EASE, overwrite: "auto" });
    };
    const leave = () => gsap.to(logos[i], { y: 0, scale: 1, duration: DUR.micro, ease: EASE, overwrite: "auto" });
    b.addEventListener("pointerenter", enter);
    b.addEventListener("focus", enter);
    b.addEventListener("pointerleave", leave);
    b.addEventListener("blur", leave);
    offs.push(() => {
      b.removeEventListener("pointerenter", enter);
      b.removeEventListener("focus", enter);
      b.removeEventListener("pointerleave", leave);
      b.removeEventListener("blur", leave);
    });
  });
  const reset = () => blocks.forEach((o) => gsap.to(o, { flexGrow: 1, duration: 0.9, ease: EASE, overwrite: "auto" }));
  container.addEventListener("pointerleave", reset);
  container.addEventListener("focusout", (e) => { if (!container.contains(e.relatedTarget)) reset(); });
  offs.push(() => container.removeEventListener("pointerleave", reset));

  return () => {
    offs.forEach((f) => f());
    gsap.set(blocks, { clearProps: "flexGrow" });
  };
}

/* 04 — Features ------------------------------------------------------------ */
function initFeatures(c) {
  const section = document.querySelector(".features");
  if (!section) return;
  const cards = $$("[data-feat]", section);
  const boxes = cards.map((card) => $(".line-box", card));

  if (c.reduce) return;

  headlineReveal($(".features__title", section));
  gsap.fromTo($(".features__label", section), { autoAlpha: 0, x: 80 }, {
    autoAlpha: 1, x: 0, duration: DUR.macro, ease: EASE, delay: 0.2,
    scrollTrigger: { trigger: section, start: START, toggleActions: "play none none none" },
  });

  cards.forEach((card, i) => {
    const box = boxes[i];
    const content = $$(".feat-card__title, .feat-card__body", card);
    const iconWrap = $("[data-icon]", card);
    const svg = $("svg", iconWrap);
    const { strokes, pops } = svgParts(svg);
    const isDocs = card.classList.contains("feat-card--compliance");

    gsap.set(content, { autoAlpha: 0, y: 20 });
    gsap.set(strokes, { drawSVG: "0%" });
    gsap.set(pops, { scale: 0, transformOrigin: "50% 50%", transformBox: "fill-box" });

    const tl = gsap.timeline({
      delay: (i % 3) * STAGGER.cards,
      scrollTrigger: { trigger: card, start: "top 85%", toggleActions: "play none none none" },
    });
    tl.add(drawBox(box), 0)
      .to(content, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: 0.08 }, 0.9)
      .to(strokes, { drawSVG: "100%", duration: 1, ease: "power2.inOut", stagger: 0.02 }, 0.4)
      .to(pops, { scale: 1, duration: 0.5, ease: "back.out(2.5)", stagger: 0.015 }, 1.1);

    if (isDocs) {
      const back = $(".sheet--back", svg);
      const mid = $(".sheet--mid", svg);
      tl.from(back, { x: 60, y: 52, duration: 1.1, ease: EASE }, 0.5)
        .from(mid, { x: 30, y: 26, duration: 1.1, ease: EASE }, 0.6);
      headlineReveal($(".feat-card__big", card), { trigger: card, start: "top 75%", delay: 0.4 });
    }

    // Hover: cursor-following gold wash + small icon loop.
    if (!c.finePointer) return;
    const proxy = { x: 0, y: 0 };
    const apply = () => {
      card.style.setProperty("--mx", `${proxy.x}px`);
      card.style.setProperty("--my", `${proxy.y}px`);
    };
    const qx = gsap.quickTo(proxy, "x", { duration: 0.5, ease: "power3", onUpdate: apply });
    const qy = gsap.quickTo(proxy, "y", { duration: 0.5, ease: "power3", onUpdate: apply });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      qx(e.clientX - r.left);
      qy(e.clientY - r.top);
    });
    card.addEventListener("pointerenter", () => {
      if (tl.isActive()) return;
      if (iconWrap.dataset.icon === "spin") {
        gsap.fromTo(svg, { rotation: 0 }, { rotation: 15, duration: 0.5, ease: "power2.out", yoyo: true, repeat: 1, transformOrigin: "50% 50%" });
      } else {
        gsap.fromTo(strokes, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.8, ease: "power2.inOut", stagger: 0.01, overwrite: true });
      }
    });
  });

  return () => boxes.forEach((b) => b.classList.remove("is-drawable"));
}

/* 05 — DOJE ---------------------------------------------------------------- */
function initDoje(c) {
  const section = document.querySelector(".doje");
  if (!section) return;
  const bottle = $(".doje__float--bottle", section);
  const can = $(".doje__float--can", section);
  const imgs = $$(".doje__img", section);
  const product = $(".doje__product", section);
  const callouts = $$("[data-callout]", section); // order: tl, tr, bl, br
  const button = $(".doje__cta .btn", section);
  // Shared with js/doje-bottle.js: yaw (radians) and cursor tilt for the 3D bottle.
  const bottle3d = (window.DojeBottle3D = window.DojeBottle3D || { turn: 0, tiltX: 0, tiltY: 0 });
  const TURN_FROM = -Math.PI * 0.85; // rises showing the back label, turns to face front

  if (c.reduce) { bottle3d.turn = 0; return; }

  headlineReveal($(".doje__title", section), { trigger: section, start: "top 70%" });
  bodyReveal($(".doje__sub", section), { delay: 0.3, scrollTrigger: { trigger: section, start: "top 70%", toggleActions: "play none none none" } });

  const parts = callouts.map((el) => ({
    line: $(".callout__line", el),
    text: $$(".callout__title, .callout__body", el),
  }));
  gsap.set(parts.map((p) => p.line), { scaleX: 0 });
  gsap.set(parts.flatMap((p) => p.text), { autoAlpha: 0, y: 20 });
  gsap.set([bottle, can], { autoAlpha: 0, y: 200, rotation: 6 });
  bottle3d.turn = TURN_FROM;
  gsap.set(button, { autoAlpha: 0, y: 20 });

  // Idle float + cursor tilt start once the products have landed.
  let idle = [];
  const startIdle = () => {
    if (idle.length) return;
    idle = imgs.map((img, i) => gsap.to(img, { y: 6, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 1.5, startAt: { y: -6 } }));
  };

  const build = (tl) => {
    tl.to(bottle, { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: "power3.out" }, 0)
      .to(bottle3d, { turn: 0, duration: 1.4, ease: "power2.out" }, 0)
      .to(can, { autoAlpha: 1, y: 0, rotation: 0, duration: 1, ease: "power3.out" }, 0.2);
    parts.forEach((p, i) => {
      const at = 1 + i * 0.45;
      tl.to(p.line, { scaleX: 1, duration: 0.6, ease: "power2.out" }, at)
        .to(p.text, { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE, stagger: 0.1 }, at + 0.35);
    });
    return tl;
  };

  if (c.isDesktop) {
    // Pinned, one scrubbed timeline. Final state holds for the last 20%.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "+=150%",
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate(self) { if (self.progress > 0.6) startIdle(); },
      },
    });
    build(tl);
    const active = tl.duration();
    tl.to(button, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE }, active - 0.1);
    tl.to({}, { duration: (tl.duration() / 0.8) * 0.2 }); // hold

    if (c.finePointer) {
      // The 3D bottle turns in real 3D (smoothed in doje-bottle.js); the can photo tilts in CSS.
      const flat = imgs.filter((img) => !img.hasAttribute("data-doje-3d"));
      const rot = flat.map((img) => gsap.quickTo(img, "rotationY", { duration: 0.8, ease: "power3" }));
      const rotX = flat.map((img) => gsap.quickTo(img, "rotationX", { duration: 0.8, ease: "power3" }));
      const onMove = (e) => {
        const r = product.getBoundingClientRect();
        const nx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
        const ny = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
        rot.forEach((q) => q(nx * 6));
        rotX.forEach((q) => q(-ny * 3));
        bottle3d.tiltX = nx;
        bottle3d.tiltY = ny;
      };
      section.addEventListener("pointermove", onMove);
      return () => {
        section.removeEventListener("pointermove", onMove);
        idle.forEach((t) => t.kill());
      };
    }
  } else {
    // Mobile: no pin, simple reveals as the products and callouts arrive.
    const tl = gsap.timeline({ scrollTrigger: { trigger: product, start: "top 80%", toggleActions: "play none none none" }, onComplete: startIdle });
    tl.to(bottle, { autoAlpha: 1, y: 0, rotation: 0, duration: DUR.macro, ease: EASE }, 0)
      .to(bottle3d, { turn: 0, duration: DUR.macro * 1.4, ease: "power2.out" }, 0)
      .to(can, { autoAlpha: 1, y: 0, rotation: 0, duration: DUR.macro, ease: EASE }, 0.15);
    parts.forEach((p, i) => {
      gsap.timeline({ scrollTrigger: { trigger: callouts[i], start: "top 85%", toggleActions: "play none none none" } })
        .to(p.line, { scaleX: 1, duration: 0.8, ease: EASE })
        .to(p.text, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: 0.1 }, 0.2);
    });
    gsap.to(button, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, scrollTrigger: { trigger: button, start: "top 92%", toggleActions: "play none none none" } });
  }

  return () => idle.forEach((t) => t.kill());
}

/* 06 — Why Sunit Breweries -------------------------------------------------- */
function initWhy(c) {
  const section = document.querySelector(".why");
  if (!section) return;
  const head = $(".why__head", section);
  const rows = $$(".why__row", section);
  const last = rows[rows.length - 1];

  // Rows stack beneath the header, so their stops depend on its real height.
  const cs = getComputedStyle(section);
  const num = (name, fallback) => parseFloat(cs.getPropertyValue(name)) || fallback;
  const offset = () => num("--stack-offset", 64);
  const rowsTop = () => head.offsetHeight + num("--head-gap", 40);
  const measure = () => {
    section.style.setProperty("--head-h", `${head.offsetHeight}px`);
    // How far below the header the fully stacked list ends → header's sticky release point.
    section.style.setProperty("--head-release", `${num("--head-gap", 40) + offset() * (rows.length - 1) + last.offsetHeight}px`);
  };
  measure();
  const ro = new ResizeObserver(measure);
  ro.observe(head);
  ro.observe(last);

  if (c.reduce) return () => ro.disconnect();

  headlineReveal($(".why__title", section));
  bodyReveal($(".why__intro", section), { delay: 0.3, scrollTrigger: { trigger: section, start: START, toggleActions: "play none none none" } });

  const splits = [];
  rows.forEach((row) => {
    const rule = $(".why__rule", row);
    const heads = $$(".why__num, .why__heading", row);
    const body = $(".why__body", row);
    const s = heads.map((h) => window.SplitText.create(h, { type: "lines", mask: "lines" }));
    splits.push(...s);
    const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 85%", toggleActions: "play none none none" } });
    tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: DUR.macro, ease: "power3.inOut" })
      .from(s.flatMap((x) => x.lines), { yPercent: 110, duration: DUR.macro, ease: EASE, stagger: STAGGER.lines }, 0.25)
      .fromTo(body, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE }, 0.55);
  });

  // With ScrollSmoother, emulate the sticky header + stack with pins (CSS sticky
  // can't see through the transformed smooth-content). Everything releases together.
  if (state.smoother) {
    const releaseEnd = () => `top top+=${rowsTop() + offset() * (rows.length - 1)}`;
    ScrollTrigger.create({
      trigger: head,
      start: "top top",
      endTrigger: last,
      end: releaseEnd,
      pin: true,
      pinSpacing: false,
    });
    rows.forEach((row, i) => {
      if (row === last) return;
      ScrollTrigger.create({
        trigger: row,
        start: () => `top top+=${rowsTop() + offset() * i}`,
        endTrigger: last,
        end: releaseEnd,
        pin: true,
        pinSpacing: false,
      });
    });
  }

  // As a row gets covered, it settles back slightly.
  if (c.isDesktop) {
    rows.forEach((row, i) => {
      const next = rows[i + 1];
      if (!next) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: next,
          start: "top bottom",
          end: () => `top top+=${rowsTop() + offset() * (i + 1)}`,
          scrub: true,
        },
      })
        .to($(".why__row-inner", row), { scale: 0.97, ease: "none" }, 0)
        .to($(".why__body", row), { opacity: 0.3, ease: "none" }, 0);
    });
  }

  return () => {
    ro.disconnect();
    splits.forEach((s) => s.revert());
  };
}

/* 07 — Our Facility --------------------------------------------------------- */
function initFacility(c) {
  const section = document.querySelector(".facility");
  if (!section) return;
  const media = $(".facility__media", section);
  const inner = $(".facility__media-inner", section);

  if (c.reduce) return;

  headlineReveal($(".facility__title", section));

  if (c.isDesktop) {
    // Heading + framed image pin together; the image expands to full-bleed
    // beneath the heading. One image → no gallery.
    section.classList.add("is-pinned-media");
    const tl = gsap.timeline({
      scrollTrigger: { trigger: $(".facility__pin", section), start: "top top", end: "+=100%", pin: true, scrub: 1, anticipatePin: 1 },
    });
    tl.fromTo(media, { clipPath: "inset(15% 20% 15% 20% round 16px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none" }, 0)
      .fromTo(inner, { scale: 1.3 }, { scale: 1, ease: "none" }, 0);
    return () => section.classList.remove("is-pinned-media");
  }

  gsap.timeline({ scrollTrigger: { trigger: media, start: START, toggleActions: "play none none none" } })
    .fromTo(media, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: DUR.macro, ease: "power3.inOut" })
    .fromTo(inner, { scale: 1.2 }, { scale: 1, duration: DUR.macro, ease: EASE }, 0);
}

/* 08 — Our Process ---------------------------------------------------------- */
function initProcess(c) {
  const section = document.querySelector(".process");
  if (!section) return;
  const track = $(".process__track", section);
  const steps = $$(".step", section);

  if (c.reduce) {
    steps.forEach((s) => s.classList.add("is-active"));
    return;
  }

  headlineReveal($(".process__title", section));
  bodyReveal($(".process__intro", section), { delay: 0.3, scrollTrigger: { trigger: section, start: START, toggleActions: "play none none none" } });

  const vertical = c.isSmall;
  const loops = steps.map((step) => idleLoop(step));

  const plays = steps.map((step, i) => {
    const divider = $(".step__divider", step);
    const num = $(".step__num", step);
    const text = $$(".step__title, .step__body", step);
    const { strokes, pops } = svgParts($(".step__icon svg", step));
    gsap.set(divider, vertical ? { scaleX: 0 } : { scaleY: 0 });
    gsap.set(num, { autoAlpha: 0, yPercent: 60 });
    gsap.set(text, { autoAlpha: 0, y: 20 });
    gsap.set(strokes, { drawSVG: "0%" });
    gsap.set(pops, { autoAlpha: 0 });
    return gsap.timeline({ paused: true, onComplete: () => loops[i].play() })
      .to(divider, vertical ? { scaleX: 1, duration: 0.9, ease: "power3.inOut" } : { scaleY: 1, duration: 0.9, ease: "power3.inOut" }, 0)
      .to(num, { autoAlpha: 1, yPercent: 0, duration: 0.8, ease: EASE }, 0.1)
      .to(strokes, { drawSVG: "100%", duration: 1.2, ease: "power2.inOut", stagger: 0.03 }, 0.2)
      .to(pops, { autoAlpha: 1, duration: 0.4 }, 0.9)
      .to(text, { autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: 0.1 }, 0.35);
  });

  const activate = (i, on) => {
    steps[i].classList.toggle("is-active", on);
    if (on && plays[i].progress() === 0 && !plays[i].isActive()) plays[i].play();
  };

  if (vertical) {
    // Phones: columns are stacked, so each step activates as it scrolls into view.
    steps.forEach((step, i) => ScrollTrigger.create({
      trigger: step,
      start: "top 75%",
      onEnter: () => activate(i, true),
      onLeaveBack: () => activate(i, false),
    }));
  } else {
    // Columns activate in turn as the section scrolls through (no visible progress line).
    const setActive = (p) => {
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length + 0.02));
      steps.forEach((s, i) => activate(i, i <= idx));
    };
    ScrollTrigger.create({
      trigger: track,
      start: "top 60%",
      end: "bottom 60%",
      onUpdate: (self) => setActive(self.progress),
      onEnter: () => setActive(0),
      onLeave: () => setActive(1),
    });
  }

  // Icons loop constantly, but only while the section is on screen.
  const visibility = ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => loops.forEach((l, i) => {
      if (plays[i].progress() < 1) return; // not activated yet
      self.isActive ? l.play() : l.pause();
    }),
  });

  // Hover: the icon's loop speeds up briefly.
  const offs = [];
  if (c.finePointer) {
    steps.forEach((step, i) => {
      const fast = () => gsap.to(loops[i], { timeScale: 2.4, duration: 0.4, overwrite: true });
      const slow = () => gsap.to(loops[i], { timeScale: 1, duration: 0.8, overwrite: true });
      step.addEventListener("pointerenter", fast);
      step.addEventListener("pointerleave", slow);
      offs.push(() => { step.removeEventListener("pointerenter", fast); step.removeEventListener("pointerleave", slow); });
    });
  }

  return () => {
    visibility.kill();
    offs.forEach((f) => f());
    loops.forEach((l) => l.kill());
  };
}

/*
 * Decorative parts of each process icon, by element index inside its SVG
 * (path/line/circle order). Everything not listed is structure and stays put.
 */
const ICON_DECOR = {
  brew: { twinkle: [16] },                        // sparkles (one compound path)
  ferment: { float: [[8, 9], [11], [12], [13]] }, // leaf + three hops
  pour: { drip: [5] },                            // drop under the tap
  roll: { float: [[0], [1], [2], [3], [4]] },     // leaves + bubble
};

/** Constant, gentle motion for a process icon: a themed move for the whole icon,
 *  plus its decorative parts drifting on their own offsets. */
function idleLoop(step) {
  const svg = $(".step__icon svg", step);
  const parts = [...svg.querySelectorAll("path, line, circle")];
  const pick = (ids) => ids.map((i) => parts[i]).filter(Boolean);
  const kind = step.dataset.step;
  const decor = ICON_DECOR[kind] || {};
  const D = 1.8;

  const tl = gsap.timeline({ paused: true });
  const loop = (target, from, to) =>
    tl.add(gsap.fromTo(target, from, { ...to, repeat: -1, yoyo: true, ease: "sine.inOut" }), 0);

  // Whole icon
  if (kind === "brew") loop(svg, { y: 0, scaleY: 1 }, { y: -4, scaleY: 1.015, transformOrigin: "50% 100%", duration: D });
  if (kind === "ferment") loop(svg, { y: 0 }, { y: -6, duration: D * 1.2 });
  if (kind === "pour") loop(svg, { x: -3, rotation: -1.5 }, { x: 3, rotation: 1.5, transformOrigin: "50% 100%", duration: D });
  if (kind === "roll") loop(svg, { rotation: -3 }, { rotation: 3, transformOrigin: "50% 90%", duration: D * 0.9 });

  // Decorative parts
  pick(decor.twinkle || []).forEach((el) => loop(el, { opacity: 1 }, { opacity: 0.25, duration: D * 0.6 }));
  (decor.float || []).forEach((ids, i) => {
    loop(pick(ids), { y: 0, rotation: 0 }, {
      y: i % 2 ? -6 : -9,
      rotation: i % 2 ? 14 : -14,
      transformOrigin: "50% 50%",
      duration: D * (0.8 + (i % 3) * 0.25),
      delay: i * 0.3,
    });
  });
  pick(decor.drip || []).forEach((el) => {
    tl.add(gsap.fromTo(el, { y: 0, opacity: 1 }, { y: 14, opacity: 0, duration: 1.1, ease: "power2.in", repeat: -1, repeatDelay: 0.6 }), 0);
  });

  return tl;
}

/* 09 — Mission & Vision ----------------------------------------------------- */
function initMissionVision(c) {
  const section = document.querySelector(".mv");
  if (!section) return;
  const cards = $$(".mv-card", section);

  if (c.reduce) return;

  gsap.fromTo(cards, { autoAlpha: 0, y: 60 }, {
    autoAlpha: 1, y: 0, duration: DUR.macro, ease: EASE, stagger: 0.15,
    scrollTrigger: { trigger: section, start: START, toggleActions: "play none none none" },
  });

  cards.forEach((card, i) => {
    const glow = $(".mv-card__glow", card);
    const dir = card.classList.contains("mv-card--vision") ? -1 : 1;
    // Slow drift along the bottom edge and slightly up. Loops offset by ~4s.
    gsap.to(glow, {
      x: 90 * dir,
      y: -40,
      duration: 15,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: i * 4,
    });
    gsap.to($(".mv-card__dot", card), {
      scale: 1.4,
      opacity: 0.6,
      duration: 2.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: i * 1.2,
    });
  });
}

/* 10 — CTA ------------------------------------------------------------------ */
function initCta(c) {
  const section = document.querySelector(".cta");
  if (!section) return;
  const media = $(".cta__media", section);
  const frame = $(".cta__frame", section);
  const video = $(".cta__video", section);
  const sweep = $(".cta__sweep", section);

  // Play the illustration video only while it's on screen (and never under reduced motion).
  const st = ScrollTrigger.create({
    trigger: frame,
    start: "top bottom",
    end: "bottom top",
    onToggle(self) {
      if (c.reduce) return;
      if (self.isActive) {
        if (video.preload === "none") video.preload = "auto";
        video.play().catch(() => {});
      } else video.pause();
    },
  });

  if (c.reduce) return () => st.kill();

  headlineReveal($(".cta__title", section));

  gsap.fromTo(media, { autoAlpha: 0, y: 60, scale: 0.92 }, {
    autoAlpha: 1, y: 0, scale: 1, duration: 1.4, ease: EASE,
    scrollTrigger: { trigger: media, start: START, toggleActions: "play none none none" },
  });

  gsap.to(frame, {
    yPercent: -8,
    ease: "none",
    scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: true },
  });

  // Illustration is a video (not SVG/PNG): a soft diagonal light sweep every ~5s.
  gsap.fromTo(sweep, { xPercent: -100 }, { xPercent: 100, duration: 1.8, ease: "power2.inOut", repeat: -1, repeatDelay: 5 });

  return () => {
    st.kill();
    video.pause();
  };
}
})();
