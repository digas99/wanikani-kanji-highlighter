const tabs = chrome.tabs;
const urlChecker = new RegExp("^(chrome||devtools)(-[a-zA-Z0-9]+)?:\/\/");

// check if tab url is not any type of chrome:// or chrome-___:// or devtools:// with regex
const canInject = tabInfo => (tabInfo.url && !urlChecker.test(tabInfo.url)) || (tabInfo.pendingUrl && !urlChecker.test(tabInfo.pendingUrl));

const multipleScriptExecuter = scriptsInfo => {
	for (const script of scriptsInfo) {
		if (script.result)
			tabs.executeScript(script.tabId, {file: script.name}, () => console.log(script.result));
		else
			tabs.executeScript(script.tabId, {file: script.name});
	}
}

tabs.onCreated.addListener(tab => {
	tabs.get(tab.id, tabInfo => {
		if (canInject(tabInfo)) {
			multipleScriptExecuter([{name: 'highlight.js', result: "Higlighting...", tabId: null}]);
		}
	});
});

tabs.onActivated.addListener(tab => {
	tabs.get(tab.tabId, tabInfo => {
		if (canInject(tabInfo)) {
			multipleScriptExecuter([{name: 'highlight.js', result: "Higlighting...", tabId: null}]);
		}
	});
});

const getDomainAsRegex = url => {
	// if it is chrome: or chrome-__:
	if (/^chrome(-[a-zA-Z0-9]+)?:/.test(url))
		return /^chrome(-[a-zA-Z0-9]+)?:/;
	
	// return domain as www\.domain\.xxx
	return url.split("://")[1].split("/")[0].toString().replace(/\./g, "\\.");
}

tabs.onUpdated.addListener((tabId, changeInfo, tabInfo) => {
	if (canInject(tabInfo)) {
		if (changeInfo.title) {
			// if different page of the same site
			// if (changeInfo.url && new RegExp(getDomainAsRegex(changeInfo.url)).test(lastUrl)) {

			// }
			multipleScriptExecuter([{name: 'highlight.js', result: "Higlighting...", tabId: null}]);
			tabs.insertCSS(null, {file: 'styles.css'});
		}

	}
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.highlighting === "values_request") {
		sendResponse({functionDelay: "1000", values: ["a","e","i","o","u"], unwantedTags: ["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"]});
	}
});