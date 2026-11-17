# Dream map

A shared travel map beside a channel. Everyone pins the places they dream of visiting, and the map fills up live with faces, reasons and a little confetti.

## Getting started

1. In a channel, choose the globe button in the channel header to open the Dream map.
2. Ask your agent in that channel: "@your-agent pin Kyoto on the map, I'd love to go there next."
3. Watch your pin land. Choose any pin to see who wants to go there and why.
4. No agent? Start a message with 📍 and a place, like 📍 Lisbon, or paste a map link.
5. Choose the palette button to change the map's style, or the arrows to open the big map for a projector.

---

## For maintainers

**How pins work.** A pin is an ordinary message in the channel: a `📍 Place · why` line with an OpenStreetMap link under it, written `<url>` so newer Buzz builds don't add a web preview card. Every member's copy of the plugin reads the channel and draws the same map, so pins last as long as the messages do. Editing the message moves the pin; deleting it removes the pin. People without the plugin see a normal message with a map link.

**Who pinned it.** A pin posted by an agent shows the agent's owner (from the owner named on the agent's profile) with the agent as a small badge, so "@scout pin Kyoto" puts Maya's face on Kyoto.

**The agent tool.** `dream_map_pin` takes `name` ("Kyoto, Japan"), `latitude`, `longitude` (decimal degrees) and an optional `note` (why, under 140 characters). It checks the input (ranges, swapped coordinates, a built-in list of about 950 places for sanity checks), refuses a 13th pin from one agent in one channel within 10 minutes, and won't post the same pin twice in 15 minutes. It posts in the conversation the agent is working in, in its thread when it has one.

**Looking up names.** A 📍 line without a link is placed from the built-in list of cities, sights and countries, offline. Names the list doesn't know are looked up on OpenStreetMap's Nominatim, one at a time, at most one a second plus a random wait, never more than 30 per app session, cached on the device, and paused for 10 minutes after any refusal. To make the plugin fully offline, remove `https://nominatim.openstreetmap.org` from `host.networkOrigins` in `manifest.json`; unknown names then show as "Couldn't find this place".

**Looks.** Three looks share one map engine: Postcard (flat, illustrated), Night globe (a globe that spins to new pins) and Confetti dots (flat, dotted). The default is Postcard; each person's choice is saved on their device. Colors come from Buzz's palette tokens, so all three follow Buzz's light and dark themes.

**Data and licenses.** Map shapes are Natural Earth 1:110m (public domain) through the world-atlas package (ISC). Projections use d3-geo and topojson-client (ISC). Everything is bundled into `plugin.js`; the map loads no tiles and needs no keys.

**Files.** `plugin.js` is the built plugin, one self-contained file. Buzz loads it as committed and runs no build or install step. The plugin's own code is under the MIT license (`LICENSE`); the notices for the bundled libraries and data are in `LICENSES.md`.

**Source.** The source is in `plugins/places/src/` (with `shared/react.js`), in the folder layout of the repository it was written in. `build.mjs` bundles it into `plugin.js` with esbuild. To check that the committed `plugin.js` comes from this source, run `npm ci`, then `npm run verify`: it rebuilds into `rebuilt.js` and compares the two byte for byte. `npm test` runs the plugin's tests. Buzz never runs any of this; it loads `plugin.js` as committed.
