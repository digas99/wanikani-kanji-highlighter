chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.uptimeDetailsPopup || request.uptimeHighlight) {
		const wrapper = document.getElementById("scriptsUptime");
		if (wrapper) {
			if (request.uptimeHighlight) 
				wrapper.getElementsByTagName("DIV")[0].style.backgroundColor = "#80fd80";

			if (request.uptimeDetailsPopup) 
				wrapper.getElementsByTagName("DIV")[1].style.backgroundColor = "#80fd80";
		}
	}
});