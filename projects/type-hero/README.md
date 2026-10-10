# Type Hero: Training Grounds

**Status: paused; preserved for possible future work.** This is the original game from the repository root, relocated without changing its gameplay.

A browser incremental game featuring stat training, jobs, equipment templates, task progression, and save migration.

## Develop and validate

From this directory, with Node.js 20 or later and npm:

```sh
npm ci
npm run validate-content
npm test
npm run build
```

The build bundles `script.js` into `app.bundle.js`, which is loaded by `index.html`. The bundle is committed for direct file opening. Content and equipment JSON are loaded through HTTP when served; file opening uses the game's built-in fallback behavior.

## Run locally

After building, with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open the local server in a browser on your computer. In a cloud task, use local HTTP requests to check the page, bundle, and JSON assets; cloud onboarding does not expose a browser preview.

The Node test suite covers content loading, equipment schemas, task progress, save migration, and file-opening compatibility. Browser gameplay interaction is a separate manual check.
