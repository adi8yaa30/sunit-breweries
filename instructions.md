# Sunit Breweries — Build Instructions

Build the Sunit Breweries marketing website from the Figma exports in `assets/`. Two pages: **Home** and **Contract Manufacturing**. Static HTML + CSS + vanilla JS, animated with GSAP. The site should feel award-level (Awwwards-style): editorial layout, restrained palette, and heavy but disciplined scroll animation.

Read this whole file before writing code. Then inspect every folder in `assets/` before building each section.

---

## 1. Source of truth

```
sunit-breweries/
└── assets/
    ├── home-page-assets/
    │   ├── 1. hero-section/                 (hero-section-figma-design-image.png, hero-image.png)
    │   ├── 2. about-us-section/
    │   ├── 3. portfolio-section/
    │   ├── 4. features-section/
    │   ├── 5. DOJE-section/
    │   ├── 6. why-sunit-breweries-section/
    │   ├── 7. our-facility-section/
    │   ├── 8. our-process-section/
    │   ├── 9.our-mission-vision-section/
    │   ├── 10. cta-section/
    │   └── 11. footer-section/
    ├── home-page-figma-design-image.png       (full-page reference)
    └── Contract-Manufacturing-figma-design-image.png
```

- Each section folder contains a `*-figma-design-image.png` (the visual reference) plus the raw assets used in it. **Match the Figma image for layout, spacing, type sizes and copy.** Open and look at every reference image before building its section.
- Use the raw assets (PNG/SVG/JPG) from each folder. Never recreate an image in CSS if the asset exists. Never use stock or placeholder images.
- Folder names contain spaces and dots. When copying into the build, copy assets to `/assets/img/<section-slug>/` with clean kebab-case filenames and reference those.
- If an asset visible in the Figma image is missing from its folder, **stop and list it** rather than inventing a substitute.
- All copy is in the Figma images. Transcribe it exactly, including gold-highlighted words.

---

## 2. Tech stack

- Plain HTML5, CSS (custom properties, no framework), vanilla ES modules.
- **GSAP 3.13+** from CDN — all plugins are free: `ScrollTrigger`, `ScrollSmoother`, `SplitText`, `DrawSVGPlugin`, `Flip`, `CustomEase`.

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollSmoother.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/DrawSVGPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/Flip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/CustomEase.min.js"></script>
```

- Font: **Instrument Sans** (Google Fonts), weights 400, 500, 600. Used for headings and body.

### File structure

```
/index.html
/contract-manufacturing.html
/css/
  reset.css
  tokens.css          (colours, type scale, spacing, easing vars)
  base.css            (nav, footer, buttons, shared components)
  home.css
  contract.css
/js/
  main.js             (register plugins, ScrollSmoother, nav, shared reveals)
  home.js             (one init function per section)
  contract.js
  utils/split.js      (SplitText helpers)
  utils/motion.js     (reduced-motion check, shared eases/durations)
/assets/img/...
```

One `init<SectionName>()` function per section in `home.js`, each scoped to its own section element. No global selectors that could leak across sections.

---

## 3. Design tokens

```css
:root {
  --bg:        #F5F1E9;
  --accent:    #B87920;
  --ink:       #111111;
  --ink-muted: #5A544C;
  --line:      rgba(17, 17, 17, 0.18);
  --line-gold: rgba(184, 121, 32, 0.45);

  --font: "Instrument Sans", system-ui, sans-serif;

  --ease-out:  cubic-bezier(0.22, 1, 0.36, 1);
  --radius:    12px;
  --gutter:    clamp(16px, 4vw, 64px);
  --max-w:     1440px;
}
```

- Derive the type scale from the Figma images. Use `clamp()` for all display sizes so headings scale fluidly.
- Display headings: tight line-height (0.95–1.05), slight negative tracking.
- Card borders: 1px `--line-gold`. Radii consistent across every card on the site.
- Buttons: solid `--accent` fill, dark text, small uppercase label. Match Figma.

---

## 4. Motion system (applies everywhere)

Consistency matters more than variety. Use a small vocabulary.

| Token | Value |
|---|---|
| Default ease | `power3.out` (register `CustomEase.create("brew", "0.22,1,0.36,1")` and use `"brew"` for reveals) |
| Micro duration | 0.6s (hovers, small fades) |
| Macro duration | 1.2s (headline reveals, image reveals) |
| Stagger | 0.08s for text lines, 0.12s for cards |
| Default trigger | `start: "top 80%"` |

### Global rules

1. **ScrollSmoother** wraps the whole page (`#smooth-wrapper` / `#smooth-content`), `smooth: 1.2`, `effects: true`. Use `data-speed` for simple parallax.
2. **Headline reveal (reuse everywhere):** `SplitText` by lines with `mask: "lines"`, animate `yPercent: 110 → 0`, stagger 0.08, duration 1.2, ease `"brew"`.
3. **Body reveal:** fade `opacity 0 → 1` + `y: 20 → 0`, 0.8s.
4. **Line/border draw:** hairlines animate `scaleX` (horizontal) or `scaleY` (vertical) from 0 → 1 with `transform-origin` at the start edge.
5. **Image reveal:** `clip-path: inset(100% 0 0 0)` → `inset(0% 0 0 0)` with inner image `scale 1.2 → 1`.
6. **Counters:** tween a proxy object and write formatted numbers into the DOM; snap to the exact final value.
7. Every hover effect must also have a sensible touch fallback (no hover-only content).
8. **Reduced motion:** wrap everything in `gsap.matchMedia()`. Under `(prefers-reduced-motion: reduce)`, disable ScrollSmoother, pinning and scrubbing; show all content in its final state with simple 0.3s fades only.
9. **Responsive:** use `gsap.matchMedia()` breakpoints (`min-width: 1024px`, `max-width: 1023px`). Disable heavy pinning below 768px and replace with simple reveals.
10. Call `ScrollTrigger.refresh()` after fonts and images load (`document.fonts.ready` + `window load`).
11. No FOUC: hide animated elements with a `.js-ready` class on `<html>` set by JS, so content stays visible if JS fails.

---

## 5. Global components

### Preloader (home page only, first visit per session)
- Full-screen `--bg`. Small "SUNIT BREWERIES" wordmark in accent, and a 0 → 100 counter bottom-right in large type.
- A thin accent line fills left → right in sync with the counter.
- On complete: preloader wipes up (`yPercent: -100`, 1s), then triggers the hero intro timeline.
- Use `sessionStorage` to skip on repeat visits within the session. Keep total under 2.2s.

### Navigation
- Logo left ("SUNIT BREWERIES", accent), links centre-right, "Partner With Us" accent button far right. Contract Manufacturing has a dropdown chevron — build a simple dropdown.
- Hides on scroll down, reappears on scroll up (`yPercent` tween). Gains a subtle `--bg` backdrop + bottom hairline after 80px scroll.
- Link hover: text rolls up and a duplicate rolls in from below (two stacked spans in an overflow-hidden wrapper).
- Mobile: hamburger → full-screen menu, links stagger in with the headline reveal.

### Buttons
- Magnetic effect on desktop (button translates up to 8px toward the cursor, `elastic.out(1, 0.4)` on leave).
- Label rolls on hover like nav links.

### Custom cursor (desktop only)
- Small accent dot following with `gsap.quickTo` lag. Grows into a ring with a label ("View", "Drag", "Explore") over interactive media. Hide on touch devices.

---

## 6. Home page — section by section

Build in this order. For each section, open its folder and figma image first.

### 01 — Hero
**Layout:** "BUILT TO BREW. READY TO SCALE." top-left. Right side: short tagline + two buttons ("View Portfolio" / "Partner With Us"). Full-width hops image (`hero-image.png`) below.

**Animation (intro timeline, runs after preloader):**
1. Headline lines mask up (headline reveal), 1.2s.
2. Tagline fades up at −0.8s overlap; buttons stagger in after.
3. Hero image: clip-path reveals from bottom to top while the inner image scales `1.25 → 1`, 1.6s.
4. Nav fades down last.

**Scroll:** hero image parallaxes (`yPercent: -15`, scrub) and scales slightly `1 → 1.08` as it leaves. Headline drifts up faster than the image (`data-speed="1.1"`).

### 02 — About (the only large-scale brewery in the North East)
**Layout:** eyebrow headline with gold words, Assam map outline with one gold-filled district, three metric cards (10.08M HLPA, ₹250–300 Cr, ~30% CAGR), closing body line.

**Animation:**
1. Headline reveal, gold words tint from ink → accent after the mask completes.
2. **Map:** use the SVG from the folder (if only a PNG exists, flag it — an SVG is needed for this effect). `DrawSVG` the outline `0% → 100%` over 2s scrubbed to scroll (`start: "top 70%", end: "center center"`).
3. When the draw completes, the district fills (`fill-opacity 0 → 1`) with a soft gold glow pulse (one-time `filter: drop-shadow` tween).
4. Metric cards rise with stagger 0.12. Numbers count up (10.08 → with 2 decimals, 250–300 counts both numbers, ~30 counts to 30). Keep the "M HLPA", "Cr", "%" suffixes static.
5. Closing body line fades up last.

### 03 — Portfolio (Who we brew for)
**Layout:** "WHO WE BREW FOR" heading + subline, then three full-bleed colour blocks: DeVans (blue), United Breweries (purple), Simba (red).

**Animation:**
1. Heading reveal.
2. Blocks reveal with clip-path wipes, alternating direction: block 1 from left, block 2 from bottom, block 3 from right. Logos scale `0.8 → 1` and fade in after their block opens.
3. **Hover (desktop):** hovered block grows (`flex-grow` via `Flip` or a width tween) while siblings shrink; logo lifts slightly. Reset on leave.
4. Blocks link to the matching partner on the Contract Manufacturing page (`contract-manufacturing.html#devans` etc.).

### 04 — Features (Our capabilities bento)
**Layout:** "World-class machinery. Zero-compromise process." + "OUR CAPABILITIES" label. Four outlined cards (KHS, FSSC 22000, ZLD + ETP, 10.08M HLPA) each with a line icon, then a wide compliance panel ("Compliance is the slowest part of brewing. Ours is already done.") with the document illustration. "Our Certifications" button below.

**Animation:**
1. Heading reveal; "OUR CAPABILITIES" label slides in from the right.
2. **Card borders draw in:** implement each border as four absolutely positioned 1px lines (or an SVG rect with `DrawSVG`). Draw top+left first, then right+bottom. Stagger cards 0.12.
3. Card content (title, body) fades up after its border completes.
4. **Icons:** if SVG, `DrawSVG` the strokes 0 → 100% over 1s, then pop the dots/nodes in with `scale 0 → 1`. If PNG, fade + rotate slightly (`rotate: -8 → 0`).
5. **Hover:** card gets a faint gold wash (radial gradient following the cursor via CSS vars `--mx/--my` set with `quickTo`). Icon does a small loop (rotate 15° on the cog icon, re-draw on others).
6. Compliance panel: the document illustration's sheets fan out slightly on enter (stagger `x/y` offsets), headline reveals.

### 05 — DOJE (Introducing DOJE)
**Layout:** "INTRODUCING DOJE" (DOJE in accent) + subline. Bottle + can centred. Four callouts with dashed gold connector lines: BOTTLE AND CAN, BUILT IN-HOUSE, THE SAME STANDARD, BREWED, NOT BOUGHT. "Explore DOJE" button.

**Animation (pinned, desktop):**
Pin the section for ~150% of viewport height and drive one scrubbed timeline:
1. Heading reveals (not scrubbed — plays on enter).
2. Bottle and can rise from below (`y: 200 → 0`, `opacity 0 → 1`), the can slightly delayed, with a small `rotate: 6 → 0` settle.
3. Dashed connector lines draw outward from the product toward each callout (`scaleX` from the product side).
4. Callout labels and body copy reveal at each line's end, in order: top-left, top-right, bottom-left, bottom-right.
5. Final state holds for the last 20% of the pin, then the button fades in.

**Idle:** after the reveal, bottle and can float gently (`y ±6px`, 3s `sine.inOut`, yoyo, offset phases).
**Mouse:** products tilt subtly toward the cursor (`rotateY ±6°`, `quickTo`).
**Mobile:** no pin; stack callouts below the products with simple reveals.

### 06 — Why Sunit Breweries (stacked sticky list — see reference video)
**Layout:** "Why Sunit / Breweries" (second word in accent) left, intro body right. Five rows, each: number (01–05), gold heading, body text right, hairline divider above.

**Reference behaviour (from the inspo video):** rows stack as you scroll. Each row becomes sticky at the top of the section, and the next row slides up *over* the previous one, covering its body. Only the top strip of each earlier row (roughly the upper part of its number and heading) stays visible, so by the end all five rows are compressed into a stack of title strips at the top, with only the last row fully visible.

**Implementation:**
1. Each row: `position: sticky`, solid `--bg` background, `top: calc(var(--stack-offset) * var(--i))` where `--i` is the row index and `--stack-offset` ≈ 18–24px (tune so only the top sliver of the previous number/heading peeks out, as in the video). Later rows need higher `z-index`.
2. Give each row enough height (~60–70vh) so there's scroll distance between stacks.
3. The hairline above each row draws `scaleX 0 → 1` as the row enters.
4. As each row gets covered, scrub it slightly: `scale 1 → 0.97` and `opacity` of its body `1 → 0.3` (it's being covered, so this only affects the peeking strip — keep it subtle).
5. On entry, the row's number and heading reveal (mask up), body fades in right after.
6. After the fifth row settles, release the stack and continue scrolling into the facility section.
7. Mobile: keep the sticky stacking (it's CSS-driven and cheap), but reduce `--stack-offset` to ~12px and row height to ~50vh.

Also fix in copy: the intro body says "Four of India's largest beer brands" — confirm with the client-facing Figma; the partner strip shows three. **Flag this in your summary rather than changing it.**

### 07 — Our Facility
**Layout:** "Our Facility" centred heading, then a full-bleed facility photo.

**Animation:**
1. Heading reveal.
2. **Expanding image:** image starts inset (`clip-path: inset(15% 20% 15% 20% round 16px)`) and expands to full-bleed (`inset(0% 0% 0% 0% round 0px)`) scrubbed over the section's scroll, pinned for ~100% of viewport height on desktop.
3. Inner image counter-scales `1.3 → 1` during the expansion for depth.
4. If the folder contains multiple facility images, after the expansion convert the pin into a horizontal gallery (translate track on `x`, scrubbed) with captions fading in bottom-left per image. If there's only one image, skip the gallery.

### 08 — Our Process (The Sunit Brewery Process)
**Layout:** "The Sunit Brewery / Process" (second line accent) left, body right. Four columns: 01 Brewhouse, 02 Fermentation, 03 Packaging, 04 Dispatch — each with an icon, number, title, body, separated by vertical hairlines.

**Animation:**
1. Heading reveal.
2. **Progress line:** a single horizontal accent line runs above the four columns and fills `scaleX 0 → 1` scrubbed across the section (`start: "top 60%", end: "bottom 60%"`).
3. As the progress line reaches each column (use timeline labels at 0, 0.25, 0.5, 0.75), that column activates: its vertical divider draws down (`scaleY`), number reveals, icon draws/pops in, title and body fade up.
4. Active column number switches to accent colour; completed ones stay accent, upcoming ones stay muted.
5. **Hover:** icon does a small themed loop (bob for vessels, slide for conveyor, nudge right for dispatch).
6. Mobile: columns stack vertically; the progress line becomes vertical on the left.

### 09 — Mission & Vision
**Layout:** two cards side by side, each with a small gold dot, accent title (Our Mission / Our Vision), centred body copy, and a soft gold gradient glow in the lower corner (mirrored between cards). **No hover-reveal** — both cards show full copy at all times.

**Animation:**
1. Cards rise and fade in, stagger 0.15.
2. **Animated gradient:** build the glow as a blurred radial gradient layer (a pseudo-element or absolutely positioned div, `filter: blur(60px)`, accent colour at ~35–40% peak opacity). Animate its position in a slow drift loop (12–18s, `sine.inOut`, yoyo), moving the glow a short distance along the card's bottom edge and slightly up.
3. Offset the two cards' loops by ~4s so they never pulse in sync.
4. The gold dot is the gradient's origin marker: give it a slow pulse (`scale 1 → 1.4`, `opacity 1 → 0.6`, 2.5s, yoyo).
5. Keep body copy in the upper two-thirds so it never loses contrast against the glow.
6. Optional: cursor proximity nudges the glow toward the mouse by up to 40px (`quickTo`).

### 10 — CTA (Have a brand? We have the lines.)
**Layout:** heading ("We have the lines." in accent), isometric brewery illustration, supporting line, "Partner With Us" button.

**Animation:**
1. Heading reveal.
2. Illustration rises and scales `0.92 → 1` with a soft fade, 1.4s.
3. Gentle scroll parallax on the illustration (`yPercent: -8`, scrub).
4. **If the illustration is an SVG:** draw the orange pipework in first (`DrawSVG`), then run a looping highlight dot along the conveyor path (`MotionPathPlugin`) every 3s. **If it's a PNG:** overlay a subtle diagonal light sweep (a gradient mask translating across every ~5s) instead.
5. Optional hotspots (desktop): small accent dots over each area of the illustration (fermentation, brewhouse, filling, palletising, warehouse). On hover, a small label tooltip appears. Position them with percentages so they scale with the image.
6. Button: magnetic + label roll. Links to the contact page.

### 11 — Footer
**Layout:** outlined panel with Overview links, Socials links, and a white box (check the folder — likely a map or image). Below, an oversized "Sunit Breweries" wordmark bleeding off the bottom with a warm gold gradient behind it.

**Animation:**
1. Panel border draws in, link columns stagger up.
2. **Wordmark:** split into characters; characters rise from below (`yPercent: 100 → 0`, stagger 0.03) scrubbed as the footer enters, so the wordmark "assembles" as the user reaches the end of the page.
3. The gold gradient behind the wordmark drifts slowly (same technique as mission/vision).
4. Footer links: underline draws left → right on hover.

---

## 7. Contract Manufacturing page

**Layout (see `Contract-Manufacturing-figma-design-image.png`):** shared nav. Header: "INDIA'S BIGGEST NAMES. OUR LINES." left, supporting line right. Three partner blocks, each with a numbered label `(01.)`, partner name right-aligned, a product-card grid (large bottle card, brand logo colour panel, smaller product cards), and a description strip. Shared footer.

- (01.) DeVans Breweries — Godfather Strong 650ml / 500ml
- (02.) Sona Beverages — Simba Strong 650ml / 500ml
- (03.) United Breweries — Kingfisher Strong, Kingfisher Lager, Kingfisher Ultra, Kingfisher Ultra Max, Amstel

Give each partner block an `id` (`devans`, `sona`, `ubl`) for deep links from the home portfolio section.

**Animation:**
1. **Page intro:** header headline reveal, supporting line fades in, nav fades down.
2. **Per partner block (on enter):**
   - `(0X.)` label and partner name reveal simultaneously from opposite sides (label from left, name from right).
   - Brand colour panel: clip-path wipe in, logo scales `0.85 → 1`.
   - Product cards: borders draw, then stagger in (0.12).
   - Bottles/cans inside cards rise from below (`y: 60 → 0`) with a small `rotate: 4 → 0` settle.
   - Description strip: border draws, text fades up, the two gold corner dots pop in last.
3. **Card hover:** product lifts `y: -10`, rotates `-3°`, casts a soft shadow; card background tints faintly gold. Small dot in the card corner scales up.
4. **Scroll parallax:** within each block, the large bottle card image moves at `data-speed="0.95"` and the small cards at `1.05` for subtle depth.
5. **Section index (desktop, optional):** a small fixed indicator on the left edge showing `01 / 02 / 03`, with the active partner highlighted as the user scrolls.
6. Mobile: grid collapses to single column; keep reveals, drop parallax.

---

## 8. Performance & quality

- Animate only `transform`, `opacity`, `clip-path` and `filter`. Never animate `width`, `height`, `top`, `left` except through `Flip`.
- Export images as WebP (keep PNG fallback only where transparency requires it). Lazy-load everything below the hero (`loading="lazy"`). Size product PNGs to their max display size ×2.
- Use `will-change` sparingly and only during active animations.
- Kill and rebuild ScrollTriggers on resize through `matchMedia`; no manual resize listeners.
- Semantic HTML: one `<h1>` per page, sections as `<section>` with `aria-labelledby`. All images have meaningful `alt` text. Decorative SVGs get `aria-hidden="true"`.
- Keyboard: every interactive element focusable with a visible accent focus ring.
- Test at 1440, 1280, 1024, 768, 390 widths. No horizontal scroll at any width.
- Lighthouse target: Performance ≥ 85, Accessibility ≥ 95.

---

## 9. Build process

1. Scan `assets/`, list every file per section, and report any missing assets before coding.
2. Set up the file structure, tokens, reset, nav, footer and ScrollSmoother shell.
3. Build Home sections 01 → 11 **layout first, no animation**, matching the Figma images. Check each against its reference image.
4. Add animations section by section, testing each before moving on.
5. Build the Contract Manufacturing page reusing shared components.
6. Add reduced-motion and mobile variants.
7. Performance pass.
8. Finish with a short summary: what was built, any assets that were missing or substituted, copy inconsistencies spotted, and anything that deviates from this spec and why.

Do not invent copy, assets, or pages. If something in this spec conflicts with the Figma image, **the Figma image wins for layout and copy; this spec wins for motion.**
