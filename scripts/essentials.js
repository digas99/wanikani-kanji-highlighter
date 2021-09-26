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

	// sendResponse(response);
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
		documentStyle.setProperty('--lkd-color', appearance["lkd_color"]);
		documentStyle.setProperty('--ap1-color', appearance["ap1_color"]);
		documentStyle.setProperty('--ap2-color', appearance["ap2_color"]);
		documentStyle.setProperty('--ap3-color', appearance["ap3_color"]);
		documentStyle.setProperty('--ap4-color', appearance["ap4_color"]);
		documentStyle.setProperty('--gr1-color', appearance["gr1_color"]);
		documentStyle.setProperty('--gr2-color', appearance["gr2_color"]);
		documentStyle.setProperty('--mst-color', appearance["mst_color"]);
		documentStyle.setProperty('--enl-color', appearance["enl_color"]);
		documentStyle.setProperty('--brn-color', appearance["brn_color"]);
	}
});