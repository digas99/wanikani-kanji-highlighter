chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log(request);
	if (request.reloadPage) {
		console.log("reload");
		window.location.reload();
	}
});