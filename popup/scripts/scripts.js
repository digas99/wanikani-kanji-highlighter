// handle color as soon as possible
chrome.storage.local.get(["settings"], result => {
	const settings = result["settings"];

	// setup css vars
	if (settings) {
		const appearance = settings["appearance"];
		const documentStyle = document.documentElement.style;
		documentStyle.setProperty('--highlight-default-color', appearance["highlight_learned"]);
		documentStyle.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
		documentStyle.setProperty('--radical-tag-color', appearance["radical_color"]);
		documentStyle.setProperty('--kanji-tag-color', appearance["kanji_color"]);
		documentStyle.setProperty('--vocabulary-tag-color', appearance["vocab_color"]);
		Object.values(srsStages).map(srs => srs["short"].toLowerCase())
			.forEach(srs => documentStyle.setProperty(`--${srs}-color`, appearance[`${srs}_color`]));
	}
});

let messagePopup, blacklistedSite, atWanikani;
window.onload = () => {
	chrome.storage.local.get(["initialFetch", "blacklist", "contextMenuSelectedText"], async result => {
		// adjust body width
		if (window.innerWidth > 500) {
			document.body.style.width = "unset";
		}

		if (result["contextMenuSelectedText"]) {
			makeSearch(result["contextMenuSelectedText"]);
			chrome.storage.local.remove("contextMenuSelectedText");
		}

	
		const initialFetch = result["initialFetch"] || result["initialFetch"] == undefined;

		messagePopup = new MessagePopup(document.body, initialFetch ? "default" : "bottom");

		if (initialFetch) {
			messagePopup.create("Fetching subject data from Wanikani...", "Please, don't close the extension.");
			messagePopup.setLoading();
			
		}

		const activeTab = await getTab();
		chrome.tabs.sendMessage(activeTab.id, {windowLocation: "origin"}, url => {

			if (url) {
				url = url["windowLocation"];
				validSite = true;
				atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url);
				blacklistedSite = blacklisted(result["blacklist"], url);
			} else {
				validSite = false;
				atWanikani = false;
				blacklistedSite = false;
			}

			document.dispatchEvent(new Event("scriptsLoaded"));
		});
	});
}

window.onscroll = () => {
	let goTop = document.querySelector(".goTop");
	if (document.documentElement.scrollTop > 500) {
		if (!goTop) {
			goTop = document.createElement("div");
			document.body.appendChild(goTop);
			goTop.classList.add("goTop", "clickable");
			const arrow = document.createElement("i");
			goTop.appendChild(arrow);
			arrow.classList.add("up");
			setTimeout(() => goTop.style.right = "7px", 200);
			goTop.addEventListener("click", () => window.scrollTo(0,0));
		}
	}
	else {
		if (goTop) {
			goTop.style.removeProperty("right");
			setTimeout(() => goTop.remove(), 200);
		}
	}
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	// show setup
	if (request.setup) {
		if (request.setup.text || request.setup.progress)
			handleLoadingMessages(request.setup.text, request.setup.progress);

		if (request.setup.fetches && document.querySelector("#updates-loading"))
			document.querySelector("#updates-loading").innerText = request.setup.fetches;
	}

	// show db progress
	if (request.db) {
		if (messagePopup.exists())
			messagePopup.update(null, `${request.db.saved} / ${request.db.total}`);
	}

	// show error
	if (request.error) {
		if (messagePopup.exists()) {
			messagePopup.update("ERROR: " + request.error.message);

			console.log("ERROR", request.error);
			if (request.error.code == 429) {
				messagePopup.update(null, "Please, wait a few minutes and try again.");
			}

			// set initialFetch flag to false to prevent infinite loop
			chrome.storage.local.set({"initialFetch": false});

			// remove popup after a few seconds
			setTimeout(() => messagePopup.remove(), 4000);
		}
	}

	// show loading
	if (request.loading) {
		if (!messagePopup.exists()) {
			messagePopup.create("Fetching subject data from Wanikani...", "Updating data......");
			messagePopup.setLoading();
		}
	}

	// selected text
	if (request.selectedText) {
		const selectedText = request.selectedText;
		makeSearch(selectedText);	
	}
});

const makeSearch = (search) => {
	if (search && search.length > 0) {
		// got to search page if not there
		if (!window.location.href.includes("search")) {
			let url = "search.html?search=" + search;
			// if it is hiragana or katakana
			if (hasKana(search))
				url += "&type=A";	

			window.location.href = url;
		}
		else {
			const searchInput = document.querySelector("#kanjiSearchInput");
			changeInput(searchInput.parentElement, hasKana(search) ? "A" : "あ");
			searchInput.value = search;
			searchInput.dispatchEvent(new Event("input"));
		}
	}
}

document.addEventListener("click", e => {
	const targetElem = e.target;
	
	// if clicked on a kanji that can generate detail info popup
	if (targetElem.closest(".kanjiDetails")) {
		console.log(targetElem);
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, {infoPopupFromSearch:targetElem.closest(".kanjiDetails").getAttribute("data-item-id")}, () => window.chrome.runtime.lastError);
		});
	}
});

const handleLoadingMessages = (text, progress) => {
	if (!messagePopup.exists()) {
		messagePopup.create("Fetching subject data from Wanikani...", "Please, don't close the extension.");
		messagePopup.setLoading();
	}

	// update loading popup
	messagePopup.loading(progress);
	messagePopup.update(text);

	if (progress == 1) {
		console.log("setup complete");
		chrome.storage.local.get("initialFetch", ({initialFetch}) => {
			initialFetch = initialFetch || initialFetch == undefined;
			if (initialFetch)
				chrome.storage.local.set({"initialFetch": false});
			
			setTimeout(async () => {
				messagePopup.remove();

				if (document.querySelector("#updates-loading"))
					document.querySelector("#updates-loading").innerText = "0";
	
				if (typeof updateHomeInterface === "function") {
					chrome.storage.local.get(HOME_FETCH_KEYS, updateHomeInterface);
					
					if (initialFetch) {
						const tab = await getTab();
						chrome.tabs.sendMessage(tab.id, {reloadPage: true});
					}
				}
			}, 1000);
		});
	}

	if (progress == null)
		chrome.storage.local.set({"initialFetch": false});
}

document.addEventListener("loadData", e => {
	if (e.fetches && document.querySelector("#updates-loading"))
		document.querySelector("#updates-loading").innerText = e.fetches;
	handleLoadingMessages(e.text, e.progress);
});