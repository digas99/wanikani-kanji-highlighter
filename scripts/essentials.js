chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.reloadPage)
		window.location.reload();

	if (request.windowLocation === "host")
		sendResponse({windowLocation: window.location.host});

	if (request.windowLocation === "origin")
		sendResponse({windowLocation: window.location.origin});
});