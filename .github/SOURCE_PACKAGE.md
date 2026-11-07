# WaniKani Kanji Highlighter: source package

This package holds what's needed to rebuild the Firefox add-on, in the folders the extension
expects (it installs its libraries from them):

- `wanikani/wanikani-kanji-highlighter`: the extension
- `wanikani/wanikani-api-manager`: its WaniKani library (installed from `../wanikani-api-manager`)
- `cjk-highlighter`: its page highlighting library (installed from `../../cjk-highlighter`), TypeScript
  compiled with the extension

## Build

You need Node.js 24 and npm. Build the WaniKani library first, because the extension uses its built files:

```sh
cd wanikani/wanikani-api-manager
npm ci
npm run build:lib

cd ../wanikani-kanji-highlighter
npm ci
npm run build:firefox
```

The add-on is then in `wanikani/wanikani-kanji-highlighter/.output/firefox-mv2`.
