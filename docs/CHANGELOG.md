# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-07-20

### Fixed

- Ship Express `Request.twilicBody` TypeScript augmentation in the published package (`dist/types.d.ts`).

## [0.1.0] - 2026-06-08

Initial public release of `@twilic/express`.

### Added

- `TWILIC_CONTENT_TYPE` (`application/vnd.twilic`) constant.
- `parseTwilic(req)` helper to decode Twilic request bodies.
- `twilicSend(res, value, init?)` helper to return Twilic-encoded responses.
- `twilicParser(options?)` middleware that sets `req.twilicBody` with optional content-type validation.
- `createTwilicExpress(codec?)` factory for injectable encode/decode.
- Node integration tests with Express and native `fetch`.
- CI workflows for format, lint, typecheck, tests, commitlint, and PR body validation.
- npm publish workflow with [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/).
