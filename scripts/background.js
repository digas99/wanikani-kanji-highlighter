const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");
let thisTabId, apiToken;
// highlighting properties
const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];
const functionDelay = "2000";
let highlightingClass = "";

let injectedHighlighter = false;

let settings;
// set settings
const setSettings = () => {
	chrome.storage.local.get(["wkhighlight_settings"], result => {
		settings = result["wkhighlight_settings"];
		if (!settings) {
			settings = {};
			[true, true, "wkhighlighter_highlighted"].forEach((value, i) => settings[i] = value);
		}
		// setup highlighting class value from settings
		highlightingClass = settings[2];

		chrome.storage.local.set({"wkhighlight_settings":settings});
	});
}
setSettings();

const blacklisted = (blacklist, url) => {
	const regex = new RegExp(`^http(s)?:\/\/(www\.)?(${blacklist.join("|")})(\/)?([a-z]+.*)?`, "g");
	return regex.test(url);
}

// check if tab url is not any type of chrome:// or chrome-___:// or devtools:// with regex
const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

const fetchReviewedKanjiID = async (apiToken, page) => {
	//fetch all reviewed kanji
	return await fetchAllPages(apiToken, page)
		.then(reviews => {
			// return an array of all learned kanji IDs
			return reviews
				.map(content => content.data
					.filter(content => content.data.subject_type === "kanji"))
				.flat(1)
				.map(content => content.data.subject_id);
		})
		.catch(errorHandling);
}

// transform the kanji IDs into kanji characters
const setupLearnedKanji = async (apiToken, page, kanji) => {
	const IDs = await fetchReviewedKanjiID(apiToken, page);
	const learnedKanji = IDs.map(id => kanji["wkhighlight_allkanji"][id].slug);
	chrome.storage.local.set({"wkhighlight_learnedKanji": learnedKanji, "wkhighlight_learnedKanji_updated":formatDate(new Date())});
	return learnedKanji;
}

const setupContentScripts = (apiToken, learnedKanjiSource, allkanji) => {
	console.log("CONTENT SCRIPTS");
	const scripts = kanji => {
		tabs.insertCSS(null, {file: 'styles/foreground-styles.css'});
		if (settings["0"]) {
			tabs.executeScript(null, {file: 'scripts/details-popup.js'}, () => chrome.runtime.lastError);
		}
		tabs.executeScript(null, {file: 'scripts/highlight.js'}, () => {
			injectedHighlighter = true;
			console.log("injecting");
			tabs.sendMessage(thisTabId, {
				functionDelay: functionDelay, 
				values: kanji,
				unwantedTags: unwantedTags,
				highlightingClass: highlightingClass
			});
			chrome.runtime.lastError;
		});
	}

	chrome.storage.local.get(["wkhighlight_learnedKanji", "wkhighlight_learnedKanji_updated"], response => {
		const date = response["wkhighlight_learnedKanji_updated"] ? response["wkhighlight_learnedKanji_updated"] : formatDate(new Date());
		modifiedSince(apiToken, date, learnedKanjiSource)
			.then(modified => {
				if (!response["wkhighlight_learnedKanji"] || modified) {
					setupLearnedKanji(apiToken, learnedKanjiSource, allkanji)
						.then(kanji => scripts(kanji))
						.catch(errorHandling);
				}
				else
					scripts(response["wkhighlight_learnedKanji"]);
			})
			.catch(errorHandling);
	});
	
}

tabs.onActivated.addListener(activeInfo => {
	const tabId = activeInfo["tabId"];
	chrome.tabs.get(tabId, response => {
		console.log(response["url"]);
		if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(response["url"])) {
			if (settings["1"] && injectedHighlighter) {
				tabs.sendMessage(tabId, {nmrKanjiHighlighted:"popup"}, response => {
					if (!window.chrome.runtime.lastError) {
						if (response) {
							const value = response["nmrKanjiHighlighted"];
							chrome.browserAction.setBadgeText({text:value >= 99 ? "99" : value.toString()});
						}
					}
					else
						chrome.browserAction.setBadgeText({text: "0"});
		
					chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1"});
				});
			}
		}
		else {
			chrome.browserAction.setBadgeText({text: "W"});
			chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1"});
		}
	});
});

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	if (canInject(tabInfo)) {
		if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(tabInfo.url)) {
			setSettings();
			chrome.storage.local.get(["wkhighlight_blacklist"], blacklist => {
				// check if the site is blacklisted
				if (!blacklist["wkhighlight_blacklist"] || blacklist["wkhighlight_blacklist"].length === 0 || !blacklisted(blacklist["wkhighlight_blacklist"], tabInfo.url)) {
					thisTabId = tabId;
					console.log(changeInfo);
					if (changeInfo.status === "complete") {
						chrome.storage.local.get(["wkhighlight_apiKey"], key => {
							if (key["wkhighlight_apiKey"]) {
								apiToken = key["wkhighlight_apiKey"];
			
								if (settings["1"]) {
									chrome.browserAction.setBadgeText({text: "0"});
									chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1"});
								}
								
								// see if all kanji is already saved in storage
								chrome.storage.local.get(['wkhighlight_allkanji', 'wkhighlight_allradicals'], result => {
									// do this only if all the kanji hasn't been saved yet
									if (!result['wkhighlight_allkanji']) {
										// fetch all kanji
										fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=kanji")
											.then(kanji_data => {
												const kanji_dict = {};
												const kanji_assoc = {};
												kanji_data
													.map(content => content.data)
													.flat(1)
													.forEach(kanji => {
														kanji_dict[kanji.id] = kanji.data;
														kanji_assoc[kanji.data.slug] = kanji.id;
													});
												
												setupContentScripts(apiToken, "https://api.wanikani.com/v2/review_statistics", {"wkhighlight_allkanji":kanji_dict});
			
												// saving all kanji
												chrome.storage.local.set({"wkhighlight_allkanji": kanji_dict, "wkhighlight_kanji_assoc": kanji_assoc});
											})
											.catch(errorHandling);
									}
									else
										setupContentScripts(apiToken, "https://api.wanikani.com/v2/review_statistics", result)
								
									if (!result['wkhighlight_allradicals']) {
										// fetch all radicals
										fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=radical")
											.then(radical_data => {
												const radical_dict = {};
												radical_data
													.map(content => content.data)
													.flat(1)
													.forEach(radical => {
														radical_dict[radical.id] = radical.data;
													});
												
												// saving all radical
												chrome.storage.local.set({"wkhighlight_allradicals": radical_dict});
											})
											.catch(errorHandling);
									}
								});
							}
						});
					}
				}
				else {
					chrome.browserAction.setBadgeText({text: '!'});
					chrome.browserAction.setBadgeBackgroundColor({color: "#dc6560"});
				}
			});
		}
		else {
			chrome.browserAction.setBadgeText({text: "W"});
			chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1"});
		}
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

	if (request.badge && settings["1"]) {
		chrome.browserAction.setBadgeText({text: request.badge.toString()});
		chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1"});
	}
});