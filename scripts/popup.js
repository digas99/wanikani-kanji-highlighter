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

window.onload = () => {
	const main = document.createElement("main");
	main.id = "main";
	document.body.appendChild(main);

	// logo
	const logoDiv = document.createElement("div");
	logoDiv.style.marginBottom = "25px";
	logoDiv.style.textAlign = "center";
	const logo = document.createElement("img");
	logo.src="logo/logo-128x128.png";
	logo.classList.add("centered");
	logoDiv.appendChild(logo);

	// extension title
	const title = document.createElement("h2");
	title.textContent = "WaniKani Kanji Highlighter";
	logoDiv.appendChild(title);

	main.appendChild(logoDiv);
	chrome.storage.local.get(["wkhighlight_apiKey"], key => {
		// if the user did not add a key yet
		if (!key["wkhighlight_apiKey"]) {
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
			APIInputWrapper.appendChild(APIInput);

			// save session
			const saveSessionWrapper = document.createElement("div");
			saveSessionWrapper.classList.add("verticalAlign");
			saveSessionWrapper.style.marginTop = "4px";
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.id = "checkbox";
			checkbox.checked = true;
			checkbox.style.marginRight = "5px";
			saveSessionWrapper.appendChild(checkbox);
			const saveSessionTitle = document.createElement("span");
			saveSessionTitle.appendChild(document.createTextNode("Keep me logged in"));
			saveSessionTitle.style.fontSize = "11px";
			saveSessionWrapper.appendChild(saveSessionTitle);
			// submit button
			const button = document.createElement("div");
			button.appendChild(document.createTextNode("Submit"));
			button.classList.add("button");
			button.id = "submit";
			saveSessionWrapper.appendChild(button);
			APIInputWrapper.appendChild(saveSessionWrapper);

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

	const submitMessage = document.createElement("p");
	main.appendChild(submitMessage);
	submitMessage.id = "message";
	submitMessage.style.marginTop = "5px";

	if (!invalidKey) {
		fetchPage(apiKey, "https://api.wanikani.com/v2/user")
			.then(user => {
				// guarantee the Subscription Restrictions (incomplete)
				if (user && user.data.subscription.active) { 
					chrome.storage.local.set({"wkhighlight_apiKey":apiKey});
					submitMessage.style.color = "green";
					submitMessage.style.textAlign = "center";
					submitMessage.appendChild(document.createTextNode("The API key was accepted!"));
					const APIInputWrapper = document.getElementsByClassName("apiKey_wrapper")[0];
					if (APIInputWrapper)
						APIInputWrapper.remove();
					
					// button to ask to reload the page
					const reloadButton = document.createElement("div");
					reloadButton.appendChild(document.createTextNode("Reload Page"));
					reloadButton.className = "button centered";
					reloadButton.id = "reloadPage";
					main.appendChild(reloadButton);	
				}
			})
			.catch(error => console.log(error));
	}
	else {
		submitMessage.style.color = "red";
		submitMessage.appendChild(document.createTextNode("The API key is invalid!"));
	}
}

document.addEventListener("click", e => {
	if (e.target.id === "submit")
		submitAction();

	if (e.target.id === "reloadPage") {
		console.log("popup");
		chrome.runtime.sendMessage({reloadPage:"true"});
		//window.location.reload();
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

		const stepText = ["1- Click on your photo on the navigation bar anywhere on the website, and then click <strong>API Tokens</strong>.", "2- Click on <strong>Generate a new token</strong>, give it any name you want, and then copy it and paste it here in the extension."];
		const imagesSrc = ["../images/apitoken_1.png", "../images/apitoken_2.png"]

		for (let i = 0; i < stepText.length; i++) {
			const wrapper = document.createElement("div");
			wrapper.classList.add("apiKeyStep");
			content.appendChild(wrapper);
			const p = document.createElement("p");
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
});

document.addEventListener("keydown", e => {
	// if user hit Enter key
	if (e.key === "Enter")
		submitAction();

	const inputKey = document.getElementById("apiInput");
	if (inputKey)
		inputKey.value = inputKey.value.trim();

});