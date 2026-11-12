# Privacy policy

_Last updated: 8 November 2026_

Chipper is a free, open-source tool for working through your YouTube Watch Later playlist, and optionally your saved Spotify albums and podcasts. It has no accounts, no servers of its own, no analytics and no ads.

## What the Chipper extension does

The extension does one thing: it lets the Chipper web app read and tidy your YouTube Watch Later playlist, because YouTube doesn't offer Watch Later through its API.

- When you sync, it opens your Watch Later page on youtube.com and reads each video's ID, title, channel, length, view count and how long ago it was uploaded. When you ask it to, it removes videos you've finished from Watch Later.
- It passes what it reads to the Chipper web app open in the same browser. Nothing is sent to anyone else.
- It only runs on your Watch Later page and on Chipper's own pages. It doesn't read your browsing history, other YouTube pages or any other site.
- It stores nothing itself.

## What the Chipper web app stores

Everything you track (videos, albums, episodes, your statuses and settings) is stored in your browser's own storage on your device. It never leaves your device unless you download a backup file yourself. Clearing the site's data in your browser deletes it.

## Other services Chipper talks to

- **YouTube.** Thumbnails are loaded from YouTube's image servers. When you import a CSV, Chipper asks YouTube's public oEmbed service for each video's title.
- **Spotify (self-hosted copies only).** If you connect Spotify, the app talks directly to Spotify's API from your browser to read your saved albums and episodes. Your Spotify sign-in token is kept in your browser's storage and is never included in backups. Chipper never changes your Spotify library.
- **Discogs.** Genre data comes from a Discogs data file you download and open yourself. Nothing is sent to Discogs.
- **GitHub Pages.** The public site is hosted on GitHub Pages, which, like any web host, may log basic request information such as IP addresses. See [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

Chipper doesn't sell, share or transfer your data, because it never has it.

## Contact

Questions or concerns: open an issue at https://github.com/leachh02/chipper/issues.
