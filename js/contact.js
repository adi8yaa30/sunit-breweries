(function () {
"use strict";
// Contact page — enquiry form (topic can be pre-selected via ?topic=), map reveal.
const { boot } = window.Brew;
const { DUR, EASE } = window.Brew.motion;
const pages = window.Brew.pages;
const { initForm } = window.Brew.forms;
const { gsap } = window;

const $ = (s, r = document) => r.querySelector(s);

// ?topic=partnership (from every "Partner With Us" button), careers, doje, media
const TOPICS = { partnership: "Contract manufacturing", manufacturing: "Contract manufacturing", doje: "DOJE", careers: "Careers", media: "Media" };
const wanted = TOPICS[(new URLSearchParams(location.search).get("topic") || "").toLowerCase()];
if (wanted) {
  const radio = document.querySelector(`#contact-form input[name="topic"][value="${wanted}"]`);
  if (radio) radio.checked = true;
}

initForm($("#contact-form"), {
  success: $(".contact__form-card [data-success]"),
  onSuccess(data, el) {
    $('[data-out="name"]', el).textContent = String(data.get("name")).trim().split(/\s+/)[0];
    $('[data-out="email"]', el).textContent = String(data.get("email")).trim();
  },
});

boot({
  preloader: false,
  init(c) {
    const cleanups = [pages.intro(c), pages.headings(c), pages.cards(c), pages.media(c)];
    if (!c.reduce) {
      // Map opens like the site's image reveals.
      gsap.fromTo("[data-map]", { clipPath: "inset(100% 0% 0% 0% round 16px)" }, {
        clipPath: "inset(0% 0% 0% 0% round 16px)", duration: DUR.macro, ease: "power3.inOut",
        scrollTrigger: { trigger: "[data-map]", start: "top 85%", toggleActions: "play none none none" },
      });
    }
    return () => cleanups.forEach((fn) => typeof fn === "function" && fn());
  },
});
})();
