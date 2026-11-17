// The three looks. Each is a map mode plus a skin: the colors live in
// styles.css under [data-look], built from Buzz's own palette families, so
// every look follows Buzz's light and dark themes.
//
// To change the default, set DEFAULT_LOOK. People can also switch looks from
// the map's header; the choice is saved on their device.
export const LOOKS = [
  {
    id: "postcard",
    label: "Postcard",
    mode: "flat",
    land: "fill",
    hint: "A warm, illustrated paper map. Paper planes fly to new pins.",
  },
  {
    id: "globe",
    label: "Night globe",
    mode: "globe",
    land: "dots",
    hint: "A glowing globe that spins to each new dream.",
  },
  {
    id: "dots",
    label: "Confetti dots",
    mode: "flat",
    land: "dots",
    hint: "A clean dotted world with bright pins and a burst of confetti.",
  },
];

export const DEFAULT_LOOK = "postcard";

const STORAGE_KEY = "buzz101.dream-map.look";

export function lookById(id) {
  return LOOKS.find((look) => look.id === id) ?? LOOKS.find((look) => look.id === DEFAULT_LOOK);
}

export function savedLook() {
  try {
    return lookById(localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOOK).id;
  } catch {
    return DEFAULT_LOOK;
  }
}

export function saveLook(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The look still changes for this visit.
  }
}

// Each person gets one of Buzz's palette families, the same one every time.
export const FAMILIES = ["magenta", "iris", "cobalt", "jade", "flame", "bee", "citrus"];

export function familyFor(key) {
  let hash = 2166136261;
  for (const char of String(key ?? "")) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return FAMILIES[(hash >>> 0) % FAMILIES.length];
}
