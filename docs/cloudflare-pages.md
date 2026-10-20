# Cloudflare Pages demo

The publish directory is **dist**, including ignored `dist/assets`. Never deploy the repository root or skip `setup`. The app is static, with local image inference; there are no Pages Functions or image-upload endpoints. ChatGPT Sites hosting is separate and is not changed by these instructions.

## Runtime and preparation

Node 24.11.0 (`.nvmrc`, also compatible with the repo's Node >=18 requirement). Wrangler is pinned through `package-lock.json`.

```sh
npm ci
npm run setup
npm run check
```

Run `npm start` and `npm test` in separate terminals before deployment (install Chromium with `npx playwright install chromium` if needed). `setup` verifies all seven dependencies against `scripts/assets.json`: face model, Three.js, MediaPipe module, SIMD and non-SIMD WASM/loaders. They are not in Git, so a successful Git checkout alone cannot be deployed.

## Authentication and existing-project check

Use the official OAuth login flow; never put account passwords or API tokens in source/chat:

```sh
npx wrangler whoami
npx wrangler login --scopes account:read user:read pages:write
npx wrangler pages project list --json
```

For remote/headless sessions the official `wrangler login --device --browser=false --scopes account:read user:read pages:write` flow prints a short-lived verification URL/code. Complete it in your own browser. Wrangler stores its login outside this repository.

Prefer the `face-form-lab` project. Check any existing project's repository/build/branch before using it; do not overwrite an unrelated project. Only if it does not already exist:

```sh
npx wrangler pages project create face-form-lab --production-branch main
```

## Deploy

Direct Upload uploads prebuilt files and does not run a remote build. Run the preparation above, commit/push source/configuration, then deploy from that clean commit:

```sh
npm run deploy:pages
```

This reruns asset verification and syntax checks before `wrangler pages deploy dist --project-name face-form-lab --branch main`. The project production URL and unique deployment URL come from Wrangler; do not infer or promise a URL before deployment succeeds.

Cloudflare's Direct Upload project type cannot later be switched to Git integration in place. If Git integration is selected instead, use repository `longvo1w1/face-form-lab`, production branch `main`, framework preset None, root repository directory, output `dist`, `NODE_VERSION=24.11.0`, and **build command exactly**:

```sh
npm ci && npm run setup && npm run check
```

No API key, database, image upload service, custom domain or Sites migration is needed for this demo.

`dist/404.html` disables Pages' implicit SPA fallback: a missing JS/worker/model/WASM URL must return 404, never a successful index page. `dist/_headers` supplies `nosniff` and explicit MediaPipe-module/WASM/model MIME types. `wrangler.jsonc` sets the project name and publish directory.

## Check the actual HTTPS URL

```sh
node scripts/check-deployment.mjs https://ACTUAL-PROJECT.pages.dev
```

This compares deployed JS sources with the local commit, checks all downloaded asset SHA-256/MIME, and requires 404 for nonexistent modules/workers/models/WASM/pages.

Set `TEST_BASE_URL` to that HTTPS origin, then run `npm test` to run real Chromium reconstruction, edit/undo/original/three-angle/export and guided-capture tests against the deployed app. `BROWSER_EXECUTABLE` can select an installed compatible Chromium. Screenshots/PNG download go to ignored `artifacts/`. The public MediaPipe test photograph is used; no customer photo is uploaded. Tests require the repository history for the original consent regression reproduction.

Verify the front-view screenshot shows eyes and mouth from the source image. Camera tests use controlled adapters/streams when no physical device is present; do not report these as Safari/iPhone validation. Physical camera permissions, native iOS pickers/HEIC, actual left/right turns and thermal/memory behavior remain device checks.

Official references read for this deployment: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [Serving Pages/404 behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/), [Headers](https://developers.cloudflare.com/pages/configuration/headers/), [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Wrangler login](https://developers.cloudflare.com/workers/wrangler/commands/#login).
