# WaniKani Kanji Highlighter
### Unofficial Chrome Extension

This is an unofficial chrome extension for Kanji Highlighting, matching the kanji learned with [WaniKani.com](https://www.wanikani.com/).
It works with any website, and provides detailed information about any kanji that is highlighted.
**Because it would be cheating, the extension doesn't work on [WaniKani.com](https://www.wanikani.com/).**

## ~[Get it on Chrome Webstore](#)~
*(Yet to be published)*

## Table of contents:
1. [Latest Features](#latest-features)
2. [Upcoming Features](#upcoming-features)
3. [Usage Guide](#usage-guide)
   * 3.1. [WaniKani API Token](#wanikani-api-token)
   * 3.2. [Kanji Details](#kanji-details)
   * 3.3. [Blacklisting a Site](#blacklisting-a-site)
   * 3.3. [Settings](#settings)
4. [About the Code](#about-the-code)

## Latest Features
### Content:
- Highlight of any kanji learned in any web page
- Hovering highlighted kanji will provide detailed information about it

### Popup:
- Information on how many kanji were highlighted on that page
- Pages can be blacklisted so that the extension will not run the highlighting on them
- Added settings where you can turn on or off the following:
    - Kanji info popup (shows details popup when hovering a highlighted kanji)
    - Kanji counter on icon (displays number of kanji highlighted in the page on the icon badge)

## Upcoming Features
### Popup:
- Highlight color customization

## Usage Guide
### WaniKani API Token:
To run the Highlighter and get all the information about your progression in Kanji learning on WaniKani, you need to feed the extension with an API Token. If you don't know how to get it, here's a quick guide:
- Go to [WaniKani.com](https://www.wanikani.com/) and login
- Click on your profile picture and then on *API Tokens* within *Settings*
- Generate a new token. Give it any name you want
- Input the token, when asked, in the extension popup

### Kanji Details:
When you find a Kanji you already learned, it will be highlighted. If you hover over it with your mouse, a small square with the kanji and its readings will appear in the bottom right corner of the page. If you hover over that square, it will expand and show you detailed information like the meaning, mnemonics, etc..

If you hover over another highlighted kanji, the popup with the details will automatically update.

When you no longer wish to have the popup visible, you can click anywhere on the page not covered by it, and it will collapse.

### Blacklisting a Site:
If you feel like the extension is being problematic on a specific website, or you simply don't want it to run in it, you can blacklist it on the extension popup. There will be a red button saying **Don't Run On This Site**.

You can blacklist multiple sites and, of course, you can allow the extension to run on it again, after it was blacklisted. There will be a red button saying **Run Highlighter On This Site**.

The changes will take place right after you reload the page.

You can see the list of blacklisted sites in *Settings*, within the extension popup.

### Settings:
On the extension popup, you will find the app settings.
- **Kanji info popup:** show the popup with the details of a highlighted kanji, when hover over it
- **Kanji counter on icon:** show the number of highlighted Kanji in the page on the icon of the extension (doesn't count above *99* kanji for readability purposes)

## About the Code
*Cooming soon*

![logo](https://github.com/digas99/wanikani-kanji-highlighter/blob/master/logo/logo.png)
