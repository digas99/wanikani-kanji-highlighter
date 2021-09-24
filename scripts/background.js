const tabs = chrome.tabs;
let thisTabId, apiToken;
// highlighting properties
const functionDelay = "20";
let highlightingClass = "";
let notLearnedHighlightingClass = "";

let injectedHighlighter = false;

let settings;
// set settings
const setSettings = () => {
	chrome.storage.local.get(["wkhighlight_settings"], result => {
		settings = result["wkhighlight_settings"];
		
		if (!settings)
			settings = defaultSettings;
		else {
			// check if all settings are stored
			notStored = [];
			Object.keys(defaultSettings).map(key => {
				(Object.keys(defaultSettings[key]).map(innerKey => {
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
		console.log("scripts");
		if (settings["kanji_details_popup"]["activated"])
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
						notLearnedHighlightingClass: notLearnedHighlightingClass
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
						if (settings["extension_icon"]["kanji_counter"] && injectedHighlighter) {
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

chrome.webNavigation.onDOMContentLoaded.addListener(details => {
	thisTabId = details.tabId;
	const url = details.url;
	if (thisTabId && url) {
		if (!urlChecker.test(url)) {
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
								chrome.storage.local.get(['wkhighlight_allkanji', 'wkhighlight_allradicals', 'wkhighlight_allvocab'], result => {
									const now = new Date();
									modifiedSince(apiToken, now, "https://api.wanikani.com/v2/subjects?types=kanji")
										.then(modified => {
											if (!result['wkhighlight_allkanji'] || modified) {
												// fetch all kanji
												fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=kanji")
													.then(kanji_data => {
														const kanji_dict = {};
														const kanji_assoc = {};
														kanji_data.map(content => content.data)
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
																	"id":kanji.id,
																	"subject_type":kanji.object
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
										});
									
									modifiedSince(apiToken, now, "https://api.wanikani.com/v2/subjects?types=radical")
										.then(modified => {
											if (!result['wkhighlight_allradicals'] || modified) {
												// fetch all radicals
												fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=radical")
													.then(radical_data => {
														const radical_dict = {};
														radical_data.map(content => content.data)
															.flat(1)
															.forEach(radical => {
																const data = radical.data;
																radical_dict[radical.id] = {
																	"characters" : data.characters,
																	"character_images" : data.character_images,
																	"document_url" : data.document_url,
																	"level" : data.level,
																	"id":radical,
																	"meanings": data.meanings.map(data => data.meaning),
																	"subject_type":radical.object
																};
															});

														// saving all radical
														chrome.storage.local.set({"wkhighlight_allradicals": radical_dict});
													})
													.catch(errorHandling);
											}
										});

									modifiedSince(apiToken, now, "https://api.wanikani.com/v2/subjects?types=vocabulary")
										.then(modified => {
											if (!result['wkhighlight_allvocab'] || modified) {
												fetchAllPages(apiToken, "https://api.wanikani.com/v2/subjects?types=vocabulary")
													.then(vocab => {
														const vocab_dict = {};
														vocab.map(content => content.data)
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
																	"id":vocab.id,
																	"subject_type":vocab.object
																};
															});
														chrome.storage.local.set({'wkhighlight_allvocab':vocab_dict});
													})
													.catch(errorHandling);
											}
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
			}
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

	if (request.badge && settings["extension_icon"]["kanji_counter"]) {
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

const setupReviewsAlarm = () => {
	// get date of next reviews and number of next reviews
	chrome.storage.local.get("wkhighlight_reviews", result => {
		let revs = result["wkhighlight_reviews"];
		if (revs && revs["next_reviews"]) {
			const next_date = setNextReviewsBundle(revs["next_reviews"])["date"];

			if (next_date) {
				// create alarm for the time of the next reviews
				chrome.alarms.create("next-reviews", {
					when: next_date.getTime()
				});
			}
		}
	});
}

chrome.alarms.getAll(alarms => {
	// if there isn't an alarm for next reviews active
	if (alarms.length == 0)
		setupReviewsAlarm();
});

chrome.alarms.onAlarm.addListener(alarm => {
	console.log(alarm);
	chrome.storage.local.get(["wkhighlight_reviews", "wkhighlight_next-reviews-bundle"], result => {
		const reviews = result["wkhighlight_reviews"];
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
		//setupReviewsAlarm();
	});
});