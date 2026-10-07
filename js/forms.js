(function () {
"use strict";
// Shared form handling for Careers + Contact: validation, inline errors,
// file checks and an animated success state.
//
// FRONT-END ONLY: nothing is sent anywhere yet. To connect a backend, replace
// the body of `send()` below with a fetch() to your endpoint and resolve/reject
// on its response.

const MESSAGES = {
  required: "This field is required.",
  email: "Please enter a valid email address, e.g. name@company.com.",
  tel: "Please enter a valid phone number.",
  url: "Please enter a full link, starting with https://",
  consent: "Please tick this box to continue.",
  choice: "Please choose one option.",
  fileType: "Please upload a PDF or Word document.",
  fileSize: "That file is over 5 MB. Please upload a smaller one.",
};

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  tel: /^\+?[0-9 ()-]{7,20}$/,
  url: /^https?:\/\/\S+\.\S+/,
};

const FILE_TYPES = [".pdf", ".doc", ".docx"];
const FILE_MAX = 5 * 1024 * 1024;

/** Replace with a real request when a backend exists. */
function send(/* formData */) {
  return new Promise((resolve) => setTimeout(resolve, 700));
}

function errorEl(form, name) {
  return form.querySelector(`[data-error-for="${name}"]`);
}

function setError(form, control, message) {
  const name = control.name;
  const err = errorEl(form, name);
  const target = control.closest(".dropzone") || control;
  if (message) {
    control.setAttribute("aria-invalid", "true");
    if (target !== control) target.setAttribute("aria-invalid", "true");
    if (err) err.textContent = message;
  } else {
    control.removeAttribute("aria-invalid");
    if (target !== control) target.removeAttribute("aria-invalid");
    if (err) err.textContent = "";
  }
}

function validateControl(form, control) {
  const value = (control.value || "").trim();
  const type = control.dataset.validate || control.type;

  if (control.type === "radio") {
    const group = form.querySelectorAll(`[name="${control.name}"]`);
    const ok = !control.required || [...group].some((r) => r.checked);
    group.forEach((r) => (ok ? r.removeAttribute("aria-invalid") : r.setAttribute("aria-invalid", "true")));
    const err = errorEl(form, control.name);
    if (err) err.textContent = ok ? "" : MESSAGES.choice;
    return ok;
  }
  if (control.type === "checkbox") {
    const ok = !control.required || control.checked;
    setError(form, control, ok ? "" : MESSAGES.consent);
    return ok;
  }
  if (control.type === "file") {
    const file = control.files && control.files[0];
    if (!file) { setError(form, control, control.required ? MESSAGES.required : ""); return !control.required; }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!FILE_TYPES.includes(ext)) { setError(form, control, MESSAGES.fileType); return false; }
    if (file.size > FILE_MAX) { setError(form, control, MESSAGES.fileSize); return false; }
    setError(form, control, "");
    return true;
  }
  if (!value) {
    setError(form, control, control.required ? MESSAGES.required : "");
    return !control.required;
  }
  if (PATTERNS[type] && !PATTERNS[type].test(value)) {
    setError(form, control, MESSAGES[type]);
    return false;
  }
  setError(form, control, "");
  return true;
}

function controlsOf(form) {
  const seenRadio = new Set();
  return [...form.elements].filter((el) => {
    if (!el.name || el.type === "submit" || el.type === "button") return false;
    if (el.type === "radio") {
      if (seenRadio.has(el.name)) return false;
      seenRadio.add(el.name);
    }
    return true;
  });
}

/**
 * Wire up a form.
 * @param {HTMLFormElement} form
 * @param {{ success: HTMLElement, onSuccess?: (data: FormData, successEl: HTMLElement) => void }} opts
 */
function initForm(form, { success, onSuccess } = {}) {
  const { gsap } = window;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animated = !!gsap && !reduce;

  // Link each control to its error message for screen readers.
  controlsOf(form).forEach((c) => {
    const err = errorEl(form, c.name);
    if (err) {
      err.id = err.id || `err-${form.id || "f"}-${c.name}`;
      const targets = c.type === "radio" ? form.querySelectorAll(`[name="${c.name}"]`) : [c];
      targets.forEach((t) => t.setAttribute("aria-describedby", [t.getAttribute("aria-describedby"), err.id].filter(Boolean).join(" ")));
    }
  });

  // Re-validate a field once the visitor has touched it.
  form.addEventListener("input", (e) => {
    if (e.target.getAttribute("aria-invalid") === "true") validateControl(form, e.target);
  });
  form.addEventListener("change", (e) => {
    if (e.target.type === "file" || e.target.type === "radio" || e.target.type === "checkbox" || e.target.getAttribute("aria-invalid") === "true") {
      validateControl(form, e.target);
    }
  });
  form.addEventListener("focusout", (e) => {
    const c = e.target;
    if (c.name && c.type !== "radio" && c.type !== "checkbox" && c.type !== "file" && c.value) validateControl(form, c);
  });

  // Drop zone: show the chosen file name, highlight on drag.
  form.querySelectorAll(".dropzone").forEach((zone) => {
    const input = zone.querySelector("input[type=file]");
    const label = zone.querySelector("[data-file-name]");
    const idle = label ? label.innerHTML : "";
    input.addEventListener("change", () => {
      const f = input.files && input.files[0];
      if (label) label.innerHTML = f ? `<b>${f.name.replace(/[<>&]/g, "")}</b><span class="dropzone__hint">${(f.size / 1024 / 1024).toFixed(1)} MB · click to replace</span>` : idle;
    });
    ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, () => zone.classList.add("is-over")));
    ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, () => zone.classList.remove("is-over")));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const invalid = controlsOf(form).filter((c) => !validateControl(form, c));
    if (invalid.length) {
      const first = invalid[0].type === "radio" ? form.querySelector(`[name="${invalid[0].name}"]`) : invalid[0];
      first.focus({ preventScroll: true });
      const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
      if (smoother) smoother.scrollTo(first, true, "center center");
      else first.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      if (animated) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.35)" });
      return;
    }

    const submit = form.querySelector("[type=submit]");
    // Both roll copies must change, or the hover roll reveals the old label.
    const labels = submit.querySelectorAll(".roll__track > span");
    const idleText = labels.length ? labels[0].textContent : "";
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    labels.forEach((l) => (l.textContent = "Sending…"));

    const data = new FormData(form);
    await send(data);

    submit.disabled = false;
    submit.removeAttribute("aria-busy");
    labels.forEach((l) => (l.textContent = idleText));
    onSuccess?.(data, success);
    showSuccess(form, success, animated);
  });

  success?.querySelector("[data-form-reset]")?.addEventListener("click", () => {
    form.reset();
    form.querySelectorAll("input[type=file]").forEach((i) => i.dispatchEvent(new Event("change")));
    controlsOf(form).forEach((c) => setError(form, c, ""));
    swap(success, form, animated, () => form.querySelector("input, select, textarea")?.focus());
  });
}

function swap(from, to, animated, done) {
  const { gsap } = window;
  if (!animated) {
    from.hidden = true;
    to.hidden = false;
    done?.();
    return;
  }
  gsap.timeline()
    .to(from, { autoAlpha: 0, y: -16, duration: 0.4, ease: "power2.in" })
    .add(() => { from.hidden = true; gsap.set(from, { clearProps: "all" }); to.hidden = false; })
    .fromTo(to, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "brew", immediateRender: false })
    .add(() => done?.());
}

function showSuccess(form, success, animated) {
  if (!success) return;
  const { gsap } = window;
  swap(form, success, animated, () => success.querySelector("[tabindex='-1'], h3, h2")?.focus({ preventScroll: true }));
  const tick = success.querySelectorAll(".form-success__icon path, .form-success__icon circle");
  if (animated && window.DrawSVGPlugin && tick.length) {
    gsap.fromTo(tick, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9, ease: "power2.inOut", stagger: 0.25, delay: 0.5 });
  }
  const smoother = window.ScrollSmoother && window.ScrollSmoother.get();
  const anchor = success.closest("[data-form-card]") || success;
  if (smoother) smoother.scrollTo(anchor, true, "top 120px");
}

window.Brew = window.Brew || {};
window.Brew.forms = { initForm, validateControl };
})();
