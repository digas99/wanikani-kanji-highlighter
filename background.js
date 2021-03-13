const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");
let thisTabId;

// check if tab url is not any type of chrome:// or chrome-___:// or devtools:// with regex
const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

// const multipleScriptExecuter = scriptsInfo => {
// 	for (const script of scriptsInfo) {
// 		if (script.result)
// 			tabs.executeScript(script.tabId, {file: script.name}, () => console.log(script.result));
// 		else
// 			tabs.executeScript(script.tabId, {file: script.name});
// 	}
// }

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

// const getDomainAsRegex = url => {
// 	// if it is chrome: or chrome-__:
// 	if (/^chrome(-[a-zA-Z0-9]+)?:/.test(url))
// 		return /^chrome(-[a-zA-Z0-9]+)?:/;
	
// 	// return domain as www\.domain\.xxx
// 	return url.split("://")[1].split("/")[0].toString().replace(/\./g, "\\.");
// }

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	console.log("INFO", tabInfo);
	if (canInject(tabInfo)) {
		thisTabId = tabId;
		if (changeInfo.status === "complete") {
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