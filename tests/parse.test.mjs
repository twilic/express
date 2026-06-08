import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { decode, encode } from "@twilic/core";
import { createTwilicExpress, parseTwilic, twilicSend } from "../dist/index.js";
import {
  TWILIC_CONTENT_TYPE,
  createJsonCodec,
  createTrackingCodec,
  encoder,
  requestApp,
} from "./helpers.mjs";

function createApp() {
  return express();
}

test("createTwilicExpress().parse reads body without middleware", async () => {
  const codec = createJsonCodec();
  const twilic = createTwilicExpress(codec);
  const app = createApp();
  app.post("/raw", async (req, res) => {
    res.json(await twilic.parse(req));
  });

  const { status, json } = await requestApp(app, "/raw", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: codec.encode({ direct: true }),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { direct: true });
});

test("createTwilicExpress().parse uses injected codec", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicExpress(codec);
  const app = createApp();
  app.post("/raw", async (req, res) => {
    res.json(await twilic.parse(req));
  });

  await requestApp(app, "/raw", {
    method: "POST",
    body: codec.encode({ tracked: "parse" }),
  });

  assert.equal(codec.stats.decodeCalls, 1);
});

test("createTwilicExpress().parse does not validate content-type", async () => {
  const twilic = createTwilicExpress(createJsonCodec());
  const app = createApp();
  app.post("/raw", async (req, res) => {
    res.json(await twilic.parse(req));
  });

  const { status, json } = await requestApp(app, "/raw", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: encoder.encode(JSON.stringify({ skippedValidation: true })),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { skippedValidation: true });
});

test("parseTwilic decodes @twilic/core wire bytes", async () => {
  const payload = { ok: true, count: 3n };
  const app = createApp();
  app.post("/raw", async (req, res) => {
    twilicSend(res, await parseTwilic(req));
  });

  const { status, buffer } = await requestApp(app, "/raw", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encode(payload),
  });

  assert.equal(status, 200);
  assert.deepEqual(decode(buffer), payload);
});

test("parseTwilic round-trips through twilicSend", async () => {
  const payload = { message: "hello" };
  const app = createApp();
  app.post("/echo", async (req, res) => {
    twilicSend(res, await parseTwilic(req));
  });

  const { buffer } = await requestApp(app, "/echo", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encode(payload),
  });

  assert.deepEqual(decode(buffer), payload);
});

test("end-to-end: parser middleware then response round-trip", async () => {
  const twilic = createTwilicExpress(createJsonCodec());
  const app = createApp();
  app.post("/echo", twilic.parser(), (req, res) => {
    twilic.send(res, { echo: req.twilicBody });
  });

  const input = { message: "hello", count: 3 };
  const { status, contentType, buffer } = await requestApp(app, "/echo", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encoder.encode(JSON.stringify(input)),
  });

  assert.equal(status, 200);
  assert.equal(contentType, TWILIC_CONTENT_TYPE);
  const decoded = JSON.parse(new TextDecoder().decode(buffer));
  assert.deepEqual(decoded, { echo: input });
});
