# Chipper: An Entertainment Backlog Depleter

I would like to dedicate this project to family. Use Chipper to get through your watch laters, albums and episodes as fast as possible, so that you can spend valuable (and decluttered) time with them. Ideally, you prioritise them before your YouTube videos anyway.

Chip away at your entertainment backlog and optimise the way you consume media.

Chipper is free and open source, and always will be. It runs in your browser and keeps your data on your own machine.

## What it does

- **YouTube Watch Later**: syncs your Watch Later playlist through the Chipper browser extension (or imports it from a CSV), then lets you search, sort and filter it by duration and status, see your remaining watch time and play videos in place. Mark videos as watched, skipped or for later, then have the extension remove the ones you're done with from YouTube.
- **Spotify albums and podcasts**: connects to your Spotify account and pulls in your saved albums and saved podcast episodes. Mark albums as listening, listened or skipped, shortlist the ones you want to hear soon, and heart your favourites. Sort and filter by release date, decade, genre (from Discogs, or your own) and more. Chipper never removes anything from your Spotify library.
- **Chip sessions**: say how long you've got and which services to include, and Chipper builds one queue to fit: things you've started first, then your shortlist, then the shortest items.

## Getting started

You'll need Node.js 22 or later and Chrome (or another Chromium browser).

1. **Load the extension.** Open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `apps/extension`.
2. **Run the app.**

   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

   Then open http://127.0.0.1:5173.

That's enough for YouTube. To add Spotify, or to run Chipper anywhere other than your own computer, see [SELF_HOSTING.md](SELF_HOSTING.md). To help out, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Project layout

| Path             | What it is                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/frontend`  | The app: React, Vite and Tailwind, storing everything in IndexedDB                                     |
| `apps/extension` | Chrome extension that reads your Watch Later playlist from YouTube                                     |
| `apps/backend`   | The optional self-hosted server: accounts and live sync between devices (Java, Spring Boot and SQLite) |
| `apps/ai`        | Optional service that groups your backlog by topic, for the self-hosted server (Python)                |
| `.github`        | CI, plus issue and pull request templates                                                              |

## Licence

Chipper is licensed under the [GNU General Public License v3.0](LICENSE).
