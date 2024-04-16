# [Changelog v1.0.8](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.8)

## Popup
- Clicking on a bar from Future Reviews chart now shows the reviews for that date ([#11](https://github.com/digas99/wanikani-kanji-highlighter/issues/11))
- Added subject passing progress bar to subject tiles in the Profile Page ([#12](https://github.com/digas99/wanikani-kanji-highlighter/issues/12))
- Added a progress bar to the subjects list in the Profile Page
- Made no longer available subjects appear more faded in the Profile Page and removed them from the progress counting
- Added a new tile coloring theme to the Profile Page: color by Subject Progress
- Level info is now clickable in Levels Progress ([#22](https://github.com/digas99/wanikani-kanji-highlighter/issues/22))
- Typing on home page will trigger a search ([#23](https://github.com/digas99/wanikani-kanji-highlighter/issues/23))
- Added coloring to distinguish kanji and vocabulary in Search ([#24](https://github.com/digas99/wanikani-kanji-highlighter/issues/24))

# [Changelog v1.0.7](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.7)
Released on 14/04/2024

## Bug Fixes
- Radicals images now load correctly ([#8](https://github.com/digas99/wanikani-kanji-highlighter/issues/8))
- Fixed level not updating on level up ([#10](https://github.com/digas99/wanikani-kanji-highlighter/issues/10))
- Details Popup navbar buttons have now a better click area ([#13](https://github.com/digas99/wanikani-kanji-highlighter/issues/13))

# [Changelog v1.0.6](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.6)
Released on 03/09/2023

## Popup
- Added Extension Rating stars

## Bug Fixes
- Lessons and Reviews counter on top navbar now update automatically upon a background task fetch

# [Changelog v1.0.5](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.5)
Released on 30/08/2023

## Bug Fixes
- Added timeout to fetching tasks to prevent it from getting stuck

# [Changelog v1.0.4](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.4)
Released on 28/08/2023

## Popup
- Added Dark Mode to the extension popup
- On big data fetches, the updated number of reviews and lessons is now shown right away, instead of waiting for the fetch to end 

## Bug Fixes
- Fixed issue that was preventing new reviews notifications (and possibly breaking the extension background tasks)

## Content
- Added periodic background tasks to fetch data from Wanikani, while the user is browsing the web

# [Changelog v1.0.3](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.3)
Released on 25/08/2023

## Bug Fixes
- Updating the extension now only clears all subject data if the previous version begins with 0
- Leaving the extension while loading data no longer breaks the loading popup message progress (it is atleast more resilient now)

# [Changelog v1.0.2](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.2)
Released on 24/08/2023

## Bug Fixes
- Fixed issue where Lessons and Reviews wouldn't always update on their own
- Avatar now loads even when offline
- Fixed the way the timestamp for new updates was being saved (it is now using UTC time)
- Page width now ajusts to the width of the screen (for users in mobile devices, with Kiwi Browser, for example)
- Fixed duplicate creation of Context Menus, which would lead to the extension's Service Worker to crash

# [Changelog v1.0.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v1.0.0)
Released on 21/08/2023

### - Migration to Manifest v3

## Technicalities
- Changed background from Page to Service Worker
- Window.localStorage not accessible on Service Worker so changed it to IndexedDB
- Popup is no longer entirely created with Javascript (it is now more organized and with each page on a different HTML file)

## Popup
- Improved interface in general
- Added navbar to Changelogs list in the About page
- Added "load more" button to Search Results to limit the number of results and reduce lag while writing on search bar
- Added loading feedback popup for the user to understand the loading stages of data from wanikani
- Loading data from Wanikani is now also being done from the extension Popup (no need to browse a web page)
- Progression Bar, Progression Stats and Levels in Progress now show a list of all the related subjects when clicked
- Lists of subject tiles are now justified to fill the entire width

## Data
- Added new Kana Vocabulary from Wanikani

## Bug Fixes
- Fixed issue where the Subjects Progression Stats would not update over time

---

# [Changelog v0.6.6](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.6)
Released on 11/08/2022

## Popup
- Added Copy to Clipboard button to API Key on About page

## Content
- Added Copy to Clipboard buttons to the main subject of lateral Details Popup and to each subject related to that main subject

## Bug Fixes
- Previous Subject arrow on lateral Details Popup now is always visible to prevent a bug where it wouldn't show up, even when there were previous subjects
- Navbar on lateral Details Popup now scrolls to each section without affecting the main webpage (some webpages would react badly to url hash changes when using anchor links and reload the page)

# [Changelog v0.6.5](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.5)
Released on 10/03/2022

## Popup
- Reduced loading times
- Removed subject info when hovering on subjects in profile, while at Wanikani

## Bug Fixes
- Fixed issue where highlighted kanji would show on extension popups opened in other tabs (not only on the popup opened on their tab)

# [Changelog v0.6.4](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.4)
Released on 06/03/2022

## Popup
- Changed the way the loading of subjects is being done to reduce significantly it's time
- Added Profile Page to Extension Popup, accessible by clicking the Avatar on the top right corner, in the side panel. This allows to:
  - See all subjects on your curret level
  - Filter and sort those subjects
  - See subjects from other levels
- Added Star to the top right corner of every secundary page that allows to make that page the Home Page of the Extension Popup

# [Changelog v0.6.3](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.3)
Released on 25/02/2022

## Popup
- Slider on settings to change width of extension popup
- Precise search switch button now works on kana writing and kanji (before, it was always precise)
- Sliders on settings now work with mouse wheel too (shift + wheel increases scale)
- Activating kana writing on text inputs of a web page no longer requires page reload (activation and deactivation happens in real time now)
- Some containers within the extension popup have been made resizable
- Bar with status of Highlighting and Details Popup (if those features are active or not)
- Removed old interface (not accessibable through the X button on the top right anymore)
- Small changes on buttons to blacklist a site to fit most recent interface
- Added overall progression bar on each SRS Stage
- Added overall progression stats (number of subjects) on each SRS Stage
- Added levels in progress stats
- Possibility to chose, through settings, what to show in the home page of the extension popup

## Content
- Added button to play sound of reading to the details popup of any vocabulary
- Added real time color change to details popup, when changing it from the settings of the extension popup

## Bug Fixes
- Clicking on a search result while on kana writing mode now searches for that result (before, it only worked while on romaji mode)
- Fixed issue where list of highlighted kanji wouldn't show up if extension popup was opened too soon
- Fixed issue where search on extension popup wouldn't load subjects when clicking to change type of input (from Romaji to Kana)
- Improved kana writing to fix some bugs with situations like "しゅっしゃ" and "かんじ" (when written as kanji instead of kannji)
- Fixed issue where the bars stating the number of highlighted kanji wouldn't show up or not update automaticaly
- Fixed issue where highlight wouldn't work if you changed tabs before page loaded
- Improved verifications to reduce times when highlight runs when it shouldn't

# [Changelog v0.6.2](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.2)
Released on 29/12/2021

## Popup
- Added SRS Stage to extension popup search results
- Changed style of search result cards
- Added button to side panel to get random subject (type of subject - kanji, vocabulary or any - can be specified in settings)

## Content
- Added SRS Stage information to details popup
- Added Timestamp Statistics to details popup
- Added Reviews Statistics to details popup
- Added Parts of Speech and JLPT and Joyo levels to details popup
- Changed the overall style of details popup
- Added navigation bar to details popup
- Added shortcut keys to interact with details popup navigation bar:
  - **I:** Navigate to Info Section
  - **C:** Navigate to Cards Section
  - **S:** Navigate to Reviews Statistics Section
  - **T:** Navigate to Timestamps Section
  - **<-:** Navigate to Previous Section
  - **->:** Navigate to Next Section
- Added button in details popup to deactivate key bindings
- Added slider to settings to set the opacity of the small details popup
- Option to write with kana on webpage text inputs

## Bug Fixes
- Fixed issue where subject data wasn't being loaded the first time the extension run
- Notifications now show subjects numbers updated
- Adjusted extension popup interactions when at wanikani.com
- Fixed issue where the extension would hide, by mistake, some things on web pages

# [Changelog v0.6.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.1)
Released on 15/12/2021

## Bug Fixes
- Assignment material shown in reviews/lessons list now match the real number of assigments (only showing up to 500 assignments before, due to a bug)

# [Changelog v0.6.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.6.0)
Released on 16/11/2021


## Content
- Notifications to remind you to practice daily
- Used Kanji in Details Popup is no longer sorted by level, but by its position in the vocabulary subject (as it was before)
- Added highlighting to elements from within an iframe (only to those iframes that allow it)

## Popup
- New side panel that is more interactive and gives a refreshed look to the app (can be activated by clicking the hamburger menu, or switched back to the old interface)
- New About page with information regarding the App, and more

---

# [Changelog v0.5.7](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.7)
Released on 08/10/2021

## Bug Fixes
- Fixed issue where, on Youtube, highlighted content wouldn't update when clicking on a new video
- Fixed issue where some kanji would be highlighted as learned, when it was not the case

# [Changelog v0.5.6](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.6)
Released on 03/10/2021

## Bug Fixes
- Fixed issue where future reviews were not being fetched and displayed in the future reviews chart

# [Changelog v0.5.5](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.5)
Released on 28/09/2021

## Content
- New notifications system to alert when there are new Reviews in queue

## Popup
- Improved "romaji to kana" system. Now, writing, for example, "kko" becomes "っこ", as it should
- Possibility to change time format within extension popup between 12h and 24h

## Bug Fixes
- Fixed Kanji Search Settings Navbar taking time to show up, or not loading at all
- Details Popup no longer closes for no reason when clicking to see the details popup of a subject from within that details popup
- Details Popup no longer shows duplicate information on a subject
- Clicking in several subjects within the extension popup now displays the correct kanji information in the details popup created
- Highlighted kanji in the page shown in the extension popup is way more stable now
- Subject cards in the details popup are now correctly sorted by level, as they should

# [Changelog v0.5.4](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.4)
Released on 03/09/2021

## Popup
- Made all features of the extension available for any type of account (free, paid, etc)
- Added user Avatar

# [Changelog v0.5.3](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.3)
Released on 30/08/2021

## Bug Fixes
- Fixed issue where the app wouldn't fetch new subjects added/altered in WaniKani (Content Updates)
- Going forwards or backwards in the future reviews chart now shows the correct day when entering a new month

# [Changelog v0.5.2](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.2)
Released on 15/08/2021

## Popup
- The display of reviews or lessons material is now divided by SRS Stages
- Added an interactive bar with number of assignments for each SRS Stage to the top of the reviews or lessons material list
- The future reviews chart shows number of reviews divided by SRS Stage (Stacked bars)
- More options to color customization in settings

# [Changelog v0.5.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.1)
Released on 10/08/2021

## Popup
- The future reviews chart can now show reviews for a specific day, chosen at "Select another day"
- The same chart also has arrows to navigate through the days more easily. The left and right arrows of the keyboard can be used for the same effect
- Reduced the time of the initial loading to almost none. The loading is now done only when needed, in certain key parts.

## Bug Fixes
- Extension popup no longer reloads when user rejects the reset of all colors in settings

# [Changelog v0.5.0](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.5.0)
Released on 09/08/2021

### - Reviews and Lessons tracking! Extra Highlight!

## Content
- Kanji you haven't learned yet are now also highlighted when they show up in the page, in a different color from the ones you learned. They work the same way as the ones you already learned, meaning they also have a details popup, etc...
- The small details popup, that shows up in the bottom right corner of the page after hovering over a kanji, now also displays the main meaning of that kanji
- Added shortcut keys to interact with the kanji details popup:
  - **L:** Lock the kanji in the details popup, meaning it won't change when hover over other kanji (might come in hand when your mouse is surrounded by several highlighted kanji)   
  - **F:** Fix the kanji details popup, not allowing it to close when clicking outside of it
  - **X:** Close the kanji details popup
  - **O:** Expand the small kanji details popup on the bottom right corner
  - **U:** Scroll the kanji details popup all the way to the top
  - **B:** Show information from the last kanji in the details popup
- Added buttons to the kanji details popup, near the kanji container, to do the same thing as the sortcut keys, but manually
- Highlighted kanji now change it's style immediately after it being changed in the extension popup settings
- Kanji cards in details popup now also show the main meaning of the material and the main reading

## Popup
- Extension popup's first page now shows number of Lessons and Reviews available at the moment. It also shows when more reviews will be available
- Clicking in the number of reviews or lessons will show the kanji material that will be taught/reviewed and also a chart with the reviews for the next 24 hours
- The list of kanji that were highlighted now have colors to distinguish the kanji you learned from the kanji you didn't
- Settings page is now organized into sections
- Color of highlight and kanji cards can now be customized in the popup settings

## Bug Fixes
- Fixed weird placements of elements inside kanji details popup (extra blank spaces, content too big for its container, etc...)

---

# [Changelog v0.4.5](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.5)
Released on 02/08/2021

## Popup
- Possibility to make the kanji search results more or less broaden through the targeted search icon in the search results navbar. If targeted search is activated, then the result of the search will be exactly what was typed in (i.e.: searching gold will only show results with gold (results as goldfish, for example, will not be included))
- Added the list of kanji that were highlighted in that page to the extension popup

## Bug Fixes
- Content inside kanji details popup no longer loads multiple times, which was also causing problems when navigating through kanji and vocabulary within the kanji details popup

# [Changelog v0.4.4](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.4)
Released on 30/07/2021

## Content
- Extension no longer counts repeated kanji on each page. This means that the number of kanji that is now being shown is only the number of different kanji in the page

## Popup
- Possibility to change the display of the kanji cards in the search result
    - List: one result per line with detailed info
    - Big and Small Grid: results in a grid but with no detailed info, only card with kanji
- The results of kanji search is now more broaden (i.e.: searching gold will also show GOLDfish)

# [Changelog v0.4.3](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.3)
Released on 02/06/2021

## Content
- Selecting any word in a page and then right clicking it will show an option in the context menu to allow the user to search for that word in the Search Bar in the extension popup
- Kanji counter in the extension icon doesn't have a cap of 99 kanji anymore

## Bug Fixes
- The Kanji Info Popup is now the same in every page, and no longer gets all wrongly formated depending on the page it is in
- Fixed an issue where if you were to click a kanji from a Search Result while there is already a Kanji Info Popup open, the Bottom Right Kanji Popup would become unclickable

# [Changelog v0.4.2](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.2)
Released on 01/06/2021

## Content
- Hovering an item card in Kanji Info Popup now shows a small sidebar where you can open the Kanji Info Popup of that item or listen to the its audio, if it is a vocabulary
- With the implementation of the feature above, vocabulary now have a Kanji Info Popup (before this, only kanji had it). This new Kanji Info Popup has information about the vocabulary, such as mnemonics, example sentences with that vocabulary, etc...
- Kanji highlighted within the example sentences can be clicked, which creates a new Kanji Info Popup for that kanji

## Popup
- When clicking a result of a search that is a kanji, the info popup for that kanji will appear in the bottom right corner of the webpage, as if that kanji was highlighted and the user hovered over it

## Bug Fixes
- Fix issue where the extension popup wouldn't load correctly and would stay that way

# [Changelog v0.4.1](https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/v0.4.1)
Released on 30/05/2021

## Bug Fixes
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
