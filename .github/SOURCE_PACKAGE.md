# WaniKani Kanji Highlighter: source package

This package holds what's needed to rebuild the Firefox add-on:

- `wanikani-kanji-highlighter`: the extension
- `wanikani-api-manager`: its library, which the extension installs from that folder

## Build

You need Node.js 24 and npm. Build the library first, because the extension uses its built files:

```sh
cd wanikani-api-manager
npm ci
npm run build:lib

cd ../wanikani-kanji-highlighter
npm ci
npm run build:firefox
```

The add-on is then in `wanikani-kanji-highlighter/.output/firefox-mv2`.
