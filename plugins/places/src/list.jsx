// The Dream list beside the map: most wanted places first, then every dream,
// newest first, with who wants to go and why.
import { React, relativeTime } from "../../../shared/react.js";
import { familyFor } from "./looks.js";
import { Avatar, HeartIcon } from "./ui.jsx";

function Faces({ pins, max = 4 }) {
  return (
    <span className="dm-faces">
      {pins.slice(0, max).map((pin) => (
        <Avatar key={pin.key} person={pin.dreamer} />
      ))}
    </span>
  );
}

export function EmptyDreams({ agentHint = "@your-agent" }) {
  return (
    <div className="dm-empty">
      <strong>No dreams on the map yet</strong>
      <p>Ask your agent in this channel:</p>
      <p className="dm-empty__quote">“{agentHint} pin Kyoto on the map, I’d love to go there next”</p>
      <p>Or start a message with 📍 and a place, like 📍 Lisbon.</p>
    </div>
  );
}

export function DreamList({ spots, pins, unresolved = [], looking = 0, selectedKey, onFocus }) {
  const wanted = spots.filter((spot) => spot.pins.length > 1).slice(0, 5);
  const newest = React.useMemo(() => [...pins].sort((a, b) => b.createdAt - a.createdAt), [pins]);
  const spotOf = React.useMemo(() => {
    const map = new Map();
    for (const spot of spots) for (const pin of spot.pins) map.set(pin.key, spot.key);
    return map;
  }, [spots]);
  if (!pins.length && !unresolved.length && !looking) return <EmptyDreams />;
  return (
    <div className="dm-list">
      {wanted.length > 0 && (
        <section className="dm-wanted" aria-label="Most wanted">
          <h3 className="dm-list__heading">Most wanted</h3>
          <ol>
            {wanted.map((spot, index) => (
              <li key={spot.key}>
                <button type="button" className="dm-wanted__item" data-rank={index + 1} data-selected={spot.key === selectedKey || undefined} onClick={() => onFocus(spot.key)}>
                  <Faces pins={spot.pins} max={3} />
                  <span className="dm-wanted__name">{spot.title}</span>
                  <span className="dm-wanted__count">
                    <HeartIcon /> {spot.pins.length}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section aria-label="Dream list">
        <h3 className="dm-list__heading">
          Dream list <span className="dm-list__count">{pins.length}</span>
          {looking > 0 && <span className="dm-list__status">Finding {looking}…</span>}
        </h3>
        <ol className="dm-dreams">
          {newest.map((pin) => (
            <li key={pin.key}>
              <button
                type="button"
                className="dm-dream"
                data-family={familyFor(pin.dreamer.pubkey)}
                data-selected={spotOf.get(pin.key) === selectedKey || undefined}
                onClick={() => onFocus(pin.key)}
              >
                <span className="dm-dream__faces">
                  <Avatar person={pin.dreamer} />
                  {pin.via && <Avatar person={pin.via} className="dm-dream__via" />}
                </span>
                <span className="dm-dream__text">
                  <span className="dm-dream__place">
                    <b>{pin.title}</b>
                    {pin.subtitle && <span>{pin.subtitle}</span>}
                  </span>
                  <span className="dm-dream__who">
                    {pin.dreamer.name}
                    {pin.via ? ` via ${pin.via.name}` : ""} · {relativeTime(pin.createdAt)}
                  </span>
                  {pin.note && <span className="dm-dream__why">“{pin.note}”</span>}
                </span>
              </button>
            </li>
          ))}
          {unresolved.map((mention) => (
            <li key={mention.key} className="dm-dream dm-dream--missing">
              <span className="dm-dream__text">
                <span className="dm-dream__place">
                  <b>{mention.name}</b>
                </span>
                <span className="dm-dream__who">Couldn’t find this place. Ask your agent to pin it: it knows where it is.</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
