const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");
let thisTabId, apiToken;
// highlighting properties
const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];
const functionDelay = "20";
let highlightingClass = "";

let lastHost = "";
let currentHost = "";
let lastUrl = "";
let currentUrl = "";
let currentPageReloaded = false;
let delayFinished = true;

let injectScripts = false;
let injectedHighlighter = false;

let isBlacklisted = false;
let isWanikani = false;

let settings;
// set settings
const setSettings = () => {
	chrome.storage.local.get(["wkhighlight_settings"], result => {
		settings = result["wkhighlight_settings"];
		if (!settings) {
			settings = {};
			[true, true, "wkhighlighter_highlighted", false, "searchResultOptionlist"].forEach((value, i) => settings[i] = value);
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
	// setup all learnable kanji if not yet
	chrome.storage.local.get(["wkhighlight_allLearnableKanji"], result => {
		let allLearnableKanji = result["wkhighlight_allLearnableKanji"];
		const kanjiList = [];
		if (!allLearnableKanji) {
			allLearnableKanji = allkanji["wkhighlight_allkanji"];
			for (let kanjiId in allLearnableKanji) {
				kanjiList.push(allLearnableKanji[kanjiId]["slug"]);
			}
			chrome.storage.local.set({"wkhighlight_allLearnableKanji":kanjiList});
		}
	});

	const scripts = kanji => {
		tabs.insertCSS(null, {file: 'styles/foreground-styles.css'});

		if (settings["0"])
			tabs.executeScript(null, {file: 'scripts/details-popup.js'}, () => {
				chrome.runtime.lastError;
				tabs.executeScript(null, {file: 'lib/raphael-min.js'}, () => tabs.executeScript(null, {file: 'lib/dmak.js'}, () => tabs.executeScript(null, {file: 'lib/dmakLoader.js'}, () => chrome.runtime.lastError)));
			});

		tabs.executeScript(null, {file: 'scripts/highlight.js'}, () => {
			injectedHighlighter = true;

			chrome.storage.local.get(["wkhighlight_allLearnableKanji"], result => {
				const allKanji = result["wkhighlight_allLearnableKanji"];
				if (allKanji) {
					tabs.sendMessage(thisTabId, {
						functionDelay: functionDelay, 
						values: kanji,
						notLearnedYet: allKanji.filter(k => !kanji.includes(k)),
						unwantedTags: unwantedTags,
						highlightingClass: highlightingClass,
					});
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
					console.log("Fetching learned kanji");
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

// reset kanji per site list
chrome.storage.local.set({"wkhighlight_kanjiPerSite":{}});

tabs.onActivated.addListener(activeInfo => {
	const tabId = activeInfo["tabId"];
	setTimeout(() => {
		if (!window.chrome.runtime.lastError) {
			tabs.get(tabId, response => {
				if (response) {
					if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(response["url"])) {
						if (settings["1"] && injectedHighlighter) {
							tabs.sendMessage(tabId, {nmrKanjiHighlighted:"popup"}, response => {
								if (!window.chrome.runtime.lastError) {
									if (response)
										chrome.browserAction.setBadgeText({text:response["nmrKanjiHighlighted"].toString(), tabId:thisTabId});
								}
								else
									chrome.browserAction.setBadgeText({text: "0", tabId:thisTabId});
					
								chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
							});
						}
					}
					else {
						chrome.browserAction.setBadgeText({text: "W", tabId:thisTabId});
						chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
					}
				}
			});
		}
	}, 200);
});

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	if (canInject(tabInfo)) {
		if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(tabInfo.url)) {
			chrome.storage.local.get(["wkhighlight_blacklist"], blacklist => {
				// check if the site is blacklisted
				if (!blacklist["wkhighlight_blacklist"] || blacklist["wkhighlight_blacklist"].length === 0 || !blacklisted(blacklist["wkhighlight_blacklist"], tabInfo.url)) {
					isBlacklisted = false;
					thisTabId = tabId;
					if (changeInfo.status === "complete") {
						// get info on page host, url and if it was reloaded
						chrome.tabs.sendMessage(tabId, {windowLocation:"host", reloaded:"check", windowHref:"href"}, response => {
							currentHost = response["windowLocation"];
							currentUrl = response["windowHref"];
							currentPageReloaded = response["reloaded"];
							console.log(currentUrl, " reloaded?", currentPageReloaded);
							
							setSettings();
							
							// allow another injection if going to another domain or if the
							// page was reloaded
							if ((lastHost != currentHost || currentPageReloaded) && delayFinished) {
								injectScripts = false;
								// set a delay to prevent multiple injections
								delayFinished = false;
								setTimeout(() => {delayFinished = true;console.log("delayFinished: ", delayFinished);}, 2000);
							}

							chrome.storage.local.get(["wkhighlight_apiKey"], key => {
								if (key["wkhighlight_apiKey"]) {
									apiToken = key["wkhighlight_apiKey"];
				
									if (settings["1"]) {
										chrome.browserAction.setBadgeText({text: "0", tabId:thisTabId});
										chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
									}
									// only run the scripts once
									if (!injectScripts && ((lastHost != currentHost) || (lastUrl == currentUrl))) {
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
																const data = kanji.data;
																kanji_dict[kanji.id] = {
																	"amalgamation_subject_ids" : data.amalgamation_subject_ids,
																	"characters" : data.characters,
																	"component_subject_ids" : data.component_subject_ids,
																	"document_url" : data.document_url,
																	"level" : data.level,
																	"meaning_hint" : data.meaning_hint,
																	"meaning_mnemonic" : data.meaning_mnemonic,
																	"meanings" : data.meanings.map(data => data.meaning),
																	"reading_hint" : data.reading_hint,
																	"reading_mnemonic" : data.reading_mnemonic,
																	"readings" : data.readings,
																	"visually_similar_subject_ids" : data.visually_similar_subject_ids,
																	"slug": data.slug,
																	"id":kanji.id
																};
																kanji_assoc[data.slug] = kanji.id;
															});
														
														setupContentScripts(apiToken, "https://api.wanikani.com/v2/review_statistics", {"wkhighlight_allkanji":kanji_dict});
														// saving all kanji
														chrome.storage.local.set({"wkhighlight_allkanji": kanji_dict, "wkhighlight_kanji_assoc": kanji_assoc});
													})
													.catch(errorHandling);
											}
											else {
												setupContentScripts(apiToken, "https://api.wanikani.com/v2/review_statistics", result);
											}
										
											if (!result['wkhighlight_allradicals']) {
												// fetch all radicals
												fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=radical")
													.then(radical_data => {
														const radical_dict = {};
														radical_data
															.map(content => content.data)
															.flat(1)
															.forEach(radical => {
																const data = radical.data;
																radical_dict[radical.id] = {
																	"characters" : data.characters,
																	"character_images" : data.character_images,
																	"document_url" : data.document_url,
																	"level" : data.level,
																	"id":radical.id
																};
															});
														
														// saving all radical
														chrome.storage.local.set({"wkhighlight_allradicals": radical_dict});
													})
													.catch(errorHandling);
											}
		
											if (!result['wkhighlight_allvocab']) {
												fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=vocabulary")
													.then(vocab => {
														const vocab_dict = {};
														vocab
															.map(content => content.data)
															.flat(1)
															.forEach(vocab => {
																const data = vocab.data;
																vocab_dict[vocab.id] = {
																	"characters" : data.characters,
																	"component_subject_ids" : data.component_subject_ids, 
																	"context_sentences" : data.context_sentences,
																	"document_url" : data.document_url,
																	"level" : data.level,
																	"meaning_mnemonic" : data.meaning_mnemonic,
																	"meanings" : data.meanings.map(data => data.meaning),
																	"parts_of_speech" : data.parts_of_speech,
																	"reading_mnemonic" : data.reading_mnemonic,
																	"readings" : data.readings.map(data => data.reading),
																	"pronunciation_audios" : data.pronunciation_audios,
																	"id":vocab.id
																};
															});
														chrome.storage.local.set({'wkhighlight_allvocab':vocab_dict});
													})
													.catch(errorHandling);
											}
										});

										injectScripts = true;
										lastUrl = currentUrl;
										lastHost = currentHost;
									}
								}
							});
						});
					}
				}
				else {
					isBlacklisted = true;
					chrome.browserAction.setBadgeText({text: '!', tabId:thisTabId});
					chrome.browserAction.setBadgeBackgroundColor({color: "#dc6560", tabId:thisTabId});
				}
			});
		}
		else {
			isWanikani = true;
			chrome.browserAction.setBadgeText({text: "W", tabId:thisTabId});
			chrome.browserAction.setBadgeBackgroundColor({color: "#f100a1", tabId:thisTabId});
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
		chrome.browserAction.setBadgeText({text: request.badge.toString(), tabId:thisTabId});
		chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:thisTabId});
	}

	if (request.imgUrl)
		sendResponse({imgUrl: imgUrlTest});

	if (request.selectedText)
		chrome.contextMenus.update("wkhighlighterSearchKanji", {title: `Search WaniKani for "${request.selectedText}"`});
	
	if (request.leavingSite) {
		// if leaving website, remove its entry with kanji in storage
		chrome.storage.local.get(["wkhighlight_kanjiPerSite"], result => {
			const kanjiPerSite = result["wkhighlight_kanjiPerSite"];
			if (kanjiPerSite) {
				let aux = {};
				for (let url in kanjiPerSite) {
					if (url != request.leavingSite)
						aux[url] = kanjiPerSite[url];
				}
				chrome.storage.local.set({"wkhighlight_kanjiPerSite":aux});
			}
		});
	}

	// inject scripts again
	if (request.forceScriptInjection && !isBlacklisted && !isWanikani) {
		chrome.storage.local.get(['wkhighlight_allkanji'], result => {
			const allKanji = result["wkhighlight_allkanji"];
			if (allKanji) {
				console.log("forcing injection");
				setupContentScripts(apiToken, "https://api.wanikani.com/v2/review_statistics", allKanji);
			}
		});
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
		chrome.notifications.create({
			type: "basic",
			title: "Searching with WaniKani Kanji Highlighter",
			message: `Open the extension to search for "${selectedText}"`,
			iconUrl: "../logo/logo.png"
		});
	}
});