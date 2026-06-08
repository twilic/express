# @twilic/express

Express middleware and helpers for Twilic binary request and response bodies.

## Install

```bash
pnpm add @twilic/express express @twilic/core
```

## Usage

```ts
import express from "express";
import { twilicParser, twilicSend } from "@twilic/express";

const app = express();

app.post("/users", twilicParser(), (req, res) => {
  twilicSend(res, { ok: true, received: req.twilicBody });
});
```

Do not mount `express.json()` before Twilic routes on the same path, or the request body stream will already be consumed. Use a dedicated router or place `twilicParser()` on routes that do not use JSON body parsing.

## API

- `TWILIC_CONTENT_TYPE`
- `parseTwilic(req)`
- `twilicSend(res, value, init?)`
- `twilicParser(options?)`
- `createTwilicExpress(codec?)`

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md).

## Publish to npm

The package ships build artifacts from `dist/`.

Local dry run:

```bash
pnpm build
pnpm pack
```

GitHub Actions publish uses [npm trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/)—no long-lived `NPM_TOKEN` secret.

One-time setup on [npmjs.com](https://www.npmjs.com/package/@twilic/express): open the package → **Settings** → **Trusted Publisher** → **GitHub Actions**, then set **Organization or user** `twilic`, **Repository** `express`, and **Workflow filename** `publish-npm.yml` (exact name, including `.yml`). See also [GitHub Actions OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect).

Release steps:

1. Update [docs/CHANGELOG.md](docs/CHANGELOG.md) and bump `version` in `package.json`.
2. Create and push matching tag `v<version>`.

Example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow `.github/workflows/publish-npm.yml` verifies tag/version match, runs tests, and then runs `npm publish` (OIDC authentication via `id-token: write`).

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
