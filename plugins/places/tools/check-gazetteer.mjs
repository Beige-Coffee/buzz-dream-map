// Checks every gazetteer place against Natural Earth 1:50m country shapes:
// a place must lie in (or within 40 km of) the country it names, and every
// country's point must lie inside that country.
//   node plugins/places/tools/check-gazetteer.mjs
import { createRequire } from "node:module";
import { geoContains, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import { gazetteerEntries, lookupPlace } from "../src/gazetteer.js";

const require = createRequire(import.meta.url);
const world = require("world-atlas/countries-50m.json");
const shapes = new Map(feature(world, world.objects.countries).features.map((f) => [f.properties.name, f]));

function nearestKm(shape, point) {
  let best = Infinity;
  const visit = (ring) => {
    for (const vertex of ring) best = Math.min(best, geoDistance(vertex, point) * 6371);
  };
  const { type, coordinates } = shape.geometry;
  if (type === "Polygon") coordinates.forEach(visit);
  else coordinates.forEach((polygon) => polygon.forEach(visit));
  return best;
}

// Small islands that the 1:50m shapes leave out: their points sit in open
// water by design. Anything else in open water, or inside another country,
// is a typo.
const OFFSHORE = new Set(["La Digue", "Fernando de Noronha", "Los Roques", "Great Barrier Reef", "British Indian Ocean Territory", "Marshall Islands"]);
const problems = [];
const notes = [];
let checked = 0;
for (const entry of gazetteerEntries()) {
  if (!entry.sourceCountry) continue;
  const shape = shapes.get(entry.sourceCountry);
  if (!shape) {
    problems.push(`${entry.name}: no shape named "${entry.sourceCountry}"`);
    continue;
  }
  const point = [entry.lng, entry.lat];
  checked++;
  if (geoContains(shape, point)) continue;
  const km = nearestKm(shape, point);
  const inside = [...shapes.values()].find((s) => geoContains(s, point))?.properties.name;
  const where = `${entry.name} (${entry.sourceCountry}): ${km.toFixed(0)} km from its country, in ${inside ?? "open water"}`;
  if (inside && km > 15) problems.push(where);
  else if (!inside && km > 40 && !OFFSHORE.has(entry.name)) problems.push(where);
  else if (km > 40) notes.push(where);
}

// Lookups people will type.
const expect = {
  Kyoto: "Japan",
  "kyoto, japan": "Japan",
  "Reykjavik": "Iceland",
  "the Amalfi Coast": "Italy",
  "Machu Picchu": "Peru",
  "Lisbon, Portugal": "Portugal",
  "Córdoba, Argentina": "Argentina",
  Cordoba: "Spain",
  "New York": "United States",
  USA: "United States",
  Japan: "Japan",
  "Yosemite National Park": "United States",
  "Granada, Nicaragua": null,
  "Somewhere Nobody Knows": null,
};
for (const [query, country] of Object.entries(expect)) {
  const found = lookupPlace(query);
  if ((found?.country ?? null) !== country) problems.push(`lookup "${query}": expected ${country}, got ${found ? `${found.name}, ${found.country}` : "nothing"}`);
}

console.log(`checked ${checked} places and countries, ${Object.keys(expect).length} lookups`);
if (notes.length) console.log(`offshore by design:\n  ${notes.join("\n  ")}`);
if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log("all good");
