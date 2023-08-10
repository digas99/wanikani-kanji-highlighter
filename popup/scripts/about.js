chrome.storage.local.get(["apiKey"], async result => {
	const apiKey = result.apiKey;
	
	// VERSION
	fetch("../manifest.json")
		.then(response => response.json())
		.then(manifest => document.querySelector("#version").innerText = `v${manifest["version"]}`);
	
	// API KEY
	const apiKeyWrapper = document.querySelector(".api-key > p");
	apiKeyWrapper.innerText = apiKey;

	// COPY API KEY
	const copyToClipboard = document.querySelector(".api-key img[alt='copy']");
	copyToClipboard.addEventListener("click", async () => {
		if (window.navigator.clipboard) {
			await window.navigator.clipboard.writeText(apiKey);
			Array.from(document.getElementsByClassName("copiedMessage")).forEach(elem => elem.remove());
			const copiedMessage = document.createElement("div");
			copyToClipboard.parentElement.appendChild(copiedMessage);
			copiedMessage.appendChild(document.createTextNode("Copied!"));
			copiedMessage.classList.add("copiedMessage");
			copiedMessage.style.color = "gray";
			copiedMessage.style.fontSize = "12px";
			setTimeout(() => copiedMessage.remove(), 1500);
		}
	});
	
	// CHANGELOG
	const changelogWrapper = document.querySelector(".changelog");
	changelogWrapper.appendChild(changelog());
});

const changelog = () => {
	const readme = document.createElement("div");
	readme.style.marginTop = "20px";
	const readmeNavbar = document.createElement("div");
	readme.appendChild(readmeNavbar);
	readmeNavbar.classList.add("readme-navbar");
	const readmeContent = document.createElement("div");
	readme.appendChild(readmeContent);
	readmeContent.classList.add("readme");
	
	fetch('../CHANGELOG.md')
		.then(response => response.text())
		.then(text => {
			text.split("\n").forEach(line => readmeContent.appendChild(mdToHTML(line)));
			readmeContent.getElementsByTagName("h2")[0].style.removeProperty("margin-top");
	
			Array.from(readmeContent.getElementsByTagName("h2"))
				.forEach((h2, i) => {
					// fill navbar
					const navbarSection = document.createElement("div");
					readmeNavbar.appendChild(navbarSection);
					navbarSection.classList.add("clickable");
					navbarSection.appendChild(document.createTextNode(h2.innerText.split("v")[1]));
					navbarSection.addEventListener("click", () => {
						Array.from(document.getElementsByClassName("readme-navbar-selected")).forEach(elem => elem.classList.remove("readme-navbar-selected"));
						navbarSection.classList.add("readme-navbar-selected");
						readmeContent.scrollTo(0, h2.offsetTop-readmeNavbar.offsetTop-h2.offsetHeight-8);
					});
					if (i == 0) navbarSection.classList.add("readme-navbar-selected");
				});
		});

	return readme;
}