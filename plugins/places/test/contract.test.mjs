// Checks the built plugin against Buzz 1.0's own rules, ported from
// block/buzz-app v1.0.0: crates/plugin-manager/src/lib.rs (Manifest::validate,
// serde deny_unknown_fields), src/plugins/modules.ts (module shape),
// src/features/panels/service.ts, src/features/pages/service.ts,
// src/features/conversation/service.tsx and src/features/agents/service.ts
// (addTool). It is a port, so a live install in Buzz is still the real test.
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";

// In this repository the source is in plugins/places/, and manifest.json, README.md and the built plugin.js are at the top.
const dir = new URL("../../../", import.meta.url).pathname;
const srcDir = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(`${dir}manifest.json`, "utf8"));
const code = readFileSync(`${dir}plugin.js`, "utf8");
const plugin = await import(`${dir}plugin.js`);

const bytes = (s) => Buffer.byteLength(s, "utf8");
function validId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 80 && /^[a-z]/.test(id) && /^[a-z0-9.-]+$/.test(id) && !id.split(/[.-]/).some((part) => part === "");
}
function validateManifest(m) {
  const top = ["id", "name", "apiVersion", "description", "updates", "discovery", "host"];
  for (const key of Object.keys(m)) if (!top.includes(key)) return `unknown manifest key ${key}`;
  if (!validId(m.id)) return "invalid id";
  if (typeof m.name !== "string" || !m.name.trim() || bytes(m.name) > 80) return "name must be 1-80 bytes";
  if (m.description !== undefined && (typeof m.description !== "string" || !m.description.trim() || bytes(m.description) > 280)) return "description must be 1-280 bytes";
  if (m.apiVersion !== 1) return "apiVersion must be 1";
  if (m.discovery) {
    if (m.discovery.category !== undefined && !validId(m.discovery.category)) return "invalid category";
    const tags = m.discovery.tags ?? [];
    if (tags.length > 16) return "too many tags";
    const seen = new Set();
    for (const tag of tags) {
      if (typeof tag !== "string" || !tag.trim() || bytes(tag) > 80 || /\p{Cc}/u.test(tag)) return `bad tag ${tag}`;
      const k = tag.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
      if (seen.has(k)) return "duplicate tag";
      seen.add(k);
    }
  }
  if (m.host) {
    const hostKeys = ["federatedIdentity", "agentHooks", "agentExecution", "commands", "networkOrigins", "processes", "mcp", "files", "managedFiles", "publicImages"];
    for (const key of Object.keys(m.host)) if (!hostKeys.includes(key)) return `unknown host key ${key}`;
    const origins = m.host.networkOrigins ?? [];
    if (origins.length > 16) return "too many origins";
    const seen = new Set();
    for (const origin of origins) {
      const url = new URL(origin);
      if (url.protocol !== "https:" || url.username || url.password || url.origin !== origin || seen.has(origin)) return `invalid origin ${origin}`;
      seen.add(origin);
    }
  }
  return null;
}

test("manifest passes Buzz 1.0's manifest checks", () => {
  assert.equal(validateManifest(manifest), null);
  assert.equal(manifest.id, plugin.PLUGIN_ID, "the page link in index.jsx names this id");
  // The checker itself catches what Buzz refuses.
  assert.match(validateManifest({ ...manifest, icon: "x" }), /unknown manifest key/);
  assert.match(validateManifest({ ...manifest, host: { networkOrigins: ["https://example.com/"] } }), /invalid origin/);
  assert.match(validateManifest({ ...manifest, id: "Dream_Map" }), /invalid id/);
});

test("plugin.js is one self-contained module that exports apply", () => {
  assert.ok(!/^\s*import\s/m.test(code), "no import statements");
  assert.ok(!/\bimport\(/.test(code), "no dynamic imports");
  assert.equal(typeof plugin.apply, "function");
  assert.ok(statSync(`${dir}plugin.js`).size < 8 * 1024 * 1024, "under the 8 MiB artifact limit");
  const provided = ["react", "panels", "pages", "relay", "agents", "host", "navigation", "conversation"];
  for (const service of plugin.inject) assert.ok(provided.includes(service), `${service} is provided by Buzz 1.0`);
});

// Buzz 1.0's own tool names (src/buzz-mcp/*.ts), which a plugin tool can't take.
const CORE_TOOLS = "buzz_help agent_types agent_create agent_update agent_read team_read team_update send reply_in_subthread self_handoff edit delete react read channel_list channel_get channel_create channel_update channel_join channel_leave channel_archive channel_unarchive channel_delete member_list member_add member_remove users dm mem_get mem_set mem_rm notes_get notes_set notes_rm canvas_get canvas_set canvas_history canvas_restore media_get repo tabs settings_list settings_get settings_set plugin_list plugin_discover plugin_disable plugin_request plugin_request_status interest_set interest_show interest_list interest_remove watch_add watch_update watch_enable watch_disable watch_remove watch_rearm watch_show watch_list solo_worker_connections solo_worker_readiness solo_worker_create solo_worker_send solo_worker_read solo_worker_stop solo_worker_archive solo_worker_list".split(" ");

function strictContext() {
  const registered = { panels: [], pages: [], links: [], tools: [] };
  const ID = /^[a-z0-9][a-z0-9._-]*$/;
  const ctx = {
    react: {},
    effect: () => {},
    relay: { snapshot: () => ({ status: "disconnected", generation: 0 }), subscribe: () => () => {} },
    host: { request: async () => ({ status: 500, headers: {}, body: "" }) },
    navigation: { open: async () => ({ status: "opened" }) },
    panels: {
      register(panel) {
        if (!panel || typeof panel.id !== "string" || !ID.test(panel.id) || typeof panel.title !== "string" || !panel.title.trim() || typeof panel.matches !== "function" || typeof panel.component !== "function")
          throw new Error("A panel needs an id, title, matcher, and component");
        if (panel.channelLauncher !== undefined && typeof panel.channelLauncher !== "function") throw new Error("A channel launcher needs a component");
        if (panel.channelPlacement !== undefined && !["bottom", "side", "tab"].includes(panel.channelPlacement)) throw new Error("A channel placement must be bottom, side or tab");
        registered.panels.push(panel);
      },
    },
    pages: {
      register(page) {
        if (!page || typeof page.id !== "string" || !ID.test(page.id) || typeof page.title !== "string" || !page.title.trim() || typeof page.component !== "function")
          throw new Error("A page needs an id, a title, and a React component function");
        if (page.layout !== undefined && page.layout !== "document" && page.layout !== "workspace") throw new Error("A page needs an id, a title, and a React component function");
        if (page.route && (!Number.isSafeInteger(page.route.version) || page.route.version < 1 || typeof page.route.validate !== "function")) throw new Error("Invalid page route contract");
        registered.pages.push(page);
      },
    },
    conversation: {
      registerLink(link) {
        if (!link || !ID.test(link.id) || typeof link.title !== "string" || !link.title.trim() || typeof link.component !== "function") throw new Error("A conversation contribution needs an id, title and component");
        if (typeof link.matches !== "function") throw new Error("A link renderer needs a matcher");
        if (link.order !== undefined && typeof link.order !== "number" && typeof link.order !== "function") throw new Error("bad order");
        registered.links.push(link);
      },
    },
    agents: {
      addTool(tool) {
        const serializable = (() => {
          try {
            JSON.stringify(tool.inputSchema);
            return true;
          } catch {
            return false;
          }
        })();
        if (!/^[a-z][a-z0-9_]{0,63}$/.test(tool.name ?? "") || CORE_TOOLS.includes(tool.name) || tool.name.startsWith("owner_") || !tool.description || tool.inputSchema?.type !== "object" || !serializable || typeof tool.call !== "function")
          throw new Error("Agent tools need a lowercase name no Buzz tool has, a description, a JSON object inputSchema and call");
        registered.tools.push(tool);
      },
    },
  };
  return { ctx, registered };
}

test("apply registers everything Buzz 1.0 accepts", () => {
  const { ctx, registered } = strictContext();
  plugin.apply(ctx);
  assert.deepEqual(registered.panels.map((p) => [p.id, p.channelPlacement ?? null]), [["map", "side"], ["place", null]]);
  assert.deepEqual(registered.pages.map((p) => p.id), ["map"]);
  assert.deepEqual(registered.links.map((l) => l.id), ["map-link"]);
  assert.deepEqual(registered.tools.map((t) => t.name), ["dream_map_pin"]);
  const page = registered.pages[0];
  assert.equal(page.layout, "workspace", "the big map must fill the window (Buzz 1.0 draws document pages in a narrow column)");
  assert.ok(page.route.validate({ channel: "7b0f4f8e-1c2d-4e5f-8a9b-0c1d2e3f4a5b" }));
  assert.ok(page.route.validate({}));
  assert.ok(!page.route.validate({ channel: "../../etc" }));
  assert.ok(registered.panels[1].matches("https://www.openstreetmap.org/?mlat=1&mlon=2#map=10/1/2"));
});

test("the tool's schema is clear and findable", () => {
  const { name, description, inputSchema } = plugin.TOOL;
  assert.equal(name, "dream_map_pin");
  for (const word of ["pin", "map", "place", "latitude", "longitude"]) assert.ok(description.toLowerCase().includes(word), word);
  assert.deepEqual(inputSchema.required, ["name", "latitude", "longitude"]);
  assert.equal(inputSchema.additionalProperties, false);
  for (const key of inputSchema.required) assert.ok(inputSchema.properties[key], key);
  assert.ok(!/[—–]/.test(description), "no dashes in what the agent reads");
});

function fakeAgent() {
  const posted = [];
  return {
    posted,
    client: {
      pubkey: "a".repeat(64),
      key: "a".repeat(64),
      query: async () => posted,
      publish: async (template) => {
        const event = { ...template, id: (posted.length + 1).toString(16).padStart(64, "0"), pubkey: "a".repeat(64), created_at: Math.floor(Date.now() / 1000) };
        posted.push(event);
        return event;
      },
    },
  };
}

test("the tool posts one pin message where the agent is working", async () => {
  const call = plugin.createPinTool();
  const { client, posted } = fakeAgent();
  const reply = await call(client, { channel: "chan" }, { name: "Kyoto, Japan", latitude: 35.0116, longitude: 135.7681, note: "temples" });
  assert.match(reply, /^Pinned Kyoto, Japan at 35\.0116, 135\.7681 on the Dream map/);
  assert.equal(posted.length, 1);
  assert.equal(posted[0].kind, 9);
  assert.deepEqual(posted[0].tags, [["h", "chan"]]);
  await call(client, { channel: "chan", root: "f".repeat(64) }, { name: "Lisbon, Portugal", latitude: 38.7223, longitude: -9.1393 });
  assert.deepEqual(posted[1].tags, [["h", "chan"], ["e", "f".repeat(64), "", "reply"]]);
  const again = await call(client, { channel: "chan" }, { name: "Kyoto, Japan", latitude: 35.0116, longitude: 135.7681, note: "temples" });
  assert.match(again, /already pinned/);
  assert.equal(posted.length, 2, "a retried call doesn't pin twice");
  await assert.rejects(call(client, {}, { name: "Kyoto", latitude: 35, longitude: 135 }), /works in a channel conversation/);
  await assert.rejects(call(client, { channel: "chan" }, { name: "Atlantis" }), /Give latitude and longitude/);
});

test("the tool stops a runaway agent", async () => {
  const call = plugin.createPinTool();
  const { client } = fakeAgent();
  for (let i = 0; i < 12; i++) await call(client, { channel: "busy" }, { name: `Place ${i}`, latitude: 10 + i, longitude: 20 + i });
  await assert.rejects(call(client, { channel: "busy" }, { name: "One more", latitude: 1, longitude: 1 }), /Wait a few minutes/);
});

test("the UI copy has no em or en dashes", () => {
  for (const file of ["src/index.jsx", "src/list.jsx", "src/map.jsx", "src/looks.js", "manifest.json", "README.md"]) {
    const text = readFileSync(`${file.startsWith("src/") ? srcDir : dir}${file}`, "utf8");
    assert.ok(!/[—–]/.test(text), `${file} has a dash`);
  }
});
