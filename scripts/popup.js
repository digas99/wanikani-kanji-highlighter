nmrKanjiHighlighted = 0;

const footer = () => {
	const wrapper = document.createElement("div");
	wrapper.style.textAlign = "center";
	wrapper.style.marginTop = "15px";

	const warning = document.createElement("p");
	warning.id = "footerWarning";
	warning.appendChild(document.createTextNode("This is NOT an official extension!"));
	wrapper.appendChild(warning);

	const ul = document.createElement("ul");
	ul.style.display = "inline-flex";
	wrapper.appendChild(ul);

	const labels = ["Github", "Contact Me", "WaniKani"];
	const links = ["https://github.com/digas99/wanikani-kanji-highlighter", "mailto:digas_correia@hotmail.com", "https://www.wanikani.com/"]
	for (let i = 0; i < labels.length; i++) {
		const li = document.createElement("li");
		li.style.padding = "0 3px";
		ul.appendChild(li);
		const a = document.createElement("a");
		a.href = links[i];
		a.target = "_blank";
		a.appendChild(document.createTextNode(labels[i]));
		li.appendChild(a);
	}

	return wrapper;
}

const reloadPage = (message, color) => {
	const wrapper = document.createElement("div");
	
	const submitMessage = document.createElement("p");
	submitMessage.id = "message";
	submitMessage.style.marginTop = "5px";
	submitMessage.style.color = color;
	submitMessage.style.textAlign = "center";
	submitMessage.appendChild(document.createTextNode(message));
	wrapper.appendChild(submitMessage);
	
	// button to ask to reload the page
	const reloadButton = document.createElement("div");
	reloadButton.appendChild(document.createTextNode("Reload Page"));
	reloadButton.className = "button centered";
	reloadButton.id = "reloadPage";
	wrapper.appendChild(reloadButton);

	return wrapper;
}

window.onload = () => {
	const main = document.createElement("div");
	main.id = "main";
	document.body.appendChild(main);

	// logo
	const logoDiv = document.createElement("div");
	logoDiv.style.marginBottom = "25px";
	logoDiv.style.textAlign = "center";
	const logo = document.createElement("img");
	logo.src="logo/logo.png";
	logo.classList.add("centered");
	logoDiv.appendChild(logo);

	// extension title
	const title = document.createElement("h2");
	title.textContent = "WaniKani Kanji Highlighter";
	logoDiv.appendChild(title);

	main.appendChild(logoDiv);
	chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo"], userData => {
		// if the user did not add a key yet
		if (!userData["wkhighlight_apiKey"]) {
			chrome.browserAction.setBadgeText({text: ''});
			chrome.browserAction.setBadgeBackgroundColor({color: "#dc6560"});

			// key input
			const APIInputWrapper = document.createElement("div");
			APIInputWrapper.classList.add("apiKey_wrapper");
			main.appendChild(APIInputWrapper);
	
			const APILabel = document.createElement("p");
			APILabel.style.textAlign = "center";
			APILabel.style.marginBottom = "5px";
			APILabel.style.fontSize = "16px";
			APILabel.appendChild(document.createTextNode("API Key: "));
			APIInputWrapper.appendChild(APILabel);
	
			const APIInput = document.createElement("input");
			APIInput.placeholder = "Input here the key...";
			APIInput.type = "text";
			APIInput.id = "apiInput";
			APIInput.style.fontSize = "15px";
			APIInput.style.width = "100%";
			APIInputWrapper.appendChild(APIInput);

			// submit button
			const button = document.createElement("div");
			button.appendChild(document.createTextNode("Submit"));
			button.classList.add("button");
			button.id = "submit";
			APIInputWrapper.appendChild(button);

			// what is an api key
			const whatIsAPIKey = document.createElement("div");
			whatIsAPIKey.style.marginTop = "2px";
			APIInputWrapper.appendChild(whatIsAPIKey);
			const whatIsAPIKeyLink = document.createElement("a");
			whatIsAPIKeyLink.href = "#";
			whatIsAPIKeyLink.id = "whatIsAPIKey";
			whatIsAPIKeyLink.appendChild(document.createTextNode("What is an API Key?"));
			whatIsAPIKey.appendChild(whatIsAPIKeyLink);
		}
		else {
			const userInfo = userData["wkhighlight_userInfo"]["data"];
			if (userInfo) {
				const userInfoWrapper = document.createElement("div");
				userInfoWrapper.style.margin = "0 7px";
				main.appendChild(userInfoWrapper);

				const userElementsList = document.createElement("ul");
				userElementsList.id = "userInfoNavbar";
				userInfoWrapper.appendChild(userElementsList);
				const signout = document.createElement("li");
				signout.style.textAlign = "right";
				const signoutLink = document.createElement("a");
				signoutLink.id = "signout";
				signoutLink.href = "#";
				signoutLink.appendChild(document.createTextNode("Logout"));
				signout.appendChild(signoutLink);
				userElementsList.appendChild(signout);

				const greetings = document.createElement("li");
				greetings.innerHTML = `Hello, <a href="${userInfo["profile_url"]}" target="_blank">${userInfo["username"]}</a>!`;
				userElementsList.appendChild(greetings);

				const level = document.createElement("li");
				level.innerHTML = `Level: <strong>${userInfo["level"]}</strong> / ${userInfo["subscription"]["max_level_granted"]}`;
				userElementsList.appendChild(level);
				
				chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
					var activeTab = tabs[0];
					chrome.tabs.sendMessage(activeTab.id, {nmrKanjiHighlighted: "popup"}, response => {
						const nmrKanjiHighlighted = response ? response["nmrKanjiHighlighted"] : 0;
						const kanjiFound = document.createElement("li");
						kanjiFound.id = "nmrKanjiHighlighted";
						kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${nmrKanjiHighlighted}</strong> (in the page)`;
						userElementsList.appendChild(kanjiFound);
					});
				});
			}
		}
		document.body.appendChild(footer());

	});

}

const fetchPage = async (apiToken, page) => {				
	const requestHeaders = new Headers({Authorization: `Bearer ${apiToken}`});
	let apiEndpoint = new Request(page, {
		method: 'GET',
		headers: requestHeaders
	});

	try {
		return await fetch(apiEndpoint)
			.then(response => response.json())
			.then(responseBody => responseBody)
			.catch(error => console.log(error));
	} catch(e) {
		console.log(e);
	}
}

const submitAction = () => {
	let invalidKey = false;
	const msg = document.getElementById("message");
	if (msg)
		msg.remove();
	const apiKey = document.getElementById("apiInput").value.trim();
	const splitKey = apiKey.split("-");
	const keyPartsLength = [8, 4, 4, 4, 12];
	let keyPart, partLength;
	for (let i = 0; i < keyPartsLength.length; i++) {
		keyPart = splitKey[i];
		partLength = keyPartsLength[i];
		if (!keyPart || keyPart.length !== partLength) {
			invalidKey = true;
			break;
		}
	}

	const main = document.getElementById("main");

	if (!invalidKey) {
		fetchPage(apiKey, "https://api.wanikani.com/v2/user")
			.then(user => {
				// guarantee the Subscription Restrictions (incomplete)
				if (user && user.data.subscription.active) { 
					chrome.storage.local.set({"wkhighlight_apiKey":apiKey, "wkhighlight_userInfo":user});
					const APIInputWrapper = document.getElementsByClassName("apiKey_wrapper")[0];
					if (APIInputWrapper)
						APIInputWrapper.remove();

					main.appendChild(reloadPage("The API key was accepted!", "green"));
				}
			})
			.catch(error => console.log(error));
	}
	else {
		const submitMessage = document.createElement("p");
		main.appendChild(submitMessage);
		submitMessage.id = "message";
		submitMessage.style.marginTop = "5px";	
		submitMessage.style.color = "red";
		submitMessage.appendChild(document.createTextNode("The API key is invalid!"));
	}
}

document.addEventListener("click", e => {
	if (e.target.id === "submit")
		submitAction();

	if (e.target.id === "reloadPage") {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {reloadPage:"true"});
			window.location.reload();
		});
	}

	if (e.target.id === "whatIsAPIKey") {
		document.body.style.width = "250px";

		document.getElementById("main").style.display = "none";
		
		const main = document.createElement("div");
		main.id = "whatIsAPIKeyMain";
		document.body.prepend(main); 

		const navbar = document.createElement("div");
		navbar.classList.add("topNav");
		main.appendChild(navbar);

		// go back arrow
		const arrowWrapper = document.createElement("div");
		arrowWrapper.id = "goBack"
		const arrow = document.createElement("i");
		arrow.classList.add("left");
		arrow.style.padding = "4px";
		arrowWrapper.appendChild(arrow);
		navbar.appendChild(arrowWrapper); 

		const title = document.createElement("h3");
		title.style.margin = "0 0 0 10px";
		title.appendChild(document.createTextNode("API Key"));
		navbar.appendChild(title);

		const content = document.createElement("div");
		content.style.paddingTop = "20px";
		main.appendChild(content);

		for (const text of ["A WaniKani API Key is a token that is meant to give you access to all the content provided by WaniKani through a third party application (like this one).", "You can create your API Key on <a href='https://www.wanikani.com/' target='_blank'>WaniKani official website</a> through the following steps:"]) {
			const pWrapper = document.createElement("div");
			pWrapper.style.marginTop = "6px";
			content.appendChild(pWrapper);
			const p = document.createElement("p");
			p.innerHTML = text;
			pWrapper.appendChild(p);
		}

		const stepText = ["<strong>1-</strong> Click on your photo on the navigation bar anywhere on the website, and then click <strong>API Tokens</strong>.", "<strong>2-</strong>  Click on <strong>Generate a new token</strong>, give it any name you want, and then copy it and paste it here in the extension."];
		const imagesSrc = ["../images/apitoken_1.png", "../images/apitoken_2.png"]

		for (let i = 0; i < stepText.length; i++) {
			const wrapper = document.createElement("div");
			wrapper.classList.add("apiKeyStep");
			content.appendChild(wrapper);
			const p = document.createElement("p");
			p.style.padding = "3px";
			p.innerHTML = stepText[i];
			wrapper.appendChild(p);
	
			const img = document.createElement("img");
			img.src = imagesSrc[i];
			img.style.width = "100%";
			wrapper.appendChild(img);
		}
	}

	if (e.target.id === "goBack" || e.target.localName === "i") {
		document.getElementById("whatIsAPIKeyMain").remove();
		document.getElementById("main").style.display = "inherit";
		document.body.style.width = "173px";
	}

	if (e.target.id === "signout") {
		const main = document.getElementById("main");
		chrome.storage.local.remove("wkhighlight_apiKey");
		if (main) {
			main.replaceChild(reloadPage("Logout successfully", "green"), main.childNodes[1]);
		}
	}
});

document.addEventListener("keydown", e => {
	// if user hit Enter key
	if (e.key === "Enter")
		submitAction();

	const inputKey = document.getElementById("apiInput");
	if (inputKey)
		inputKey.value = inputKey.value.trim();

});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.nmrKanjiHighlighted) {
		nmrKanjiHighlighted = request.nmrKanjiHighlighted;
		const nmrKanjiHighlightedElem = document.getElementById("nmrKanjiHighlighted");
		if (nmrKanjiHighlightedElem) {
			nmrKanjiHighlightedElem.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${nmrKanjiHighlighted}</strong> (in the page)`;
		}
	}
});