chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.reloadPage)
		window.location.reload();
});