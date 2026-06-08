import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { decode } from "@twilic/core";
import { createTwilicExpress, twilicSend } from "../dist/index.js";
import {
  TWILIC_CONTENT_TYPE,
  assertTwilicResponse,
  createJsonCodec,
  createTrackingCodec,
  decoder,
  requestApp,
} from "./helpers.mjs";

function createApp() {
  return express();
}

test("twilicSend sets status, content-type, and custom headers", async () => {
  const twilic = createTwilicExpress(createJsonCodec());
  const app = createApp();
  app.get("/users", (_req, res) => {
    twilic.send(res, { ok: true }, { status: 201, headers: { "x-id": "1" } });
  });

  const result = await requestApp(app, "/users");

  assertTwilicResponse(result, 201);
  assert.equal(result.response.headers.get("x-id"), "1");
  assert.deepEqual(JSON.parse(decoder.decode(result.buffer)), { ok: true });
});

test("twilicSend encodes with @twilic/core", async () => {
  const app = createApp();
  app.get("/users", (_req, res) => {
    twilicSend(res, { ok: true, n: 1n });
  });

  const result = await requestApp(app, "/users");
  assertTwilicResponse(result);
  assert.deepEqual(decode(result.buffer), { ok: true, n: 1n });
});

test("twilicSend defaults to status 200", async () => {
  const app = createApp();
  app.get("/ping", (_req, res) => {
    twilicSend(res, { pong: true });
  });

  const result = await requestApp(app, "/ping");
  assertTwilicResponse(result, 200);
});

test("twilicSend overwrites caller content-type with Twilic", async () => {
  const app = createApp();
  app.get("/users", (_req, res) => {
    twilicSend(
      res,
      { ok: true },
      { headers: { "content-type": "application/json" } },
    );
  });

  const result = await requestApp(app, "/users");
  assert.equal(result.contentType, TWILIC_CONTENT_TYPE);
});

test("twilicSend body is bytes from codec", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicExpress(codec);
  const payload = { nested: { items: [1, 2, 3] }, flag: false };

  const app = createApp();
  app.get("/data", (_req, res) => {
    twilic.send(res, payload);
  });

  const result = await requestApp(app, "/data");

  assert.equal(codec.stats.encodeCalls, 1);
  assert.deepEqual(codec.stats.lastEncoded, payload);
  assert.deepEqual(JSON.parse(decoder.decode(result.buffer)), payload);
});

test("createTwilicExpress().send uses injected codec", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicExpress(codec);
  const app = createApp();
  app.get("/x", (_req, res) => {
    twilic.send(res, { via: "factory" });
  });

  await requestApp(app, "/x");
  assert.equal(codec.stats.encodeCalls, 1);
});

test("twilicSend encodes null", async () => {
  const codec = createJsonCodec();
  const twilic = createTwilicExpress(codec);
  const app = createApp();
  app.get("/null", (_req, res) => {
    twilic.send(res, null);
  });

  const result = await requestApp(app, "/null");
  assertTwilicResponse(result);
  assert.equal(decoder.decode(result.buffer), "null");
});
