# Changelog v0.4.2
Not Released Yet

## Content
- Hovering an item card in Kanji Info Popup now shows a small sidebar where you can listen to the audio of vocabulary

## Bug Fix
- Fix issue where the extension popup wouldn't load correctly and would stay that way

# Changelog v0.4.1
Pending Release

## Bug Fixed
- Fixed bug where name of kanji wouldn't show up properly in the Kanji Info Popup

# [Changelog v0.4.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.0)
Released on 28/05/2021

### - Vocabulary is here!

## Content
- Kanji info that appears when hovering over a kanji now has every vocabulary word, provided by WaniKani, associated to that kanji

## Popup
- Implemented vocabulary results in Kanji Search
- When clicking the kanji of a result in Kanji Search, a new search will be made with the kanji that was clicked
- Improved Api Key text input to match the Kanji Search text input interface

---

# [Changelog v0.3.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.3.1)
Released on 24/05/2021
## Popup
- Changed the position of the search bar to fit better the interface
- Added level of kanji to the results of Kanji Searching
- Added the possibility to search kanji by level and reading
- Added a button in search bar to allow the user to change between writing romaji and kana (if the kana option is selected, the user will still write romaji through their keyboard but it will be automatically converted to kana) 
- Added the number of kanji found when using the search bar

# [Changelog v0.3.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.3.0)
Released on 22/05/2021
## Popup
- Added a delete option to the blacklisted sites list within settings for every blacklisted site
- The button that feeds the list of blacklisted sites now has the number of blacklisted sites
- Changes in the style of the options in settings
- Added Kanji Search:
    - Search kanji thorugh it's name or it's character (also shows similar kanji)
    - When something matches, it shows the character, the names and the readings for the kanji
    - Any kanji will show up, even the ones you haven't learned yet

## Bug Fixes
- Clicking outside the settings and exit buttons, in the popup extension, no longer triggers them by mistake

---

# [Changelog v0.2.2](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.2.2)
Released on 13/05/2021
## Bug Fixes
- Fixed extension popup not fully loading on certain websites

# [Changelog v0.2.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.2.1)
Released on 12/05/2021
## Bug Fixes
- Fixed wrong version number displaying on the extension popup

# [Changelog v0.2.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.2.0)
Released on 11/05/2021
## Popup
- Changed navbar buttons from text to icons
- Added option in settings to change the style of the highlighting

## Content
- Put an indicator when a kanji reading is hidden because of overflow on small Popup of Kanji Info

## Bug Fixes
- Fixed some styling formatting issues with the highlighting of the kanji in some websites

---

# [Changelog v0.1.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.1.1)
Released on 07/05/2021
## Bug Fixes
- Fixed page loading issues when navigating through pages of a same website
- The extension now works on subdomains of Wanikani

# [Changelog v0.1.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.1.0) 
Released on 27/03/2021
## Content
- Highlight of any kanji learned in any web page
- Hovering highlighted kanji will provide detailed information about it

## Popup
- Information on how many kanji were highlighted on that page
- Pages can be blacklisted so that the extension will not run the highlighting on them
- Added settings where you can turn on or off the following:
    - Kanji info popup (shows details popup when hovering a highlighted kanji)
    - Kanji counter on icon (displays number of kanji highlighted in the page on the icon badge)
