# Contributing

Thank you for improving `@twilic/express`.

## Scope

This repository contains:

- Express middleware and helpers for Twilic request/response bodies (`src/`)
- Node integration tests (`tests/`)

Keep changes aligned with the normative spec in [twilic/twilic](https://github.com/twilic/twilic) and the core bindings in [twilic/twilic-js](https://github.com/twilic/twilic-js).

## Development

Requirements:

- Node.js 24+
- pnpm 10+

```bash
pnpm install
pnpm build
pnpm test
pnpm fmt:check
pnpm lint
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

Use this format:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types include `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, and `chore`.

Examples:

- `feat: add twilicParser middleware`
- `fix: return 415 for unsupported content-type`

After `pnpm install`, Husky runs Commitlint on each local commit. Pull requests are also checked in CI so every commit in the branch follows the same rules.

## Pull Requests

Use the pull request template and fill in every required section. PR bodies are validated in CI.

## Contribution Checklist

- Tests added or updated for behavior changes
- `pnpm test`, `pnpm fmt:check`, and `pnpm lint` pass locally
- Documentation updated when the public API changes
- Commit messages follow Conventional Commits

By contributing to this repository, you agree that your contribution may be distributed under the MIT license used by the project.
