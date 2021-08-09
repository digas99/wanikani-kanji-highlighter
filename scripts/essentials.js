chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	let response = {};

	if (request.reloadPage)
		window.location.reload();

	if (request.windowHref === "href")
		response["windowHref"] = window.location.href;

	if (request.windowLocation === "host")
		response["windowLocation"] = window.location.host;

	if (request.windowLocation === "origin")
		response["windowLocation"] = window.location.origin;

	// check if page was reloaded
	if (request.reloaded) {
		response["reloaded"] = sessionStorage.getItem("is_reloaded") ? true : false;
		// store flag to indicate the page was reloaded
		sessionStorage.setItem("is_reloaded", true);
	}

	sendResponse(response);
});

window.onbeforeunload = () => {
	chrome.runtime.sendMessage({leavingSite:window.location.href});
}

// check if highlight.js and details-popup.js are not injected
setTimeout(() => {
	try {
		// check for the scripts global flags
		injectedHighlight;
		injectedDetailsPopup;
	} catch(e) {
		// if not injected, then force injection
		chrome.runtime.sendMessage({forceScriptInjection:"all"});
	} 
}, 3000);

// setup css vars
chrome.storage.local.get("wkhighlight_settings", result => {
	const settings = result["wkhighlight_settings"];
	if (settings) {
		const appearance = settings["appearance"];
		document.documentElement.style.setProperty('--highlight-default-color', appearance["highlight_learned"]);
		document.documentElement.style.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
		document.documentElement.style.setProperty('--default-color', appearance["details_popup"]);
		document.documentElement.style.setProperty('--radical-tag-color', appearance["radical_color"]);
		document.documentElement.style.setProperty('--kanji-tag-color', appearance["kanji_color"]);
		document.documentElement.style.setProperty('--vocab-tag-color', appearance["vocab_color"]);
	}
});