# Development guide

## Add a game

1. Create `projects/<game-name>/` with a README describing status, required tools, installation, startup, and validation.
2. Keep the game's dependency declarations and lockfiles inside that directory.
3. Add it to the root README project index.
4. Add relevant CI checks and optional root command shortcuts when useful.

Use a shared package only when more than one game needs it. Different games can use different engines and toolchains.

## Local and cloud work

The GitHub repository stores versioned project files. Local development uses your computer's checkout and tools. A Codex cloud environment supplies its own checkout, installed tools, network configuration, and optional variables or secrets.

Use Git commits, branches, and pull requests to move changes between checkouts. Publishing a cloud environment saves its prepared setup; it does not push code to GitHub. Running processes must restart in future tasks.

The root folder name on disk can differ from the GitHub repository name. Cloud setup instructions use the actual checkout path, so changing a display name alone does not require moving that folder.

## Repository naming

The intended name is `games-workspace`; the recommended Codex environment display name is **Games Development**. If renaming GitHub manually, use repository Settings → General → Repository name. Verify the Codex repository selection after renaming, update local origin URLs to the new GitHub URL, and republish the updated environment configuration.

Keep employer-owned work in its separate work repository and personal non-game projects in their separate personal repository.
