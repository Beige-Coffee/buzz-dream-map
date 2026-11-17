// Places in message text, the pin message the agent tool posts, and the
// checks on what an agent sends. A place needs coordinates from a map link
// or geo: URI, or a "📍 Name" line that the offline gazetteer (or, as a last
// resort, OpenStreetMap's Nominatim) can place.
import { distanceKm, lookupPlace } from "./gazetteer.js";

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";
const patterns = [
  // https://www.openstreetmap.org/?mlat=37.79&mlon=-122.39#map=17/...
  { source: "osm", re: new RegExp(`openstreetmap\\.org\\/[^\\s)>\\]]*[?&]mlat=${NUM}&mlon=${NUM}`, "i") },
  // https://www.openstreetmap.org/#map=17/37.79/-122.39
  { source: "osm", re: new RegExp(`openstreetmap\\.org\\/[^\\s)>\\]]*#map=\\d+\\/${NUM}\\/${NUM}`, "i") },
  // https://www.google.com/maps/place/Ferry+Building/@37.7955,-122.3937,17z
  { source: "google", re: new RegExp(`google\\.[a-z.]+\\/maps\\/[^\\s)>\\]]*@${NUM},${NUM}`, "i") },
  // https://maps.google.com/?q=37.79,-122.39 and the Maps URLs API's query=
  { source: "google", re: new RegExp(`google\\.[a-z.]+\\/maps[^\\s)>\\]]*[?&](?:q|query|ll)=${NUM}(?:,|%2C)\\s*${NUM}`, "i") },
  // https://maps.apple.com/?ll=37.79,-122.39&q=Ferry%20Building
  { source: "apple", re: new RegExp(`maps\\.apple\\.com\\/[^\\s)>\\]]*[?&](?:ll|sll|coordinate)=${NUM}(?:,|%2C)${NUM}`, "i") },
  // geo:37.79,-122.39
  { source: "geo", re: new RegExp(`\\bgeo:${NUM},${NUM}`, "i") },
];

const PIN = /^[ \t>*-]*📍️?[ \t]*(.+)$/u;

export function validCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function nameFromUrl(source, text) {
  try {
    if (source === "google") {
      const match = /\/maps\/place\/([^/@?#\s]+)/i.exec(text);
      if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
    }
    if (source === "apple") {
      const match = /maps\.apple\.com\/[^\s]*[?&](?:q|name)=([^&#\s)]+)/i.exec(text);
      if (match) return decodeURIComponent(match[1].replace(/\+/g, " "));
    }
  } catch {
    // A malformed escape leaves the name to the 📍 line or the default.
  }
  return undefined;
}

// "📍 Kyoto, Japan · temples in autumn" -> { name: "Kyoto, Japan", note }
// A Markdown link on the line, "📍 [Kyoto](https://…)", keeps its label.
function pinLine(text) {
  const match = PIN.exec(text);
  if (!match) return undefined;
  const line = match[1]
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<?https?:\/\/\S+>?/g, "")
    .trim();
  const [name, ...rest] = line.split(/\s+[·|•–—]\s+|\s+-\s+|:\s+/);
  const clean = name.replace(/[*_`~]/g, "").replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 2) return undefined;
  const note = rest.join(" · ").replace(/[*_`~]/g, "").trim();
  return { name: clean.slice(0, 80), note: note.slice(0, 200) || undefined };
}

function coordsIn(text) {
  for (const { source, re } of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (validCoords(lat, lng)) return { lat, lng, source };
  }
  return undefined;
}

/** Places mentioned in one message, one per line: with coordinates, or with
 * a name to look up. A 📍 line may carry its map link or have it on the next line. */
export function placesIn(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split("\n");
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pin = pinLine(line);
    let coords = coordsIn(line);
    if (pin && !coords && i + 1 < lines.length && !pinLine(lines[i + 1])) {
      coords = coordsIn(lines[i + 1]);
      if (coords) i++;
    }
    if (coords) {
      found.push({
        name: pin?.name ?? nameFromUrl(coords.source, line) ?? "Pinned place",
        note: pin?.note,
        lat: coords.lat,
        lng: coords.lng,
        source: coords.source,
      });
    } else if (pin) {
      found.push({ name: pin.name, note: pin.note, query: pin.name, source: "pin" });
    }
  }
  return found.slice(0, 12);
}

export function isMapUrl(url) {
  return typeof url === "string" && Boolean(coordsIn(url));
}

export function placeFromUrl(url) {
  const coords = coordsIn(url);
  if (!coords) return undefined;
  return { ...coords, name: nameFromUrl(coords.source, url) };
}

const fixed = (n) => String(Number(n.toFixed(4)));

export function mapLink(lat, lng, zoom = 10) {
  const la = fixed(lat);
  const lo = fixed(lng);
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=${zoom}/${la}/${lo}`;
}

/** The message the agent tool posts: readable in any Buzz, a pin in this one.
 * The link is written `<url>`: it still renders as a link, but Buzz draws no
 * web preview card for it, so twenty pins don't bring twenty OpenStreetMap cards. */
export function pinMessage({ name, note, lat, lng }) {
  return `📍 ${name}${note ? ` · ${note}` : ""}\n<${mapLink(lat, lng)}>`;
}

// ---- What an agent sends ----

const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  const text = value
    .replace(CONTROL, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/📍️?/gu, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function number(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\s*-?\d{1,3}(\.\d+)?\s*$/.test(value)) return Number(value);
  return NaN;
}

/**
 * Checks a dream_map_pin call. Returns { name, note, lat, lng, notes[] } or
 * throws an Error whose message tells the agent exactly what to fix.
 */
export function checkPin(args) {
  if (!args || typeof args !== "object") throw new Error("Give name, latitude and longitude.");
  // The posted line is "📍 name · note", so the name can't hold a separator.
  const name = cleanText(args.name ?? args.place, 80)
    .replace(/\s*[·|•–—:]\s*|\s+-\s+/g, ", ")
    .replace(/^[,\s]+|[,\s]+$/g, "");
  if (name.length < 2) throw new Error('Give the place\'s name in "name", for example "Kyoto, Japan".');
  const note = cleanText(args.note ?? args.why, 140) || undefined;
  const notes = [];
  let lat = number(args.latitude ?? args.lat);
  let lng = number(args.longitude ?? args.lng ?? args.lon);
  const known = lookupPlace(name);
  const given = !Number.isNaN(lat) || !Number.isNaN(lng);
  if (!given) {
    if (!known) throw new Error(`Give latitude and longitude for ${name} in decimal degrees, for example latitude 35.0116 and longitude 135.7681 for Kyoto.`);
    ({ lat, lng } = known);
    notes.push(`No coordinates were given, so the map used its own for ${known.name}${known.country && known.country !== known.name ? `, ${known.country}` : ""}.`);
  } else if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Give both latitude and longitude as numbers in decimal degrees, such as 35.0116 and 135.7681.");
  }
  if (Math.abs(lat) > 90 && Math.abs(lat) <= 180 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
    notes.push("Latitude and longitude looked swapped, so the map swapped them back.");
  }
  if (!validCoords(lat, lng)) throw new Error("Latitude must be between -90 and 90 and longitude between -180 and 180.");
  if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) throw new Error(`0, 0 is open ocean. Give the real latitude and longitude for ${name}.`);
  if (known && given) {
    const away = distanceKm({ lat, lng }, known);
    const swapped = distanceKm({ lat: lng, lng: lat }, known);
    if (away > 600 && swapped < 150 && Math.abs(lng) <= 90) {
      [lat, lng] = [lng, lat];
      notes.push("Latitude and longitude looked swapped, so the map swapped them back.");
    } else if (away > 600 && !known.isCountry) {
      notes.push(
        `Pinned where you said. Note: the map knows ${known.name}${known.country ? `, ${known.country}` : ""} at ${known.lat}, ${known.lng}, about ${Math.round(away).toLocaleString("en-US")} km away. If you meant that one, delete your pin message and pin it again with those coordinates.`,
      );
    }
  }
  return { name, note, lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)), notes };
}

// ---- Looking up 📍 lines ----

// Nominatim allows one request a second per app and asks clients to cache.
// In a class, twenty copies of this plugin share one network, so lookups
// wait their turn, spread out, stop for a while on any refusal, and stop for
// the session after a few dozen. Every answer is cached on this device.
const CACHE_KEY = "buzz101.dream-map.geocode.v2";
const SESSION_LIMIT = 30;
let cache;
function readCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    cache = {};
  }
  return cache;
}
function writeCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable: lookups still work, uncached.
  }
}

export function createGeocoder(host, { online = true } = {}) {
  let queue = Promise.resolve();
  let last = 0;
  let pausedUntil = 0;
  let used = 0;
  const inflight = new Map();
  return function geocode(query) {
    const offline = lookupPlace(query);
    if (offline) return Promise.resolve({ lat: offline.lat, lng: offline.lng, label: offline.name, country: offline.country });
    const key = String(query).trim().toLowerCase();
    const known = readCache()[key];
    if (known !== undefined) return Promise.resolve(known);
    if (!online || !host?.request) return Promise.resolve(null);
    if (inflight.has(key)) return inflight.get(key);
    const task = (queue = queue.then(async () => {
      if (Date.now() < pausedUntil || used >= SESSION_LIMIT) return null;
      // Up to three extra seconds, so a class's copies don't ask at once.
      const wait = Math.max(0, 1100 - (Date.now() - last)) + Math.random() * 3000;
      await new Promise((resolve) => setTimeout(resolve, wait));
      last = Date.now();
      used++;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(query)}`;
      try {
        const response = await host.request({
          url,
          headers: { "User-Agent": "BuzzDreamMap/1.0 (Buzz desktop plugin)", Accept: "application/json" },
          timeoutMs: 15000,
        });
        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          pausedUntil = Date.now() + 10 * 60 * 1000;
          return null;
        }
        if (response.status !== 200) return null;
        const [hit] = JSON.parse(response.body);
        const result = hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: String(hit.display_name ?? "").split(",")[0] } : null;
        if (result && !validCoords(result.lat, result.lng)) return null;
        readCache()[key] = result;
        writeCache();
        return result;
      } catch {
        return null;
      } finally {
        inflight.delete(key);
      }
    }));
    inflight.set(key, task);
    return task;
  };
}
