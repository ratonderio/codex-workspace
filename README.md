# Games Workspace

An agent-agnostic home for personal game projects. Use Codex, Copilot, Claude Code, or another development tool with the same source and project instructions.

## Project index

| Project | Status | Description |
| --- | --- | --- |
| [Type Hero](projects/type-hero/README.md) | Paused; retained for reference | Browser incremental game with stat training, jobs, equipment, and task mastery |

## Layout

```text
projects/       Independent games, each with its own dependencies and README
docs/           Shared development guidance
.github/        Repository automation
.githooks/      Shared Git hooks
AGENTS.md       Common instructions for coding agents
```

Keep new games in `projects/<game-name>/`. Add a `packages/` directory only when multiple games actually share a library. Projects may use different engines or languages; the root npm scripts currently forward to Type Hero, rather than imposing npm on every future game.

## Quick start

With Node.js 20 or later and npm, from the repository root:

```sh
npm ci
npm run setup
npm run check
npm run build
```

`npm ci` at the root enables the Git hook; `npm run setup` installs Type Hero's locked dependencies. The build refreshes the game's committed browser bundle. See the [game README](projects/type-hero/README.md) for serving instructions and the [development guide](docs/development.md) for adding projects and using local or cloud environments.

This repository was previously named `codex-workspace`. Its purpose is game development, independent of the assistant used. The GitHub repository name and the Codex environment display name are separate settings.
