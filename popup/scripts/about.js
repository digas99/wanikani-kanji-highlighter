chrome.storage.local.get(["apiKey"], async result => {
	const apiKey = result.apiKey;
	
	// VERSION
	fetch("../manifest.json")
		.then(response => response.json())
		.then(async manifest => {
			const version = manifest["version"];
			document.querySelector("#version").innerText = `v${version}`;
			
			const latest = await reposLatestVersion("digas99", "wanikani-kanji-highlighter");
			const latestNumber = Number(latest.split("v")[1].replace(/\./g, ""));
			const currentNumber = Number(version.replace(/\./g, ""));
			if (latestNumber <= currentNumber)
				document.querySelector("#latestVersion")?.style.removeProperty("display");
			else
				document.querySelector("#outdatedVersion")?.style.removeProperty("display");
		});
	
	// API KEY
	const apiKeyWrapper = document.querySelector(".api-key > p");
	apiKeyWrapper.innerText = apiKey;

	// COPY API KEY
	const copyToClip = document.querySelector(".api-key img[alt='copy']");
	copyToClip.addEventListener("click", async () => await copyToClipboard(apiKey, copyToClip));
	
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
			const converter = new showdown.Converter();
			const html = converter.makeHtml(text);
			readmeContent.innerHTML = html;
			
			Array.from(readmeContent.querySelectorAll("h1"))
				.forEach((h1, i) => {
					// fill navbar
					const navbarSection = document.createElement("div");
					readmeNavbar.appendChild(navbarSection);
					navbarSection.classList.add("clickable");
					navbarSection.appendChild(document.createTextNode(h1.innerText.split("Changelog v")[1]));
					navbarSection.addEventListener("click", () => {
						Array.from(document.getElementsByClassName("readme-navbar-selected")).forEach(elem => elem.classList.remove("readme-navbar-selected"));
						navbarSection.classList.add("readme-navbar-selected");
						readmeContent.scrollTo(0, h1.offsetTop-readmeNavbar.offsetTop-h1.offsetHeight+8);
					});
					if (i == 0) navbarSection.classList.add("readme-navbar-selected");
				});
		});

	return readme;
}