window.onload = () => {
	chrome.storage.local.get(["wkhighlight_apiKey"], key => {
		if (!key["wkhighlight_apiKey"]) {
			if (document.body.childNodes.length === 1) {
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

				document.body.appendChild(logoDiv);

				// key input
				const APIInputWrapper = document.createElement("div");
				APIInputWrapper.classList.add("apiKey_wrapper");
		
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

				document.body.appendChild(APIInputWrapper);
			}
		}
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

	const submitMessage = document.createElement("p");
	document.body.appendChild(submitMessage);
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
					document.body.appendChild(reloadButton);	
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
});

document.addEventListener("keydown", e => {
	// if user hit Enter key
	if (e.key === "Enter")
		submitAction();

	const inputKey = document.getElementById("apiInput");
	if (inputKey)
		inputKey.value = inputKey.value.trim();

});