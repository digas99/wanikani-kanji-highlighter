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
			goTop.style.top = "0";
			setTimeout(() => goTop.style.top = "56px", 200);
			goTop.addEventListener("click", () => window.scrollTo(0,0));
		}
	}
	else {
		if (goTop) {
			goTop.style.top = "0px";
			setTimeout(() => goTop.remove(), 200);
		}
	}
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	// catch wanikani data setup completion
	console.log("SCRIPT JS", request.setup);
	if (request.setup) {
		if (messagePopup) {
			if (!messagePopup.exists()) {
				messagePopup.create("Fetching subject data from Wanikani...", "Please, don't close the extension.");
				messagePopup.setLoading();
			}

			const setup = request.setup;
	
			// update loading popup
			messagePopup.loading(setup.progress);
			messagePopup.update(setup.text);
	
			if (setup.progress == 1) {
				console.log("setup complete");
				chrome.storage.local.set({"initialFetch": false});

				setTimeout(() => {
					messagePopup.remove();
					window.location.reload();
				}, 500);

			}
		}
	}

	// show db progress
	if (request.db) {
		messagePopup.update(null, `${request.db.saved} / ${request.db.total}`);
	}
});

let messagePopup, blacklistedSite, atWanikani;
window.onload = () => {
	messagePopup = new MessagePopup(document.body)
	
	chrome.storage.local.get(["initialFetch", "apiKey", "settings", "blacklist"], async result => {
		const activeTab = await getTab();
		chrome.tabs.sendMessage(activeTab.id, {windowLocation: "origin"}, url => {
			const settings = result["settings"];

			if (url) {
				url = url["windowLocation"];
				atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url);
				blacklistedSite = blacklisted(result["blacklist"], url);
			}
			
			// setup css vars
			const appearance = settings["appearance"];
			const documentStyle = document.documentElement.style;
			documentStyle.setProperty('--highlight-default-color', appearance["highlight_learned"]);
			documentStyle.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
			documentStyle.setProperty('--radical-tag-color', appearance["radical_color"]);
			documentStyle.setProperty('--kanji-tag-color', appearance["kanji_color"]);
			documentStyle.setProperty('--vocab-tag-color', appearance["vocab_color"]);
			Object.values(srsStages).map(srs => srs["short"].toLowerCase())
				.forEach(srs => documentStyle.setProperty(`--${srs}-color`, appearance[`${srs}_color`]));

			if (result["initialFetch"] || result["initialFetch"] == undefined) {
				messagePopup.create("Fetching subject data from Wanikani...", "Please, don't close the extension.");
				messagePopup.setLoading();
				
			}

			document.dispatchEvent(new Event("scriptsLoaded"));
			
			loadData(result["apiKey"]);
		});
	});
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