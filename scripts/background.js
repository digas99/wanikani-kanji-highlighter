const tabs = chrome.tabs;
let thisTabId, apiToken;
// highlighting properties
const functionDelay = 20;
let highlightingClass = "";
let notLearnedHighlightingClass = "";

let injectedHighlighter = false;
let externalPort;

let thisUrl;

chrome.runtime.onConnect.addListener(port => externalPort = port);

chrome.runtime.onInstalled.addListener(details => {
	// clear all subjects on extension update
	if (details.reason == "update") {
		console.log("extension updated");
		clearSubjects();
	}
});

let settings;
// set settings
const setSettings = () => {
	chrome.storage.local.get(["wkhighlight_settings"], result => {
		settings = result["wkhighlight_settings"];
		
		if (!settings)
			settings = defaultSettings;
		else {
			// check if all settings are stored
			const notStored = [];
			Object.keys(defaultSettings).forEach(key => {
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

		chrome.storage.local.set({"wkhighlight_settings":settings});

		// setup highlighting class value from settings
		highlightingClass = settings["highlight_style"]["learned"];
		notLearnedHighlightingClass = settings["highlight_style"]["not_learned"];
	});
}
setSettings();

const blacklisted = (blacklist, url) => {
	const regex = new RegExp(`^http(s)?:\/\/(www\.)?(${blacklist.join("|")})(\/)?([a-z]+.*)?`, "g");
	return regex.test(url);
}

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
	const IDs = await fetchReviewedKanjiID(apiToken, page);
	const learnedKanji = IDs.map(id => kanji[id].slug);
	console.log(learnedKanji);
	chrome.storage.local.set({"wkhighlight_learnedKanji": learnedKanji, "wkhighlight_learnedKanji_updated":formatDate(new Date())});
	return learnedKanji;
}

const executeScripts = (scripts, tabId) => scripts.forEach(script => tabs.executeScript(tabId, {file: script}));
const insertStyles = (styles, tabId) => styles.forEach(style => tabs.insertCSS(tabId, {file: style}));

const setupContentScripts = (apiToken, learnedKanjiSource, allkanji) => {
	// setup all learnable kanji if not yet
	console.log("setupContentScripts");
	console.log("source: ", learnedKanjiSource);
	chrome.storage.local.get(["wkhighlight_allLearnableKanji"], result => {
		let allLearnableKanji = result["wkhighlight_allLearnableKanji"];
		const kanjiList = [];
		if (!allLearnableKanji) {
			allLearnableKanji = allkanji;
			for (let kanjiId in allLearnableKanji) {
				kanjiList.push(allLearnableKanji[kanjiId]["slug"]);
			}
			chrome.storage.local.set({"wkhighlight_allLearnableKanji":kanjiList});
		}
	});

	const scripts = kanji => {
		console.log("scripts");
		// inject details popup
		if (settings["kanji_details_popup"]["activated"]) {
			console.log("details-popup");
			executeScripts(['scripts/details-popup/details-popup.js', 'scripts/details-popup/subject-display.js', 'scripts/kana.js'], thisTabId);
			insertStyles(['styles/subject-display.css'], thisTabId);
		}

		// inject highlighter
		tabs.executeScript(thisTabId, {file: 'scripts/highlighter/highlight.js'}, () => {
			insertStyles(['styles/highlight.css'], thisTabId);
			tabs.executeScript(thisTabId, {file: 'scripts/highlighter/highlight-setup.js'}, () => injectedHighlighter = true);

			chrome.storage.local.get(["wkhighlight_allLearnableKanji"], result => {
				const allKanji = result["wkhighlight_allLearnableKanji"];
				const notLearnedKanji = allKanji.filter(k => !kanji.includes(k));
				if (allKanji) {
					chrome.storage.local.set({"wkhighlight_highlight_setup": {
						functionDelay: functionDelay, 
						learned: kanji,
						notLearned: notLearnedKanji,
						unwantedTags: unwantedTags,
						learnedClass: highlightingClass,
						notLearnedClass: notLearnedHighlightingClass,
					}});
				}
			});

			chrome.runtime.lastError;
		});
	}

	chrome.storage.local.get(["wkhighlight_learnedKanji", "wkhighlight_learnedKanji_updated"], response => {
		const date = response["wkhighlight_learnedKanji_updated"] ? response["wkhighlight_learnedKanji_updated"] : formatDate(new Date());
		modifiedSince(apiToken, date, learnedKanjiSource)
			.then(modified => {
				// even if not modified, fetch if learnedKanji not found in storage
				if (!response["wkhighlight_learnedKanji"] || modified) {
					setupLearnedKanji(apiToken, learnedKanjiSource, allkanji)
						.then(kanji => scripts(kanji))
						.catch(errorHandling);
				}
				else {
					scripts(response["wkhighlight_learnedKanji"]);
				}
			})
			.catch(errorHandling);
	});
}

tabs.onActivated.addListener(activeInfo => {
	thisTabId = activeInfo["tabId"];
	tabs.get(thisTabId, result => {
		console.log(thisTabId);
		if (result) {
			if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(result["url"])) {
				if (settings["extension_icon"]["kanji_counter"] && injectedHighlighter) {
					tabs.sendMessage(thisTabId, {nmrKanjiHighlighted:"popup"}, response => {
						console.log(chrome.runtime.lastError);
						if (!chrome.runtime.lastError) {
							console.log(response, response["nmrKanjiHighlighted"]);
							if (response && response["nmrKanjiHighlighted"]) {
								chrome.browserAction.setBadgeText({text:response["nmrKanjiHighlighted"].toString(), tabId:thisTabId});
							}
							else {
								chrome.browserAction.setBadgeText({text: "0", tabId:thisTabId});
							}
				
							chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
						}
						
					});
				}
			}
			else {
				chrome.browserAction.setBadgeText({text: "W", tabId:thisTabId});
				chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
			}
		}
	});
});

chrome.webNavigation.onDOMContentLoaded.addListener(details => {
	thisTabId = details.tabId;
	const url = details.url;
	console.log(thisTabId, url);
	if (thisTabId && url) {
		chrome.tabs.get(thisTabId, tab => {
			thisUrl = tab.url;
			console.log(thisUrl, url);
			if (url === thisUrl && !urlChecker.test(url)) {
				if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url)) {
					chrome.storage.local.get(["wkhighlight_blacklist"], blacklist => {
						// check if the site is blacklisted
						if (!blacklist["wkhighlight_blacklist"] || blacklist["wkhighlight_blacklist"].length === 0 || !blacklisted(blacklist["wkhighlight_blacklist"], url)) {
							setSettings();
	
							chrome.storage.local.get(["wkhighlight_apiKey"], key => {
								if (key["wkhighlight_apiKey"]) {
									apiToken = key["wkhighlight_apiKey"];
				
									if (settings["extension_icon"]["kanji_counter"]) {
										chrome.browserAction.setBadgeText({text: "0", tabId:thisTabId});
										chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
									}
	
									// see if all kanji is already saved in storage
									chrome.storage.local.get(['wkhighlight_allkanji', 'wkhighlight_allkanji_updated', 'wkhighlight_allradicals', 'wkhighlight_allradicals_updated', 'wkhighlight_allvocab', 'wkhighlight_allvocab_updated'], result => {
										const now = formatDate(new Date());
										const kanjiUpdated = result["wkhighlight_allkanji_updated"] ? result["wkhighlight_allkanji_updated"] : now;
										const radicalsUpdated = result["wkhighlight_allradicals_updated"] ? result["wkhighlight_allradicals_updated"] : now;
										const vocabUpdates = result["wkhighlight_allvocab_updated"] ? result["wkhighlight_allvocab_updated"] : now;
										modifiedSince(apiToken, kanjiUpdated, "https://api.wanikani.com/v2/subjects?types=kanji")
											.then(modified => {
												if (!result['wkhighlight_allkanji'] || modified)
													setupKanji(apiToken, "https://api.wanikani.com/v2/subjects?types=kanji", kanji_dict => setupContentScripts(apiToken, "https://api.wanikani.com/v2/assignments", kanji_dict));
												else
													setupContentScripts(apiToken, "https://api.wanikani.com/v2/assignments", result["wkhighlight_allkanji"]);
											});
										
										modifiedSince(apiToken, radicalsUpdated, "https://api.wanikani.com/v2/subjects?types=radical")
											.then(modified => {
												if (!result['wkhighlight_allradicals'] || modified)
													setupRadicals(apiToken, "https://api.wanikani.com/v2/subjects?types=radical");
											});
	
										modifiedSince(apiToken, vocabUpdates, "https://api.wanikani.com/v2/subjects?types=vocabulary")
											.then(modified => {
												if (!result['wkhighlight_allvocab'] || modified)
													setupVocab(apiToken, "https://api.wanikani.com/v2/subjects?types=vocabulary");
											});
									});
	
								}
							});
						}
						else {
							chrome.browserAction.setBadgeText({text: '!', tabId:thisTabId});
							chrome.browserAction.setBadgeBackgroundColor({color: "#dc6560", tabId:thisTabId});
						}
					});
				}
				else {
					chrome.browserAction.setBadgeText({text: "W", tabId:thisTabId});
					chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
					// inject details popup to allow subjects creation
					if (settings["kanji_details_popup"]["activated"]) {
						executeScripts(['scripts/details-popup/details-popup.js', 'scripts/details-popup/subject-display.js', 'scripts/kana.js'], thisTabId);
						insertStyles(['styles/subject-display.css'], thisTabId);
					}
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

	if (request.badge && settings["extension_icon"]["kanji_counter"] && sender.url === thisUrl) {
		console.log(thisUrl, sender.url);
		chrome.browserAction.setBadgeText({text: request.badge.toString(), tabId:thisTabId});
		chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
	}

	if (request.imgUrl)
		sendResponse({imgUrl: imgUrlTest});

	if (request.selectedText)
		chrome.contextMenus.update("wkhighlighterSearchKanji", {title: `Search WaniKani for "${request.selectedText}"`});

	if (request.onDisconnect === "reload") {
		if (externalPort)
			externalPort.onDisconnect.addListener(() => chrome.runtime.reload());

	}
});

const contextMenuItem = {
	id: "wkhighlighterSearchKanji",
	title: "Search With WKHighlighter",
	contexts: ["selection"]
};

chrome.contextMenus.create(contextMenuItem);

chrome.contextMenus.onClicked.addListener(data => {
	let selectedText = data["selectionText"];
	if (data["menuItemId"] == "wkhighlighterSearchKanji" && selectedText) {
		selectedText = selectedText.trim();
		chrome.storage.local.set({wkhighlight_contextMenuSelectedText:selectedText});
		chrome.browserAction.setBadgeText({text: '\u2B06', tabId:thisTabId});
		chrome.browserAction.setBadgeBackgroundColor({color: "green", tabId:thisTabId});
		chrome.storage.local.get(["wkhighlight_settings"], result => {
			const settings = result["wkhighlight_settings"];
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

const setNextReviewsBundle = next_reviews => {
	const next_revs_dates = next_reviews.map(review => new Date(review["available_at"]));
	const next_date = new Date(Math.min.apply(null, next_revs_dates));
	const next_revs = filterAssignmentsByTime(next_reviews, new Date(), next_date);

	chrome.storage.local.set({"wkhighlight_next-reviews-bundle":next_revs});

	return {
		date: next_date,
		reviews: next_revs
	}
}

const setupReviewsAlarm = reviews => {
	if (reviews && reviews["next_reviews"]) {
		const next_date = setNextReviewsBundle(reviews["next_reviews"])["date"];
		if (next_date) {
			// create alarm for the time of the next reviews
			chrome.alarms.create("next-reviews", {
				when: next_date.getTime()
			});
		}
	}
}

const setupPracticeAlarm = time => {
	time = time?.split(":");
	if (time?.length === 2) {
		let date = new Date(setExactHour(new Date(), time[0]).getTime() + time[1]*60000);
		if (date?.getTime() <= new Date().getTime()) date = changeDay(date, 1);
		if (date) {
			chrome.alarms.create("practice", {
				when: date.getTime()
			});
		}
	}
}

chrome.storage.local.get(["wkhighlight_settings"], result => {
	const settings = result["wkhighlight_settings"];
	if (settings) {
		// new reviews notifications
		chrome.alarms.getAll(alarms => {
			// if there isn't an alarm for next reviews
			if (alarms.filter(alarm => alarm.name === 'next-reviews').length == 0 && settings["notifications"]["new_reviews"])
				chrome.storage.local.get(["wkhighlight_reviews"], result => setupReviewsAlarm(result["wkhighlight_reviews"]));

			if (alarms.filter(alarm => alarm.name === 'practice').length == 0 && settings["notifications"]["practice_reminder"])
				chrome.storage.local.get(["wkhighlight_practice_timestamp"], result => setupPracticeAlarm(result["wkhighlight_practice_timestamp"]));
		});
	}
});

chrome.alarms.onAlarm.addListener(alarm => {
	if (alarm.name === "next-reviews") {
		chrome.storage.local.get(["wkhighlight_next-reviews-bundle", "wkhighlight_apiKey"], result => {
			setupAvailableAssignments(result["wkhighlight_apiKey"], (reviews, lessons) => {
				const reviews_bundle = result["wkhighlight_next-reviews-bundle"];
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
				setupAvailableAssignments(result["wkhighlight_apiKey"], setupReviewsAlarm);
			});
		});	
	}

	if (alarm.name === "practice") {
		chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_practice_timestamp"], result => {
			setupAvailableAssignments(result["wkhighlight_apiKey"], (reviews, lessons) => {
				if (lessons!==undefined && reviews!==undefined) {
					chrome.notifications.create({
						type: "basic",
						title: "Time to practice your Japanese!",
						message: `Lessons: ${lessons["count"]}  /  Reviews: ${reviews["count"]}`,
						iconUrl: "../logo/logo.png"
					});
				}
	
				// setup new alarm
				setupPracticeAlarm(result["wkhighlight_practice_timestamp"]);
			});
		});
	}
});