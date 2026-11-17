// Dream map: a shared travel map beside a channel. People (or their agents)
// pin the places they dream of visiting; everyone's map fills up live.
import { React, bindReact, splitScope, useStylesheet } from "../../../shared/react.js";
import { useArrivals, useDreams } from "./dream.js";
import { DreamList } from "./list.jsx";
import { LOOKS, lookById, saveLook, savedLook } from "./looks.js";
import { DreamMap } from "./map.jsx";
import { checkPin, createGeocoder, isMapUrl, pinMessage, placeFromUrl } from "./places.js";
import css from "./styles.css";
import { BackIcon, CloseIcon, ExpandIcon, GlobeIcon, PaletteIcon, PinIcon } from "./ui.jsx";

export const inject = ["react", "panels", "pages", "relay", "agents", "host", "navigation", "conversation"];

// Must match manifest.json; the page link below names it.
export const PLUGIN_ID = "buzz101.dream-map";
export const TOOL_NAME = "dream_map_pin";

export const TOOL = {
  name: TOOL_NAME,
  description:
    "Pin a place on the Dream map, the shared travel map beside this channel. Use it when someone asks you to pin, add or put a place on the map, such as somewhere they dream of visiting. Give the place's name with its country, its latitude and longitude in decimal degrees, and, if they said why they want to go, a short note in their words. One call pins one place; call again for each extra place. It posts one short message in this conversation, and that message is the pin: it shows on everyone's map with your owner's picture, so your reply doesn't need to repeat the place or a link.",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: 'The place with its country, as people say it: "Kyoto, Japan", "Machu Picchu, Peru". 2 to 80 characters.',
      },
      latitude: { type: "number", minimum: -90, maximum: 90, description: "Decimal degrees, north is positive. Kyoto is 35.0116." },
      longitude: { type: "number", minimum: -180, maximum: 180, description: "Decimal degrees, east is positive. Kyoto is 135.7681." },
      note: { type: "string", description: "Optional. Why they want to go, in their words, under 140 characters." },
    },
    required: ["name", "latitude", "longitude"],
    additionalProperties: false,
  },
};

const BURST = 12;
const WINDOW_MS = 10 * 60 * 1000;

/** The agent tool's work, separate from registration so tests can call it. */
export function createPinTool() {
  const recent = new Map();
  return async function call(client, context, args) {
    const channel = context?.channel;
    if (!channel) throw new Error("dream_map_pin works in a channel conversation. Ask in the channel whose map you want the pin on.");
    const pin = checkPin(args);
    const key = `${client.pubkey}:${channel}`;
    const now = Date.now();
    const times = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (times.length >= BURST) throw new Error(`You've pinned ${BURST} places here in the last 10 minutes. Wait a few minutes before pinning more.`);
    // An agent that retries the same call shouldn't drop a second pin.
    const content = pinMessage(pin);
    let timer;
    try {
      const mine = await Promise.race([
        client.query([{ kinds: [9], "#h": [channel], authors: [client.pubkey], since: Math.floor(now / 1000) - 900, limit: 40 }]),
        new Promise((resolve) => {
          timer = setTimeout(() => resolve([]), 4000);
        }),
      ]);
      const twin = mine?.find?.((event) => event.content === content);
      if (twin) return `${pin.name} is already pinned on the Dream map in this channel (message ${twin.id.slice(0, 8)}). Nothing new was posted.`;
    } catch {
      // Can't check: pin anyway.
    } finally {
      clearTimeout(timer);
    }
    const tags = [["h", channel]];
    if (context.root && !context.topLevel) tags.push(["e", context.root, "", "reply"]);
    const event = await client.publish({ kind: 9, content, tags });
    times.push(now);
    recent.set(key, times);
    return [`Pinned ${pin.name} at ${pin.lat}, ${pin.lng} on the Dream map in this channel (message ${String(event?.id ?? "").slice(0, 8)}). Everyone with the Dream map sees it now.`, ...pin.notes].join(" ");
  };
}

export function apply(ctx) {
  bindReact(ctx.react);
  ctx.effect(() => useStylesheet("showcase-places-dream-map", css));
  const geocode = createGeocoder(ctx.host);
  let active = true;
  ctx.effect(() => () => {
    active = false;
  });
  // The channel whose map was opened last, for the full-size page.
  let lastChannel = null;

  function useRelay() {
    return React.useSyncExternalStore(ctx.relay.subscribe, ctx.relay.snapshot, ctx.relay.snapshot);
  }
  const usable = (state) => Boolean(state?.session) && (state.status === "ready" || state.cached);

  function useLook() {
    const [look, setLook] = React.useState(savedLook);
    return [
      lookById(look),
      (id) => {
        saveLook(id);
        setLook(id);
      },
    ];
  }

  function LookMenu({ look, onChange }) {
    const [open, setOpen] = React.useState(false);
    const box = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const close = (event) => {
        if (!box.current?.contains(event.target)) setOpen(false);
      };
      const key = (event) => event.key === "Escape" && setOpen(false);
      document.addEventListener("pointerdown", close);
      document.addEventListener("keydown", key);
      return () => {
        document.removeEventListener("pointerdown", close);
        document.removeEventListener("keydown", key);
      };
    }, [open]);
    return (
      <span className="dm-menu" ref={box}>
        <button type="button" className="dm-icon-button" aria-label={`Map style: ${look.label}`} title="Map style" aria-expanded={open} onClick={() => setOpen(!open)}>
          <PaletteIcon />
        </button>
        {open && (
          <span className="dm-menu__list" role="menu" aria-label="Map style">
            {LOOKS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === look.id}
                className="dm-menu__item"
                data-look-swatch={option.id}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span className="dm-menu__swatch" aria-hidden="true" />
                <span className="dm-menu__text">
                  <b>{option.label}</b>
                  <span>{option.hint}</span>
                </span>
              </button>
            ))}
          </span>
        )}
      </span>
    );
  }

  function showMessage(context, pin) {
    const scope = context.scope ? splitScope(context.scope) : undefined;
    if (!scope) return;
    void ctx.navigation.open({
      version: 1,
      kind: "conversation",
      scope,
      channelId: context.channelId,
      messageId: pin.root ?? pin.eventId,
      ...(pin.root ? { threadRootId: pin.root } : {}),
    });
  }

  function useMapState(session, channelId) {
    const dreams = useDreams({ session, channelId, geocode });
    const arrivals = useArrivals(dreams.pins, dreams.ready);
    const [selectedKey, setSelectedKey] = React.useState(null);
    const [focus, setFocus] = React.useState(null);
    const focusOn = (key) => setFocus({ key, nonce: Date.now() });
    return { dreams, arrivals, selectedKey, setSelectedKey, focus, focusOn };
  }

  function countLine(dreams) {
    const people = new Set(dreams.pins.map((p) => p.dreamer.pubkey)).size;
    if (!dreams.pins.length) return "No dreams yet";
    return `${dreams.pins.length} ${dreams.pins.length === 1 ? "dream" : "dreams"} · ${people} ${people === 1 ? "person" : "people"}`;
  }

  // The map beside a channel.
  function ChannelMap({ session, context, focusUrl, close }) {
    const { dreams, arrivals, selectedKey, setSelectedKey, focus, focusOn } = useMapState(session, context.channelId);
    const [look, setLook] = useLook();
    lastChannel = { scope: context.scope, channelId: context.channelId, channelName: context.channelName };
    React.useEffect(() => {
      if (!focusUrl) return;
      const target = placeFromUrl(focusUrl);
      if (!target) return;
      const match = dreams.spots.find((s) => s.pins.some((p) => Math.abs(p.lat - target.lat) < 1e-3 && Math.abs(p.lng - target.lng) < 1e-3));
      if (match) focusOn(match.key);
    }, [focusUrl, dreams.spots.length]);
    const openBig = () =>
      void ctx.navigation.open({ version: 1, kind: "plugin", pluginId: PLUGIN_ID, pageId: "map", params: { channel: context.channelId } });
    return (
      <section className="dm-panel" data-look={look.id}>
        <header className="dm-head">
          <span className="dm-head__icon" aria-hidden="true">
            <GlobeIcon />
          </span>
          <span className="dm-head__title">
            <b>Dream map</b>
            <span>
              #{context.channelName} · {countLine(dreams)}
            </span>
          </span>
          <span className="dm-head__actions">
            <LookMenu look={look} onChange={setLook} />
            <button type="button" className="dm-icon-button" aria-label="Open the big map" title="Open the big map" onClick={openBig}>
              <ExpandIcon />
            </button>
            {close && (
              <button type="button" className="dm-icon-button" aria-label="Close map" title="Close map" onClick={close}>
                <CloseIcon />
              </button>
            )}
          </span>
        </header>
        <div className="dm-panel__map">
          <DreamMap
            spots={dreams.spots}
            look={look}
            arrivals={arrivals}
            focus={focus}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            onShowMessage={(pin) => showMessage(context, pin)}
          />
        </div>
        <div className="dm-panel__list">
          <DreamList spots={dreams.spots} pins={dreams.pins} unresolved={dreams.unresolved} looking={dreams.looking} selectedKey={selectedKey} onFocus={focusOn} />
        </div>
      </section>
    );
  }

  function Launcher({ context, toggle, pressed, available }) {
    return (
      <button
        type="button"
        className="dm-launcher"
        data-pressed={pressed || undefined}
        aria-label="Dream map"
        aria-expanded={pressed}
        title="Dream map"
        onClick={(event) => {
          event.currentTarget.focus();
          if (active && available()) toggle(context.channelId);
        }}
      >
        <GlobeIcon />
      </button>
    );
  }

  function ChannelPanel({ channelContext, close }) {
    const state = useRelay();
    if (!channelContext || !usable(state) || state.scope !== channelContext.scope) return <p className="dm-status">Connect to this channel to see its Dream map.</p>;
    return <ChannelMap key={`${state.scope}:${state.generation}:${channelContext.channelId}`} session={state.session} context={channelContext} close={close} />;
  }

  // Opened by clicking a map link in a message: the channel's map, on that place.
  function LinkPanel({ target, context }) {
    const state = useRelay();
    if (!usable(state) || !context?.channelId) return <p className="dm-status">Connect to see this place on the Dream map.</p>;
    const channels = state.session.channels;
    const name = channels.get?.(context.channelId)?.name ?? channels.list().channels.find((c) => c.id === context.channelId)?.name;
    const channelContext = { scope: state.scope, channelId: context.channelId, channelName: name ?? "channel" };
    return <ChannelMap key={`${state.scope}:${context.channelId}`} session={state.session} context={channelContext} focusUrl={target} />;
  }

  // The big map, for a projector: buzz://plugin?id=buzz101.dream-map&page=map&route.channel=<id>
  function BigMap({ session, context }) {
    const { dreams, arrivals, selectedKey, setSelectedKey, focus, focusOn } = useMapState(session, context.channelId);
    const [look, setLook] = useLook();
    const [present, setPresent] = React.useState(false);
    const back = () => {
      const scope = splitScope(context.scope);
      void ctx.navigation.open({ version: 1, kind: "conversation", scope, channelId: context.channelId });
    };
    return (
      <section className="dm-page" data-look={look.id} data-present={present || undefined}>
        <header className="dm-head dm-head--page">
          <button type="button" className="dm-icon-button" aria-label={`Back to #${context.channelName}`} title={`Back to #${context.channelName}`} onClick={back}>
            <BackIcon />
          </button>
          <span className="dm-head__icon" aria-hidden="true">
            <GlobeIcon />
          </span>
          <span className="dm-head__title">
            <b>Dream map</b>
            <span>
              #{context.channelName} · {countLine(dreams)}
            </span>
          </span>
          <span className="dm-head__actions">
            <LookMenu look={look} onChange={setLook} />
            <button type="button" className="dm-chip-button" aria-pressed={present} onClick={() => setPresent(!present)}>
              {present ? "Show the list" : "Map only"}
            </button>
          </span>
        </header>
        <div className="dm-page__body">
          <div className="dm-page__map">
            <DreamMap
              spots={dreams.spots}
              look={look}
              arrivals={arrivals}
              focus={focus}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              big
              labels="all"
              stamp={present ? { title: "Our dream trips", subtitle: `#${context.channelName} · ${countLine(dreams)}` } : undefined}
              onShowMessage={(pin) => showMessage(context, pin)}
            />
          </div>
          {!present && (
            <aside className="dm-page__list" aria-label="Dream list">
              <DreamList spots={dreams.spots} pins={dreams.pins} unresolved={dreams.unresolved} looking={dreams.looking} selectedKey={selectedKey} onFocus={focusOn} />
            </aside>
          )}
        </div>
      </section>
    );
  }

  function ChooseChannel({ session, onChoose }) {
    const list = React.useSyncExternalStore(
      (listener) => session.channels.subscribeList?.(listener) ?? (() => {}),
      () => session.channels.list(),
      () => session.channels.list(),
    );
    const channels = (list.channels ?? []).filter((c) => c.joined !== false && !c.archived && c.channelType !== "dm").slice(0, 60);
    return (
      <div className="dm-choose">
        <PinIcon />
        <strong>Which channel’s Dream map?</strong>
        <p>Open a channel and click the globe in its header, or choose one here.</p>
        <ul>
          {channels.map((c) => (
            <li key={c.id}>
              <button type="button" className="dm-chip-button" onClick={() => onChoose(c)}>
                #{c.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function MapPage({ navigation }) {
    const state = useRelay();
    const routed = navigation?.target?.route?.params?.channel;
    const [chosen, setChosen] = React.useState(null);
    if (!usable(state)) return <p className="dm-status">Connecting to your community…</p>;
    const session = state.session;
    const channelId = chosen ?? (typeof routed === "string" ? routed : undefined) ?? (lastChannel?.scope === state.scope ? lastChannel.channelId : undefined);
    if (!channelId) return <ChooseChannel session={session} onChoose={(c) => setChosen(c.id)} />;
    const channel = session.channels.get?.(channelId) ?? session.channels.list().channels.find((c) => c.id === channelId);
    const context = { scope: state.scope, channelId, channelName: channel?.name ?? "channel" };
    return <BigMap key={`${state.scope}:${state.generation}:${channelId}`} session={session} context={context} />;
  }

  ctx.panels.register({
    id: "map",
    title: "Dream map",
    matches: () => false,
    channelLauncher: Launcher,
    channelPlacement: "side",
    component: ChannelPanel,
  });

  ctx.panels.register({
    id: "place",
    title: "Dream map",
    matches: isMapUrl,
    component: LinkPanel,
  });

  ctx.pages.register({
    id: "map",
    title: "Dream map",
    // "workspace" gives the page the whole window. Without it Buzz draws pages
    // in a narrow reading column with no fixed height, and the map collapses.
    layout: "workspace",
    component: MapPage,
    route: {
      version: 1,
      validate: (params) =>
        params === null ||
        params === undefined ||
        (typeof params === "object" &&
          !Array.isArray(params) &&
          (params.channel === undefined || (typeof params.channel === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(params.channel)))),
    },
  });

  // Map links in messages read as a small "Show on map" chip. Clicking one
  // opens the Dream map beside the conversation, on that place.
  ctx.conversation.registerLink({
    id: "map-link",
    title: "Map links",
    matches: isMapUrl,
    order: -10,
    component: function MapLink({ url }) {
      const place = placeFromUrl(url);
      return (
        <span className="dm-link">
          <PinIcon width="13" height="13" />
          {place?.name ?? "Show on map"}
        </span>
      );
    },
  });

  ctx.agents.addTool({ ...TOOL, call: createPinTool() });
}
