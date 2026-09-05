import { decode, encode, type TwilicValue } from "@twilic/core";
import type { Request, RequestHandler, Response } from "express";

import "./types.js";

export const TWILIC_CONTENT_TYPE = "application/vnd.twilic";

export interface TwilicCodec {
  encode: (value: TwilicValue) => Uint8Array;
  decode: (bytes: Uint8Array) => TwilicValue;
}

export const DEFAULT_BODY_LIMIT = 1_048_576;

export interface TwilicParserOptions {
  requireContentType?: boolean;
  /** Maximum request body bytes. Defaults to 1 MiB. */
  limit?: number;
}

export interface TwilicSendInit {
  status?: number;
  headers?: Record<string, string>;
}

export interface TwilicExpress<T = TwilicValue> {
  parse: (req: Request, options?: TwilicParserOptions) => Promise<T>;
  send: (res: Response, value: TwilicValue, init?: TwilicSendInit) => void;
  parser: (options?: TwilicParserOptions) => RequestHandler;
}

function bodyLimit(options?: TwilicParserOptions): number {
  const limit = options?.limit ?? DEFAULT_BODY_LIMIT;
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new RangeError("limit must be a non-negative safe integer");
  }
  return limit;
}

function hasTwilicContentType(contentType: string | undefined): boolean {
  return contentType?.startsWith(TWILIC_CONTENT_TYPE) ?? false;
}

export class TwilicBodyLimitError extends Error {
  readonly status = 413;
  readonly statusCode = 413;
  constructor() {
    super("Twilic request body exceeds limit");
  }
}

async function readRequestBody(req: Request, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  // Keep the socket available long enough for the middleware to return 413.
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (bytes.length > limit - total) {
      req.pause();
      throw new TwilicBodyLimitError();
    }
    total += bytes.length;
    chunks.push(bytes);
  }
  return Buffer.concat(chunks, total);
}

function parseWithCodec<T>(
  codec: TwilicCodec,
  req: Request,
  options?: TwilicParserOptions
): Promise<T> {
  return readRequestBody(req, bodyLimit(options)).then(
    (body) => codec.decode(new Uint8Array(body)) as T
  );
}

function sendWithCodec(
  codec: TwilicCodec,
  res: Response,
  value: TwilicValue,
  init?: TwilicSendInit
): void {
  const body = Buffer.from(codec.encode(value));
  if (init?.status !== undefined) {
    res.status(init.status);
  }
  if (init?.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      res.setHeader(key, value);
    }
  }
  res.setHeader("Content-Type", TWILIC_CONTENT_TYPE);
  res.send(body);
}

function parserWithCodec<T>(
  codec: TwilicCodec,
  options?: TwilicParserOptions
): RequestHandler {
  const requireContentType = options?.requireContentType ?? true;
  bodyLimit(options);

  return async (req, res, next) => {
    const contentType = req.headers["content-type"];
    if (requireContentType && !hasTwilicContentType(contentType)) {
      res.status(415).send("Unsupported Media Type");
      return;
    }

    try {
      const value = await parseWithCodec<T>(codec, req, options);
      req.twilicBody = value as TwilicValue;
      next();
    } catch (error) {
      if (error instanceof TwilicBodyLimitError) {
        res.setHeader("Connection", "close");
        res.status(413).send(error.message);
        return;
      }
      next(error);
    }
  };
}

const defaultCodec: TwilicCodec = {
  encode,
  decode,
};

export function createTwilicExpress<T = TwilicValue>(
  codec: TwilicCodec = defaultCodec
): TwilicExpress<T> {
  return {
    parse: (req, options) => parseWithCodec<T>(codec, req, options),
    send: (res, value, init) => sendWithCodec(codec, res, value, init),
    parser: (options) => parserWithCodec<T>(codec, options),
  };
}

export function parseTwilic<T = TwilicValue>(
  req: Request,
  options?: TwilicParserOptions
): Promise<T> {
  return parseWithCodec<T>(defaultCodec, req, options);
}

export function twilicSend(
  res: Response,
  value: TwilicValue,
  init?: TwilicSendInit
): void {
  sendWithCodec(defaultCodec, res, value, init);
}

export function twilicParser<T = TwilicValue>(
  options?: TwilicParserOptions
): RequestHandler {
  return parserWithCodec<T>(defaultCodec, options);
}
