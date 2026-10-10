# Games workspace guidance

- Read the root README and the selected project's README before making changes.
- Keep each independent game under `projects/<game-name>/`; keep its dependencies, assets, tests, and commands with that game.
- Type Hero is paused and retained for reference. Do not remove it or change gameplay unless the task calls for it.
- Put reusable code in `packages/` only when there is an actual shared use case.
- Keep instructions usable across assistants. Provider-specific instructions should point to the shared guidance instead of duplicating it.
- From the root, `npm run setup` installs Type Hero dependencies; `npm run check` runs content validation and tests; `npm run build` refreshes its bundle.
- For changes affecting the game, run its validation and tests. Rebuild its bundle when changing browser source, and inspect the resulting diff.
- Keep credentials out of tracked files. Use local configuration or environment settings.
- Cloud tasks are already isolated; use the existing checkout. Do not create a Git worktree unless the user explicitly requests one.
