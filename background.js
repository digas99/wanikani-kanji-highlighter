const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");
let thisTabId;

// highlighting properties
const unwantedTags = ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"];
const functionDelay = "2000";
const highlightingClass = "wkhighlighter_highlighted";

const errorHandling = error => console.log(error);

// check if tab url is not any type of chrome:// or chrome-___:// or devtools:// with regex
const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

// tabs.onCreated.addListener(tab => {
// 	tabs.get(tab.id, tabInfo => {
// 		if (canInject(tabInfo)) {
// 			thisTabId = tab.id;
// 			tabs.executeScript(null, {file: 'highlight.js'}, () => {
// 				console.log("Higlighting...");
// 				tabs.sendMessage(thisTabId, {
// 					functionDelay: functionDelay, 
// 					values: ["a","e","i","o","u"],
// 					unwantedTags: unwantedTags,
// 					highlightingClass: highlightingClass
// 				});
// 			});
// 		}
// 	});
// });

const apiToken = '27691352-eeae-48fb-ad3a-3c8bb6627528';

// fetch a single page from the WaniKani API
const fetchPage = async (apiToken, page) => {				
	const requestHeaders = new Headers({Authorization: `Bearer ${apiToken}`});
	let apiEndpoint = new Request(page, {
		method: 'GET',
		headers: requestHeaders
	});

	try {
		return await fetch(apiEndpoint)
			.then(response => response.json())
			.then(responseBody => responseBody)
			.catch(errorHandling);
	} catch(e) {
		console.log(e);
	}
}

// recursive function to fetch all pages that come after a given page (given page included)
const fetchAllPages = async (apiToken, page) => {
	if (!page)
		return [];

	const result = await fetchPage(apiToken, page);
	return [result].concat(await fetchAllPages(apiToken, result.pages.next_url));
}

const fetchReviewedKanjiID = async (apiToken, page) => {
	//fetch all reviewed kanji
	console.log("Loading reviews...");
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
	return IDs.map(id => kanji["wkhighlight_allkanji"][id].slug);
}

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	//console.log("INFO", tabInfo);
	if (canInject(tabInfo)) {
		thisTabId = tabId;
		if (changeInfo.status === "complete") {
			console.log("Loading user information...");
			fetchPage(apiToken, "https://api.wanikani.com/v2/user")
				.then(user => {
					console.log("User: ", user.data.username);
					// guarantee the Subscription Restrictions (incomplete)
					if (user.data.subscription.active) {
						console.log("User's subscription is activated!");
						// see if all kanji is already saved in storage
						chrome.storage.local.get(['wkhighlight_allkanji'], result => {
							// do this only if all the kanji hasn't been saved yet
							if (Object.keys(result).length === 0) {
								console.log("Saving all kanji info...");
								
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
										// saving all kanji
										chrome.storage.local.set({"wkhighlight_allkanji": kanji_dict, "wkhighlight_kanji_assoc": kanji_assoc}, message => {
											if (!message)
												console.log("Kanji saved in storage.")
											else
												console.log("Kanji couldn't be saved in storage! ", message);
										});
									})
									.catch(errorHandling);
							}
						});
					
						// load all kanji from storage
						console.log("Loading all kanji...");
						chrome.storage.local.get(["wkhighlight_allkanji"], result => {

							setupLearnedKanji(apiToken, "https://api.wanikani.com/v2/review_statistics", result)
								.then(kanji => {
									tabs.insertCSS(null, {file: 'styles.css'});
									tabs.executeScript(null, {file: 'details-popup.js'});
									tabs.executeScript(null, {file: 'highlight.js'}, () => {
										tabs.sendMessage(thisTabId, {
											functionDelay: functionDelay, 
											values: kanji,
											unwantedTags: unwantedTags,
											highlightingClass: highlightingClass
										});
										console.log("Higlighting...");
									});
								})
								.catch(errorHandling);

						});
					}
				})
				.catch(errorHandling);
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
});