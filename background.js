const tabs = chrome.tabs;

// get tab and window id
tabs.onActivated.addListener(tab => {
	// get info of the tab with tabId
	tabs.get(tab.tabId, tab_info => {
		// check if tab url is from https://www.google.com with regex
		if (/^https:\/\/www\.google/.test(tab_info.url)) {
			// inject foreground script (null: active tab)
			tabs.executeScript(null, {file: 'foreground.js'}, () => console.log("injected"));
		}
	});
});