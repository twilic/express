import assert from "node:assert/strict";
import http from "node:http";
import { TWILIC_CONTENT_TYPE } from "../dist/index.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export { encoder, decoder, TWILIC_CONTENT_TYPE };

export function createJsonCodec() {
  return {
    encode(value) {
      return encoder.encode(JSON.stringify(value));
    },
    decode(bytes) {
      if (bytes.length === 0) {
        return null;
      }
      return JSON.parse(decoder.decode(bytes));
    },
  };
}

export function createTrackingCodec(inner = createJsonCodec()) {
  const stats = {
    encodeCalls: 0,
    decodeCalls: 0,
    lastEncoded: null,
    lastDecoded: null,
  };
  return {
    stats,
    encode(value) {
      stats.encodeCalls += 1;
      stats.lastEncoded = value;
      return inner.encode(value);
    },
    decode(bytes) {
      stats.decodeCalls += 1;
      stats.lastDecoded = bytes;
      return inner.decode(bytes);
    },
  };
}

export function twilicContentType(extra = "") {
  return extra ? `${TWILIC_CONTENT_TYPE}; ${extra}` : TWILIC_CONTENT_TYPE;
}

export async function requestApp(app, path, init = {}) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}${path}`;

  try {
    const response = await fetch(url, init);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const text = buffer.toString("utf8");
    return {
      response,
      status: response.status,
      contentType,
      text,
      buffer,
      json: isJson && text ? JSON.parse(text) : undefined,
    };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

export function assertTwilicResponse(result, expectedStatus = 200) {
  assert.equal(result.status, expectedStatus);
  assert.equal(result.contentType, TWILIC_CONTENT_TYPE);
}
