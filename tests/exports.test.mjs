import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TWILIC_CONTENT_TYPE,
  createTwilicExpress,
  parseTwilic,
  twilicParser,
  twilicSend,
} from "../dist/index.js";

test("TWILIC_CONTENT_TYPE is application/vnd.twilic", () => {
  assert.equal(TWILIC_CONTENT_TYPE, "application/vnd.twilic");
});

test("named exports are functions", () => {
  assert.equal(typeof createTwilicExpress, "function");
  assert.equal(typeof parseTwilic, "function");
  assert.equal(typeof twilicParser, "function");
  assert.equal(typeof twilicSend, "function");
});

test("createTwilicExpress returns parse, send, and parser", () => {
  const twilic = createTwilicExpress();
  assert.equal(typeof twilic.parse, "function");
  assert.equal(typeof twilic.send, "function");
  assert.equal(typeof twilic.parser, "function");
});

test("twilicParser and createTwilicExpress().parser both return middleware", () => {
  const fromFactory = createTwilicExpress().parser();
  const fromExport = twilicParser();
  assert.equal(typeof fromFactory, "function");
  assert.equal(typeof fromExport, "function");
});
