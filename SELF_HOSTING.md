# Running your own copy of Chipper

Chipper is a static web app plus a Chrome extension. There's no server or database to run: everything you track is stored in your browser. Running your own copy is mainly about adding Spotify, which the public site can't offer to everyone (see [Why Spotify needs your own copy](#why-spotify-needs-your-own-copy)).

## What you need

- [Node.js](https://nodejs.org) 22 or later
- Chrome, or another Chromium browser such as Edge or Brave
- For Spotify: a Spotify Premium account, because Spotify only lets Premium accounts own developer apps

## 1. Get the code and install

```bash
git clone https://github.com/leachh02/chipper.git
cd chipper/apps/frontend
npm install
cp .env.example .env
```

## 2. Load the extension

The extension reads your Watch Later playlist from YouTube, because YouTube's API doesn't offer Watch Later.

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `apps/extension` folder.

The manifest pins the extension's ID, so it's the same on every machine and Chipper finds it without any setup. If you loaded an older copy before the ID was pinned, click **Remove** on its card and load it again: reloading keeps the old ID. Keep YouTube in English: removing videos from Watch Later relies on the wording of YouTube's menu.

## 3. Add Spotify (optional)

Skip this if you only want YouTube. Without a client ID, Chipper hides everything to do with Spotify.

1. Go to the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create an app. Choose **Web API** when it asks which APIs you'll use.
2. Under the app's settings, add these redirect URIs:
   - `http://127.0.0.1:5173/dashboard/spotify` for `npm run dev`
   - `http://127.0.0.1:4173/dashboard/spotify` for `npm run preview`
3. Copy the app's **Client ID** into `.env`:

   ```bash
   VITE_SPOTIFY_CLIENT_ID=your-client-id
   ```

4. To let someone else use your copy, add their Spotify email address under **User Management** in the app's settings. Development Mode allows up to 5 people.

## 4. Run it

For everyday use, build it once and serve the build:

```bash
npm run build
npm run preview
```

Then open http://127.0.0.1:4173. Run `npm run build` again after you pull updates or change `.env`.

If you're changing the code, use `npm run dev` and open http://127.0.0.1:5173 instead.

Use `127.0.0.1` rather than `localhost`. Spotify only accepts `127.0.0.1` for local redirects, and your browser keeps separate data for each address, so sticking to one keeps everything together.

## Running it somewhere other than your own computer

The `dist` folder that `npm run build` creates is plain static files, so any static host works, such as nginx, Caddy, GitHub Pages or Cloudflare Pages. A few things to know:

- **Send every page to `index.html`.** Chipper handles its own routes, so a request for `/dashboard/youtube` has to return `index.html`. With nginx that's `try_files $uri /index.html;`, and Caddy's equivalent is `try_files {path} /index.html`.
- **Let the extension talk to your address.** Chrome only lets sites listed in the extension's manifest talk to it, and the manifest allows `localhost`, `127.0.0.1` and the public site. Add your address to `externally_connectable.matches` in `apps/extension/manifest.json`, for example `"https://chipper.example.com/*"`, then reload the extension on `chrome://extensions`.
- **Spotify needs HTTPS.** Apart from `127.0.0.1`, Spotify only accepts `https://` redirect URIs. Add `https://your-address/dashboard/spotify` to your Spotify app.

## Why Spotify needs your own copy

Since February 2026, Spotify apps in Development Mode can have at most 5 users, and the app's owner needs Premium. Getting past that means applying for extended access, which Spotify reserves for established businesses. So the public Chipper site is YouTube only, and anyone who wants Spotify brings their own client ID.

## Your data

Everything lives in your browser's storage for the address you open Chipper on. It doesn't leave your computer, except for requests to YouTube and Spotify. Clearing site data for that address deletes it, so save a backup now and then from **Your data and backups** on the home page.
