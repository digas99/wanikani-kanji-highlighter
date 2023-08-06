const popupLoading = text => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("popup-loading");

    // add gray back
    wrapper.appendChild(document.createElement("div"));

    // add popup
    const textWrapper = document.createElement("div");
    wrapper.appendChild(textWrapper);
	textWrapper.classList.add("content");
	// text
	const textNode = document.createElement("div");
    textWrapper.appendChild(textNode);
    textNode.appendChild(document.createTextNode(text));
	// loading bar
	const loadingBarWrapper = document.createElement("div");
	textWrapper.appendChild(loadingBarWrapper);
	loadingBarWrapper.classList.add("popup-loading-bar");
	const loadingBar = document.createElement("div");
	loadingBarWrapper.appendChild(loadingBar);
	const loadingBarProgress = document.createElement("div");
	loadingBar.appendChild(loadingBarProgress);

    return wrapper;
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

let messagePopup;
window.onload = () => {
	messagePopup = new MessagePopup(document.body);

	chrome.storage.local.get(["wkhighlight_initialFetch", "wkhighlight_apiKey"], result => {
		if (result["wkhighlight_initialFetch"]) {
			messagePopup.create("Fetching subject data from Wanikani...");
			messagePopup.loadingBar();

			loadData(result["wkhighlight_apiKey"]);
		}
	});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	console.log("[from content script]", request);

	// catch wanikani data setup completion
	if (request.setup) {
		if (messagePopup) {
			if (!messagePopup.exists()) {
				messagePopup.create("Fetching subject data from Wanikani...");
				messagePopup.loadingBar();
			}

			const setup = request.setup;
	
			console.log("setup", setup);
			// update loading popup
			messagePopup.loading(setup.progress);
			messagePopup.update(setup.message);
	
			if (setup.progress == 1) {
				console.log("setup complete");
				chrome.storage.local.set({"wkhighlight_initialFetch": false});

				setTimeout(() => {
					messagePopup.remove();
					window.location.reload();
				}, 500);

			}
		}
	}
});