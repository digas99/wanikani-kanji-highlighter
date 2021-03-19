window.onload = () => {
	chrome.storage.local.get(["wkhighlight_apiKey"], key => {
		console.log(key);
		if (!key["wkhighlight_apiKey"]) {
			if (document.body.childNodes.length === 1) {
				const APIInputWrapper = document.createElement("div");
		
				const APILabel = document.createElement("span");
				APILabel.appendChild(document.createTextNode("API Key: "));
				APIInputWrapper.appendChild(APILabel);
		
				const APIInput = document.createElement("input");
				APIInput.type = "text";
				APIInput.id = "apiInput";
				APIInputWrapper.appendChild(APIInput);
		
				document.body.appendChild(APIInputWrapper);
			}
		}
	});
}

document.addEventListener("keydown", e => {
	// if user hit Enter key
	let invalidKey = false;
	if (e.key === "Enter") {
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

		if (!invalidKey) {
			chrome.storage.local.set({"wkhighlight_apiKey":apiKey});
			window.location.reload();
		}
		else {
			console.log("Invalid key");
		}
	}
});