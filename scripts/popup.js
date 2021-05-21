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
	const links = ["https://github.com/digas99/wanikani-kanji-highlighter", "mailto:wkhighlighter@diogocorreia.com", "https://www.wanikani.com/"]
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

	const versionWrapper = document.createElement("div");
	wrapper.appendChild(versionWrapper);
	const version = document.createElement("a");
	versionWrapper.appendChild(version);

	reposFirstVersion("digas99", "wanikani-kanji-highlighter").then(result => {
		version.href = `https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/${result}`;
		version.appendChild(document.createTextNode(result));
		version.target = "_blank";
		versionWrapper.style.marginTop = "4px";
		version.style.color = "black";
	});

	return wrapper;
}

const reloadPage = (message, color) => {
	const wrapper = document.createElement("div");
	
	const submitMessage = document.createElement("p");
	submitMessage.id = "message";
	submitMessage.style.marginTop = "5px";
	submitMessage.style.color = color;
	submitMessage.style.textAlign = "center";
	submitMessage.innerHTML = message;
	wrapper.appendChild(submitMessage);
	
	// button to ask to reload the page
	const reloadButton = document.createElement("div");
	reloadButton.appendChild(document.createTextNode("Reload Page"));
	reloadButton.className = "button centered";
	reloadButton.id = "reloadPage";
	wrapper.appendChild(reloadButton);

	return wrapper;
}

const blacklisted = (blacklist, url) => {
	const regex = new RegExp(`^http(s)?:\/\/(www\.)?(${blacklist.join("|")})(\/)?([a-z]+.*)?`, "g");
	return regex.test(url);
}

window.onload = () => {
	const main = document.createElement("div");
	main.id = "main";
	document.body.appendChild(main);

	// logo
	const logoDiv = document.createElement("div");
	main.appendChild(logoDiv);
	logoDiv.style.marginBottom = "25px";
	logoDiv.style.textAlign = "center";
	logoDiv.style.fontSize = "11px";
	const logo = document.createElement("img");
	logo.src="logo/logo.png";
	logo.classList.add("centered");
	logo.style.width = "110px";
	logoDiv.appendChild(logo);

	// extension title
	const title = document.createElement("h2");
	title.textContent = "WaniKani Kanji Highlighter";
	logoDiv.appendChild(title);

	chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_blacklist"], userData => {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {windowLocation: "origin"}, response => {
				const url = response ? response["windowLocation"] : "";
				if (!userData["wkhighlight_blacklist"] || userData["wkhighlight_blacklist"].length === 0 || !blacklisted(userData["wkhighlight_blacklist"], url)) {
					const apiKey = userData["wkhighlight_apiKey"];
					// if the user did not add a key yet
					if (!apiKey) {
						chrome.browserAction.setBadgeText({text: ''});

						// key input
						const apiInputWrapper = document.createElement("div");
						apiInputWrapper.classList.add("apiKey_wrapper");
						main.appendChild(apiInputWrapper);

						const apiLabel = document.createElement("p");
						apiLabel.style.textAlign = "center";
						apiLabel.style.marginBottom = "5px";
						apiLabel.style.fontSize = "16px";
						apiLabel.appendChild(document.createTextNode("API Key: "));
						apiInputWrapper.appendChild(apiLabel);

						const apiInput = document.createElement("input");
						apiInput.placeholder = "Input here the key...";
						apiInput.type = "text";
						apiInput.id = "apiInput";
						apiInput.style.fontSize = "15px";
						apiInput.style.width = "100%";
						apiInputWrapper.appendChild(apiInput);

						// submit button
						const button = document.createElement("div");
						button.appendChild(document.createTextNode("Submit"));
						button.classList.add("button");
						button.id = "submit";
						apiInputWrapper.appendChild(button);

						// what is an api key
						const whatIsAPIKey = document.createElement("div");
						whatIsAPIKey.style.marginTop = "2px";
						apiInputWrapper.appendChild(whatIsAPIKey);
						const whatIsAPIKeyLink = document.createElement("a");
						whatIsAPIKeyLink.href = "#";
						whatIsAPIKeyLink.id = "whatIsAPIKey";
						whatIsAPIKeyLink.appendChild(document.createTextNode("What is an API Key?"));
						whatIsAPIKey.appendChild(whatIsAPIKeyLink);
					}
					else {
						main.appendChild(logoDiv);
						chrome.storage.local.get(["wkhighlight_userInfo_updated"], response => {
							const date = response["wkhighlight_userInfo_updated"] ? response["wkhighlight_userInfo_updated"] : formatDate(new Date());
							modifiedSince(apiKey, date, "https://api.wanikani.com/v2/user")
								.then(modified => {
									// if user info has been updated in wanikani, then update cache
									if (modified) {
										fetchPage(apiKey, "https://api.wanikani.com/v2/user")
											.then(user => {
												if (!window.chrome.runtime.lastError && user) 
													chrome.storage.local.set({"wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
										});
									}
	
									const userInfo = userData["wkhighlight_userInfo"]["data"];
									if (userInfo) {
										//const loggedInWrapper = document.createElement("div");
										//main.appendChild(loggedInWrapper);
			
										const userInfoWrapper = document.createElement("div");
										userInfoWrapper.style.margin = "0 7px";
										main.appendChild(userInfoWrapper);
			
										const userElementsList = document.createElement("ul");
										userElementsList.id = "userInfoNavbar";
										userInfoWrapper.appendChild(userElementsList);
										const topRightNavbar = document.createElement("li");
										userElementsList.appendChild(topRightNavbar);
										topRightNavbar.style.textAlign = "right";
										topRightNavbar.style.marginBottom = "7px";
										["../images/settings.png", "../images/exit.png"].forEach(img => {
											const link = document.createElement("a");
											link.style.padding = "0 5px";
											link.href = "#";
											link.classList.add("navbar_icon");
											const icon_img = document.createElement("img");
											icon_img.id = img.split("/")[2].split(".")[0];
											icon_img.src = img;
											link.appendChild(icon_img);
											topRightNavbar.appendChild(link);
										});
			
										const greetings = document.createElement("li");
										greetings.innerHTML = `Hello, <a href="${userInfo["profile_url"]}" target="_blank">${userInfo["username"]}</a>!`;
										userElementsList.appendChild(greetings);
			
										const level = document.createElement("li");
										level.innerHTML = `Level: <strong>${userInfo["level"]}</strong> / ${userInfo["subscription"]["max_level_granted"]}`;
										userElementsList.appendChild(level);
										
										const kanjiFound = document.createElement("li");
										kanjiFound.id = "nmrKanjiHighlighted";
										kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: (in the page)`;
										userElementsList.appendChild(kanjiFound);

										if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url)) {
											chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
												var activeTab = tabs[0];
												chrome.tabs.sendMessage(activeTab.id, {nmrKanjiHighlighted: "popup"}, response => {
													const nmrKanjiHighlighted = response && response["nmrKanjiHighlighted"] ? response["nmrKanjiHighlighted"] : 0;
													kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${nmrKanjiHighlighted}</strong> (in the page)`;
												});
											});
										}
										else {
											const notRunAtWK = document.createElement("li");
											notRunAtWK.appendChild(document.createTextNode("I don't run @wanikani, sorry!"));
											notRunAtWK.id = "notRunAtWK";
											userElementsList.appendChild(notRunAtWK);
										}

										const searchWrapper = document.createElement("li");
										userElementsList.appendChild(searchWrapper);
										searchWrapper.id = "kanjiSearchWrapper";
										const searchIcon = document.createElement("img");
										searchIcon.id = "kanjiSearchIcon";
										searchIcon.src = "../images/search.png";
										searchWrapper.appendChild(searchIcon);
										const searchInput = document.createElement("input");
										searchWrapper.appendChild(searchInput);
										searchInput.type = "text";
										searchInput.placeholder = "Gold / 金 / kin";
										searchInput.id = "kanjiSearchInput";
			
										const blacklistButtonWrapper = document.createElement("div");
										userInfoWrapper.appendChild(blacklistButtonWrapper);
										const blacklistButton = document.createElement("div");
										blacklistButton.id = "blacklistButton";
										blacklistButtonWrapper.appendChild(blacklistButton);
										blacklistButton.classList.add("button");
										blacklistButton.style.margin = "16px 0";
										blacklistButton.appendChild(document.createTextNode("Don't Run On This Site"));
									}
								});
						});
					}
				}
				else {
					const blacklistWrapper = document.createElement("div");
					main.appendChild(blacklistWrapper);

					const warningWrapper = document.createElement("div");
					blacklistWrapper.appendChild(warningWrapper);
					warningWrapper.id = "warningWrapper";
					const exclamationMark = document.createElement("span");
					warningWrapper.appendChild(exclamationMark);
					exclamationMark.appendChild(document.createTextNode("!"));
					exclamationMark.style.color = "#dc6560";
					exclamationMark.style.fontSize = "40px";
					const warningMessage = document.createElement("p");
					warningWrapper.appendChild(warningMessage);
					warningMessage.appendChild(document.createTextNode("This page was blacklisted by you."));
					warningMessage.style.fontSize = "18px";

					const warningButton = document.createElement("div");
					
					warningButton.classList.add("button");
					blacklistWrapper.appendChild(warningButton);
					warningButton.appendChild(document.createTextNode("Run Highlighter On This Page"));
					warningButton.id = "runHighlighterButton";
				}	
			});
		});
		
		document.body.appendChild(footer());

	});

}

const submitAction = () => {
	let invalidKey = false;
	const msg = document.getElementById("message");
	if (msg)
		msg.remove();

	// check if key is valid
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
				if (!window.chrome.runtime.lastError && user) {
					let msg, color;
					if (user.data.subscription.active) {
						chrome.storage.local.set({"wkhighlight_apiKey":apiKey, "wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
						msg = "The API key was accepted!";
						color = "green";
					}
					else {
						clearCache();
						msg = "Subscription not active!";
						color = "red";
					}

					const APIInputWrapper = document.getElementsByClassName("apiKey_wrapper")[0];
					if (APIInputWrapper)
						APIInputWrapper.remove();

					main.appendChild(reloadPage(msg, color));
				}
			})
			.catch(errorHandling);
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

const secundaryPage = (titleText) => {
	document.body.style.width = "250px";

	document.getElementById("main").style.display = "none";

	const main = document.createElement("div");
	main.id = "secPageMain";
	document.body.prepend(main); 

	const navbar = document.createElement("div");
	navbar.classList.add("topNav");
	main.appendChild(navbar);

	// go back arrow
	const arrowWrapper = document.createElement("div");
	arrowWrapper.id = "goBack"
	const arrow = document.createElement("i");
	arrow.className = "left clickable";
	arrow.style.padding = "4px";
	arrowWrapper.appendChild(arrow);
	navbar.appendChild(arrowWrapper); 

	const title = document.createElement("h3");
	title.style.margin = "0 0 0 10px";
	title.appendChild(document.createTextNode(titleText));
	navbar.appendChild(title);

	const content = document.createElement("div");
	content.style.paddingTop = "20px";
	main.appendChild(content);

	return content;
}

document.addEventListener("click", e => {
	const targetElem = e.target;
	console.log(targetElem);

	if (targetElem.id === "submit")
		submitAction();

	if (targetElem.id === "reloadPage") {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {reloadPage:"true"}, () => window.chrome.runtime.lastError);
			window.location.reload();
		});
	}

	if (targetElem.id === "whatIsAPIKey") {
		const content = secundaryPage("API Key");

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

	if (targetElem.id === "goBack" || targetElem.localName === "i") {
		document.getElementById("secPageMain").remove();
		document.getElementById("main").style.display = "inherit";
		document.body.style.width = "200px";
	}

	if (targetElem.id === "exit" || (targetElem.childNodes[0] && targetElem.childNodes[0].id === "exit")) {
		const main = document.getElementById("main");
		chrome.storage.local.remove("wkhighlight_apiKey");
		if (main) {
			main.replaceChild(reloadPage("Logout successfully", "green"), main.childNodes[1]);
		}
	}

	if (targetElem.id === "blacklistButton") {
		chrome.storage.local.get(["wkhighlight_blacklist"], blacklist => {
			let blacklistedUrls = blacklist["wkhighlight_blacklist"] ? blacklist["wkhighlight_blacklist"] : [];
			chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
				var activeTab = tabs[0];
				chrome.tabs.sendMessage(activeTab.id, {windowLocation: "host"}, response => {
					if (!window.chrome.runtime.lastError && response["windowLocation"]) {
						blacklistedUrls.push(response["windowLocation"].replace("www.", "").replace(".", "\\."));
						chrome.storage.local.set({"wkhighlight_blacklist":blacklistedUrls});
						const main = document.getElementById("main");
						if (main) {
							main.replaceChild(reloadPage(`Extension DEACTIVATED on: <div class="locationDiv"><span>${response["windowLocation"]}</span></div>`, "green"), main.childNodes[1]);
						}
					}
				});
			});
		}); 
	}

	if (targetElem.id === "runHighlighterButton") {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			var activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {windowLocation: "host"}, response => {
				if (!window.chrome.runtime.lastError && response["windowLocation"]) {
					const location = response["windowLocation"];
					chrome.storage.local.get(["wkhighlight_blacklist"], data => {
						let blacklisted = data["wkhighlight_blacklist"];
						let index = blacklisted.indexOf(location.replace("www.", "").replace(".", "\\."));
						blacklisted.splice(index,1);
						chrome.storage.local.set({"wkhighlight_blacklist": blacklisted});
						const main = document.getElementById("main");
						if (main) {
							main.replaceChild(reloadPage(`Extension ACTIVATED on <div class="locationDiv"><span>${location}</span></div>`, "green"), main.childNodes[1]);
						}
						chrome.browserAction.setBadgeText({text: ''});
					});
				}
			});
		});
	}

	if (targetElem.id === "settings" || (targetElem.childNodes[0] && targetElem.childNodes[0].id === "settings")) {
		const content = secundaryPage("Settings");
		content.id = "settingsContent";
		
		const blacklistedDiv = document.createElement("div");
		content.appendChild(blacklistedDiv);
		const blackListedlink = document.createElement("a");
		blacklistedDiv.appendChild(blackListedlink);
		blackListedlink.href = "#";
		blackListedlink.id = "blacklistedSitesList";
		blackListedlink.appendChild(document.createTextNode("Blacklisted sites"));
		const arrow = document.createElement("i");
		arrow.classList.add("right", "blacklisted_title_arrow");
		console.log(arrow);
		chrome.storage.local.get(["wkhighlight_blacklist"], result => {
			blackListedlink.innerText += ` (${result["wkhighlight_blacklist"].length})`;
			blackListedlink.appendChild(arrow);
		});

		const settingsChecks = document.createElement("div");
		settingsChecks.style.display = "grid";
		content.appendChild(settingsChecks);
		let count = 0;
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (settings) {
				["Kanji info popup", "Kanji counter on icon"].forEach(title => {
					const div = document.createElement("div");
					settingsChecks.appendChild(div);
					div.style.display = "inline-flex";
					div.style.padding = "3px 0";
		
					idValue = "settings"+count;
					const label = document.createElement("label");
					div.appendChild(label);
					label.classList.add("settingsItemLabel");
					label.appendChild(document.createTextNode(title));
					label.htmlFor = idValue;
		
					const inputDiv = document.createElement("div");
					inputDiv.classList.add("checkbox_wrapper");
					const checkbox = document.createElement("input");
					div.appendChild(inputDiv);
					inputDiv.appendChild(checkbox);
					checkbox.checked = settings[count];
					checkbox.type = "checkbox";
					checkbox.id = idValue;
					checkbox.classList.add("settingsItemCheckbox", "clickable");
					
					count++;
				});

				const div = document.createElement("div");
				settingsChecks.appendChild(div);
				div.style.display = "inline-flex";
				div.style.padding = "3px 0";

				const label = document.createElement("label");
				div.appendChild(label);
				label.classList.add("settingsItemLabel");
				label.appendChild(document.createTextNode("Highlight style"));

				const inputDiv = document.createElement("div");
				inputDiv.classList.add("checkbox_wrapper");
				div.appendChild(inputDiv);
				["wkhighlighter_highlighted", "wkhighlighter_highlighted_underlined", "wkhighlighter_highlighted_bold"].forEach(className => {
					const span = document.createElement("span");
					inputDiv.appendChild(span);
					span.classList.add(className);
					span.appendChild(document.createTextNode("A"));
					span.classList.add("settings_highlight_style_option", "clickable");
				});

				chrome.storage.local.get(["wkhighlight_settings"], result => document.querySelectorAll(`.${result["wkhighlight_settings"][2]}`)[0].classList.add("simple_shadow"));
			}
		});

		const dangerZone = document.createElement("div");
		content.appendChild(dangerZone);

		const clearCash = document.createElement("div");
		dangerZone.appendChild(clearCash);
		clearCash.classList.add("dangerItem");
		const clearCashButton = document.createElement("div");
		clearCash.appendChild(clearCashButton);
		clearCashButton.classList.add("button");
		clearCashButton.id = "clearCash";
		clearCashButton.appendChild(document.createTextNode("Clear Cash"));
		const clearCashDescription = document.createElement("div");
		clearCash.appendChild(clearCashDescription);
		clearCashDescription.classList.add("dangerItemDescription");
		clearCashDescription.appendChild(document.createTextNode("Clears local data. This won't affect your WaniKani account!"));

		const rateApp = document.createElement("div");
		content.parentNode.appendChild(rateApp);
		rateApp.style.fontSize = "16px";
		rateApp.innerHTML = "Enjoying the app? <a target='_blank' href='https://chrome.google.com/webstore/detail/wanikani-kanji-highlighte/pdbjikelneighjgjojikkmhiehpcokjm/reviews#:~:text=Rate%20this%20extension'>Rate me!</a>";

	}

	if (targetElem.classList.contains("settingsItemCheckbox")) {
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (!settings) {
				settings = {};
			}
			console.log(settings);
			const settingsID = targetElem.id.replace("settings", "");
			
			console.log(settingsID);

			// if user removed badges in settings
			if (settingsID === "1") {
				let value = "";
				console.log(targetElem);
				if (targetElem.checked)
					value = nmrKanjiHighlighted+"";
				chrome.browserAction.setBadgeText({text: value});
			}
			
			settings[settingsID] = targetElem.checked;
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	}

	if (targetElem.id === "clearCash") {
		clearCache();
	}

	if (targetElem.id === "blacklistedSitesList" || targetElem.parentElement.id === "blacklistedSitesList") {
		const wrapper = document.getElementById("blacklistedSitesWrapper");
		if (!wrapper) {
			const parent = targetElem.parentElement;

			const blacklistedSitesList = document.createElement("div");
			parent.appendChild(blacklistedSitesList);
			blacklistedSitesList.id = "blacklistedSitesWrapper";
			chrome.storage.local.get(["wkhighlight_blacklist"], result => {
				const blacklisted = result["wkhighlight_blacklist"];
				if (blacklisted) {
					blacklisted.forEach(site => {
						site = site.replace("\\.", ".");
						const div = document.createElement("div");
						blacklistedSitesList.appendChild(div);
						div.classList.add("blacklisted_site_wrapper");

						const a = document.createElement("a");
						div.appendChild(a);
						a.target = "_black";
						a.href = "https://www."+site;
						a.style.width = "100%";
						a.appendChild(document.createTextNode(site));

						const binWrapper = document.createElement("div");
						binWrapper.classList.add("bin_container");
						div.appendChild(binWrapper);
						const span = document.createElement("span");
						span.id = site.replace(".", "_");
						binWrapper.appendChild(span);
						span.classList.add("bin_wrapper", "clickable");
						const bin = document.createElement("img");
						bin.src = "../images/trash.png";
						bin.classList.add("bin_icon");
						span.appendChild(bin);
					});
				}
				
				if (!blacklisted || blacklisted.length === 0) {
					const p = document.createElement("p");
					blacklistedSitesList.appendChild(p);
					p.appendChild(document.createTextNode("There are no sites blacklisted!"));
				}
			});
		}
		else {
			wrapper.remove();
		}
	}

	if (targetElem.classList.contains("settings_highlight_style_option")) {
		document.querySelectorAll(".simple_shadow").forEach(elem => elem.classList.remove("simple_shadow"));
		targetElem.classList.add("simple_shadow");
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (!settings) {
				settings = {};
			}
			
			settings[2] = targetElem.classList[0];
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	}

	if (targetElem.classList.contains("bin_wrapper") || targetElem.parentElement.classList.contains("bin_wrapper")) {
		let site = (targetElem.id ? targetElem.id : targetElem.parentElement.id).replace("_", "\\.");
		chrome.storage.local.get(["wkhighlight_blacklist"], data => {
			let blacklisted = data["wkhighlight_blacklist"];
			let index = blacklisted.indexOf(site);
			blacklisted.splice(index,1);
			chrome.storage.local.set({"wkhighlight_blacklist": blacklisted});

			site = site.replace("\\.", ".");
			console.log(site);
			for (let elem of document.querySelectorAll(".blacklisted_site_wrapper")) {
				console.log(elem.childNodes[0].text);
				if (elem.childNodes[0].text === site) {
					elem.remove();
					
					const blacklistedListTitle = document.getElementById("blacklistedSitesList");
					const blacklistedText = blacklistedListTitle.innerText;
					let nmrBlacklisted = blacklistedText.split("(")[1].split(")")[0];
					blacklistedListTitle.innerText = blacklistedText.replace(nmrBlacklisted, --nmrBlacklisted);

					break;
				}
			}
		});
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