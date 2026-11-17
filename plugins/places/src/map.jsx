// The Dream map: a self-contained world drawn from bundled Natural Earth
// geometry. No tiles, no keys, no network. Two modes: a flat Natural Earth
// map (Postcard, Confetti dots) and a globe (Night globe).
import { geoGraticule10, geoInterpolate, geoNaturalEarth1, geoOrthographic, geoPath, geoRotation } from "d3-geo";
import { React, relativeTime } from "../../../shared/react.js";
import { familyFor } from "./looks.js";
import { Avatar, CloseIcon, FitIcon, HeartIcon, MessageIcon, MinusIcon, PlaneGlyph, PlusIcon } from "./ui.jsx";
import { flatDots, globeDots, worldShapes } from "./world.js";

const SPHERE = { type: "Sphere" };
const RAD = Math.PI / 180;
let graticule;
const graticuleLines = () => (graticule ??= geoGraticule10());

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function useSize(ref) {
  const [size, setSize] = React.useState(null);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const w = Math.round(element.clientWidth);
      const h = Math.round(element.clientHeight);
      if (w < 40 || h < 40) return;
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return size;
}

export function useReducedMotion() {
  const query = React.useMemo(() => (typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null), []);
  const [reduced, setReduced] = React.useState(() => Boolean(query?.matches));
  React.useEffect(() => {
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [query]);
  return reduced;
}

function useLatest(value) {
  const ref = React.useRef(value);
  ref.current = value;
  return ref;
}

/** Animates a view object from where it is to `target`. */
function useTween(setView, viewRef) {
  const frame = React.useRef(0);
  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return React.useCallback((target, ms = 800, mix) => {
    cancelAnimationFrame(frame.current);
    const from = viewRef.current;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const e = ease(t);
      setView(mix ? mix(from, target, e) : Object.fromEntries(Object.keys(target).map((key) => [key, lerp(from[key], target[key], e)])));
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);
}

// ---- Pins, clusters and labels, shared by both modes ----

/** Groups pins that would overlap on screen into one bubble, then merges
 * bubbles that would touch, so nothing on the map hides anything else. */
function clusterSpots(spots, toScreen, radius, w, h) {
  const clusters = [];
  for (const spot of spots) {
    const p = toScreen(spot);
    if (!p || p.x < -50 || p.y < -50 || p.x > w + 50 || p.y > h + 70) continue;
    const home = clusters.find((c) => (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < radius * radius);
    if (home) {
      home.members.push(spot);
      home.points.push(p);
    } else {
      clusters.push({ x: p.x, y: p.y, alpha: p.alpha ?? 1, members: [spot], points: [p] });
    }
  }
  for (let merged = true; merged; ) {
    merged = false;
    for (const c of clusters) {
      if (c.members.length > 1) {
        c.x = c.points.reduce((s, p) => s + p.x, 0) / c.points.length;
        c.y = c.points.reduce((s, p) => s + p.y, 0) / c.points.length;
      }
    }
    search: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i];
        const b = clusters[j];
        const reach = a.members.length > 1 || b.members.length > 1 ? radius * 1.8 : radius;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < reach * reach) {
          a.members.push(...b.members);
          a.points.push(...b.points);
          a.alpha = Math.max(a.alpha, b.alpha);
          clusters.splice(j, 1);
          merged = true;
          break search;
        }
      }
    }
  }
  return clusters;
}

let measureCanvas;
function textWidth(text, size) {
  measureCanvas ??= document.createElement("canvas").getContext("2d");
  measureCanvas.font = `600 ${size}px Inter, system-ui, sans-serif`;
  return measureCanvas.measureText(text).width;
}

/** Puts names beside pins wherever they fit, most wanted first. */
function placeLabels(clusters, { size, pinH, pinW, w, h, only }) {
  const taken = clusters.map((c) =>
    c.members.length > 1
      ? { x0: c.x - pinW * 0.7, x1: c.x + pinW * 0.7, y0: c.y - pinW * 0.7, y1: c.y + pinW * 0.7 }
      : { x0: c.x - pinW / 2, x1: c.x + pinW / 2 + 8, y0: c.y - pinH - 8, y1: c.y + 2 },
  );
  const hit = (a) => a.x0 < 2 || a.y0 < 2 || a.x1 > w - 2 || a.y1 > h - 2 || taken.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
  const labels = [];
  for (const c of clusters) {
    if (c.members.length !== 1 || c.alpha < 0.6) continue;
    const spot = c.members[0];
    if (only && !only(spot)) continue;
    const text = spot.pins.length > 1 ? `${spot.title} ×${spot.pins.length}` : spot.title;
    const lw = textWidth(text, size) + 12;
    const lh = size + 8;
    const options = [
      { x0: c.x - lw / 2, y0: c.y + 3 },
      { x0: c.x + pinW / 2 + 2, y0: c.y - pinH / 2 - lh / 2 },
      { x0: c.x - pinW / 2 - 2 - lw, y0: c.y - pinH / 2 - lh / 2 },
      { x0: c.x - lw / 2, y0: c.y - pinH - lh - 2 },
    ];
    for (const o of options) {
      const box = { x0: o.x0, y0: o.y0, x1: o.x0 + lw, y1: o.y0 + lh };
      if (hit(box)) continue;
      taken.push(box);
      labels.push({ key: spot.key, text, x: o.x0, y: o.y0, wanted: spot.pins.length > 1 });
      break;
    }
  }
  return labels;
}

function pinLabel(spot) {
  const names = spot.pins.map((p) => p.dreamer.name);
  const who = names.length > 2 ? `${names.slice(0, 2).join(", ")} and ${names.length - 2} more` : names.join(" and ");
  return `${spot.title}${spot.subtitle ? `, ${spot.subtitle}` : ""}. ${who} ${names.length > 1 ? "want" : "wants"} to go.`;
}

function SpotPin({ spot, x, y, alpha, selected, fresh, hidden, onSelect }) {
  const lead = spot.pins[0];
  const family = familyFor(lead.dreamer.pubkey);
  const count = spot.pins.length;
  return (
    <button
      type="button"
      className="dm-pin"
      data-family={family}
      data-selected={selected || undefined}
      data-fresh={fresh || undefined}
      data-wanted={count > 1 || undefined}
      style={{ transform: `translate(${x}px, ${y}px)`, opacity: hidden ? 0 : alpha, zIndex: selected ? 30 : fresh ? 20 : 11 + Math.min(count, 8) }}
      tabIndex={hidden ? -1 : undefined}
      aria-label={pinLabel(spot)}
      aria-pressed={selected}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(selected ? null : spot.key);
      }}
    >
      <span className="dm-pin__drop">
        <span className="dm-pin__body">
          <Avatar person={lead.dreamer} className="dm-pin__face" />
          {count > 1 ? (
            <span className="dm-pin__count">
              <HeartIcon />
              {count}
            </span>
          ) : lead.via ? (
            <Avatar person={lead.via} className="dm-pin__via" />
          ) : null}
        </span>
        <span className="dm-pin__tail" />
      </span>
    </button>
  );
}

function ClusterPin({ cluster, onOpen }) {
  const people = cluster.members.flatMap((s) => s.pins);
  const faces = people.slice(0, 3);
  return (
    <button
      type="button"
      className="dm-cluster"
      data-faces={faces.length}
      style={{ transform: `translate(${cluster.x}px, ${cluster.y}px)`, opacity: cluster.alpha, zIndex: 10 }}
      aria-label={`${people.length} dreams close together: ${cluster.members.map((s) => s.title).join(", ")}. Zoom in.`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(cluster);
      }}
    >
      <span className="dm-cluster__body">
        {faces.map((pin, i) => (
          <Avatar key={pin.key} person={pin.dreamer} className={`dm-cluster__face dm-cluster__face--${i + 1}`} />
        ))}
        <span className="dm-cluster__count">{people.length}</span>
      </span>
    </button>
  );
}

function Burst({ x, y, family, reduced }) {
  if (reduced) return null;
  const pieces = Array.from({ length: 14 }, (_, i) => i);
  const colors = ["magenta", "bee", "iris", "jade", "flame", "cobalt", "citrus"];
  return (
    <span className="dm-burst" style={{ transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
      <span className="dm-burst__ring" data-family={family} />
      <span className="dm-burst__ring dm-burst__ring--late" data-family={family} />
      {pieces.map((i) => (
        <i
          key={i}
          data-family={colors[i % colors.length]}
          style={{
            "--a": `${(i / pieces.length) * 360 + (i % 2) * 11}deg`,
            "--d": `${34 + (i % 3) * 14}px`,
            "--r": `${(i % 2 ? 1 : -1) * (120 + i * 17)}deg`,
            "--delay": `${(i % 4) * 25}ms`,
          }}
        />
      ))}
    </span>
  );
}

/** A paper plane flying the same curve as the dashed trail. It reads the
 * current view every frame, so it stays on course while the map moves. */
function Plane({ flight, project }) {
  const element = React.useRef(null);
  const latest = useLatest(project);
  React.useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1600);
      const a = latest.current(flight.from);
      const b = latest.current(flight.to);
      const el = element.current;
      if (a && b && el) {
        const e = ease(t);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2 - Math.hypot(b.x - a.x, b.y - a.y) * 0.32;
        const x = (1 - e) ** 2 * a.x + 2 * (1 - e) * e * cx + e * e * b.x;
        const y = (1 - e) ** 2 * a.y + 2 * (1 - e) * e * cy + e * e * b.y;
        const angle = Math.atan2(2 * (1 - e) * (cy - a.y) + 2 * e * (b.y - cy), 2 * (1 - e) * (cx - a.x) + 2 * e * (b.x - cx));
        el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
        el.style.opacity = String(t < 0.85 ? 1 : (1 - t) / 0.15);
      }
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <span ref={element} className="dm-plane" data-family={flight.family} aria-hidden="true">
      <PlaneGlyph size={22} />
    </span>
  );
}

/** The selected place, or a group of places too close to tell apart even
 * fully zoomed in (a cluster's "group:" key). */
function selectedSpot(spots, key) {
  if (!key) return undefined;
  if (!key.startsWith("group:")) return spots.find((s) => s.key === key);
  const keys = key.slice(6).split(",");
  const members = spots.filter((s) => keys.includes(s.key));
  if (members.length < 2) return members[0];
  return {
    key,
    group: true,
    title: `${members.length} places close together`,
    subtitle: members.map((m) => m.title).join(", "),
    lat: members[0].lat,
    lng: members[0].lng,
    pins: members.flatMap((m) => m.pins),
  };
}

function SpotCard({ spot, x, y, w, h, onClose, onShowMessage }) {
  const width = Math.min(300, w - 24);
  const above = y > 230 || y > h / 2;
  const left = clamp(x - width / 2, 12, w - width - 12);
  const style = above ? { left, bottom: h - y + 52, width } : { left, top: y + 14, width };
  const wanted = spot.group ? 0 : spot.pins.length;
  return (
    <div
      className="dm-card"
      role="dialog"
      aria-label={spot.title}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="dm-card__head">
        <span className="dm-card__title">
          <strong>{spot.title}</strong>
          {spot.subtitle && <span>{spot.subtitle}</span>}
        </span>
        <button type="button" className="dm-icon-button" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      {wanted > 1 && (
        <p className="dm-card__wanted">
          <HeartIcon /> {wanted} people want to go here
        </p>
      )}
      <ul className="dm-card__people">
        {spot.pins.map((pin) => (
          <li key={pin.key}>
            <Avatar person={pin.dreamer} />
            <span className="dm-card__text">
              <span className="dm-card__who">
                <b>{pin.dreamer.name}</b>
                {pin.via && <span> via {pin.via.name}</span>}
                {spot.group && <span> · {pin.title}</span>}
                <span className="dm-card__time">{relativeTime(pin.createdAt)}</span>
              </span>
              {pin.note && <span className="dm-card__note">“{pin.note}”</span>}
              {onShowMessage && (
                <button type="button" className="dm-text-button" onClick={() => onShowMessage(pin)}>
                  <MessageIcon /> Show message
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Controls({ onIn, onOut, onFit }) {
  return (
    <div className="dm-controls">
      <button type="button" className="dm-icon-button" aria-label="Zoom in" title="Zoom in" onClick={onIn}>
        <PlusIcon />
      </button>
      <button type="button" className="dm-icon-button" aria-label="Zoom out" title="Zoom out" onClick={onOut}>
        <MinusIcon />
      </button>
      <button type="button" className="dm-icon-button" aria-label="Show every pin" title="Show every pin" onClick={onFit}>
        <FitIcon />
      </button>
    </div>
  );
}

function Compass() {
  return (
    <svg className="dm-compass" width="44" height="44" viewBox="-22 -22 44 44" aria-hidden="true">
      <circle r="17" className="dm-compass__ring" />
      <path d="M0 -15 L4 0 L0 15 L-4 0 Z" className="dm-compass__needle" />
      <path d="M0 -15 L4 0 L-4 0 Z" className="dm-compass__north" />
      <text y="-19" textAnchor="middle">N</text>
    </svg>
  );
}

/** Drag, wheel and double-click handling for both modes. */
function useGestures(element, { onDrag, onZoom, onTap, onDouble }) {
  const handlers = useLatest({ onDrag, onZoom, onTap, onDouble });
  React.useEffect(() => {
    const el = element.current;
    if (!el) return;
    let press = null;
    // These are native listeners, so React's stopPropagation comes too late:
    // leave pins, bubbles, cards and buttons to their own handlers.
    const own = (e) => Boolean(e.target?.closest?.(".dm-pin, .dm-cluster, .dm-card, .dm-controls"));
    const down = (e) => {
      if (e.button !== 0 || own(e)) return;
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    };
    const move = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const dx = e.clientX - press.lastX;
      const dy = e.clientY - press.lastY;
      if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) {
        press.moved = true;
        el.setPointerCapture?.(e.pointerId);
        el.dataset.dragging = "";
      }
      if (press.moved) handlers.current.onDrag(dx, dy);
      press.lastX = e.clientX;
      press.lastY = e.clientY;
    };
    const up = (e) => {
      if (!press || e.pointerId !== press.id) return;
      if (!press.moved) handlers.current.onTap?.(e);
      delete el.dataset.dragging;
      press = null;
    };
    const wheel = (e) => {
      if (e.target?.closest?.(".dm-card")) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const scale = e.deltaMode === 1 ? 16 : 1;
      const factor = Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.012 : 0.0022));
      handlers.current.onZoom(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    const dbl = (e) => {
      if (own(e)) return;
      const rect = el.getBoundingClientRect();
      handlers.current.onDouble?.(e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("dblclick", dbl);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("dblclick", dbl);
    };
  }, []);
}

function circles(points, r) {
  // One path of many small circles: far cheaper than thousands of elements.
  const d = [];
  const r2 = (2 * r).toFixed(2);
  const rs = r.toFixed(2);
  for (const [x, y] of points) d.push(`M${(x - r).toFixed(1)} ${y.toFixed(1)}a${rs} ${rs} 0 1 0 ${r2} 0a${rs} ${rs} 0 1 0 -${r2} 0`);
  return d.join("");
}

// ---- Flat mode ----

function flatBase(w, h, big) {
  const pad = big ? 26 : 10;
  const projection = geoNaturalEarth1().fitExtent([[pad, pad], [w - pad, h - pad]], SPHERE);
  const path = geoPath(projection);
  const [[x0, y0], [x1, y1]] = path.bounds(SPHERE);
  const { land, borders } = worldShapes();
  const ref = geoNaturalEarth1().fitWidth(1000, SPHERE);
  const f = projection.scale() / ref.scale();
  const [rtx, rty] = ref.translate();
  const [btx, bty] = projection.translate();
  return {
    projection,
    path,
    f,
    fromRef: (x, y) => [(x - rtx) * f + btx, (y - rty) * f + bty],
    sphere: path(SPHERE),
    land: path(land),
    borders: path(borders),
    graticule: path(graticuleLines()),
    bounds: { x0, x1, y0, y1 },
    band: { y0: projection([0, 78])[1], y1: projection([0, -56])[1] },
  };
}

function clampFlat(view, base, w, h) {
  const k = clamp(view.k, 1, 14);
  if (k <= 1.02) return { k: 1, x: 0, y: 0 };
  return {
    k,
    x: clamp(view.x, w / 2 - k * base.bounds.x1, w / 2 - k * base.bounds.x0),
    y: clamp(view.y, h / 2 - k * base.band.y1, h / 2 - k * base.band.y0),
  };
}

function fitFlat(spots, base, w, h, { maxK = 4, pad = 56 } = {}) {
  if (!spots.length) return { k: 1, x: 0, y: 0 };
  const points = spots.map((s) => base.projection([s.lng, s.lat]));
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Dreams all over the world: show the whole world, edge to edge.
  if ((x1 - x0) / (base.bounds.x1 - base.bounds.x0) > 0.6) return { k: 1, x: 0, y: 0 };
  const k = clamp(Math.min((w - 2 * pad) / Math.max(x1 - x0, 1), (h - 2 * pad) / Math.max(y1 - y0, 1)), 1, maxK);
  return clampFlat({ k, x: w / 2 - k * ((x0 + x1) / 2), y: h / 2 - k * ((y0 + y1) / 2) }, base, w, h);
}

function FlatView({ w, h, look, spots, selectedKey, onSelect, freshKeys, arrivingKeys, bursts, flights, big, reduced, onShowMessage, register, labelsFor }) {
  const base = React.useMemo(() => flatBase(w, h, big), [w, h, big]);
  const [view, setView] = React.useState(() => fitFlat(spots, base, w, h, { maxK: 2.2 }));
  const viewRef = useLatest(view);
  const tween = useTween(setView, viewRef);
  const root = React.useRef(null);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const sized = React.useRef(base);
  if (sized.current !== base) {
    // Resized: keep the same place in the middle.
    const old = sized.current;
    const cx = (w / 2 - view.x) / view.k;
    const cy = (h / 2 - view.y) / view.k;
    const geo = old.projection.invert([cx, cy]);
    const p = geo ? base.projection(geo) : [w / 2, h / 2];
    sized.current = base;
    const next = clampFlat({ k: view.k, x: w / 2 - view.k * p[0], y: h / 2 - view.k * p[1] }, base, w, h);
    if (next.k !== view.k || next.x !== view.x || next.y !== view.y) setView(next);
  }

  const zoomAt = (factor, px, py, animate) => {
    const v = viewRef.current;
    const k = clamp(v.k * factor, 1, 14);
    const target = clampFlat({ k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) }, base, w, h);
    if (animate) tween(target, 350);
    else setView(target);
  };
  useGestures(root, {
    onDrag: (dx, dy) => setView((v) => clampFlat({ ...v, x: v.x + dx, y: v.y + dy }, base, w, h)),
    onZoom: (factor, x, y) => zoomAt(factor, x, y),
    onDouble: (x, y) => zoomAt(2, x, y, true),
    onTap: () => onSelect(null),
  });

  const project = (spot) => {
    const p = base.projection([spot.lng, spot.lat]);
    return p && { x: view.k * p[0] + view.x, y: view.k * p[1] + view.y };
  };
  const fitTo = (list, maxK) => tween(fitFlat(list, base, w, h, { maxK }), reduced ? 1 : 750);
  register.current = {
    reveal(spot, { zoom } = {}) {
      const p = project(spot);
      if (zoom) {
        const k = Math.max(viewRef.current.k, 3);
        const q = base.projection([spot.lng, spot.lat]);
        tween(clampFlat({ k, x: w / 2 - k * q[0], y: h / 2 - k * q[1] + 40 }, base, w, h), reduced ? 1 : 800);
      } else if (p && (p.x < w * 0.12 || p.x > w * 0.88 || p.y < h * 0.18 || p.y > h * 0.9)) {
        const v = viewRef.current;
        const q = base.projection([spot.lng, spot.lat]);
        tween(clampFlat({ k: v.k, x: w / 2 - v.k * q[0], y: h / 2 - v.k * q[1] }, base, w, h), reduced ? 1 : 900);
      }
    },
    fit: () => fitTo(spots, 4),
  };

  const k = view.k;
  const dots = React.useMemo(() => {
    if (look.land !== "dots") return null;
    const { points, step } = flatDots();
    // Keep dots at least ~5px apart on screen: a crisp halftone, not grey noise.
    const stride = step * base.f * k < 4.8 ? 2 : 1;
    const all = [];
    for (let i = 0; i < points.length; i += 2) {
      if (stride === 2 && ((Math.round((points[i] - step / 2) / step) | Math.round((points[i + 1] - step / 2) / step)) & 1)) continue;
      all.push(base.fromRef(points[i], points[i + 1]));
    }
    const r = Math.min(step * stride * base.f * 0.31, 3.5 / k);
    return { all, r };
  }, [base, look.land, Math.round(Math.log2(k) * 4)]);
  const tinted = React.useMemo(() => {
    if (!dots) return [];
    // Dots around each pin take the dreamer's color, like a little glow.
    const reach = flatDots().step * base.f * 3.6;
    const groups = new Map();
    const places = spots.map((s) => ({ p: base.projection([s.lng, s.lat]), family: familyFor(s.pins[0].dreamer.pubkey) }));
    for (const point of dots.all) {
      for (const { p, family } of places) {
        if (p && (p[0] - point[0]) ** 2 + (p[1] - point[1]) ** 2 < reach * reach) {
          if (!groups.has(family)) groups.set(family, []);
          groups.get(family).push(point);
          break;
        }
      }
    }
    return [...groups].map(([family, points]) => ({ family, d: circles(points, dots.r * 1.12) }));
  }, [dots, spots]);
  const dotsPath = React.useMemo(() => (dots ? circles(dots.all, dots.r) : ""), [dots]);

  const radius = big ? 34 : 28;
  const clusters = clusterSpots(spots, project, radius, w, h);
  const selected = selectedSpot(spots, selectedKey);
  const selectedPoint = selected && project(selected);
  const labels = placeLabels(clusters, { size: big ? 13 : 11, pinH: big ? 54 : 42, pinW: big ? 44 : 34, w, h, only: labelsFor });

  return (
    <div className="dm-stage" ref={root}>
      <svg className="dm-svg" width={w} height={h} aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-sea`} cx="50%" cy="45%" r="70%">
            <stop offset="0%" className="dm-sea-0" />
            <stop offset="100%" className="dm-sea-1" />
          </radialGradient>
          <clipPath id={`${uid}-sphere`}>
            <path d={base.sphere} />
          </clipPath>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
          {look.land === "fill" ? (
            <>
              <path className="dm-sphere-shadow" d={base.sphere} transform={`translate(0 ${5 / k})`} />
              <path className="dm-sea" d={base.sphere} fill={`url(#${uid}-sea)`} />
              <path className="dm-graticule" d={base.graticule} clipPath={`url(#${uid}-sphere)`} />
              <g clipPath={`url(#${uid}-sphere)`}>
                <path className="dm-coast-halo dm-coast-halo--wide" d={base.land} />
                <path className="dm-coast-halo" d={base.land} />
              </g>
              <path className="dm-land-shadow" d={base.land} transform={`translate(0 ${2.5 / k})`} />
              <path className="dm-land" d={base.land} />
              <path className="dm-borders" d={base.borders} />
              <path className="dm-sphere-edge" d={base.sphere} />
            </>
          ) : (
            <>
              <path className="dm-sphere-faint" d={base.sphere} />
              <path className="dm-dots" d={dotsPath} />
              {tinted.map((t) => (
                <path key={t.family} className="dm-dots-tint" data-family={t.family} d={t.d} />
              ))}
            </>
          )}
          {flights.map((flight) => {
            const a = base.projection([flight.from.lng, flight.from.lat]);
            const b = base.projection([flight.to.lng, flight.to.lat]);
            if (!a || !b) return null;
            const mx = (a[0] + b[0]) / 2;
            const my = (a[1] + b[1]) / 2;
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const d = `M${a[0]} ${a[1]} Q${mx} ${my - len * 0.32} ${b[0]} ${b[1]}`;
            return (
              <g key={flight.id} className="dm-flight" data-family={flight.family}>
                <path className="dm-flight__trail" d={d} pathLength="1" />
              </g>
            );
          })}
        </g>
      </svg>
      {look.id === "postcard" && <Compass />}
      <div className="dm-overlay">
        {labels.map((label) => (
          <span key={label.key} className="dm-label" data-wanted={label.wanted || undefined} style={{ transform: `translate(${label.x}px, ${label.y}px)` }}>
            {label.text}
          </span>
        ))}
        {clusters.map((cluster) =>
          cluster.members.length === 1 ? (
            <SpotPin
              key={`spot:${cluster.members[0].key}`}
              spot={cluster.members[0]}
              x={cluster.x}
              y={cluster.y}
              alpha={cluster.alpha}
              selected={cluster.members[0].key === selectedKey}
              fresh={freshKeys.has(cluster.members[0].key)}
              hidden={arrivingKeys.has(cluster.members[0].key)}
              onSelect={onSelect}
            />
          ) : (
            <ClusterPin
              key={`cluster:${cluster.members[0].key}`}
              cluster={cluster}
              onOpen={(c) => {
                const v = viewRef.current;
                const fit = fitFlat(c.members, base, w, h, { maxK: 14, pad: 90 });
                if (fit.k <= v.k * 1.15) onSelect(`group:${c.members.map((m) => m.key).join(",")}`);
                else tween(fit, reduced ? 1 : 650);
              }}
            />
          ),
        )}
        {bursts.map((b) => {
          const spot = spots.find((s) => s.key === b.spotKey);
          const p = spot && project(spot);
          return p ? <Burst key={b.id} x={p.x} y={p.y} family={b.family} reduced={reduced} /> : null;
        })}
        {!reduced && flights.map((flight) => <Plane key={flight.id} flight={flight} project={project} />)}
        {selected && selectedPoint && <SpotCard spot={selected} x={selectedPoint.x} y={selectedPoint.y} w={w} h={h} onClose={() => onSelect(null)} onShowMessage={onShowMessage} />}
      </div>
      <Controls onIn={() => zoomAt(1.6, w / 2, h / 2, true)} onOut={() => zoomAt(1 / 1.6, w / 2, h / 2, true)} onFit={() => fitTo(spots, 4)} />
    </div>
  );
}

// ---- Globe mode ----

let stars;
const starField = () =>
  (stars ??= Array.from({ length: 70 }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    return [a - Math.floor(a), b - Math.floor(b), 0.4 + ((i * 37) % 10) / 14];
  }));

function GlobeView({ w, h, look, spots, selectedKey, onSelect, freshKeys, arrivingKeys, bursts, flights, big, reduced, onShowMessage, register, labelsFor }) {
  const R0 = Math.max(60, Math.min(w, h) / 2 - (big ? 34 : 20));
  const start = spots[0] ? { lambda: spots[0].lng, phi: clamp(spots[0].lat * 0.6, -25, 35) } : { lambda: 10, phi: 18 };
  const [view, setView] = React.useState({ ...start, k: 1 });
  const viewRef = useLatest(view);
  const tween = useTween(setView, viewRef);
  const root = React.useRef(null);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const idleUntil = React.useRef(performance.now() + 45000);
  const busy = React.useRef(0);
  const wake = (ms = 45000) => {
    idleUntil.current = performance.now() + ms;
  };

  // A gentle spin, about 24 frames a second, that rests after a while so a
  // class of laptops isn't spinning a globe all afternoon.
  React.useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 40) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (document.hidden || now < busy.current || now > idleUntil.current) return;
      setView((v) => ({ ...v, lambda: v.lambda + dt * 5 }));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  const projection = React.useMemo(() => geoOrthographic().clipAngle(90).precision(0.7), []);
  projection
    .scale(R0 * view.k)
    .translate([w / 2, h / 2])
    .rotate([-view.lambda, -view.phi]);
  const path = geoPath(projection);
  const rotate = geoRotation([-view.lambda, -view.phi]);
  const R = R0 * view.k;
  const toScreen = (lng, lat, lift = 0) => {
    const [l, p] = rotate([lng, lat]);
    const cosP = Math.cos(p * RAD);
    const depth = cosP * Math.cos(l * RAD);
    return { x: w / 2 + R * (1 + lift) * cosP * Math.sin(l * RAD), y: h / 2 - R * (1 + lift) * Math.sin(p * RAD), depth };
  };
  const project = (spot) => {
    const s = toScreen(spot.lng, spot.lat);
    if (s.depth < 0.06) return null;
    return { x: s.x, y: s.y, alpha: clamp((s.depth - 0.06) / 0.2, 0, 1) };
  };

  const drag = (dx, dy) => {
    busy.current = performance.now() + 4000;
    wake();
    const degrees = 180 / Math.PI / (R0 * viewRef.current.k);
    setView((v) => ({ ...v, lambda: v.lambda - dx * degrees, phi: clamp(v.phi + dy * degrees, -70, 70) }));
  };
  const zoom = (factor, animate) => {
    busy.current = performance.now() + 3000;
    const k = clamp(viewRef.current.k * factor, 0.75, 4.5);
    if (animate) tween({ ...viewRef.current, k }, 350);
    else setView((v) => ({ ...v, k }));
  };
  useGestures(root, {
    onDrag: drag,
    onZoom: (factor) => zoom(factor),
    onDouble: () => zoom(1.7, true),
    onTap: () => onSelect(null),
  });
  const turnTo = (spot, k) => {
    busy.current = performance.now() + 5000;
    wake();
    const from = viewRef.current;
    let lambda = spot.lng;
    while (lambda - from.lambda > 180) lambda -= 360;
    while (lambda - from.lambda < -180) lambda += 360;
    tween({ lambda, phi: clamp(spot.lat * 0.8, -50, 55), k: k ?? from.k }, reduced ? 1 : 1300);
  };
  register.current = {
    reveal: (spot, { zoom: closer } = {}) => turnTo(spot, closer ? Math.max(viewRef.current.k, 1.8) : undefined),
    fit: () => {
      wake();
      tween({ ...viewRef.current, k: 1 }, 600);
    },
  };

  const dots = React.useMemo(() => globeDots(), []);
  const c = [Math.cos(view.phi * RAD) * Math.cos(view.lambda * RAD), Math.cos(view.phi * RAD) * Math.sin(view.lambda * RAD), Math.sin(view.phi * RAD)];
  const near = [];
  const far = [];
  const r = Math.max(0.6, R * 0.0074);
  for (let i = 0, j = 0; i < dots.latlng.length; i += 2, j += 3) {
    const dot = dots.xyz[j] * c[0] + dots.xyz[j + 1] * c[1] + dots.xyz[j + 2] * c[2];
    if (dot < 0.02) continue;
    const s = toScreen(dots.latlng[i + 1], dots.latlng[i]);
    (dot > 0.35 ? near : far).push([s.x, s.y]);
  }

  const radius = big ? 34 : 28;
  const clusters = clusterSpots(spots, project, radius, w, h);
  const selected = selectedSpot(spots, selectedKey);
  const selectedPoint = selected && project(selected);
  const labels = placeLabels(clusters, { size: big ? 13 : 11, pinH: big ? 54 : 42, pinW: big ? 44 : 34, w, h, only: labelsFor });

  return (
    <div className="dm-stage" ref={root} onPointerEnter={() => wake()}>
      <svg className="dm-svg" width={w} height={h} aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-space`} cx="50%" cy="40%" r="75%">
            <stop offset="0%" className="dm-space-0" />
            <stop offset="100%" className="dm-space-1" />
          </radialGradient>
          <radialGradient id={`${uid}-ball`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" className="dm-ball-0" />
            <stop offset="65%" className="dm-ball-1" />
            <stop offset="100%" className="dm-ball-2" />
          </radialGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset={`${(R / (R * 1.22)) * 100 - 2}%`} className="dm-glow-0" />
            <stop offset="100%" className="dm-glow-1" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill={`url(#${uid}-space)`} />
        <g className="dm-stars">
          {starField().map(([x, y, s], i) => (
            <circle key={i} cx={x * w} cy={y * h} r={s} />
          ))}
        </g>
        <circle cx={w / 2} cy={h / 2} r={R * 1.22} fill={`url(#${uid}-glow)`} />
        <circle className="dm-ball" cx={w / 2} cy={h / 2} r={R} fill={`url(#${uid}-ball)`} />
        <path className="dm-graticule" d={path(graticuleLines()) ?? ""} />
        <path className="dm-globe-dots dm-globe-dots--far" d={circles(far, r * 0.8)} />
        <path className="dm-globe-dots" d={circles(near, r)} />
        <circle className="dm-ball-rim" cx={w / 2} cy={h / 2} r={R} />
        {flights.map((flight) => {
          const interpolate = geoInterpolate([flight.from.lng, flight.from.lat], [flight.to.lng, flight.to.lat]);
          const steps = 40;
          let d = "";
          let pen = false;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const [lng, lat] = interpolate(t);
            const s = toScreen(lng, lat, 0.18 * Math.sin(Math.PI * t));
            if (s.depth < -0.05) {
              pen = false;
              continue;
            }
            d += `${pen ? "L" : "M"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
            pen = true;
          }
          return d ? <path key={flight.id} className="dm-arc" data-family={flight.family} d={d} pathLength="1" /> : null;
        })}
      </svg>
      <div className="dm-overlay">
        {labels.map((label) => (
          <span key={label.key} className="dm-label" data-wanted={label.wanted || undefined} style={{ transform: `translate(${label.x}px, ${label.y}px)` }}>
            {label.text}
          </span>
        ))}
        {clusters.map((cluster) =>
          cluster.members.length === 1 ? (
            <SpotPin
              key={`spot:${cluster.members[0].key}`}
              spot={cluster.members[0]}
              x={cluster.x}
              y={cluster.y}
              alpha={cluster.alpha}
              selected={cluster.members[0].key === selectedKey}
              fresh={freshKeys.has(cluster.members[0].key)}
              hidden={arrivingKeys.has(cluster.members[0].key)}
              onSelect={(key) => {
                if (key) busy.current = performance.now() + 60000;
                onSelect(key);
              }}
            />
          ) : (
            <ClusterPin
              key={`cluster:${cluster.members[0].key}`}
              cluster={cluster}
              onOpen={(cl) => {
                if (viewRef.current.k >= 4.4) {
                  busy.current = performance.now() + 60000;
                  onSelect(`group:${cl.members.map((m) => m.key).join(",")}`);
                } else turnTo(cl.members[0], Math.min(4.5, viewRef.current.k * 2));
              }}
            />
          ),
        )}
        {bursts.map((b) => {
          const spot = spots.find((s) => s.key === b.spotKey);
          const p = spot && project(spot);
          return p ? <Burst key={b.id} x={p.x} y={p.y} family={b.family} reduced={reduced} /> : null;
        })}
        {selected && selectedPoint && (
          <SpotCard
            spot={selected}
            x={selectedPoint.x}
            y={selectedPoint.y}
            w={w}
            h={h}
            onClose={() => {
              busy.current = 0;
              onSelect(null);
            }}
            onShowMessage={onShowMessage}
          />
        )}
      </div>
      <Controls onIn={() => zoom(1.5, true)} onOut={() => zoom(1 / 1.5, true)} onFit={() => register.current.fit()} />
    </div>
  );
}

// ---- The map ----

/**
 * spots: places with their dreamers (see dream.js). arrivals: pins that just
 * landed, which get a flight, a burst and a toast. focus: { key, nonce } to
 * fly to a place from the list.
 */
export function DreamMap({ spots, look, arrivals = [], focus, selectedKey, onSelect, big = false, labels = "auto", stamp, onShowMessage }) {
  const box = React.useRef(null);
  const size = useSize(box);
  const reduced = useReducedMotion();
  const register = React.useRef(null);
  const [freshKeys, setFreshKeys] = React.useState(() => new Set());
  const [arrivingKeys, setArrivingKeys] = React.useState(() => new Set());
  const [bursts, setBursts] = React.useState([]);
  const [flights, setFlights] = React.useState([]);
  const [toasts, setToasts] = React.useState([]);
  const played = React.useRef(new Set());
  const lastSpot = React.useRef(null);
  const spotsRef = useLatest(spots);
  const timers = React.useRef([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  React.useEffect(() => {
    for (const arrival of arrivals) {
      if (played.current.has(arrival.pin.key)) continue;
      played.current.add(arrival.pin.key);
      later(() => {
        const spot = spotsRef.current.find((s) => s.pins.some((p) => p.key === arrival.pin.key));
        if (!spot) return;
        const id = `${arrival.pin.key}:${Date.now()}`;
        const family = familyFor(arrival.pin.dreamer.pubkey);
        const without = (key) => (set) => {
          const next = new Set(set);
          next.delete(key);
          return next;
        };
        register.current?.reveal(spot);
        setToasts((list) => [...list.slice(-1), { id, pin: arrival.pin, count: spot.pins.length }]);
        later(() => setToasts((list) => list.filter((t) => t.id !== id)), 4800);
        const from = lastSpot.current && spotsRef.current.find((s) => s.key === lastSpot.current);
        const flies = Boolean(from && from.key !== spot.key && !reduced);
        if (flies) {
          setFlights((list) => [...list.slice(-2), { id, from, to: spot, family }]);
          later(() => setFlights((list) => list.filter((f) => f.id !== id)), 4200);
        }
        lastSpot.current = spot.key;
        // A brand-new place waits for its plane (or the globe's turn), then
        // drops in with confetti. A place that just gained a dreamer bounces.
        const wait = reduced ? 0 : look.mode === "globe" ? 1150 : flies ? 1500 : 0;
        if (wait && spot.pins.length === 1) setArrivingKeys((set) => new Set(set).add(spot.key));
        later(() => {
          setArrivingKeys(without(spot.key));
          setFreshKeys((set) => new Set(set).add(spot.key));
          later(() => setFreshKeys(without(spot.key)), 2200);
          setBursts((list) => [...list, { id, spotKey: spot.key, family }]);
          later(() => setBursts((list) => list.filter((b) => b.id !== id)), 1600);
        }, wait);
      }, Math.max(0, arrival.at - Date.now()) + 250);
    }
    if (!lastSpot.current && spots[0]) lastSpot.current = [...spots].sort((a, b) => b.latest - a.latest)[0].key;
  }, [arrivals]);

  React.useEffect(() => {
    if (!focus?.key) return;
    const spot = spots.find((s) => s.key === focus.key || s.pins.some((p) => p.key === focus.key));
    if (!spot) return;
    register.current?.reveal(spot, { zoom: true });
    onSelect(spot.key);
  }, [focus?.nonce]);

  const labelsFor =
    labels === "all" ? undefined : labels === "none" ? () => false : (spot) => spot.pins.length > 1 || spot.key === selectedKey || freshKeys.has(spot.key);
  const View = look.mode === "globe" ? GlobeView : FlatView;
  return (
    <div className="dm-map" ref={box} data-look={look.id} data-variant={big ? "big" : "panel"}>
      {size && (
        <View
          key={`${look.id}`}
          w={size.w}
          h={size.h}
          look={look}
          spots={spots}
          selectedKey={selectedKey}
          onSelect={onSelect}
          freshKeys={freshKeys}
          arrivingKeys={arrivingKeys}
          bursts={bursts}
          flights={flights}
          big={big}
          reduced={reduced}
          onShowMessage={onShowMessage}
          register={register}
          labelsFor={labelsFor}
        />
      )}
      {stamp && (
        <div className="dm-stamp" aria-hidden="true">
          <span className="dm-stamp__title">{stamp.title}</span>
          {stamp.subtitle && <span className="dm-stamp__sub">{stamp.subtitle}</span>}
        </div>
      )}
      <div className="dm-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="dm-toast" data-family={familyFor(toast.pin.dreamer.pubkey)}>
            <Avatar person={toast.pin.dreamer} />
            <span>
              <b>{toast.pin.dreamer.name}</b> pinned <b>{toast.pin.title}</b>
              {toast.count > 1 ? <span className="dm-toast__extra"> · {toast.count} people now</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
