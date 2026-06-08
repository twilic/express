import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { decode, encode } from "@twilic/core";
import {
  TWILIC_CONTENT_TYPE,
  parseTwilic,
  twilicParser,
  twilicSend,
} from "../dist/index.js";
import { requestApp } from "./helpers.mjs";

function createApp() {
  return express();
}

test("twilicParser + twilicSend round-trip with @twilic/core", async () => {
  const payload = {
    id: 42n,
    name: "alice",
    active: true,
    tags: ["a", "b"],
  };

  const app = createApp();
  app.post("/users", twilicParser(), (req, res) => {
    twilicSend(res, { received: req.twilicBody });
  });

  const { status, contentType, buffer } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encode(payload),
  });

  assert.equal(status, 200);
  assert.equal(contentType, TWILIC_CONTENT_TYPE);

  const decoded = decode(buffer);
  assert.equal(decoded.received.id, 42n);
  assert.equal(decoded.received.name, "alice");
  assert.equal(decoded.received.active, true);
  assert.deepEqual(decoded.received.tags, ["a", "b"]);
});

test("parseTwilic decodes @twilic/core wire bytes", async () => {
  const payload = { ok: true, value: 7n };
  const app = createApp();
  app.post("/decode", async (req, res) => {
    twilicSend(res, await parseTwilic(req));
  });

  const { buffer } = await requestApp(app, "/decode", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encode(payload),
  });

  assert.deepEqual(decode(buffer), payload);
});
