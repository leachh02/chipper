# Running your own copy of Chipper

There are two ways to run your own Chipper:

- **The Chipper server**, in Docker. It serves the app, gives everyone in your household an account, and keeps each person's devices in sync live, so a video you finish on your phone is gone from your PC's list within seconds. See [The Chipper server](#the-chipper-server).
- **Just the app**, with no server. Everything stays in your browser, and backup files move it between devices. See the steps below.

Either way, running your own copy is also how you add Spotify, which the public site can't offer to everyone (see [Why Spotify needs your own copy](#why-spotify-needs-your-own-copy)).

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
- **Tell the extension your address.** The extension works with `localhost`, `127.0.0.1` and the public site out of the box. For any other address, click the extension's toolbar button (or open its **Options**), add the address and allow access when the browser asks, then refresh Chipper.
- **Spotify needs HTTPS.** Apart from `127.0.0.1`, Spotify only accepts `https://` redirect URIs. Add `https://your-address/dashboard/spotify` to your Spotify app.

## The Chipper server

The server is a single Docker container: the app, accounts and sync, with everything stored in one SQLite database on a Docker volume.

### Start it

You need [Docker](https://docs.docker.com/get-docker/) with Compose.

```bash
git clone https://github.com/leachh02/chipper.git
cd chipper
docker compose up -d --build
```

Open `http://<the server's address>:8080`, go to **Your data**, and create the first account. That account is the admin, who adds everyone else from the same page. Each person signs in on each of their devices, and what's already on a device is merged into their account the first time.

To update, pull the latest code and run `docker compose up -d --build` again.

### Phones, HTTPS and the extension

- **Over plain `http://`**, Chipper works in any browser on your network, but phones won't install it as an app, because browsers only allow that over HTTPS. To get HTTPS, put the server behind a reverse proxy such as [Caddy](https://caddyserver.com), or use [Tailscale](https://tailscale.com)'s `tailscale serve`.
- **The Watch Later extension** works with `http://127.0.0.1:8080` with no setup, on the PC that runs the server. To sync Watch Later against the server from another PC, or at another address, click the extension's toolbar button, add that address (for example `192.168.1.20:8080`) and allow access, then refresh Chipper.
- **Don't put it on the open internet without HTTPS.** Passwords travel with every sign-in, and there's no limit yet on how often someone can try one.

### Spotify

Put `VITE_SPOTIFY_CLIENT_ID` in `apps/frontend/.env` as in [Add Spotify](#3-add-spotify-optional), then run `docker compose up -d --build`. The image is built with that file, so rebuild after changing it. In your Spotify app, add the redirect URI `http://127.0.0.1:8080/dashboard/spotify` (for use on the server's own machine) or `https://<your address>/dashboard/spotify`.

### Group by topic (optional)

Chipper can sort what's left of your Watch Later and podcasts into groups by topic, like "Cooking · Recipe · Pasta" or "Astronomy · Moons · Telescope". Then **Group by topic** shows your list under each group, and a chip session can stick to the topics you pick.

It runs in a second container with a small language model ([all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)). Everything happens on your own machine: nothing is sent anywhere, and there's no API key. Start it with the `ai` profile:

```bash
docker compose --profile ai up -d --build
```

The first build downloads the model into the image, about 650 MB in all. The service loads the model when someone groups their backlog, and lets it go after 10 minutes unused (set `CHIPPER_AI_IDLE_MINUTES` to change that).

Then use **Group** on Watch Later or on Spotify's podcasts. Groups sync to all your devices. Use **Regroup** when your backlog has changed a lot; anything added since shows under "Not grouped yet".

### Back up the server

Everyone's data is in the `chipper-data` volume. To copy it out:

```bash
docker compose stop
docker compose cp chipper:/data ./chipper-backup
docker compose start
```

Each device also keeps its own full copy, and **Your data** still downloads a backup file.

### Without Docker

You need Java 21 and Node.js 22:

```bash
cd apps/frontend
npm ci
VITE_SERVER=true npm run build
cp -R dist/. ../server/src/main/resources/static/
cd ../server
./mvnw -DskipTests package
CHIPPER_DATA_DIR=/where/to/keep/data java -jar target/chipper-server-*.jar
```

`PORT` changes the port from 8080. For grouping by topic, run the service in `apps/ai` (see its README) and set `CHIPPER_AI_URL` to its address.

## Why Spotify needs your own copy

Since February 2026, Spotify apps in Development Mode can have at most 5 users, and the app's owner needs Premium. Getting past that means applying for extended access, which Spotify reserves for established businesses. So the public Chipper site is YouTube only, and anyone who wants Spotify brings their own client ID.

## Your data

Everything lives in your browser's storage for the address you open Chipper on. Without the server, it doesn't leave your computer, except for requests to YouTube and Spotify. Clearing site data for that address deletes it, so save a backup now and then from **Your data**. With the server, each person's data is also kept on the server, and only their own devices can see it.
