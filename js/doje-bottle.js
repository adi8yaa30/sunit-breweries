// 05 — DOJE: real-time 3D bottle (three.js + meshopt GLB).
// Replaces the flat bottle photo once the model is ready; the photo stays as the
// poster/fallback if WebGL or the network fails. home.js drives the shared state
// object (entrance spin + cursor tilt); this module only renders.
// three.js is imported on demand (see start()) so its ~700 KB never competes with
// the hero on first load.
let THREE, GLTFLoader, MeshoptDecoder;

const MODEL_URL = "assets/models/doje-bottle.glb";
const BG = "#F5F1E9";           // --bg: what the glass refracts where no beer is behind it
const BOTTLE_H = 0.2902;         // model height in metres (crown top)
const FILL_FRAC = 0.975;         // share of canvas height the bottle fills (matches the photo)
const FOV = 16;                  // long lens, like the product photography

const state = (window.DojeBottle3D = window.DojeBottle3D || { turn: 0, tiltX: 0, tiltY: 0 });

const root = document.querySelector("[data-doje-3d]");
if (root) init(root);

function init(root) {
  const canvas = root.querySelector(".doje__gl");
  const product = root.closest(".doje__product");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Warm up in idle time a few seconds after load (after the hero intro), or
  // sooner if the visitor heads for the section — never mid-scroll next to it.
  let started = false;
  const go = () => {
    if (started) return;
    started = true;
    io.disconnect();
    start().catch((err) => console.warn("[doje] 3D bottle unavailable, keeping photo.", err));
  };
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) go(); }, { rootMargin: "200% 0px" });
  io.observe(root);
  const afterLoad = () => setTimeout(() => idle().then(go), 3000);
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });

  async function start() {
    // Each heavy step runs in its own idle slice so no single task blocks a frame for long.
    [THREE, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]);
    await idle();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);

    await idle();
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    scene.environmentIntensity = 1;
    scene.environmentRotation.y = -0.35;

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 10);

    // Pivot at the bottle's centre so cursor pitch rocks it around its middle.
    const pivot = new THREE.Group();
    pivot.position.y = BOTTLE_H / 2;
    scene.add(pivot);

    scene.add(backdrop(), contactShadow());

    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL_URL);
    await idle();
    const model = gltf.scene;
    model.position.y = -BOTTLE_H / 2;
    pivot.add(model);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    model.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      for (const key of ["map", "normalMap", "roughnessMap"]) if (m[key]) m[key].anisotropy = maxAniso;
      if (m.name === "Amber lager") liquidGlow(m);
      if (m.name === "Amber glass") {
        m.envMapIntensity = 1.4;
        o.renderOrder = 2;
      }
      if (/label|collar/i.test(m.name)) m.envMapIntensity = 0.95;
    });

    // Frame the bottle the way the photo did: centred in the canvas, ~97% of its height.
    const fit = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const visH = BOTTLE_H / FILL_FRAC;
      const dist = 0.036 + visH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
      camera.position.set(0, BOTTLE_H / 2 + 0.004, dist);
      camera.lookAt(0, BOTTLE_H / 2 - 0.002, 0);
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(fit).observe(canvas);
    fit();

    // Compile shaders and warm the transmission pass before revealing.
    await renderer.compileAsync(scene, camera);
    await idle();
    renderer.render(scene, camera);
    product.classList.add("is-3d");

    // Render loop: only while the section is on screen.
    let visible = true, raf = 0;
    const timer = new THREE.Timer();
    timer.connect(document);
    const cur = { yaw: state.turn, pitch: 0 };
    const tick = (now) => {
      raf = 0;
      if (!visible) return;
      timer.update(now);
      const dt = Math.min(timer.getDelta(), 0.05);
      const t = timer.getElapsed();
      const sway = reduce ? 0 : Math.sin(t * 0.45) * 0.07;
      const targetYaw = state.turn + state.tiltX * 0.38 + sway;
      const targetPitch = -state.tiltY * 0.05;
      const k = 1 - Math.exp(-dt * 6);
      cur.yaw += (targetYaw - cur.yaw) * k;
      cur.pitch += (targetPitch - cur.pitch) * k;
      pivot.rotation.set(cur.pitch, cur.yaw, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) { timer.reset(); raf = requestAnimationFrame(tick); }
    }).observe(root);
    raf = requestAnimationFrame(tick);
  }
}

/* Resolve in the browser's next idle period (or next frame-ish where unsupported). */
function idle(timeout = 600) {
  return new Promise((resolve) => {
    if ("requestIdleCallback" in window) requestIdleCallback(() => resolve(), { timeout });
    else setTimeout(resolve, 32);
  });
}

/* Studio lighting as an environment map: near-white room (keeps the label paper
   white) with tall strip softboxes either side, a top
   softbox and a dim rim from behind — the classic long bottle highlights. */
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#fbf8f3").multiplyScalar(0.62), side: THREE.BackSide })
  );
  env.add(room);
  // floor slightly darker so the lower bottle picks up a grounded reflection
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color("#8c8a86").multiplyScalar(0.5) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5;
  env.add(floor);

  const light = (w, h, intensity, color, pos, lookAt = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(...lookAt);
    env.add(m);
  };
  light(3, 7, 0, "#000000", [-4.4, 0, -0.6]);          // black flags: dark rims define the glass edges
  light(3, 7, 0, "#000000", [4.4, 0, -0.6]);
  light(0.9, 6, 30, "#ffffff", [-3.2, 0.4, 2.2]);     // key strip, front-left
  light(0.6, 6, 14, "#fdfaf5", [3.4, 0.4, 1.6]);       // fill strip, front-right
  light(4, 2, 3.2, "#ffffff", [0, 4.8, 0.5]);          // top softbox
  light(1.2, 5, 4, "#ffd9a0", [0, 0.5, -4.8]);         // warm back light → glow through the glass
  light(0.3, 5, 24, "#ffffff", [-1.4, 0.4, 4.6]);       // thin front kicker for the centre highlight

  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}

/* A flat card of the page colour behind the bottle, written ONLY into the
   transmission buffer. The glass then refracts cream through the empty neck
   instead of transparent black, while the canvas itself stays transparent. */
function backdrop() {
  const mat = new THREE.MeshBasicMaterial({ color: BG, toneMapped: false, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
  m.position.set(0, 0.15, -0.6);
  m.renderOrder = -1;
  m.onBeforeRender = (renderer) => { mat.colorWrite = renderer.getRenderTarget() !== null; };
  return m;
}

/* Soft contact shadow + a longer cast shadow falling to the right, like the photo. */
function contactShadow() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const blob = (cx, cy, rx, ry, a) => {
    g.save();
    g.translate(cx, cy);
    g.scale(rx / ry, 1);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    grd.addColorStop(0, `rgba(40,28,14,${a})`);
    grd.addColorStop(0.55, `rgba(40,28,14,${a * 0.45})`);
    grd.addColorStop(1, "rgba(40,28,14,0)");
    g.fillStyle = grd;
    g.beginPath(); g.arc(0, 0, ry, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  blob(size * 0.56, size * 0.5, size * 0.44, size * 0.3, 0.28);  // soft cast, leaning right
  blob(size * 0.5, size * 0.5, size * 0.36, size * 0.36, 0.45);  // contact occlusion
  blob(size * 0.5, size * 0.5, size * 0.3, size * 0.3, 0.55);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.11),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.0004;
  return m;
}

/* Beer can't be a second transmissive layer behind the glass in real time, so fake the
   light scattering through it: glow strongest where we look straight through the
   liquid, falling off to deep amber at the grazing edges. */
function liquidGlow(m) {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
       float facing = saturate( dot( normalize( vNormal ), normalize( vViewPosition ) ) );
       totalEmissiveRadiance *= 0.12 + 1.15 * pow( facing, 3.0 );`
    );
  };
  m.customProgramCacheKey = () => "doje-liquid-glow";
}
