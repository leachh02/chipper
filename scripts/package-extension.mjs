// Builds store-ready zips of apps/extension:
//   apps/extension/dist/chipper-chrome-<version>.zip   for the Chrome Web Store
//   apps/extension/dist/chipper-firefox-<version>.zip  for addons.mozilla.org
//
// Run from the repo root: node scripts/package-extension.mjs
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "apps/extension");
const out = join(source, "dist");
const manifest = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));

// The Chrome Web Store gives the extension its own ID, and refuses a
// manifest that pins one with "key"
function chromeManifest() {
  const { key: _key, ...rest } = manifest;
  return rest;
}

// Firefox runs background scripts as an event page rather than a service
// worker, can't take messages straight from websites (the app-bridge content
// script covers that), and needs an add-on ID.
function firefoxManifest() {
  const { key: _key, externally_connectable: _ext, background, ...rest } = manifest;
  return {
    ...rest,
    background: { scripts: [background.service_worker], type: background.type },
    browser_specific_settings: {
      gecko: {
        id: "chipper@leachh02.github.io",
        strict_min_version: "128.0",
        // Chipper sends nothing anywhere: it only reads and edits your Watch
        // Later page and hands the results to the Chipper app in your browser
        data_collection_permissions: { required: ["none"] },
      },
      gecko_android: { strict_min_version: "128.0" },
    },
  };
}

rmSync(out, { recursive: true, force: true });

for (const [browser, build] of [
  ["chrome", chromeManifest],
  ["firefox", firefoxManifest],
]) {
  const dir = join(out, browser);
  mkdirSync(dir, { recursive: true });
  for (const path of ["background.js", "servers.js", "options.html", "options.js", "scripts", "images"]) {
    cpSync(join(source, path), join(dir, path), {
      recursive: true,
      filter: (file) => !file.endsWith(".DS_Store"),
    });
  }
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(build(), null, 2) + "\n");

  const zip = join(out, `chipper-${browser}-${manifest.version}.zip`);
  execFileSync("zip", ["-qr", "-X", zip, "."], { cwd: dir });
  console.log(`Built ${zip}`);
}
