# Publishing Chipper

How the public site and the browser extensions get released, with the text the stores ask for.

## The site

Every push to `main` builds the app and deploys it to https://leachh02.github.io/chipper/ (see `.github/workflows/pages.yml`). The public build has no Spotify client ID, so it's YouTube only.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Packaging the extension

```bash
node scripts/package-extension.mjs
```

This writes two zips to `apps/extension/dist/`:

- `chipper-chrome-<version>.zip`: the manifest without its `key`, since the Chrome Web Store assigns its own ID.
- `chipper-firefox-<version>.zip`: a background page instead of a service worker, no `externally_connectable` (Firefox doesn't support it; the app-bridge content script covers it), and a Firefox add-on ID.

Bump `version` in `apps/extension/manifest.json` before packaging an update. Both stores reject a version they've already seen.

### Extension IDs

The site reaches the extension directly by ID in Chrome, and through the app-bridge content script otherwise. The bridge works whatever the ID is. Once the Chrome Web Store assigns an ID, add it to the site build's `VITE_EXTENSIONS_ID` in `pages.yml`, alongside the unpacked ID (`ldgdfonogoclfkekjihefgobappiechp`, comma-separated), so the direct route works for both copies.

## Store listing text

Use the same text for both stores.

**Name:** Chipper

**Summary** (Chrome allows 132 characters):
> Sync your YouTube Watch Later playlist with Chipper, then clear what you've watched. Free and open source.

**Description:**
> Chipper helps you work through your YouTube Watch Later playlist a bit at a time. Tell it how long you've got, and it picks videos that fit.
>
> YouTube doesn't let apps read Watch Later, so this extension does it for the Chipper web app (https://leachh02.github.io/chipper/):
> • Sync: reads the videos in your Watch Later playlist
> • Tidy up: removes the videos you've marked as watched or skipped
>
> Everything stays in your browser. There are no accounts, no tracking and no ads. Chipper is free and open source: https://github.com/leachh02/chipper
>
> Removing videos relies on YouTube's menu wording, so keep YouTube in English.

**Category:** Productivity

**Privacy policy URL:** https://github.com/leachh02/chipper/blob/main/PRIVACY.md

**Homepage / support URL:** https://github.com/leachh02/chipper

### Chrome Web Store: privacy practices tab

**Single purpose:**
> Reads and tidies the user's YouTube Watch Later playlist for the Chipper web app, which YouTube's API doesn't support.

**Permission justifications:**
- `tabs`: Opens the user's Watch Later page in a new tab to read or tidy it, closes it afterwards, and returns focus to the Chipper tab.
- Host permission `https://www.youtube.com/*`: Lets the content script run on the Watch Later playlist page, where it reads the videos and removes the ones the user has finished.
- Content scripts on `localhost`, `127.0.0.1` and `leachh02.github.io/chipper`: Pass messages between the Chipper web app and the extension. They only run on Chipper's own pages.

**Remote code:** No, it doesn't use remote code.

**Data usage:** Tick none of the data types. Certify that data isn't sold, isn't used for unrelated purposes, and isn't used for creditworthiness.

### Firefox Add-ons (AMO)

- **Source code:** The extension is plain, unminified JavaScript with no build step, so no separate source upload is needed.
- **Data collection:** None (already declared in the manifest).
- **Android:** Mark it as compatible with Firefox for Android.

### Screenshots

Chrome needs at least one, at 1280×800 or 640×400. Good options:
1. The Chipper home page with the backlog totals
2. Watch Later in Chipper, with a sync in progress
3. A chip session queue
