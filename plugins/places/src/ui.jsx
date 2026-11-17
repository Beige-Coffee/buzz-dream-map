// Small shared pieces: avatars and icons.
import { React } from "../../../shared/react.js";
import { familyFor } from "./looks.js";

export function initials(name) {
  const words = String(name || "?").replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/);
  return ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

/** A person's picture, or their initials on their color if it won't load. */
export function Avatar({ person, className = "" }) {
  const [broken, setBroken] = React.useState(false);
  const family = familyFor(person?.pubkey);
  const picture = !broken && typeof person?.picture === "string" && /^(https:|data:image\/)/.test(person.picture) ? person.picture : null;
  return (
    <span className={`dm-avatar ${className}`} data-family={family} aria-hidden="true">
      {picture ? (
        <img alt="" src={picture} referrerPolicy="no-referrer" draggable={false} onError={() => setBroken(true)} />
      ) : (
        <span className="dm-avatar__initials">{initials(person?.name)}</span>
      )}
    </span>
  );
}

// Paths are functions so no element is built before Buzz hands over React.
const icon = (paths, size = 16) =>
  function Icon(props) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {paths()}
      </svg>
    );
  };

export const GlobeIcon = icon(
  () => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
  ),
);
export const PinIcon = icon(
  () => (
  <>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>
  ),
);
export const PlusIcon = icon(() => <path d="M12 5v14M5 12h14" />);
export const MinusIcon = icon(() => <path d="M5 12h14" />);
export const FitIcon = icon(() => <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const CloseIcon = icon(() => <path d="M6 6l12 12M18 6L6 18" />);
export const ExpandIcon = icon(() => <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />);
export const PaletteIcon = icon(
  () => (
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" />
    <circle cx="7.5" cy="11" r="1" />
    <circle cx="10.5" cy="7" r="1" />
    <circle cx="15" cy="7.5" r="1" />
  </>
  ),
);
export const MessageIcon = icon(() => <path d="M5 18l-1.5 3L8 19.5h9a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v9.5c0 .6.4 1.2 1 1.5z" />, 14);
export const BackIcon = icon(() => <path d="M15 6l-6 6 6 6" />);
export const HeartIcon = icon(() => <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />, 12);

export const PlaneGlyph = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M21 3L3 10.5l6.5 2.5L12 20l3-6.5L21 3z" fill="currentColor" />
  </svg>
);
