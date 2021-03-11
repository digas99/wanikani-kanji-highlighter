const tabs = chrome.tabs;
const urlChecker = new RegExp("^chrome(-[a-zA-Z0-9]+)?:\/\/");
let injected = false;

const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

const multipleScriptExecuter = scriptsInfo => {
	for (const script of scriptsInfo) {
		if (script.result)
			tabs.executeScript(null, {file: script.name}, () => console.log(script.result));
		else
			tabs.executeScript(null, {file: script.name});
	}
}

tabs.onCreated.addListener(tab => {
	// get info of the tab with tabId
	console.log(tab)
	tabs.get(tab.id, tabInfo => {
		console.log(tabInfo);
		console.log(tabInfo.url);
	if (canInject(tabInfo))
			multipleScriptExecuter([{name: 'injection_control.js'}, {name: 'variables.js', result: "Setting variables......"}, {name: 'highlight.js', result: "Higlighting..."}]);
	});
});

tabs.onActivated.addListener(tab => {
	// get info of the tab with tabId
	console.log(tab)
	tabs.get(tab.tabId, tabInfo => {
		console.log(tabInfo);
		console.log(tabInfo.url);
	if (canInject(tabInfo))
			multipleScriptExecuter([{name: 'injection_control.js'}, {name: 'highlight.js', result: "Higlighting..."}]);
	});
});

// get tab and window id
tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	// check if tab url is not any type of chrome:/ or chrome-___:/ with regex
	console.log(tabInfo.url);
	if (canInject(tabInfo)) {
		if (!injected) {
			multipleScriptExecuter([{name: 'injection_control.js'}, {name: 'variables.js', result: "Setting variables......"}, {name: 'highlight.js', result: "Higlighting..."}]);
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