importScripts(
	"/scripts/static.js",
	"/scripts/time.js",
	"/scripts/fetch/data-fetch.js",
	"/scripts/fetch/wk-fetch.js",
	"/scripts/database.js",
	"/scripts/functions.js",
	"/scripts/kana.js",
);

const tabs = chrome.tabs;
let thisTabId, apiToken;
// highlighting properties
const functionDelay = 20;
let highlightingClass = "";
let notLearnedHighlightingClass = "";

let injectedHighlighter = false;
let externalPort;

let thisUrl;

let kanaWriting;

let allKanjiList;

chrome.runtime.onConnect.addListener(port => externalPort = port);

chrome.runtime.onInstalled.addListener(details => {
	console.log("Extension installed");

	// clear all subjects on extension update if the major version begins with 0
	if (details.reason == "update" && details.previousVersion.split('.')[0] == '0') {
		clearSubjects();
		chrome.storage.local.set({"initialFetch": true});
	}

	// setup context menu
	chrome.contextMenus.create({
		id: "wkhighlighterSearchKanji",
		title: "Search With WKHighlighter",
		contexts: ["selection"]
	});

	// interval to load data
	chrome.alarms.get("load-data", alarm => {
		if (!alarm)
			chrome.alarms.create("load-data", {periodInMinutes: 5});
	});

	// remove any lingering fetching
	chrome.storage.local.remove("fetching");
});

const db = new Database("wanikani");
db.open("subjects", "id", ["level", "subject_type", "srs_stage"]);

// set settings
const setSettings = () => {
	chrome.storage.local.get(["settings"], result => {
		let settings = result["settings"];
		
		if (!settings)
			settings = defaultSettings;
		else {
			// check if all settings are stored
			const notStored = [];
			Object.keys(defaultSettings).forEach(key => {
				// initialize group if it doesn't exist
				if (typeof settings[key] === 'undefined')
					settings[key] = {};	
				
				(Object.keys(defaultSettings[key]).forEach(innerKey => {
					// if it doesn't exists in settings
					if (typeof settings[key][innerKey] === 'undefined')
						notStored.push([key, innerKey]);
				}));
			});

			// if settings["appearance"] doesn't exist, then initialize it
			if (!Object.keys(settings).includes("appearance"))
				settings["appearance"] = {};
			// only store the missing values a preserve the others
			notStored.forEach(id => settings[id[0]][id[1]] = defaultSettings[id[0]][id[1]]);
		}

		chrome.storage.local.set({"settings":settings}, () => console.log("[SETTINGS] stored."));

		// setup highlighting class value from settings
		highlightingClass = settings["highlight_style"]["learned"];
		notLearnedHighlightingClass = settings["highlight_style"]["not_learned"];
		kanaWriting = settings["miscellaneous"]["kana_writing"];
	});
}
setSettings();

const fetchReviewedKanjiID = async (apiToken, page) => {
	//fetch all reviewed kanji
	return await fetchAllPages(apiToken, page)
		.then(reviews => {
			// return an array of all learned kanji IDs
			return reviews
				.map(content => content.data
					.filter(content => content.data.subject_type === "kanji" && content.data.srs_stage > 0))
				.flat(1)
				.map(content => content.data.subject_id);
		})
		.catch(errorHandling);
}

// transform the kanji IDs into kanji characters
const setupLearnedKanji = async (apiToken, page, kanji) => {
	const ids = await fetchReviewedKanjiID(apiToken, page);
	const learnedKanji = ids.map(id => kanji[id].slug);
	chrome.storage.local.set({"learnedKanji": learnedKanji, "learnedKanji_updated":new Date().toUTCString()});
	return learnedKanji;
}

const setupContentScripts = (apiToken, learnedKanjiSource, allkanji) => {
	console.log("Setting up content scripts...");

	// setup all learnable kanji if not yet
	chrome.storage.local.get(["learnable_kanji"], result => {
		let allLearnableKanji = result["learnable_kanji"];
		const kanjiList = [];
		if (!allLearnableKanji) {
			allLearnableKanji = allkanji;
			for (let kanjiId in allLearnableKanji) {
				kanjiList.push(allLearnableKanji[kanjiId]["slug"]);
			}
			chrome.storage.local.set({"learnable_kanji":kanjiList});
		}
	});

	const scripts = kanji => {
		chrome.storage.local.get(["settings", "learnable_kanji"], result => {
			const settings = result["settings"];

			// inject details popup
			if (settings["kanji_details_popup"]["activated"]) {
				chrome.scripting.executeScript({
					target: {tabId: thisTabId},
					files: ['scripts/details-popup/details-popup.js', 'scripts/details-popup/subject-display.js']
				});
	
				chrome.scripting.insertCSS({
					target: {tabId: thisTabId},
					files: ['styles/subject-display.css'],
				});
			}
	
			if (kanji) {
				// inject highlighter
				chrome.scripting.executeScript({
					target: {tabId: thisTabId},
					files: ['scripts/highlighter/highlight.js']
				}, () => {
					chrome.scripting.insertCSS({
						target: {tabId: thisTabId},
						files: ['styles/highlight.css'],
					});
					chrome.scripting.executeScript({
						target: {tabId: thisTabId},
						files: ['scripts/highlighter/highlight-setup.js']
					}, () => injectedHighlighter = true);
		
					const allKanji = result["learnable_kanji"];
					const notLearnedKanji = allKanji.filter(k => !kanji.includes(k));
					if (allKanji) {
						chrome.storage.local.set({"highlight_setup": {
							functionDelay: functionDelay, 
							learned: kanji,
							notLearned: notLearnedKanji,
							unwantedTags: unwantedTags,
							learnedClass: highlightingClass,
							notLearnedClass: notLearnedHighlightingClass,
						}});
					}
				});
			}
		});
	}

	chrome.storage.local.get(["learnedKanji", "learnedKanji_updated"], async response => {
		const date = response["learnedKanji_updated"];
		const modified = await modifiedSince(apiToken, date, learnedKanjiSource);
		if (!response["learnedKanji"] || modified) {
			setupLearnedKanji(apiToken, learnedKanjiSource, allkanji)
				.then(kanji => scripts(kanji))
				.catch(error => {
					console.log(error);
					scripts(response["learnedKanji"]);
				});
		} else
			scripts(response["learnedKanji"]);

	});
}

tabs.onActivated.addListener(activeInfo => {
	thisTabId = activeInfo["tabId"];
	tabs.get(thisTabId, result => {
		if (result) {
			if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(result["url"])) {
				chrome.storage.local.get(["settings", "blacklist"], result => {
					const blacklist = result["blacklist"];
					const settings = result["settings"];
				
					if (settings["extension_icon"]["kanji_counter"] && injectedHighlighter) {
						tabs.sendMessage(thisTabId, {nmrKanjiHighlighted:"popup"}, response => {
							if (response && response["nmrKanjiHighlighted"])
								chrome.action.setBadgeText({text:response["nmrKanjiHighlighted"].toString(), tabId:thisTabId});
							else
								chrome.action.setBadgeText({text: "0", tabId:thisTabId});
							
							if (!response) {
								// check if the site is blacklisted
								if (!blacklist || blacklist.length === 0 || !blacklisted(blacklist, thisUrl))
									setupContentScripts(apiToken, "https://api.wanikani.com/v2/assignments", allKanjiList);
								else {
									chrome.action.setBadgeText({text: '!', tabId:thisTabId});
									chrome.action.setBadgeBackgroundColor({color: "#dc6560", tabId:thisTabId});
								}
							}
				
							chrome.action.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
	
							tabs.sendMessage(thisTabId, {kanaWriting:kanaWriting});
							
						});
					}
				});
			}
			else {
				chrome.action.setBadgeText({text: "W", tabId:thisTabId});
				chrome.action.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
			}
		}
	});
});

chrome.webNavigation.onDOMContentLoaded.addListener(details => {
	console.log("DOM loaded", details);
	thisTabId = details.tabId;
	const url = details.url;
	if (thisTabId && url) {
		chrome.tabs.get(thisTabId, tab => {
			thisUrl = tab.url;
			if (url === thisUrl && !urlChecker.test(url)) {
				if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url)) {
					chrome.storage.local.get(["settings", "blacklist", "apiKey", "kanji"], result => {
						const settings = result["settings"];

						// check if the site is blacklisted
						if (!result["blacklist"] || result["blacklist"].length === 0 || !blacklisted(result["blacklist"], url)) {
							setSettings();
	
							if (result["apiKey"]) {
								apiToken = result["apiKey"];

								chrome.scripting.executeScript({
									target: {tabId: thisTabId},
									files: ["scripts/kana.js"]
								}, () => tabs.sendMessage(thisTabId, {kanaWriting:kanaWriting}));

								if (settings && settings["miscellaneous"] && settings["miscellaneous"]["kana_writing"]) {
									chrome.scripting.executeScript({
										target: {tabId: thisTabId},
										files: ["scripts/kana-inputs.js"]
									});
								}
			
								if (settings["extension_icon"]["kanji_counter"]) {
									chrome.action.setBadgeText({text: "0", tabId:thisTabId});
									chrome.action.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
								}
				
								if (result["kanji"])
									setupContentScripts(apiToken, "https://api.wanikani.com/v2/assignments", result["kanji"]);
								else {
									chrome.action.setBadgeText({text: "X", tabId:thisTabId});
									chrome.action.setBadgeBackgroundColor({color: "#00aaff", tabId:thisTabId});
								}
							}
						}
						else {
							chrome.action.setBadgeText({text: '!', tabId:thisTabId});
							chrome.action.setBadgeBackgroundColor({color: "#dc6560", tabId:thisTabId});
						}
					});
				}
				else {
					chrome.action.setBadgeText({text: "W", tabId:thisTabId});
					chrome.action.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
				}
			}
		});
	}
});

let highlightUpdateFunction;

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	// sends to the content script information about key pressing and the reference to the highlight update function
	if (request.key)
		tabs.sendMessage(thisTabId, {key: request.key, intervalFunction: highlightUpdateFunction});
	
	// fetch reference to the highlight update function
	if (request.intervalFunction)
		highlightUpdateFunction = request.intervalFunction;

	if (request.popupDetails)
		tabs.sendMessage(thisTabId, {popupDetails: request.popupDetails});

	if (request.badge && sender.url === thisUrl) {
		chrome.storage.local.get("settings", result => {
			if (result["settings"]["extension_icon"]["kanji_counter"]) {
				chrome.action.setBadgeText({text: request.badge.toString(), tabId:thisTabId});
				chrome.action.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
			}
		});
	}

	if (request.imgUrl) {
		sendResponse({imgUrl: imgUrlTest});
		return true;
	}

	if (request.selectedText)
		chrome.contextMenus.update("wkhighlighterSearchKanji", {title: `Search WaniKani for "${request.selectedText}"`});

	if (request.onDisconnect === "reload") {
		if (externalPort)
			externalPort.onDisconnect.addListener(() => chrome.runtime.reload());
	}

	if (request.kanaWriting)
		kanaWriting = request.kanaWriting;


	// DRIVE MESSAGES BACK TO THE POPUP

	// drive the setup progress back to the popup
	if (request.setup) chrome.runtime.sendMessage({setup: request.setup});

	// drive the database progress back to the popup
	if (request.db) chrome.runtime.sendMessage({db: request.db});

	// drive the error message back to the popup
	if (request.error) chrome.runtime.sendMessage({error: request.error});

	// drive loading request back to the popup
	if (request.loading) chrome.runtime.sendMessage({loading: request.loading});


	// LOAD DATA
	if (request.loadData) {
		loadData(request.loadData);
	}
});

chrome.contextMenus.onClicked.addListener(data => {
	let selectedText = data["selectionText"];
	if (data["menuItemId"] == "wkhighlighterSearchKanji" && selectedText) {
		selectedText = selectedText.trim();
		chrome.storage.local.set({contextMenuSelectedText:selectedText});
		chrome.action.setBadgeText({text: '\u2B06', tabId:thisTabId});
		chrome.action.setBadgeBackgroundColor({color: "green", tabId:thisTabId});
		chrome.storage.local.get(["settings"], result => {
			const settings = result["settings"];
			if (settings && settings["notifications"]["searching_a_webpage_word"]) {
				chrome.notifications.create({
					type: "basic",
					title: "Searching with WaniKani Kanji Highlighter",
					message: `Open the extension to search for "${selectedText}"`,
					iconUrl: "../logo/logo.png"
				});
			}
		});
	}
});

chrome.storage.local.get(["settings"], result => {
	const settings = result["settings"];
	if (settings) {
		// new reviews notifications
		chrome.alarms.getAll(alarms => {
			// if there isn't an alarm for next reviews
			if (alarms.filter(alarm => alarm.name === 'next-reviews').length == 0 && settings["notifications"]["new_reviews"])
				chrome.storage.local.get(["reviews"], result => setupReviewsAlarm(result["reviews"]));

			if (alarms.filter(alarm => alarm.name === 'practice').length == 0 && settings["notifications"]["practice_reminder"])
				chrome.storage.local.get(["practice_reminder_timestamp"], result => setupPracticeAlarm(result["practice_reminder_timestamp"]));
		});
	}
});

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === "next-reviews") {
		chrome.storage.local.get(["next-reviews-bundle", "reviews", "apiKey"], result => {
			const reviews = result["reviews"];
			const reviews_bundle = result["next-reviews-bundle"];
			console.log(reviews_bundle);
			if (reviews_bundle && reviews && reviews["count"]) {
				// notify user
				chrome.notifications.create({
					type: "basic",
					title: `WaniKani: ${reviews_bundle.length} new Reviews`,
					message: `You have now ${reviews_bundle.length} more Reviews, a total of ${reviews["count"]+reviews_bundle.length} Reviews.`,
					iconUrl: "../logo/logo.png"
				});
			}

			// setup new alarm
			setupAvailableAssignments(result["apiKey"], setupReviewsAlarm);
		});	
	}

	if (alarm.name === "practice") {
		chrome.storage.local.get(["apiKey", "practice_timestamp"], result => {
			setupAvailableAssignments(result["apiKey"], (reviews, lessons) => {
				if (lessons!==undefined && reviews!==undefined) {
					chrome.notifications.create({
						type: "basic",
						title: "Time to practice your Japanese!",
						message: `Lessons: ${lessons["count"]}  /  Reviews: ${reviews["count"]}`,
						iconUrl: "../logo/logo.png"
					});
				}
			});
		});
	}

	if (alarm.name === "load-data") {
		chrome.storage.local.get(["apiKey", "settings"], result => {
			if (result["apiKey"] && result["settings"] && result["settings"]["miscellaneous"]["background_updates"])
				loadData(result["apiKey"]);
		});
	}

	if (alarm.name === "fetching-timeout") {
		chrome.storage.local.remove("fetching");
	}
});