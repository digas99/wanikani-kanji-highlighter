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
	if (request.setup) {
		if (messagePopup) {
			if (!messagePopup.exists()) {
				messagePopup.create("Fetching subject data from Wanikani...");
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

let messagePopup;
window.onload = () => {
	messagePopup = new MessagePopup(document.body);
	
	chrome.storage.local.get(["initialFetch", "apiKey"], result => {
		if (result["initialFetch"] || result["initialFetch"] == undefined) {
			messagePopup.create("Fetching subject data from Wanikani...", "Please, don't close the extension.");
			messagePopup.setLoading();

		}

		loadData(result["apiKey"]);
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