// From a channel's messages to the dreams on its map. Pins are ordinary
// channel messages, so they persist on the relay and every member's copy of
// the plugin draws the same map. Edits move a pin; deleting the message
// removes it.
import { React } from "../../../shared/react.js";
import { countryLabel, distanceKm, lookupPlace, normalize } from "./gazetteer.js";
import { placesIn, validCoords } from "./places.js";

export const KINDS = [9, 40002, 40003, 5, 9005];
const PAGE = 500;
const EXTRA_PAGES = 3;

const tagOf = (event, name) => event.tags?.find((tag) => tag[0] === name)?.[1];

function textOf(event) {
  if (event.kind !== 40002) return typeof event.content === "string" ? event.content : "";
  try {
    const body = JSON.parse(event.content);
    return typeof body?.content === "string" ? body.content : "";
  } catch {
    return "";
  }
}

/** Messages as people see them: each author's latest edit, deleted ones gone. */
export function effectiveMessages(events) {
  const messages = new Map();
  for (const event of events) if (event.kind === 9 || event.kind === 40002) messages.set(event.id, event);
  const edits = new Map();
  const deleted = new Set();
  for (const event of events) {
    if (event.kind === 40003) {
      const target = tagOf(event, "e");
      const message = target && messages.get(target);
      const last = target && edits.get(target);
      if (message && message.pubkey === event.pubkey && (!last || last.created_at < event.created_at)) edits.set(target, event);
    } else if (event.kind === 5 || event.kind === 9005) {
      for (const tag of event.tags ?? []) {
        if (tag[0] !== "e") continue;
        const message = messages.get(tag[1]);
        // Authors delete their own; kind 9005 is a moderator's, which the relay checked.
        if (event.kind === 9005 || !message || message.pubkey === event.pubkey) deleted.add(tag[1]);
      }
    }
  }
  return [...messages.values()]
    .filter((event) => !deleted.has(event.id) && !event.error)
    .map((event) => ({ event, text: edits.has(event.id) ? edits.get(event.id).content : textOf(event) }))
    .sort((a, b) => a.event.created_at - b.event.created_at || a.event.id.localeCompare(b.event.id));
}

/** Every place mentioned in the channel, oldest first. */
export function mentionsIn(messages) {
  const list = [];
  for (const { event, text } of messages) {
    const root = event.tags?.find((tag) => tag[0] === "e" && tag[3] === "root")?.[1] ?? event.tags?.find((tag) => tag[0] === "e" && tag[3] === "reply")?.[1];
    placesIn(text).forEach((place, index) => list.push({ ...place, key: `${event.id}:${index}`, event, root }));
  }
  return list;
}

/** "Kyoto, Japan" -> { title: "Kyoto", subtitle: "Japan" } */
export function splitName(name, known) {
  const parts = String(name).split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return { title: parts[0], subtitle: parts.slice(1).join(", ") };
  const found = known === undefined ? lookupPlace(name) : known;
  const subtitle = found && !found.isCountry && found.country ? found.country : "";
  return { title: parts[0] ?? String(name), subtitle };
}

function person(pubkey, profiles) {
  const profile = profiles.get(pubkey);
  return {
    pubkey,
    name: profile?.name?.trim() || `${pubkey.slice(0, 8)}…`,
    picture: profile?.picture,
    isAgent: Boolean(profile?.isAgent),
  };
}

/** The dreamer is the person: an agent's pin belongs to the agent's owner. */
export function pinsFrom(mentions, resolved, profiles) {
  const pins = [];
  for (const mention of mentions) {
    const spot = mention.query ? resolved[mention.query] : mention;
    if (!spot || !validCoords(spot.lat, spot.lng)) continue;
    const author = profiles.get(mention.event.pubkey);
    const owner = author?.isAgent && /^[0-9a-f]{64}$/.test(author.ownerPubkey ?? "") ? author.ownerPubkey : undefined;
    const known = mention.query ? (resolved[mention.query]?.offline ?? null) : undefined;
    const { title, subtitle } = splitName(mention.name, known);
    pins.push({
      key: mention.key,
      eventId: mention.event.id,
      root: mention.root,
      title,
      subtitle: subtitle || (mention.query ? (resolved[mention.query]?.country ?? "") : ""),
      note: mention.note,
      lat: spot.lat,
      lng: spot.lng,
      createdAt: mention.event.created_at,
      dreamer: person(owner ?? mention.event.pubkey, profiles),
      via: owner ? person(mention.event.pubkey, profiles) : undefined,
    });
  }
  return pins;
}

/** Pins at the same place become one spot, so "most wanted" can count them. */
export function spotsFrom(pins) {
  const spots = [];
  for (const pin of [...pins].sort((a, b) => b.createdAt - a.createdAt)) {
    // The same place: the same name nearby ("Kyoto" and "Kyoto, Japan"), or
    // practically the same point under another name ("NYC", "New York City").
    // Different places in one city stay apart.
    const name = normalize(pin.title);
    const spot = spots.find((s) => {
      const km = distanceKm(s, pin);
      return km < 2 || (name && s.name === name && km < 250);
    });
    if (!spot) {
      spots.push({ key: pin.key, name, title: pin.title, subtitle: pin.subtitle, lat: pin.lat, lng: pin.lng, pins: [pin], latest: pin.createdAt });
      continue;
    }
    // One vote per person per place: keep their newest pin.
    if (!spot.pins.some((p) => p.dreamer.pubkey === pin.dreamer.pubkey)) spot.pins.push(pin);
    if (!spot.subtitle && pin.subtitle) spot.subtitle = pin.subtitle;
  }
  return spots.sort((a, b) => b.pins.length - a.pins.length || b.latest - a.latest);
}

// ---- The live hook ----

function useExternal(store) {
  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}

/** Reads a little further back than the live window, once, so pins from a
 * long, busy class still show for someone who opens the map late. */
function useOlder(session, channelId, live) {
  const [older, setOlder] = React.useState([]);
  const full = live.status === "ready" && live.events.length >= PAGE - 20;
  React.useEffect(() => {
    if (!full || typeof session.read !== "function") return;
    const controller = new AbortController();
    (async () => {
      let until = Math.min(...live.events.map((e) => e.created_at));
      const seen = new Set(live.events.map((e) => e.id));
      const found = [];
      for (let page = 0; page < EXTRA_PAGES && !controller.signal.aborted; page++) {
        const events = await session.read([{ kinds: KINDS, "#h": [channelId], until, limit: PAGE }], { signal: controller.signal });
        const fresh = events.filter((e) => !seen.has(e.id));
        fresh.forEach((e) => seen.add(e.id));
        found.push(...fresh);
        if (events.length < PAGE - 20 || !fresh.length) break;
        until = Math.min(...events.map((e) => e.created_at));
      }
      if (!controller.signal.aborted) setOlder(found);
    })().catch(() => {});
    return () => controller.abort();
  }, [session, channelId, full]);
  return older;
}

export function useDreams({ session, channelId, geocode }) {
  const view = React.useMemo(() => session.observe([{ kinds: KINDS, "#h": [channelId], limit: PAGE }]), [session, channelId]);
  React.useEffect(() => {
    void view.refresh();
    const timer = setInterval(() => void view.refresh(), 30000);
    return () => {
      clearInterval(timer);
      view.dispose();
    };
  }, [view]);
  const live = useExternal(view);
  const older = useOlder(session, channelId, live);
  const profiles = useExternal(session.profiles);

  const mentions = React.useMemo(() => mentionsIn(effectiveMessages([...older, ...live.events])), [live.events, older]);

  // Offline answers are immediate; only names the gazetteer doesn't know wait.
  const [online, setOnline] = React.useState({});
  const resolved = React.useMemo(() => {
    const out = {};
    for (const m of mentions) {
      if (!m.query || m.query in out) continue;
      const offline = lookupPlace(m.query);
      if (offline) out[m.query] = { lat: offline.lat, lng: offline.lng, country: offline.isCountry ? "" : offline.country, offline };
      else if (m.query in online) out[m.query] = online[m.query];
    }
    return out;
  }, [mentions, online]);
  const waiting = React.useMemo(() => [...new Set(mentions.filter((m) => m.query && !(m.query in resolved)).map((m) => m.query))], [mentions, resolved]);
  React.useEffect(() => {
    if (!waiting.length) return;
    let live = true;
    (async () => {
      for (const query of waiting) {
        const hit = await geocode(query);
        if (!live) return;
        setOnline((current) => ({ ...current, [query]: hit ? { ...hit, country: hit.country ?? "" } : null }));
      }
    })();
    return () => {
      live = false;
    };
  }, [waiting.join("\n")]);

  React.useEffect(() => {
    const authors = [...new Set(mentions.map((m) => m.event.pubkey))];
    if (authors.length) void session.profiles.ensure(authors);
  }, [mentions, session]);
  const owners = React.useMemo(
    () => [...new Set(mentions.map((m) => profiles.get(m.event.pubkey)?.ownerPubkey).filter((key) => /^[0-9a-f]{64}$/.test(key ?? "")))],
    [mentions, profiles],
  );
  React.useEffect(() => {
    if (owners.length) void session.profiles.ensure(owners);
  }, [owners.join(","), session]);

  const pins = React.useMemo(() => pinsFrom(mentions, resolved, profiles), [mentions, resolved, profiles]);
  const spots = React.useMemo(() => spotsFrom(pins), [pins]);
  const unresolved = mentions.filter((m) => m.query && resolved[m.query] === null);
  return {
    pins,
    spots,
    unresolved,
    looking: waiting.length,
    status: live.status,
    // The first read has finished: from here on, a new pin is news.
    ready: live.status === "ready" || live.status === "error",
  };
}

/** Pins that arrived while the map was open, newest last, for the fun bits.
 * Older pins that load late (history, slow lookups) never count. */
export function useArrivals(pins, ready) {
  const known = React.useRef(null);
  const [arrivals, setArrivals] = React.useState([]);
  React.useEffect(() => {
    if (!ready) return;
    if (!known.current) {
      known.current = new Set(pins.map((p) => p.key));
      return;
    }
    const recent = Date.now() / 1000 - 180;
    const unseen = pins.filter((p) => !known.current.has(p.key));
    unseen.forEach((p) => known.current.add(p.key));
    const fresh = unseen.filter((p) => p.createdAt >= recent);
    if (!fresh.length) return;
    const at = Date.now();
    setArrivals((list) => [...list.filter((a) => at - a.at < 8000), ...fresh.map((pin, i) => ({ pin, at: at + i * 900 }))]);
  }, [pins, ready]);
  return arrivals;
}

export { countryLabel };
