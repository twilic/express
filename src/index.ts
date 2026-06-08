import { decode, encode, type TwilicValue } from "@twilic/core";
import type { Request, RequestHandler, Response } from "express";

export const TWILIC_CONTENT_TYPE = "application/vnd.twilic";

export interface TwilicCodec {
  encode: (value: TwilicValue) => Uint8Array;
  decode: (bytes: Uint8Array) => TwilicValue;
}

export interface TwilicParserOptions {
  requireContentType?: boolean;
}

export interface TwilicSendInit {
  status?: number;
  headers?: Record<string, string>;
}

export interface TwilicExpress<T = TwilicValue> {
  parse: (req: Request) => Promise<T>;
  send: (res: Response, value: TwilicValue, init?: TwilicSendInit) => void;
  parser: (options?: TwilicParserOptions) => RequestHandler;
}

function hasTwilicContentType(contentType: string | undefined): boolean {
  return contentType?.startsWith(TWILIC_CONTENT_TYPE) ?? false;
}

async function readRequestBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseWithCodec<T>(codec: TwilicCodec, req: Request): Promise<T> {
  return readRequestBody(req).then(
    (body) => codec.decode(new Uint8Array(body)) as T,
  );
}

function sendWithCodec(
  codec: TwilicCodec,
  res: Response,
  value: TwilicValue,
  init?: TwilicSendInit,
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
  options?: TwilicParserOptions,
): RequestHandler {
  const requireContentType = options?.requireContentType ?? true;

  return async (req, res, next) => {
    const contentType = req.headers["content-type"];
    if (requireContentType && !hasTwilicContentType(contentType)) {
      res.status(415).send("Unsupported Media Type");
      return;
    }

    try {
      const value = await parseWithCodec<T>(codec, req);
      req.twilicBody = value as TwilicValue;
      next();
    } catch (error) {
      next(error);
    }
  };
}

const defaultCodec: TwilicCodec = {
  encode,
  decode,
};

export function createTwilicExpress<T = TwilicValue>(
  codec: TwilicCodec = defaultCodec,
): TwilicExpress<T> {
  return {
    parse: (req) => parseWithCodec<T>(codec, req),
    send: (res, value, init) => sendWithCodec(codec, res, value, init),
    parser: (options) => parserWithCodec<T>(codec, options),
  };
}

export function parseTwilic<T = TwilicValue>(req: Request): Promise<T> {
  return parseWithCodec<T>(defaultCodec, req);
}

export function twilicSend(
  res: Response,
  value: TwilicValue,
  init?: TwilicSendInit,
): void {
  sendWithCodec(defaultCodec, res, value, init);
}

export function twilicParser<T = TwilicValue>(
  options?: TwilicParserOptions,
): RequestHandler {
  return parserWithCodec<T>(defaultCodec, options);
}
