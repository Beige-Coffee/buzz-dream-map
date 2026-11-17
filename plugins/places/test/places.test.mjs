// node --test plugins/places/test/
import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveMessages, mentionsIn, pinsFrom, spotsFrom } from "../src/dream.js";
import { lookupPlace } from "../src/gazetteer.js";
import { checkPin, isMapUrl, pinMessage, placeFromUrl, placesIn } from "../src/places.js";

test("the tool's own message reads back as the same place", () => {
  const pin = { name: "Kyoto, Japan", note: "Temples in the autumn leaves", lat: 35.0116, lng: 135.7681 };
  const [found] = placesIn(pinMessage(pin));
  assert.deepEqual({ name: found.name, note: found.note, lat: found.lat, lng: found.lng }, pin);
  assert.match(pinMessage(pin), /^📍 Kyoto, Japan · Temples in the autumn leaves\n<https:\/\/www\.openstreetmap\.org\/\?mlat=35\.0116&mlon=135\.7681#map=10\/35\.0116\/135\.7681>$/);
});

test("people's own lines and links become places", () => {
  assert.deepEqual(placesIn("📍 Lisbon · yellow trams"), [{ name: "Lisbon", note: "yellow trams", query: "Lisbon", source: "pin" }]);
  const google = placesIn("this! https://www.google.com/maps/place/Road+to+Hana/@20.7984,-156.3319,10z")[0];
  assert.equal(google.name, "Road to Hana");
  assert.equal(google.lat, 20.7984);
  const apple = placeFromUrl("https://maps.apple.com/?ll=48.8566,2.3522&q=Paris");
  assert.equal(apple.name, "Paris");
  assert.equal(placesIn("meet at geo:37.79,-122.39")[0].lng, -122.39);
  assert.equal(placesIn("📍 [Kyoto](https://example.com/kyoto) · tea")[0].name, "Kyoto");
  assert.deepEqual(placesIn("I'd love to go to Kyoto someday"), []);
  assert.ok(isMapUrl("https://www.openstreetmap.org/#map=12/35.01/135.76"));
  assert.ok(!isMapUrl("https://example.com/?mlat=1&mlon=2"));
});

test("checkPin accepts what agents send and fixes the usual slips", () => {
  const ok = checkPin({ name: "  Kyoto,   Japan ", latitude: 35.011612, longitude: "135.768111", note: "Fushimi Inari\nat dawn" });
  assert.deepEqual(ok, { name: "Kyoto, Japan", note: "Fushimi Inari at dawn", lat: 35.0116, lng: 135.7681, notes: [] });

  const swapped = checkPin({ name: "Kyoto, Japan", latitude: 135.7681, longitude: 35.0116 });
  assert.equal(swapped.lat, 35.0116);
  assert.match(swapped.notes[0], /swapped/);

  const quietSwap = checkPin({ name: "Paris, France", latitude: 2.3522, longitude: 48.8566 });
  assert.equal(quietSwap.lat, 48.8566);
  assert.match(quietSwap.notes[0], /swapped/);

  const fromList = checkPin({ name: "Machu Picchu" });
  assert.equal(fromList.lat, -13.1631);
  assert.match(fromList.notes[0], /used its own/);

  const texas = checkPin({ name: "Paris", latitude: 33.6609, longitude: -95.5555 });
  assert.equal(texas.lat, 33.6609);
  assert.match(texas.notes[0], /km away/);

  assert.equal(checkPin({ name: "Kyoto · Japan", latitude: 35, longitude: 135 }).name, "Kyoto, Japan");
  assert.ok(checkPin({ name: "Lisbon", latitude: 38.7, longitude: -9.1, note: "x".repeat(400) }).note.length <= 140);
  assert.equal(checkPin({ name: "📍 Bali", latitude: -8.34, longitude: 115.09 }).name, "Bali");
});

test("checkPin explains what to fix", () => {
  assert.throws(() => checkPin({ name: "Somewhere Unknown" }), /Give latitude and longitude for Somewhere Unknown/);
  assert.throws(() => checkPin({ latitude: 1, longitude: 2 }), /Give the place's name/);
  assert.throws(() => checkPin({ name: "Kyoto", latitude: 35 }), /both latitude and longitude/);
  assert.throws(() => checkPin({ name: "Nowhere", latitude: 0, longitude: 0 }), /open ocean/);
  assert.throws(() => checkPin({ name: "Mars", latitude: 120, longitude: 200 }), /between -90 and 90/);
  assert.throws(() => checkPin({ name: "Kyoto", latitude: "north", longitude: 135 }), /both latitude and longitude/);
});

const ev = (id, pubkey, kind, content, tags = [], at = 1000) => ({ id: id.padEnd(64, "0"), pubkey, kind, content, created_at: at, tags: [["h", "c"], ...tags] });
test("edits move a pin, deletions remove it, as Buzz shows them", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  const pin = ev("1", a, 9, "📍 Lisbon");
  const edit = ev("2", a, 40003, "📍 Porto", [["e", pin.id]], 1001);
  const strangerEdit = ev("3", b, 40003, "📍 Nowhere", [["e", pin.id]], 1002);
  assert.equal(effectiveMessages([pin, edit, strangerEdit])[0].text, "📍 Porto");
  const second = ev("4", a, 9, "📍 Kyoto");
  assert.equal(effectiveMessages([pin, second, ev("5", b, 5, "", [["e", second.id]])]).length, 2, "only the author deletes with kind 5");
  assert.equal(effectiveMessages([pin, second, ev("6", a, 5, "", [["e", second.id]])]).length, 1);
  assert.equal(effectiveMessages([pin, second, ev("7", b, 9005, "", [["e", pin.id]])]).length, 1, "moderator deletion");
  const rich = ev("8", a, 40002, JSON.stringify({ content: "📍 Bali · rice terraces" }));
  assert.equal(mentionsIn(effectiveMessages([rich]))[0].name, "Bali");
});

test("one city's different places stay apart; one place's spellings merge", () => {
  const who = (n) => ({ pubkey: String(n).repeat(64).slice(0, 64), name: `P${n}` });
  const pin = (n, title, lat, lng) => ({ key: `k${n}`, title, subtitle: "", lat, lng, createdAt: n, dreamer: who(n) });
  const spots = spotsFrom([
    pin(1, "Ferry Building", 37.7955, -122.3937),
    pin(2, "Dolores Park", 37.7596, -122.4269),
    pin(3, "Presidio Tunnel Tops", 37.8033, -122.4562),
    pin(4, "Kyoto", 35.0116, 135.7681),
    pin(5, "Kyoto", 35.0211, 135.7556),
    pin(6, "NYC", 40.7128, -74.006),
    pin(7, "New York City", 40.713, -74.0055),
  ]);
  const sizes = Object.fromEntries(spots.map((s) => [s.title, s.pins.length]));
  assert.equal(sizes["Ferry Building"], 1);
  assert.equal(sizes["Dolores Park"], 1);
  assert.equal(sizes["Presidio Tunnel Tops"], 1);
  assert.equal(sizes.Kyoto, 2);
  assert.equal(spots.find((s) => s.pins.some((p) => p.title === "NYC")).pins.length, 2);
});

test("an agent's pin belongs to its owner; same place, one vote each", () => {
  const owner = "1".repeat(64);
  const agent = "2".repeat(64);
  const loner = "3".repeat(64);
  const other = "4".repeat(64);
  const profiles = new Map([
    [owner, { name: "Maya" }],
    [agent, { name: "Scout", isAgent: true, ownerPubkey: owner }],
    [loner, { name: "Rover", isAgent: true }],
    [other, { name: "Leo" }],
  ]);
  const events = [
    ev("1", agent, 9, pinMessage({ name: "Kyoto, Japan", note: "temples", lat: 35.0116, lng: 135.7681 }), [], 10),
    ev("2", other, 9, "📍 Kyoto · cherry blossoms", [], 20),
    ev("3", owner, 9, "📍 Kyoto, Japan", [], 30),
    ev("4", loner, 9, pinMessage({ name: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393 }), [], 40),
  ];
  const mentions = mentionsIn(effectiveMessages(events));
  const kyoto = lookupPlace("Kyoto");
  const resolved = { Kyoto: { lat: kyoto.lat, lng: kyoto.lng, offline: kyoto }, "Kyoto, Japan": { lat: kyoto.lat, lng: kyoto.lng, offline: kyoto } };
  const pins = pinsFrom(mentions, resolved, profiles);
  const first = pins.find((p) => p.eventId.startsWith("1"));
  assert.equal(first.dreamer.name, "Maya");
  assert.equal(first.via.name, "Scout");
  assert.equal(first.title, "Kyoto");
  assert.equal(first.subtitle, "Japan");
  const rover = pins.find((p) => p.eventId.startsWith("4"));
  assert.equal(rover.dreamer.name, "Rover");
  assert.equal(rover.via, undefined);
  const spots = spotsFrom(pins);
  assert.equal(spots[0].title, "Kyoto");
  assert.deepEqual(spots[0].pins.map((p) => p.dreamer.name).sort(), ["Leo", "Maya"], "Maya counts once");
  assert.equal(spots[1].title, "Lisbon");
});
