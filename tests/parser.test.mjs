import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { decode, encode } from "@twilic/core";
import {
  createTwilicExpress,
  twilicParser,
  twilicSend,
} from "../dist/index.js";
import {
  TWILIC_CONTENT_TYPE,
  createJsonCodec,
  createTrackingCodec,
  encoder,
  requestApp,
  twilicContentType,
} from "./helpers.mjs";

function createTestTwilic() {
  return createTwilicExpress(createJsonCodec());
}

function createApp() {
  return express();
}

function withErrorHandler(app) {
  app.use((error, _req, res, _next) => {
    res.status(500).send(error.message);
  });
  return app;
}

test("twilicParser decodes request body into req.twilicBody", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (req, res) => {
    res.json(req.twilicBody);
  });

  const { status, json } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encoder.encode(JSON.stringify({ id: 1, name: "A" })),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { id: 1, name: "A" });
});

test("accepts content-type with parameters", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (req, res) => {
    res.json(req.twilicBody);
  });

  const { status, json } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": twilicContentType("charset=utf-8") },
    body: encoder.encode(JSON.stringify({ ok: true })),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true });
});

test("returns 415 when content-type is missing", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (_req, res) => {
    res.send("ok");
  });

  const { status, text } = await requestApp(app, "/users", {
    method: "POST",
    body: encoder.encode(JSON.stringify({ id: 1 })),
  });

  assert.equal(status, 415);
  assert.equal(text, "Unsupported Media Type");
});

test("returns 415 when content-type is not Twilic", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (_req, res) => {
    res.send("ok");
  });

  const { status, text } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: encoder.encode(JSON.stringify({ id: 1 })),
  });

  assert.equal(status, 415);
  assert.equal(text, "Unsupported Media Type");
});

test("returns 415 for similar but non-matching media types", async () => {
  for (const contentType of [
    "application/vnd.twilix",
    "application/json",
    "text/plain",
  ]) {
    const twilic = createTestTwilic();
    const app = createApp();
    app.post("/users", twilic.parser(), (_req, res) => {
      res.send("ok");
    });

    const { status } = await requestApp(app, "/users", {
      method: "POST",
      headers: { "content-type": contentType },
      body: encoder.encode(JSON.stringify({})),
    });
    assert.equal(status, 415, `expected 415 for ${contentType}`);
  }
});

test("does not call downstream handler when returning 415", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  let handlerCalls = 0;
  app.post("/users", twilic.parser(), () => {
    handlerCalls += 1;
    return new Response("ok");
  });

  await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: encoder.encode(JSON.stringify({})),
  });

  assert.equal(handlerCalls, 0);
});

test("requireContentType false skips validation", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post(
    "/users",
    twilic.parser({ requireContentType: false }),
    (req, res) => {
      res.json(req.twilicBody);
    },
  );

  const { status, json } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: encoder.encode(JSON.stringify({ ok: true })),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true });
});

test("requireContentType false still decodes with missing content-type", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post(
    "/users",
    twilic.parser({ requireContentType: false }),
    (req, res) => {
      res.json(req.twilicBody);
    },
  );

  const { status, json } = await requestApp(app, "/users", {
    method: "POST",
    body: encoder.encode(JSON.stringify({ noHeader: true })),
  });

  assert.equal(status, 200);
  assert.deepEqual(json, { noHeader: true });
});

test("decodes empty body when content-type is valid", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (req, res) => {
    res.json(req.twilicBody ?? null);
  });

  const { status, json } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: new Uint8Array(0),
  });

  assert.equal(status, 200);
  assert.equal(json, null);
});

test("uses injected codec decode", async () => {
  const codec = createTrackingCodec();
  const twilic = createTwilicExpress(codec);
  const app = createApp();
  app.post("/users", twilic.parser(), (req, res) => {
    res.json(req.twilicBody);
  });

  await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: codec.encode({ tracked: true }),
  });

  assert.equal(codec.stats.decodeCalls, 1);
  assert.ok(codec.stats.lastDecoded instanceof Uint8Array);
});

test("propagates decode errors from codec", async () => {
  const twilic = createTwilicExpress({
    encode: () => new Uint8Array(0),
    decode() {
      throw new Error("decode failed");
    },
  });
  const app = createApp();
  app.post("/users", twilic.parser(), (_req, res) => {
    res.send("ok");
  });
  withErrorHandler(app);

  const { status, text } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: new Uint8Array([1]),
  });

  assert.equal(status, 500);
  assert.equal(text, "decode failed");
});

test("default requireContentType is true", async () => {
  const twilic = createTestTwilic();
  const app = createApp();
  app.post("/users", twilic.parser(), (_req, res) => {
    res.send("ok");
  });

  const { status } = await requestApp(app, "/users", {
    method: "POST",
    body: encoder.encode(JSON.stringify({})),
  });

  assert.equal(status, 415);
});

test("twilicParser() decodes @twilic/core wire bytes", async () => {
  const app = createApp();
  app.post("/users", twilicParser(), (req, res) => {
    twilicSend(res, { received: req.twilicBody });
  });

  const payload = { id: 1n, label: "core" };
  const { status, buffer } = await requestApp(app, "/users", {
    method: "POST",
    headers: { "content-type": TWILIC_CONTENT_TYPE },
    body: encode(payload),
  });

  assert.equal(status, 200);
  const decoded = decode(buffer);
  assert.equal(decoded.received.id, 1n);
  assert.equal(decoded.received.label, "core");
});
