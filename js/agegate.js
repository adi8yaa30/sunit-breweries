(function () {
"use strict";
// Age gate. Independent of main.js so the gate always works; uses GSAP for
// motion when it's available and falls back to plain show/hide when it isn't.
// Exposes window.BrewAgeGate.ready — resolves when the visitor is let in
// (at the start of the exit wipe, so the page intro can overlap it).

const html = document.documentElement;
const gate = document.querySelector(".agegate");
const KEY = "sb-age-ok";
const REMEMBER_DAYS = 30;
const MIN_AGE = 21; // Assam's legal drinking age

let resolveReady;
const ready = new Promise((r) => (resolveReady = r));
window.BrewAgeGate = { ready, active: false };
window.__ageGateReady = true;

if (!gate || !html.classList.contains("show-agegate")) {
  gate?.remove();
  resolveReady(false);
  return;
}
window.BrewAgeGate.active = true;

const { gsap, SplitText, CustomEase } = window;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animated = !!gsap && !reduce;
if (gsap && CustomEase) {
  gsap.registerPlugin(CustomEase);
  CustomEase.create("brew", "0.22,1,0.36,1");
}

const $ = (s) => gate.querySelector(s);
const $$ = (s) => [...gate.querySelectorAll(s)];
const title = $(".agegate__title");
const askPanel = $('[data-ag-panel="ask"]');
const deniedPanel = $('[data-ag-panel="denied"]');
const remember = $(".agegate__remember input");
const form = $("[data-ag-form]");
const fields = { day: form.elements.day, month: form.elements.month, year: form.elements.year };
const inputs = [fields.day, fields.month, fields.year];
const errorEl = $("[data-ag-error]");

// Everything behind the gate is inert until the visitor gets in.
const behind = ["#smooth-wrapper", "[data-nav]", ".mobile-menu", ".cm-index", ".skip-link", ".preloader"]
  .map((s) => document.querySelector(s))
  .filter(Boolean);
behind.forEach((el) => (el.inert = true));

/* Intro ------------------------------------------------------------------------ */
let wordmarkSplit;
function intro() {
  const reveal = $$("[data-ag]");
  if (!animated) {
    if (gsap) gsap.fromTo(reveal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    else reveal.forEach((el) => (el.style.visibility = "visible"));
    title.focus({ preventScroll: true });
    return;
  }
  const titleSplit = SplitText ? SplitText.create(title, { type: "lines", mask: "lines" }) : null;
  wordmarkSplit = SplitText ? SplitText.create($(".agegate__wordmark"), { type: "chars", mask: "chars" }) : null;
  gsap.set(reveal, { visibility: "visible" });

  const tl = gsap.timeline({ defaults: { ease: "brew" }, onComplete: () => title.focus({ preventScroll: true }) });
  tl.from($(".agegate__glow"), { yPercent: 35, autoAlpha: 0, duration: 1.6, ease: "power3.out" }, 0)
    .from($(".agegate__top"), { yPercent: -60, autoAlpha: 0, duration: 0.8 }, 0.2)
    .from($(".agegate__eyebrow"), { y: 16, autoAlpha: 0, duration: 0.8 }, 0.25)
    .from(titleSplit ? titleSplit.lines : title, { yPercent: 110, duration: 1.2, stagger: 0.08 }, 0.3)
    .from(askPanel.children, { y: 20, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.7)
    .from(wordmarkSplit ? wordmarkSplit.chars : $(".agegate__wordmark"), { yPercent: 100, duration: 1.1, stagger: 0.03 }, 0.5);

  // The gold glow drifts slowly, like the footer's.
  gsap.to($(".agegate__glow"), { xPercent: 4, yPercent: -3, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.6 });
}

/* Panels ----------------------------------------------------------------------- */
function swap(from, to) {
  const focusTarget = to.querySelector("input, button");
  if (!animated) {
    from.hidden = true;
    to.hidden = false;
    focusTarget?.focus();
    return;
  }
  gsap.timeline()
    .to(from.children, { y: -14, autoAlpha: 0, duration: 0.35, stagger: 0.05, ease: "power2.in" })
    .add(() => {
      from.hidden = true;
      gsap.set(from.children, { clearProps: "all" });
      to.hidden = false;
    })
    .fromTo(to.children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "brew", immediateRender: false })
    .add(() => focusTarget?.focus({ preventScroll: true }), "-=0.5"); // once it's visible
}

/* Enter ------------------------------------------------------------------------ */
function enter() {
  try {
    sessionStorage.setItem(KEY, "1");
    sessionStorage.setItem("sb-preloaded", "1"); // the gate replaces the preloader this session
    if (remember.checked) localStorage.setItem(KEY, String(Date.now() + REMEMBER_DAYS * 864e5));
  } catch (e) { /* storage blocked: the gate simply shows again next time */ }

  const finish = () => {
    behind.forEach((el) => (el.inert = false));
    html.classList.remove("show-agegate");
    window.BrewAgeGate.active = false;
    wordmarkSplit?.revert();
    gate.remove();
  };

  if (!animated) {
    if (gsap) {
      gsap.to(gate, { autoAlpha: 0, duration: 0.3, onComplete: finish });
      resolveReady(true);
    } else {
      resolveReady(true);
      finish();
    }
    return;
  }

  gsap.timeline({ onComplete: finish })
    .to([$(".agegate__top"), $(".agegate__body")], { y: -24, autoAlpha: 0, duration: 0.45, stagger: 0.05, ease: "power2.in" })
    .to(wordmarkSplit ? wordmarkSplit.chars : $(".agegate__wordmark"), { yPercent: -100, duration: 0.6, stagger: 0.015, ease: "power2.in" }, 0)
    .add(() => resolveReady(true), "-=0.05")
    .to(gate, { yPercent: -100, duration: 1, ease: "power3.inOut" }, "<");
}

/* Date of birth ------------------------------------------------------------- */
const digits = (el) => el.value.replace(/\D/g, "");

// Keep only digits, and move on to the next field once one is complete.
inputs.forEach((el, i) => {
  el.addEventListener("input", () => {
    el.value = digits(el).slice(0, el.maxLength);
    el.removeAttribute("aria-invalid");
    errorEl.textContent = "";
    if (el.value.length === el.maxLength && inputs[i + 1]) inputs[i + 1].focus();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !el.value && inputs[i - 1]) {
      e.preventDefault();
      inputs[i - 1].focus();
    }
  });
});

/** Age in whole years on today's date, or null if the date isn't real. */
function ageFrom(d, m, y) {
  const today = new Date();
  if (y < 1900 || y > today.getFullYear() || m < 1 || m > 12 || d < 1) return null;
  const dob = new Date(y, m - 1, d);
  if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) return null; // e.g. 31/02
  if (dob > today) return null;
  let age = today.getFullYear() - y;
  if (today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)) age -= 1;
  return age;
}

function fail(message, bad) {
  errorEl.textContent = message;
  bad.forEach((el) => el.setAttribute("aria-invalid", "true"));
  bad[0]?.focus();
  if (animated) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const empty = inputs.filter((el) => !digits(el));
  if (empty.length) return fail("Please enter your full date of birth.", empty);
  if (digits(fields.year).length !== 4) return fail("Please enter the year as four digits, e.g. 1990.", [fields.year]);

  const age = ageFrom(+digits(fields.day), +digits(fields.month), +digits(fields.year));
  if (age === null) return fail("That doesn't look like a valid date. Please check it and try again.", inputs);
  if (age >= MIN_AGE) return enter();
  swap(askPanel, deniedPanel); // the date itself is never stored
});

$("[data-ag-back]").addEventListener("click", () => {
  inputs.forEach((el) => { el.value = ""; el.removeAttribute("aria-invalid"); });
  errorEl.textContent = "";
  swap(deniedPanel, askPanel);
});

// Keep keyboard focus inside the dialog.
gate.addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const focusable = $$("button, input, [tabindex]:not([tabindex='-1'])").filter((el) => !el.closest("[hidden]"));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// Start once fonts are in (short cap so the gate never waits long).
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(intro);
})();
