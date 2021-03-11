const tabs = chrome.tabs;
let injected = false;

tabs.onActivated.addListener((tab) => {
	// get info of the tab with tabId
	tabs.get(tab.tabId, tabInfo => {
		console.log(tabInfo.url);
		if (!/^chrome(-[a-zA-Z0-9]+)?:\/\//.test(tabInfo.url)) {
			tabs.executeScript(null, {file: 'variables.js'}, () => console.log("Setting variables..."));
			tabs.executeScript(null, {file: 'highlight.js'}, () => console.log("Higlighting..."));
		}
	});
});

// get tab and window id
tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	// check if tab url is not any type of chrome:/ or chrome-___:/ with regex
	if (!/^chrome(-[a-zA-Z0-9]+)?:\/\//.test(tabInfo.url)) {
		if (!injected) {
			tabs.executeScript(null, {file: 'variables.js'}, () => console.log("Setting variables..."));
			tabs.executeScript(null, {file: 'highlight.js'}, () => console.log("Higlighting..."));
			injected = true;
		}
		// inject some css (null: active tab)
		tabs.insertCSS(null, {file: 'styles.css'});
	}
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.exiting === "true") {
		injected = false;
	}

	if (request.highlighting === "values_request") {
		sendResponse({functionDelay: "3000", value: "a"});
	}
});