// Usage (from a folder with @gltf-transform/core@4, @gltf-transform/extensions@4,
//   @gltf-transform/functions@4 and meshoptimizer installed):
//   node enhance-doje-glb.mjs Doje_Bottle_Optical_Glass.glb assets/models/doje-bottle.glb [uncompressed-out.glb]

// Enhance the DOJE bottle GLB for realism:
//  - rebuild the beer volume so it fills the bottle to a real 650 ml level (was 50%),
//    following the inner wall of the glass with a meniscus at the surface
//  - retune every material (amber glass absorption, beer, printed labels, crown)
//  - meshopt-compress for the web
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMaterialsSpecular, KHRMaterialsIOR,
  KHRMaterialsVolume, KHRMaterialsTransmission, KHRMaterialsEmissiveStrength } from "@gltf-transform/extensions";
import { dedup, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";

const [, , SRC, OUT, RAW_OUT] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(SRC);
const root = doc.getRoot();
const byName = (list, name) => list.find((x) => x.getName() === name);
const mesh = (n) => byName(root.listMeshes(), n);
const mat = (n) => byName(root.listMaterials(), n);

/* ------------------------------------------------------------ beer volume */
// Inner wall radius per 1 mm slice, measured from the glass mesh (Y-up, metres).
const glassPos = mesh("Doje_Bottle_Glass.001").listPrimitives()[0].getAttribute("POSITION");
const SLICE = 0.001, H = 0.29, nS = Math.ceil(H / SLICE);
const rMin = new Array(nS).fill(Infinity);
const v = [0, 0, 0];
for (let i = 0; i < glassPos.getCount(); i++) {
  glassPos.getElement(i, v);
  const s = Math.floor(v[1] / SLICE);
  const r = Math.hypot(v[0], v[2]);
  if (s >= 0 && s < nS && r > 0.004) rMin[s] = Math.min(rMin[s], r);
}
// fill empty slices by linear interpolation, then smooth
for (let s = 0; s < nS; s++) if (!isFinite(rMin[s])) {
  let a = s - 1; while (a >= 0 && !isFinite(rMin[a])) a--;
  let b = s + 1; while (b < nS && !isFinite(rMin[b])) b++;
  rMin[s] = a < 0 ? rMin[b] : b >= nS ? rMin[a] : rMin[a] + (rMin[b] - rMin[a]) * (s - a) / (b - a);
}
const rIn = (y) => {
  const f = y / SLICE - 0.5, s = Math.max(0, Math.min(nS - 2, Math.floor(f))), t = Math.min(1, Math.max(0, f - s));
  const k = (i) => { let sum = 0, n = 0; for (let d = -2; d <= 2; d++) { const j = i + d; if (j >= 0 && j < nS) { sum += rMin[j]; n++; } } return sum / n; };
  return k(s) * (1 - t) + k(s + 1) * t;
};

const GAP = 0.00015;          // hairline gap so the liquid never z-fights the glass
const Y0 = 0.0106;            // inner floor of the bottle
const FILL = 0.2345;          // ≈650 ml, leaves a real headspace in the neck
const MEN_H = 0.0011, MEN_W = 0.0022; // meniscus climb + width

// profile (r, y) from the floor edge up the wall to the meniscus lip
const prof = [];
const CORNER = 0.0025;
for (let i = 0; i <= 6; i++) { // rounded floor corner
  const a = (i / 6) * Math.PI / 2;
  const rw = rIn(Y0 + CORNER) - GAP;
  prof.push([rw - CORNER + Math.sin(a) * CORNER, Y0 + CORNER - Math.cos(a) * CORNER]);
}
for (let y = Y0 + CORNER + 0.001; y < FILL + MEN_H; y += 0.001) prof.push([rIn(y) - GAP, y]);
prof.push([rIn(FILL + MEN_H) - GAP, FILL + MEN_H]);
// meniscus: curves from the wall down to the flat surface
const rTop = rIn(FILL + MEN_H) - GAP;
for (let i = 1; i <= 8; i++) {
  const t = i / 8;
  prof.push([rTop - MEN_W * t, FILL + MEN_H * Math.pow(1 - t, 2.2)]);
}

const SEG = 160;
const P = [], N = [], UV = [], I = [];
const ring = (r, y, nr, ny, u) => {
  const start = P.length / 3;
  for (let j = 0; j <= SEG; j++) {
    const a = (j / SEG) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    P.push(r * c, y, r * s); N.push(nr * c, ny, nr * s); UV.push(j / SEG, u);
  }
  return start;
};
const strip = (a, b) => { for (let j = 0; j < SEG; j++) I.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1); };
const fan = (center, ringStart, flip) => { for (let j = 0; j < SEG; j++) flip ? I.push(center, ringStart + j, ringStart + j + 1) : I.push(center, ringStart + j + 1, ringStart + j); };

// floor cap
const floorC = P.length / 3; P.push(0, Y0, 0); N.push(0, -1, 0); UV.push(0.5, 0);
const floorR = ring(prof[0][0], prof[0][1], 0, -1, 0);
fan(floorC, floorR, true);
// side + meniscus with analytic normals
let prev = null;
prof.forEach(([r, y], i) => {
  const [r0, y0] = prof[Math.max(0, i - 1)], [r1, y1] = prof[Math.min(prof.length - 1, i + 1)];
  let tr = r1 - r0, ty = y1 - y0; const l = Math.hypot(tr, ty); tr /= l; ty /= l;
  const cur = ring(r, y, ty, -tr, i / (prof.length - 1)); // outward normal
  if (prev !== null) strip(prev, cur);
  prev = cur;
});
// flat surface
const last = prof[prof.length - 1];
const topR = ring(last[0], last[1], 0, 1, 1);
const topC = P.length / 3; P.push(0, FILL, 0); N.push(0, 1, 0); UV.push(0.5, 1);
fan(topC, topR, false);

const beerPrim = mesh("Doje_Bottle_Beer.001").listPrimitives()[0];
const buf = root.listBuffers()[0];
const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
beerPrim.setAttribute("POSITION", acc("VEC3", new Float32Array(P)));
beerPrim.setAttribute("NORMAL", acc("VEC3", new Float32Array(N)));
beerPrim.setAttribute("TEXCOORD_0", acc("VEC2", new Float32Array(UV)));
beerPrim.setIndices(acc("SCALAR", new Uint32Array(I)));
const beerNode = byName(root.listNodes(), "Doje_Bottle_Beer");
beerNode.setExtras({ fill_level_m: FILL, fill_volume_ml: 650 });

/* -------------------------------------------------------------- materials */
const clearcoatExt = doc.createExtension(KHRMaterialsClearcoat);
const specExt = doc.createExtension(KHRMaterialsSpecular);
const iorExt = doc.createExtension(KHRMaterialsIOR);
const volExt = doc.createExtension(KHRMaterialsVolume);
const trExt = doc.createExtension(KHRMaterialsTransmission);
const emExt = doc.createExtension(KHRMaterialsEmissiveStrength);

// Amber glass: the old absorption (3.5 mm) made the bottle read as opaque brown.
// Real amber glass passes warm orange light; a 2.4 mm wall is quite clear edge-on.
const glass = mat("Optical amber glass").setName("Amber glass");
glass.setBaseColorFactor([1, 0.985, 0.95, 1]).setRoughnessFactor(0.035).setMetallicFactor(0);
glass.setExtension("KHR_materials_transmission", trExt.createTransmission().setTransmissionFactor(1));
glass.setExtension("KHR_materials_ior", iorExt.createIOR().setIOR(1.52));
glass.setExtension("KHR_materials_volume", volExt.createVolume()
  .setThicknessFactor(0.005).setAttenuationDistance(0.004).setAttenuationColor([0.82, 0.44, 0.08]));
glass.setExtension("KHR_materials_specular", specExt.createSpecular().setSpecularFactor(1).setSpecularColorFactor([1, 1, 1]));

// Beer: rich amber with a faint self-glow standing in for light scattered through the liquid
// (real-time transmission can't be layered behind the glass, so the liquid stays opaque).
const beer = mat("Amber beer - visible real-time liquid.001").setName("Amber lager");
beer.setBaseColorFactor([0.3, 0.11, 0.012, 1]).setRoughnessFactor(0.12).setMetallicFactor(0);
beer.setEmissiveFactor([1, 0.56, 0.13]);
beer.setExtension("KHR_materials_emissive_strength", emExt.createEmissiveStrength().setEmissiveStrength(0.09));
beer.setExtension("KHR_materials_ior", iorExt.createIOR().setIOR(1.34));

// Printed labels: gloss varnish over coated paper.
for (const n of ["Doje_Front_Label artwork.001", "Doje_Back_Label artwork.001", "Die-cut eagle collar.001"]) {
  const m = mat(n).setName(n.replace(".001", ""));
  m.setRoughnessFactor(0.55).setMetallicFactor(0);
  m.setExtension("KHR_materials_specular", specExt.createSpecular().setSpecularFactor(0.35));
  m.setExtension("KHR_materials_clearcoat", clearcoatExt.createClearcoat().setClearcoatFactor(0.3).setClearcoatRoughnessFactor(0.28));
}
mat("Paper reverse and cut edge.001").setName("Paper reverse and cut edge")
  .setBaseColorFactor([0.86, 0.83, 0.75, 1]).setRoughnessFactor(0.9);

// Crown: gold-lacquered tinplate — metal under a thin glossy lacquer.
const crown = mat("Pale gold lacquered steel.001").setName("Gold lacquered crown");
crown.setBaseColorFactor([0.86, 0.66, 0.3, 1]).setMetallicFactor(1).setRoughnessFactor(0.24);
crown.setExtension("KHR_materials_clearcoat", clearcoatExt.createClearcoat().setClearcoatFactor(1).setClearcoatRoughnessFactor(0.06));

// glass/labels should render both faces of thin paper; glass stays single-sided (closed shell)
for (const n of ["Paper reverse and cut edge"]) mat(n).setDoubleSided(true);

root.getAsset().generator = "DOJE bottle realism pass (glTF-Transform)";
await doc.transform(dedup(), prune());
if (RAW_OUT) await io.write(RAW_OUT, doc);
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
await io.write(OUT, doc);
console.log("beer verts", P.length / 3, "tris", I.length / 3, "top r", rTop.toFixed(4));
