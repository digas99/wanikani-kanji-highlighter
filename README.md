# WaniKani Kanji Highlighter
### Unofficial Chrome Extension

This is an unofficial chrome extension for Kanji Highlighting, matching the kanji learned with [WaniKani.com](https://www.wanikani.com/).
It works with any website, and provides detailed information about any kanji that is highlighted.
**Because it would be cheating, the extension doesn't work on [WaniKani.com](https://www.wanikani.com/).**

#### VERSION 0.3.1

## [Get it on Chrome Webstore](https://chrome.google.com/webstore/detail/wanikani-kanji-highlighte/pdbjikelneighjgjojikkmhiehpcokjm/)

## Table of contents:
1. [Latest Features](#changelog-v031)
2. [Usage Guide](#usage-guide)
   * 2.1. [WaniKani API Token](#wanikani-api-token)
   * 2.2. [Kanji Details](#kanji-details)
   * 2.3. [Kanji Search](#kanji-search)
   * 2.4. [Writing Kana](#writing-kana)
   * 2.5. [Blacklisting a Site](#blacklisting-a-site)
   * 2.6. [Settings](#settings)
3. [Pictures](#pictures)

## Changelog v0.3.1
Pending Release
### Popup
- Changed the position of the search bar to fit better the interface
- Added level of kanji to the results of Kanji Searching
- Added the possibility to search kanji by level and reading
- Added a button in search bar to allow the user to change between writing romaji and kana (if the kana option is selected, the user will still write romaji through their keyboard but it will be automatically converted to kana) 
- Added the number of kanji found when using the search bar


#### [(All changelogs)](CHANGELOG.md)

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

### Kanji Search:
You can search for any Kanji taught on WaniKani, even if you didn't learn it yet, through the search bar in the extension popup.

The search can be done by writing in the search bar in two ways, which can be toggled by clicking a button with either 'あ' or 'A':
- **Kana (きん):**
  - **Hiragana:** writing the reading in Hiragana (lowercase) will show all kanji with that reading, either kunyomi or onyomi
- **Romaji/Kanji/Number (Gold/金/5):**
  - **Name of the kanji:** writing the name of a kanji will show immediately all matches for that name (sometimes, different kanji have the same name)
  - **Character of the Kanji:** writing the kanji itself, will show, not only that kanji, but all the similar kanji
  - **Level:** writing a number 1-60 will show all kanji from that level

The result of the search is the character for the kanji, followed by its names, readings and level.

### Writing Kana:
Within the search bar, if you change the writing type from Romaji to Kana, by clicking on the button with the character 'あ', everything you type with your keyboard on that search bar will be automatically converted to Kana. If you write in **Lower Case** then **Hiragana** will show up. If you write in **Uper Case** then **Katakana** will show up.

So, if you write **kya**, you will see **きゃ**. If you instead write **KYA**, you will se **キャ**.

"Special characters":
- **ぁぃぅぇぉ (small):** l+(a|i|u|e|o) or x+(a|i|u|e|o)
- **っ (small)**: ll or xx
- **ゃゅょ (small):** l+(ya|yu|yo) or x+(ya|yu|yo)
- **ん:** nn

(Same goes for all it's counterparts in **Katakana**, using Upper Case)

### Blacklisting a Site:
If you feel like the extension is being problematic on a specific website, or you simply don't want it to run in it, you can blacklist it on the extension popup. There will be a red button saying **Don't Run On This Site**.

You can blacklist multiple sites and, of course, you can allow the extension to run on it again, after it was blacklisted. There will be a red button saying **Run Highlighter On This Site**.

The changes will take place right after you reload the page.

You can see the list of blacklisted sites in *Settings*, within the extension popup.

### Settings:
On the extension popup, you will find the app settings.
- **Kanji info popup:** show the popup with the details of a highlighted kanji, when hover over it
- **Kanji counter on icon:** show the number of highlighted Kanji in the page on the icon of the extension (doesn't count above *99* kanji for readability purposes)
- **Highlight style:** choose how do you want the kanji to be highlighted

## Pictures
![screenshot1](https://i.imgur.com/9euvCGE.jpg)
![screenshot2](https://i.imgur.com/25CS2nc.jpg)
![screenshot3](https://i.imgur.com/A8G5jrJ.jpg)

![logo](https://github.com/digas99/wanikani-kanji-highlighter/blob/master/logo/logo.png)
