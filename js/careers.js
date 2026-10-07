(function () {
"use strict";
// Careers page — role list (accordion + team filter), application form.
const { boot } = window.Brew;
const { DUR, EASE } = window.Brew.motion;
const pages = window.Brew.pages;
const { initForm } = window.Brew.forms;
const { gsap, ScrollTrigger, Flip } = window;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const roles = $$("[data-roles] .role");
const roleSelect = $("[data-role-select]");

/* One-time wiring (not tied to breakpoints) ----------------------------------- */

// The application's role list comes from the listings, so roles live in one place.
roles.forEach((role) => {
  const opt = document.createElement("option");
  opt.value = opt.textContent = role.dataset.title;
  roleSelect.append(opt);
});

// Accordion: one button per role; closed panels are inert (not focusable).
function setOpen(role, open) {
  const btn = $(".role__head", role);
  const panel = $(".role__panel", role);
  role.classList.toggle("is-open", open);
  btn.setAttribute("aria-expanded", String(open));
  panel.inert = !open;
}
roles.forEach((role) => {
  setOpen(role, false);
  $(".role__head", role).addEventListener("click", () => setOpen(role, !role.classList.contains("is-open")));
  // Page height changes when a panel opens/closes: keep ScrollTrigger positions right.
  $(".role__panel", role).addEventListener("transitionend", (e) => {
    if (e.propertyName === "grid-template-rows") ScrollTrigger.refresh();
  });
});

// Team filter, animated with Flip.
const count = $("[data-role-count]");
const empty = $("[data-roles-empty]");
$$('input[name="dept"]').forEach((input) => input.addEventListener("change", () => {
  const dept = input.value;
  const flipState = Flip.getState(roles);
  let visible = 0;
  roles.forEach((role) => {
    const show = dept === "all" || role.dataset.dept === dept;
    role.hidden = !show;
    if (show) visible += 1;
    else setOpen(role, false);
  });
  count.textContent = visible;
  empty.hidden = visible > 0;

  if (reduced()) { ScrollTrigger.refresh(); return; }
  Flip.from(flipState, {
    duration: 0.6,
    ease: "power3.inOut",
    onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: DUR.micro, ease: EASE, stagger: 0.06 }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}));

// "Apply for this role" pre-selects the role (the in-page anchor scroll is handled by main.js).
$$("[data-apply]").forEach((btn) => btn.addEventListener("click", () => {
  roleSelect.value = btn.dataset.apply;
  roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
  if (!reduced()) {
    gsap.fromTo(roleSelect, { backgroundColor: "rgba(205, 163, 102, 0.35)" }, { backgroundColor: "rgba(205, 163, 102, 0)", duration: 1.6, delay: 0.6, ease: "power2.out", clearProps: "backgroundColor" });
  }
}));

// Application form (front-end only — see js/forms.js).
initForm($("#apply-form"), {
  success: $("#apply [data-success]"),
  onSuccess(data, el) {
    $('[data-out="name"]', el).textContent = String(data.get("name")).trim().split(/\s+/)[0];
    $('[data-out="role"]', el).textContent = data.get("role") === "General application" ? "a role with us" : `the ${data.get("role")} role`;
  },
});

/* Motion (rebuilt per breakpoint by main.js) ----------------------------------- */
boot({
  preloader: false,
  init(c) {
    const cleanups = [pages.intro(c), pages.headings(c), pages.cards(c), pages.media(c)];
    if (!c.reduce) {
      gsap.fromTo(roles, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1, y: 0, duration: DUR.body, ease: EASE, stagger: 0.08,
        scrollTrigger: { trigger: "[data-roles]", start: "top 85%", toggleActions: "play none none none" },
      });
    }
    return () => cleanups.forEach((fn) => typeof fn === "function" && fn());
  },
});
})();
