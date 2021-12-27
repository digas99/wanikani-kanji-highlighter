chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

	if (request.reloadPage)
		window.location.reload();

	if (request.windowHref === "href")
		sendResponse({windowHref:window.location.href});

	if (request.windowLocation === "host")
		sendResponse({windowLocation:window.location.host});

	if (request.windowLocation === "origin")
		sendResponse({windowLocation:window.location.origin});

	// check if page was reloaded
	if (request.reloaded) {
		sendResponse({reloaded:sessionStorage.getItem("is_reloaded") ? true : false});
		// store flag to indicate the page was reloaded
		sessionStorage.setItem("is_reloaded", true);
	}
});

window.onbeforeunload = () => {
	chrome.runtime.sendMessage({leavingSite:window.location.href});
}

// setup css vars
chrome.storage.local.get("wkhighlight_settings", result => {
	const settings = result["wkhighlight_settings"];
	if (settings) {
		const appearance = settings["appearance"];
		const documentStyle = document.documentElement.style;
		documentStyle.setProperty('--highlight-default-color', appearance["highlight_learned"]);
		documentStyle.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
		documentStyle.setProperty('--default-color', appearance["details_popup"]);
		documentStyle.setProperty('--radical-tag-color', appearance["radical_color"]);
		documentStyle.setProperty('--kanji-tag-color', appearance["kanji_color"]);
		documentStyle.setProperty('--vocab-tag-color', appearance["vocab_color"]);
		Object.values(srsStages).map(srs => srs["short"].toLowerCase())
			.forEach(srs => documentStyle.setProperty(`--${srs}-color`, appearance[`${srs}_color`]));
	}
});


document.addEventListener("click", () => {
	chrome.runtime.sendMessage({selectedText: window.getSelection().toString().trim()});
});