(function () {
"use strict";
// Shared runtime: plugin registration, ScrollSmoother, nav, magnetic
// buttons, preloader, footer and the matchMedia shell every page runs inside.
const { BREAKPOINTS, DUR, STAGGER, EASE, START, wait, drawBox, bodyReveal, simpleFade } = window.Brew.motion;
const { splitChars } = window.Brew.split;

const { gsap, ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin, Flip, CustomEase } = window;
const html = document.documentElement;

const state = {
  smoother: null,
  introReady: null, // Promise resolved when the page intro may start
};

/* -------------------------------------------------------------------------- */
/*  Boot                                                                      */
/* -------------------------------------------------------------------------- */

async function boot(page) {
  if (!gsap || !ScrollTrigger) {
    html.classList.remove("js-ready", "show-preloader");
    return;
  }
  window.__brewBooted = true;

  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin, Flip, CustomEase);
  CustomEase.create("brew", "0.22,1,0.36,1");
  gsap.defaults({ ease: "power3.out" });
  gsap.config({ nullTargetWarn: false }); // some SVG icons have no filled parts to pop
  ScrollTrigger.config({ ignoreMobileResize: true });

  // The age gate (if shown) replaces the preloader; the page intro waits for it.
  // Otherwise the preloader runs immediately (home, first visit) while fonts settle.
  const gate = window.BrewAgeGate;
  if (gate && gate.active) {
    document.querySelector(".preloader")?.remove();
    state.introReady = gate.ready;
  } else {
    state.introReady = page.preloader ? runPreloader() : Promise.resolve();
  }

  await Promise.race([document.fonts.ready, wait(1500)]);

  initDropdown();
  initAnchors();

  const mm = gsap.matchMedia();
  mm.add(BREAKPOINTS, (ctx) => {
    const c = ctx.conditions;
    const cleanups = [];

    if (c.isDesktop && !c.reduce) {
      state.smoother = ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#smooth-content",
        smooth: 1.2,
        effects: true,
        smoothTouch: false,
      });
      html.classList.add("has-smoother");
      // No scrolling behind the age gate.
      if (window.BrewAgeGate?.active) {
        const sm = state.smoother;
        sm.paused(true);
        window.BrewAgeGate.ready.then(() => sm.paused(false));
      }
      // Native anchor jumps / focus can scroll the fixed wrapper itself; keep it pinned at 0.
      const wrapper = document.querySelector("#smooth-wrapper");
      const lockWrapper = () => { if (wrapper.scrollTop) wrapper.scrollTop = 0; };
      wrapper.addEventListener("scroll", lockWrapper);
      cleanups.push(() => wrapper.removeEventListener("scroll", lockWrapper));
    }
    if (!c.reduce) html.classList.add("js-motion");

    cleanups.push(initNav(c));
    cleanups.push(initMobileMenu(c));
    cleanups.push(initFooter(c));

    if (c.reduce) reducedMotionPass();

    cleanups.push(page.init?.(c, state));

    // Any [data-reveal] a page didn't animate itself gets the default body reveal.
    if (!c.reduce) {
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        if (gsap.getTweensOf(el).length) return;
        bodyReveal(el, { scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none none" } });
      });
    }

    // Pointer niceties last, so their quickTo tweens don't mask the check above.
    if (c.finePointer && c.isDesktop && !c.reduce) {
      cleanups.push(initMagnetic());
    }

    return () => {
      cleanups.forEach((fn) => typeof fn === "function" && fn());
      state.smoother?.kill();
      state.smoother = null;
      html.classList.remove("has-smoother", "js-motion");
    };
  });

  // Refresh once fonts and images are in.
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  if (document.readyState === "complete") ScrollTrigger.refresh();
  else window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

  scrollToInitialHash();
}

/* -------------------------------------------------------------------------- */
/*  Reduced motion: everything in its final state, simple fades only          */
/* -------------------------------------------------------------------------- */

function reducedMotionPass() {
  gsap.set("[data-split]", { visibility: "visible" });
  gsap.utils.toArray("[data-reveal]").forEach((el) => simpleFade(el, el));
}

/* -------------------------------------------------------------------------- */
/*  Preloader                                                                 */
/* -------------------------------------------------------------------------- */

function runPreloader() {
  const el = document.querySelector(".preloader");
  if (!el) return Promise.resolve();
  if (!html.classList.contains("show-preloader")) {
    el.remove();
    return Promise.resolve();
  }

  try { sessionStorage.setItem("sb-preloaded", "1"); } catch (e) { /* private mode */ }

  return new Promise((resolve) => {
    const count = el.querySelector(".preloader__count");
    const line = el.querySelector(".preloader__line");
    const proxy = { v: 0 };
    const tl = gsap.timeline({
      onComplete() {
        html.classList.remove("show-preloader");
        el.remove();
      },
    });
    tl.from(el.querySelector(".preloader__mark"), { autoAlpha: 0, y: 10, duration: 0.4 })
      .to(proxy, {
        v: 100,
        duration: 1.25,
        ease: "power2.inOut",
        onUpdate: () => (count.textContent = Math.round(proxy.v)),
      }, 0)
      .to(line, { scaleX: 1, duration: 1.25, ease: "power2.inOut" }, 0)
      .add(resolve, "+=0.02")
      .to(el, { yPercent: -100, duration: 0.9, ease: "power3.inOut" }, "<");
  });
}

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

function initNav(c) {
  const nav = document.querySelector("[data-nav]");
  if (!nav) return;
  let hidden = false;
  const show = (v) => {
    if (hidden === !v) return;
    hidden = !v;
    gsap.to(nav, { yPercent: v ? 0 : -100, duration: DUR.micro, ease: EASE, overwrite: true });
  };
  const st = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle("is-scrolled", y > 80);
      if (html.classList.contains("menu-open") || nav.contains(document.activeElement) && document.activeElement !== document.body) {
        show(true);
        return;
      }
      if (c.reduce) return;
      if (y < 120) show(true);
      else show(self.direction !== 1);
    },
  });
  return () => {
    st.kill();
    gsap.set(nav, { clearProps: "transform" });
  };
}

function initDropdown() {
  document.querySelectorAll("[data-dropdown]").forEach((dd) => {
    const btn = dd.querySelector("button");
    const set = (open) => {
      dd.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      set(!dd.classList.contains("is-open"));
    });
    if (window.matchMedia(BREAKPOINTS.finePointer).matches) {
      let t;
      dd.addEventListener("mouseenter", () => { clearTimeout(t); set(true); });
      dd.addEventListener("mouseleave", () => { t = setTimeout(() => set(false), 180); });
    }
    dd.addEventListener("focusout", (e) => { if (!dd.contains(e.relatedTarget)) set(false); });
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dd.classList.contains("is-open")) { set(false); btn.focus(); }
    });
  });
}

function initMobileMenu(c) {
  const nav = document.querySelector("[data-nav]");
  const burger = document.querySelector(".nav__burger");
  const menu = document.querySelector(".mobile-menu");
  if (!burger || !menu) return;

  const links = menu.querySelectorAll(".mobile-menu__links > li > a, .mobile-menu__links .sub a");
  const splits = [...links].map((a) => SplitText.create(a, { type: "lines", mask: "lines" }));
  const lines = splits.flatMap((s) => s.lines);
  let open = false;

  const tl = gsap.timeline({ paused: true })
    .set(menu, { visibility: "visible" })
    .fromTo(menu, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: c.reduce ? 0.3 : 0.8, ease: "power3.inOut" })
    .fromTo(lines, { yPercent: c.reduce ? 0 : 110 }, { yPercent: 0, duration: c.reduce ? 0.01 : DUR.macro, ease: EASE, stagger: 0.05 }, c.reduce ? 0 : 0.35)
    .fromTo(menu.querySelector(".btn"), { autoAlpha: 0, y: c.reduce ? 0 : 20 }, { autoAlpha: 1, y: 0, duration: DUR.micro }, "-=0.8");

  const toggle = (v) => {
    open = v;
    html.classList.toggle("menu-open", v);
    nav.classList.toggle("menu-open", v);
    burger.setAttribute("aria-expanded", String(v));
    burger.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    document.body.style.overflow = v ? "hidden" : "";
    if (v) tl.timeScale(1).play();
    else tl.timeScale(1.6).reverse();
  };
  const onBurger = () => toggle(!open);
  const onKey = (e) => { if (e.key === "Escape" && open) { toggle(false); burger.focus(); } };
  const onLink = (e) => { if (e.target.closest("a")) toggle(false); };
  burger.addEventListener("click", onBurger);
  document.addEventListener("keydown", onKey);
  menu.addEventListener("click", onLink);

  return () => {
    burger.removeEventListener("click", onBurger);
    document.removeEventListener("keydown", onKey);
    menu.removeEventListener("click", onLink);
    if (open) toggle(false);
    tl.kill();
    gsap.set(menu, { clearProps: "all" });
    splits.forEach((s) => s.revert());
  };
}

/* -------------------------------------------------------------------------- */
/*  Anchor links (work with and without ScrollSmoother)                       */
/* -------------------------------------------------------------------------- */

/** Element for a URL hash, or null. Never throws on odd hashes (e.g. "#:~:text=", "%20"). */
function hashTarget(hash) {
  if (!hash || hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch (err) {
    return null;
  }
}

function scrollToTarget(target, smooth = true) {
  if (state.smoother) state.smoother.scrollTo(target, smooth, "top top");
  else target.scrollIntoView({ behavior: smooth && !window.matchMedia(BREAKPOINTS.reduce).matches ? "smooth" : "auto" });
}

function initAnchors() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href*='#']");
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === "#") {
      if (a.getAttribute("href") === "#") e.preventDefault(); // placeholder links
      return;
    }
    const target = hashTarget(url.hash);
    if (!target) return;
    e.preventDefault();
    try { history.pushState(null, "", url.hash); } catch (err) { /* file:// */ }
    scrollToTarget(target);
  });
}

function scrollToInitialHash() {
  const target = hashTarget(location.hash);
  if (!target) return;
  const wrapper = document.querySelector("#smooth-wrapper");
  const go = () => setTimeout(() => {
    try {
      if (wrapper) wrapper.scrollTop = 0;
      ScrollTrigger.refresh();
      scrollToTarget(target, false);
    } catch (err) { /* never let a deep-link scroll break the page */ }
  }, 60);
  const whenLoaded = () => {
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  };
  // Behind the age gate the page is inert and scrolling is paused: wait until the visitor is in.
  if (window.BrewAgeGate?.active) window.BrewAgeGate.ready.then(whenLoaded);
  else whenLoaded();
}

/* -------------------------------------------------------------------------- */
/*  Magnetic buttons (desktop)                                                */
/* -------------------------------------------------------------------------- */

function initMagnetic() {
  const MAX = 8;
  const offs = [];
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    const qx = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
    const qy = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
    const move = (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      qx(gsap.utils.clamp(-1, 1, x) * MAX);
      qy(gsap.utils.clamp(-1, 1, y) * MAX);
    };
    const leave = () => gsap.to(btn, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.4)" });
    btn.addEventListener("pointermove", move);
    btn.addEventListener("pointerleave", leave);
    offs.push(() => {
      btn.removeEventListener("pointermove", move);
      btn.removeEventListener("pointerleave", leave);
    });
  });
  return () => offs.forEach((f) => f());
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function initFooter(c) {
  const footer = document.querySelector(".footer");
  if (!footer || c.reduce) return;

  const panel = footer.querySelector(".footer__panel");
  const box = panel.querySelector(".line-box");
  const cols = panel.querySelectorAll(".footer__col, .footer__map");

  const tl = gsap.timeline({ scrollTrigger: { trigger: panel, start: "top 85%", toggleActions: "play none none none" } });
  tl.add(drawBox(box))
    .from(cols, { autoAlpha: 0, y: 30, duration: DUR.body, ease: EASE, stagger: STAGGER.cards }, 0.3);

  // Wordmark assembles character by character as the page ends.
  const mark = footer.querySelector("[data-wordmark]");
  const split = splitChars(mark);
  gsap.fromTo(split.chars, { yPercent: 100 }, {
    yPercent: 0,
    ease: "none",
    stagger: 0.03,
    scrollTrigger: {
      trigger: footer.querySelector(".footer__brand"),
      start: "top bottom",
      end: "bottom bottom",
      scrub: 0.6,
    },
  });

  // Gold gradient drifts slowly.
  gsap.to(footer.querySelector(".footer__glow"), {
    xPercent: 4,
    yPercent: -4,
    duration: 16,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });

  const lineBox = box;
  return () => {
    lineBox.classList.remove("is-drawable");
    split.revert();
  };
}
window.Brew.boot = boot;
window.Brew.state = state;
})();
