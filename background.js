const tabs = chrome.tabs;

// get tab and window id
tabs.onActivated.addListener(tab => {
	// get info of the tab with tabId
	tabs.get(tab.tabId, tabInfo => {
		const url = tabInfo.url;
		//if (!/^chrome:\//.test(url) || !/^chrome-extension:\//.test(url)) {
		// check if tab url is not any type of chrome:/ or chrome-___:/ with regex
		if (!/^chrome(-[a-zA-Z0-9]+)?:\//.test(url)) {
			// inject some css and foreground script (null: active tab)
			tabs.insertCSS(null, {file: 'styles.css'});
			tabs.executeScript(null, {file: 'foreground.js'}, () => console.log("injected"));
		}
	});
});