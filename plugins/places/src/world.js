// The world the map draws: Natural Earth 1:110m land and borders (public
// domain, via world-atlas) plus precomputed dot grids. Decoded on first use,
// so activating the plugin stays instant.
import { feature, mesh } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { FLAT_DOTS, GLOBE_DOTS } from "./world-data.js";

let shapes;
export function worldShapes() {
  if (!shapes) {
    shapes = {
      land: feature(world, world.objects.land),
      borders: mesh(world, world.objects.countries, (a, b) => a !== b),
    };
  }
  return shapes;
}

function unpack(base64, scale) {
  const binary = atob(base64);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) view.setUint8(i, binary.charCodeAt(i));
  const out = new Float32Array(binary.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / scale;
  return out;
}

let flat;
/** Land dots on an even grid in Natural Earth space: [x0, y0, x1, y1, ...]
 * in reference units, where the whole sphere is `width` wide. */
export function flatDots() {
  if (!flat) flat = { ...FLAT_DOTS, points: unpack(FLAT_DOTS.data, 10) };
  return flat;
}

let globe;
/** Land dots spread evenly over the sphere: [lat0, lng0, lat1, lng1, ...]. */
export function globeDots() {
  if (!globe) {
    const raw = unpack(GLOBE_DOTS.data, 100);
    // Unit vectors, so the globe can test which side a dot is on cheaply.
    const rad = Math.PI / 180;
    const xyz = new Float32Array((raw.length / 2) * 3);
    for (let i = 0, j = 0; i < raw.length; i += 2, j += 3) {
      const lat = raw[i] * rad;
      const lng = raw[i + 1] * rad;
      xyz[j] = Math.cos(lat) * Math.cos(lng);
      xyz[j + 1] = Math.cos(lat) * Math.sin(lng);
      xyz[j + 2] = Math.sin(lat);
    }
    globe = { latlng: raw, xyz };
  }
  return globe;
}
