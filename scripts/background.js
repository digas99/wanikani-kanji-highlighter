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

	if (details.reason == "update") {
		// clear all subjects on extension update if the major version begins with 0
		if (details.previousVersion.split('.')[0] == '0') {
			clearSubjects();
			chrome.storage.local.set({"initialFetch": true});
		}
		// update database values
		else if (details.previousVersion < '1.2.2') {
			// remove deprecated subjects from chrome storage
			chrome.storage.local.remove([
				"kana_vocabulary",
				"kanji",
				"radical",
				"radicals",
				"vocabulary"
			]);
			chrome.storage.local.get(["apiKey"], result => {
				triggerSubjectsUpdate(result["apiKey"]);
			});
		}
		else if (details.previousVersion < '1.2.7') {
			chrome.storage.local.remove("kanji_updated")
		}
		else if (details.previousVersion < '1.4.0') {
			chrome.storage.local.remove("radicals_updated");
		}
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

const setupContentScripts = () => {
	console.log("Setting up content scripts...");

	chrome.storage.local.get(["settings", "learnable_kanji", "learnedKanji"], async response => {
		const settings = response["settings"];

		// inject details popup
		if (settings["kanji_details_popup"]["activated"]) {
			const subjectDrawing = settings["kanji_details_popup"]["subject_drawing"] ? [
				'/lib/raphael-min.js',
				'/lib/dmak.js',
				'/lib/dmakLoader.js',
			] : [];

			chrome.scripting.executeScript({
				target: {tabId: thisTabId},
				files: [
					'/scripts/details-popup/details-popup.js',
					'/scripts/details-popup/subject-display.js',
					...subjectDrawing
				]
			});

			chrome.scripting.insertCSS({
				target: {tabId: thisTabId},
				files: ['styles/subject-display.css'],
			});
		}

		const learnedKanji = response["learnedKanji"];
		if (learnedKanji) {
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
	
				const allKanji = response["learnable_kanji"];
				const notLearnedKanji = allKanji.filter(k => !learnedKanji.includes(k));
				if (allKanji) {
					chrome.storage.local.set({"highlight_setup": {
						functionDelay: functionDelay, 
						learned: learnedKanji,
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
									setupContentScripts();
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
	thisTabId = details.tabId;
	const url = details.url;
	if (thisTabId && url) {
		chrome.tabs.get(thisTabId, tab => {
			thisUrl = tab.url;
			if (url === thisUrl && !urlChecker.test(url)) {
				if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url)) {
					chrome.storage.local.get(["settings", "blacklist", "apiKey"], result => {
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
				
								setupContentScripts();
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

	if (request.selectedText)
		chrome.contextMenus.update("wkhighlighterSearchKanji", {title: `Search WaniKani for "${request.selectedText}"`});

	if (request.onDisconnect === "reload") {
		if (externalPort)
			externalPort.onDisconnect.addListener(() => chrome.runtime.reload());
	}

	if (request.kanaWriting)
		kanaWriting = request.kanaWriting;

	if (request.fetchSubjects) {
		(async () => {
			const db = new Database("wanikani");
			const opened = await db.open("subjects");
			console.log(request);
			if (opened && request.fetchSubjects) {
				const subjects = await db.getAll("subjects", "id", request.fetchSubjects);
				sendResponse(subjects);
			}
		})();

		return true;
	}
	// DRIVE MESSAGES BACK TO THE POPUP

	// drive the setup progress back to the popup
	if (request.setup) chrome.runtime.sendMessage({setup: request.setup});

	// drive the database progress back to the popup
	if (request.db) chrome.runtime.sendMessage({db: request.db});

	// drive the error message back to the popup
	if (request.error) chrome.runtime.sendMessage({error: request.error});

	// drive loading request back to the popup
	if (request.loading) chrome.runtime.sendMessage({loading: request.loading});

	// get style sheet file
	if (request.styleSheet) {
		fetch(`/styles/${request.styleSheet}`)
			.then(response => response.text())
			.then(text => sendResponse(text));
		return true;
	}

	// get script file
	if (request.script) {
		fetch(`/scripts/${request.script}`)
			.then(response => response.text())
			.then(text => sendResponse(text));
		return true;
	}

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