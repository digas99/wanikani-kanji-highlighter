const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");
let thisTabId;

// check if tab url is not any type of chrome:// or chrome-___:// or devtools:// with regex
const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

tabs.onCreated.addListener(tab => {
	tabs.get(tab.id, tabInfo => {
		if (canInject(tabInfo)) {
			thisTabId = tab.id;
			tabs.executeScript(null, {file: 'highlight.js'}, () => {
				console.log("Higlighting...");
				tabs.sendMessage(thisTabId, {
					functionDelay: "2000", 
					values: ["a","e","i","o","u"],
					unwantedTags: ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"],
					highlightingClass: "wkhighlighter_highlighted"
				});
			});
		}
	});
});

const apiToken = '27691352-eeae-48fb-ad3a-3c8bb6627528';

// fetch a single page from the WaniKani API
async function fetchPage(apiToken, page) {				
	const requestHeaders = new Headers({Authorization: `Bearer ${apiToken}`});
	let apiEndpoint = new Request(page, {
		method: 'GET',
		headers: requestHeaders
	});

	try {
		return await fetch(apiEndpoint)
			.then(response => response.json())
			.then(responseBody => responseBody)
			.catch(error => console.log(error));
	} catch(e) {
		console.log(e);
	}
}

// recursive function to fetch all pages after a given page (given page included)
async function fetchAllPages(apiToken, page) {
	if (!page)
		return [];

	const result = await fetchPage(apiToken, page);
	return [result].concat(await fetchAllPages(apiToken, result.pages.next_url));
}

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	//console.log("INFO", tabInfo);
	if (canInject(tabInfo)) {
		thisTabId = tabId;
		if (changeInfo.status === "complete") {

			// fetch all review statistics
			fetchAllPages(apiToken, "https://api.wanikani.com/v2/review_statistics")
				.then(reviews => {
					const kanjiLearned = (reviews
						.map(content => content.data
							.filter(content => content.data.subject_type === "kanji"))).flat(1);
					console.log(kanjiLearned);
				})
				.catch(error => console.log(error));
			
			tabs.executeScript(null, {file: 'highlight.js'}, () => {
				console.log("Higlighting...");
				tabs.sendMessage(thisTabId, {
					functionDelay: "2000", 
					values: ["a","e","i","o","u"],
					unwantedTags: ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"],
					highlightingClass: "wkhighlighter_highlighted"
				});
			});
			tabs.insertCSS(null, {file: 'styles.css'});
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
});