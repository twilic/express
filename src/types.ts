import type { TwilicValue } from "@twilic/core";

declare global {
  namespace Express {
    interface Request {
      twilicBody?: TwilicValue;
    }
  }
}

export {};
