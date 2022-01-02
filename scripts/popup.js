let kanjiList = [];
let vocabList = [];
let radicalList = [];
let activeTab;

let reviews, lessons, reviewsChart;

let apiKey;

let sidePanelOn = false;

let atWanikani = false;

let lastLessonsValue = 0;
let lastReviewsValue = 0;

const footer = () => {
	const wrapper = document.createElement("div");
	wrapper.id = "footer";

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
		version.href = "https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/"+result;
		version.appendChild(document.createTextNode("beta-"+result));
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
	logoDiv.id = "logoWrapper";
	const logo = document.createElement("img");
	logo.src="logo/logo.png";
	logoDiv.appendChild(logo);

	// extension title
	const title = document.createElement("h2");
	title.textContent = "WaniKani Kanji Highlighter";
	logoDiv.appendChild(title);

	chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_blacklist", "wkhighlight_settings"], result => {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {windowLocation: "origin"}, response => {
				const url = response ? response["windowLocation"] : "";

				let settings = result["wkhighlight_settings"];
				if (settings && settings["miscellaneous"] && settings["miscellaneous"]["extension_popup_width"])
					document.documentElement.style.setProperty('--body-base-width', settings["miscellaneous"]["extension_popup_width"]+"px");

				atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url);

				if (!result["wkhighlight_blacklist"] || result["wkhighlight_blacklist"].length === 0 || !blacklisted(result["wkhighlight_blacklist"], url)) {
					apiKey = result["wkhighlight_apiKey"];
					// if the user did not add a key yet
					if (!apiKey) {
						chrome.browserAction.setBadgeText({text: '', tabId:activeTab.id});

						// key input
						const apiInputWrapper = document.createElement("div");
						apiInputWrapper.classList.add("apiKey_wrapper");
						main.appendChild(apiInputWrapper);

						const apiLabel = document.createElement("p");
						apiLabel.style.marginBottom = "5px";
						apiLabel.style.fontSize = "14px";
						apiLabel.appendChild(document.createTextNode("API Key: "));
						apiInputWrapper.appendChild(apiLabel);
					
						const apiInput = textInput("apiKey", "../images/key.png", "Input the key here...");
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
						const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading account info...");
						const loadingElem = loadingVal[0];
						main.appendChild(loadingElem);
		
						// set settings
						if (!settings)
							settings = defaultSettings;
						else {
							// check if all settings are stored
							notStored = [];
							Object.keys(defaultSettings).forEach(key => {
								if (!Object.keys(settings).includes(key))
									settings[key] = {};

								Object.keys(defaultSettings[key]).forEach(innerKey => {
									// if it doesn't exists in settings
									if (typeof settings[key][innerKey] === 'undefined')
										notStored.push([key, innerKey]);
								});
							});
				
							// only store the missing values a preserve the others
							notStored.forEach(id => settings[id[0]][id[1]] = defaultSettings[id[0]][id[1]]);
						}
				
						chrome.storage.local.set({"wkhighlight_settings":settings});
			
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

						document.body.style.cursor = "progress";
						chrome.storage.local.get(["wkhighlight_userInfo_updated","wkhighlight_summary_updated", "wkhighlight_reviews", "wkhighlight_lessons"], response => {
							const date = response["wkhighlight_userInfo_updated"] ? response["wkhighlight_userInfo_updated"] : formatDate(new Date());

							modifiedSince(apiKey, date, "https://api.wanikani.com/v2/user")
								.then(modified => {
									const userInfo = result["wkhighlight_userInfo"]["data"];

									// if user info has been updated in wanikani, then update cache
									if (!userInfo || modified)
										fetchUserInfo(apiKey)
										
									if (userInfo) {
										// get user avatar
										fetch("https://www.wanikani.com/users/"+userInfo["username"])
											.then(result => result.text())
											.then(content => {
												const parser = new DOMParser();
												const doc = parser.parseFromString(content, 'text/html');
												const avatarElem = doc.getElementsByClassName("avatar user-avatar-default")[0];
												
												// remove loading animation
												loadingElem.remove();
												clearInterval(loadingVal[1]);	

												const userInfoWrapper = document.createElement("div");
												userInfoWrapper.id = "userInfoWrapper";
												main.appendChild(userInfoWrapper);
					
												// scripts uptime
												// const scriptsUptimeWrapper = document.createElement("div");
												// userInfoWrapper.appendChild(scriptsUptimeWrapper);
												// scriptsUptimeWrapper.title = "Scripts Uptime Status";
												// scriptsUptimeWrapper.id = "scriptsUptime";
												// const scriptsUptimeUl = document.createElement("ul");
												// scriptsUptimeWrapper.appendChild(scriptsUptimeUl);
												// chrome.tabs.query({currentWindow: true, active: true}, tabs => {
												// 	["Highlighter", "Details Popup"].forEach(script => {
												// 		const scriptsUptimeLi = document.createElement("li");
												// 		scriptsUptimeUl.appendChild(scriptsUptimeLi);
												// 		scriptsUptimeLi.appendChild(document.createTextNode(script));
												// 		const scriptsUptimeSignal = document.createElement("div");
												// 		scriptsUptimeLi.appendChild(scriptsUptimeSignal);

												// 		chrome.tabs.sendMessage(tabs[0].id, {uptime: script}, response => {
												// 			if (response) scriptsUptimeSignal.style.backgroundColor = "#80fd80";
												// 		});
												// 	});
												// });

												const topRightNavbar = document.createElement("div");
												userInfoWrapper.appendChild(topRightNavbar);
												topRightNavbar.id = "topRightNavbar";
												["../images/settings.png"].forEach(img => {
													const link = document.createElement("a");
													link.style.padding = "0 5px";
													link.href = "#";
													link.classList.add("navbar_icon");
													const icon_img = document.createElement("img");
													icon_img.id = img.split("/")[2].split(".")[0];
													icon_img.src = img;
													icon_img.title = icon_img.id[0].toUpperCase()+icon_img.id.slice(1);
													link.appendChild(icon_img);
													topRightNavbar.appendChild(link);
												});

												const userElementsList = document.createElement("ul");
												userElementsList.id = "userInfoNavbar";
												userInfoWrapper.appendChild(userElementsList);
					
												const accInfoWrapper = document.createElement("li");
												userElementsList.appendChild(accInfoWrapper);
												accInfoWrapper.style.display = "flex";

												const avatarWrapper = document.createElement("div");
												accInfoWrapper.appendChild(avatarWrapper);
												avatarWrapper.style.paddingRight = "5px";
												avatarWrapper.style.margin = "auto";
												const avatar = document.createElement("img");
												avatarWrapper.appendChild(avatar);
												avatar.src = avatarElem ? "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0] : "/images/wanikani-default.png";
												avatar.style.width = "30px";
												avatar.style.borderRadius = "15px";

												const accInfo = document.createElement("ul");
												accInfoWrapper.appendChild(accInfo);
												accInfo.style.width = "100%";
												const profile = document.createElement("li");
												profile.innerHTML = `<a href="${userInfo["profile_url"]}" target="_blank">${userInfo["username"]}</a>`;
												profile.title = "Go to WaniKani Profile";
												accInfo.appendChild(profile);												
												const level = document.createElement("li");
												level.style.display = "flex";
												const div1 = document.createElement("div");
												level.appendChild(div1);
												div1.style.width = "100%";
												div1.innerHTML = `Level: <strong>${userInfo["level"]}</strong> / ${userInfo["subscription"]["max_level_granted"]}`;
												const div2 = document.createElement("div");
												level.appendChild(div2);
												div2.id = "levelBarWrapper";
												const levelBar = document.createElement("div");
												div2.appendChild(levelBar);
												setTimeout(() => levelBar.style.width = (userInfo["level"]/userInfo["subscription"]["max_level_granted"])*100+"%", 100);
												levelBar.id = "levelBar";
												accInfo.appendChild(level);

												// burger menu
												const burgerWrapper = document.createElement("div");
												topRightNavbar.appendChild(burgerWrapper);
												burgerWrapper.title = "Menu";
												burgerWrapper.classList.add("clickable", "burger-menu");
												for (let i = 0; i < 3; i++) {
													burgerWrapper.appendChild(document.createElement("div"));
												}
												
												burgerWrapper.addEventListener("click", () => {
													if (!burgerWrapper.classList.contains("burger-menu-clicked")) {
														burgerWrapper.classList.add("burger-menu-clicked");
														sidePanelOn = true;

														chrome.storage.local.set({"wkhighlight_burger_menu":true});

														document.body.style.minHeight = "365px";

														// hide navbar icons and logo wrapper
														Array.from(document.getElementsByClassName("navbar_icon"))
															.forEach(icon => icon.style.display = "none");
														const logoWrapper = document.getElementById("logoWrapper");
														if (logoWrapper) logoWrapper.style.display = "none";

														// side panel
														const container = document.createElement("div");
														document.body.appendChild(container);
														document.body.style.paddingRight = "40px";
														container.classList.add("side-panel");
														const avatarWrapper = document.createElement("div");
														container.appendChild(avatarWrapper);
														avatarWrapper.style.marginTop = "10px";
														const avatarLink = document.createElement("a");
														avatarWrapper.appendChild(avatarLink);
														avatarLink.href = userInfo["profile_url"];
														avatarLink.title = userInfo["username"];
														avatarLink.target = "_blank";
														const avatar = document.createElement("img");
														avatarLink.appendChild(avatar);
														avatar.src = avatarElem ? "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0] : "/images/wanikani-default.png";
														const level = document.createElement("p");
														container.appendChild(level);
														level.style.fontWeight = "bold";
														level.style.color = "#ccc";
														level.title = "Level";
														level.appendChild(document.createTextNode(userInfo["level"]));

														const ul = document.createElement("ul");
														container.appendChild(ul);

														chrome.storage.local.get(["wkhighlight_settings"], result => {
															const buttons = !atWanikani ? ["../images/settings.png", "../images/search.png", "../images/blacklist.png", "../images/about.png", "../images/random.png", "../images/exit.png"] : ["../images/settings.png", "../images/about.png", "../images/exit.png"];
															buttons.forEach(img => {
																const li = document.createElement("li");
																ul.appendChild(li);
																li.style.position = "relative";
																const link = document.createElement("a");
																li.appendChild(link);
																link.style.padding = "0 5px";
																link.href = "#";
																link.classList.add("navbar_icon");
																link.addEventListener("click", () => {
																	const sidePanelLogo = document.getElementById("side-panel-logo");
																	if (sidePanelLogo && container.classList.contains("side-panel-focus")) {
																		sidePanelLogo.dispatchEvent(new MouseEvent("click", {
																			"view": window,
																			"bubbles": true,
																			"cancelable": false
																		}));
																	}
																});
																const icon_img = document.createElement("img");
																icon_img.id = img.split("/")[2].split(".")[0];
																icon_img.src = img;
																icon_img.title = icon_img.id[0].toUpperCase()+icon_img.id.slice(1);
																icon_img.style.width = "20px";
																link.appendChild(icon_img);
	
																if (icon_img.title === "Random") {
																	icon_img.setAttribute("data-item-id", "rand");
																	icon_img.classList.add("kanjiDetails");
																	
																	const settings = result["wkhighlight_settings"];
																	if (settings && settings["kanji_details_popup"] && settings["kanji_details_popup"]["random_subject"]) {
																		const type = document.createElement("span");
																		link.appendChild(type);
																		type.id = "random-subject-type";
																		type.appendChild(document.createTextNode(settings["kanji_details_popup"]["random_subject"].charAt(0)));

																		if (settings["kanji_details_popup"]["random_subject"] == "Any") {
																			type.style.removeProperty("background-color");
																			type.style.removeProperty("filter");
																		}
																		else if (settings["kanji_details_popup"]["random_subject"] == "Kanji") {
																			icon_img.setAttribute("data-item-id", "rand-kanji");
																			type.style.backgroundColor = "var(--kanji-tag-color)";
																			type.style.filter = "invert(1)";
																		}
																		else if (settings["kanji_details_popup"]["random_subject"] == "Vocabulary") {
																			icon_img.setAttribute("data-item-id", "rand-vocab");
																			type.style.backgroundColor = "var(--vocab-tag-color)";
																			type.style.filter = "invert(1)";
																		}
																	}	
																}
															});
														});
														

														if (atWanikani && notRunAtWK) {
															notRunAtWK.style.textAlign = "right";
															notRunAtWK.style.borderBottom = "0px";
															notRunAtWK.style.borderLeft = "10px solid";
														}

														const exitIcon = Array.from(ul.getElementsByTagName("li")).filter(li => li.getElementsByTagName("img")[0]?.title === "Exit")[0];
														if (exitIcon) exitIcon.style.paddingLeft = "3px";

														const blacklistIcon = Array.from(ul.getElementsByTagName("li")).filter(li => li.getElementsByTagName("img")[0]?.title === "Blacklist")[0];
														if (blacklistIcon) blacklistIcon.style.paddingRight = "3px";

														const logoDiv = document.createElement("div");
														container.appendChild(logoDiv);
														logoDiv.id = "side-panel-logo";
														logoDiv.classList.add("clickable");
														logoDiv.addEventListener("click", () => {
															if (!container.classList.contains("side-panel-focus")) {
																container.classList.add("side-panel-focus");
																
																Array.from(document.getElementsByClassName("navbar_icon"))
																	.filter(icon => icon.style.display !== "none")
																	.forEach(icon => {
																		const label = document.createElement("p");
																		icon.appendChild(label);
																		label.style.pointerEvents = "none";
																		label.appendChild(document.createTextNode(icon.getElementsByTagName("img")[0].title));
																	});
															}
															else {
																container.classList.remove("side-panel-focus");
																Array.from(document.getElementsByClassName("navbar_icon"))
																	.filter(icon => icon.style.display !== "none")
																	.forEach(icon => {
																		icon.getElementsByTagName("p")[0].remove();
																	});
															}
														});
														const logo = document.createElement("img");
														logo.src="logo/logo.png";
														logo.style.pointerEvents = "none";
														logoDiv.appendChild(logo);

														burgerWrapper.title = "Close Menu";
														accInfoWrapper.style.display = "none";

														document.getElementById("footer").style.display = "none";
													}
													else {
														burgerWrapper.classList.remove("burger-menu-clicked");
														sidePanelOn = false;

														chrome.storage.local.set({"wkhighlight_burger_menu":false});

														document.body.style.removeProperty("min-height");

														document.body.style.removeProperty("padding-right");
														document.getElementsByClassName("side-panel")[0]?.remove();

														// show navbar icons and logo wrapper
														Array.from(document.getElementsByClassName("navbar_icon"))
															.forEach(icon => icon.style.removeProperty("display"));
														const logoWrapper = document.getElementById("logoWrapper");
														if (logoWrapper) logoWrapper.style.removeProperty("display");

														if (atWanikani) {
															if (notRunAtWK) {
																notRunAtWK.style.removeProperty("text-align");
																notRunAtWK.style.removeProperty("border-bottom");
																notRunAtWK.style.removeProperty("border-left");
															}
														}

														burgerWrapper.title = "Menu";
														accInfoWrapper.style.display = "flex";

														document.getElementById("footer").style.removeProperty("display");
													}
												});

												chrome.storage.local.get(["wkhighlight_burger_menu"], result => {
													if (result["wkhighlight_burger_menu"]) {
														burgerWrapper.dispatchEvent(new MouseEvent("click", {
															"view": window,
															"bubbles": true,
															"cancelable": false
														}));
														accInfoWrapper.style.display = "none";
													}
												});

												const kanjiFoundWrapper = document.createElement("li");
												userElementsList.appendChild(kanjiFoundWrapper);
												kanjiFoundWrapper.classList.add("resizable");
												kanjiFoundWrapper.style.maxHeight = defaultSettings["sizes"]["highlighted_kanji_height"]+"px";
												chrome.storage.local.get(["wkhighlight_settings"], result => {
													if (result["wkhighlight_settings"] && result["wkhighlight_settings"]["sizes"])
														kanjiFoundWrapper.style.maxHeight = result["wkhighlight_settings"]["sizes"]["highlighted_kanji_height"]+"px";
												});
												const resizableS = document.createElement("div");
												kanjiFoundWrapper.appendChild(resizableS);
												resizableS.classList.add("resizable-s");
												const kanjiFound = document.createElement("div");
												kanjiFoundWrapper.appendChild(kanjiFound);
												const kanjiFoundBar = document.createElement("div");
												kanjiFoundWrapper.appendChild(kanjiFoundBar);
												const kanjiFoundList = document.createElement("div");
												kanjiFoundWrapper.appendChild(kanjiFoundList);

												const summaryWrapper = document.createElement("li");
												userElementsList.appendChild(summaryWrapper);
												summaryWrapper.style.textAlign = "center";
												const summaryUl = document.createElement("ul");
												summaryWrapper.appendChild(summaryUl);
												summaryUl.style.display = "inline-flex";
												summaryUl.style.width = "100%";
												["Lessons", "Reviews"].forEach(topic => {
													const summaryLi = document.createElement("li");
													summaryUl.appendChild(summaryLi);
													summaryLi.style.width = "100%";
													summaryLi.style.color = "white";

													const titleWrapper = document.createElement("div");
													summaryLi.appendChild(titleWrapper);
													titleWrapper.classList.add("summaryTitle");
													titleWrapper.title = topic+" in WaniKani";
													const title = document.createElement("a");
													titleWrapper.appendChild(title);
													title.appendChild(document.createTextNode(topic));
													title.href = "https://www.wanikani.com/"+topic[0].toLowerCase()+topic.slice(1, -1);
													title.target = "_blank";
													title.style.color = "white";

													const value = document.createElement("div");
													summaryLi.appendChild(value);
													value.appendChild(document.createTextNode("0"));
													value.classList.add("summaryValue", "clickable");
													value.style.backgroundColor = topic == "Lessons" ? "#4f7b61" : "#2c7080";
													value.id = "summary"+topic;
												});

												const reviewsLoadingVal = loading([], [], 25);
												const reviewsLoadingElem = reviewsLoadingVal[0];
												summaryWrapper.appendChild(reviewsLoadingElem);

												const moreReviews = document.createElement("p");
												summaryWrapper.appendChild(moreReviews);
												moreReviews.style.padding = "3px 0";
												moreReviews.innerHTML = 'More <span style="color:#2c7080;font-weight:bold">Reviews</span> in';
												const moreReviewsDate  = document.createElement("p");
												summaryWrapper.appendChild(moreReviewsDate);
												moreReviewsDate.style.padding = "3px 0";

												if (!atWanikani) {	
													atWanikani = false;				
													const searchArea = textInput("kanjiSearch", "../images/search.png", "Gold / 金 / 5", searchSubject);
													searchArea.title = "Search subjects";
													chrome.storage.local.get(["wkhighlight_contextMenuSelectedText"], result => {
														const selectedText = result["wkhighlight_contextMenuSelectedText"];
														if (selectedText) {
															const input = [...searchArea.firstChild.childNodes].filter(child => child.tagName == "INPUT")[0];
															input.value = selectedText;
															const userInfoNav = document.getElementById("userInfoNavbar");
															if (userInfoNav)
																userInfoNav.style.display = "none";

															document.getElementById("kanjiSearchInput").click();
															if (kanjiList.length == 0 || vocabList.length == 0) {
																document.body.style.setProperty("cursor", "progress", "important");
																loadItemsLists(() => {
																	document.body.style.cursor = "inherit";
																	searchSubject(input)
																});
															}
															else
																searchSubject(input);
																
															chrome.storage.local.remove(["wkhighlight_contextMenuSelectedText"]);
															chrome.storage.local.get(["wkhighlight_nmrHighLightedKanji"], result => {
																chrome.browserAction.setBadgeText({text: result["wkhighlight_nmrHighLightedKanji"].toString(), tabId:activeTab.id});
																chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:activeTab.id});
															});
														}
													});

													chrome.tabs.query({currentWindow: true, active: true}, tabs => {
														chrome.tabs.sendMessage(tabs[0].id, {nmrKanjiHighlighted:"popup"}, response => {
															if (response) {
																chrome.storage.local.get(["wkhighlight_kanji_assoc"], result => {
																	const learned = response["learned"];
																	const notLearned = response["notLearned"];

																	kanjiFound.id = "nmrKanjiHighlighted";
																	kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong></strong> (in the page)`;

																	const barData = [
																		{
																			link: "learnedKanji",
																			color: "var(--highlight-default-color)",
																			value: learned.length
																		},
																		{
																			link: "notLearnedKanji",
																			color: "var(--notLearned-color)",
																			value: notLearned.length
																		}
																	];

																	kanjiFoundBar.parentElement.replaceChild(itemsListBar(barData), kanjiFoundBar);

																	kanjiFoundList.id = "kanjiHighlightedList";
																	kanjiFoundList.classList.add("simple-grid");
																	const kanjiFoundUl = document.createElement("ul");
																	kanjiFoundList.appendChild(kanjiFoundUl);

																	const kanjiAssoc = result["wkhighlight_kanji_assoc"];
																	kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${response["nmrKanjiHighlighted"]}</strong> (in the page)`;
			
																	const classes = ["kanjiHighlightedLearned", "kanjiHighlightedNotLearned"];
																	[learned, notLearned].forEach((type, i) => {
																		type.forEach(kanji => {
																			const kanjiFoundLi = document.createElement("li");
																			kanjiFoundUl.appendChild(kanjiFoundLi);
																			kanjiFoundLi.classList.add("clickable", "kanjiDetails", classes[i]);
																			kanjiFoundLi.appendChild(document.createTextNode(kanji));
																			if (kanjiAssoc && kanjiAssoc[kanji]) kanjiFoundLi.setAttribute("data-item-id", kanjiAssoc[kanji]);
																		});
																	});
																});
															}
														});
													});

													topRightNavbar.insertBefore(searchArea, topRightNavbar.firstChild);
													const searchWrapper = searchArea.firstChild;
													const searchTypeWrapper = document.createElement("div");
													searchWrapper.appendChild(searchTypeWrapper);
													searchTypeWrapper.classList.add("kanjiSearchTypeWrapper");
													searchTypeWrapper.title = "Kana";
													searchTypeWrapper.id = "kanjiSearchTypeKana";
													const searchType = document.createElement("span");
													searchTypeWrapper.appendChild(searchType);
													searchType.id = "kanjiSearchType";
													searchType.appendChild(document.createTextNode("あ"));
												}
												else {
													atWanikani = true;

													topRightNavbar.style.position = "absolute";
													topRightNavbar.style.right = "0";
													topRightNavbar.style.top = "7px";

													const notRunAtWK = document.createElement("li");
													notRunAtWK.appendChild(document.createTextNode("Limited features @wanikani, sorry!"));
													notRunAtWK.id = "notRunAtWK";
													userElementsList.appendChild(notRunAtWK);
												}

												if (!atWanikani) {
													const blacklistButtonWrapper = document.createElement("div");
													document.getElementById("footer").insertBefore(blacklistButtonWrapper, document.getElementById("footer").children[0]);
													blacklistButtonWrapper.id = "blacklistButtonWrapper";
													const blacklistButton = document.createElement("div");
													blacklistButton.id = "blacklistButton";
													blacklistButtonWrapper.appendChild(blacklistButton);
													blacklistButton.classList.add("button");
													blacklistButton.appendChild(document.createTextNode("Don't Run On This Site"));
												}

												// get all assignments if there are none in storage or if they were modified
												setupAssignments(apiKey, () => setupAvailableAssignments(apiKey, setupSummary));
										
												const setupSummary = (reviews, lessons) => {
													if (reviews) {
														const currentTime = new Date().getTime();
														
														const currentValue = parseInt(document.getElementById("summaryReviews").innerText);
														if (currentValue === 0)
															document.getElementById("summaryReviews").innerText = reviews["count"] ? reviews["count"] : "...";
														else {
															if (reviews["count"] && typeof currentValue === "number" && !isNaN(currentTime) && reviews["count"] != lastReviewsValue) {
																counterAnimation(currentValue, reviews["count"], document.getElementById("summaryReviews"), 5);
																lastReviewsValue = reviews["count"];
															}	
														}												
		
														// get all the reviews for the next 14 days
														const nextReviews = reviews["next_reviews"];
														const hoursIn14Days = 24*14;
														// check reviews for the next hours, for every exact hour
														for (let i = 1; i < hoursIn14Days; i++) {
															const thisDate = nextExactHour(new Date(), i);
															const reviewsForNextHour = filterAssignmentsByTime(nextReviews, new Date(), thisDate);
															if (reviewsForNextHour.length > 0) {
																const remainingTime = msToTime(thisDate - currentTime);
																moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:#2c7080;font-weight:bold">Reviews</span> in <b>${remainingTime}</b>`;
																chrome.storage.local.get(["wkhighlight_settings"], result => {
																	const settings = result["wkhighlight_settings"];
																	let time = `${thisDate.getHours() < 10 ? "0"+thisDate.getHours() : thisDate.getHours()}:${thisDate.getMinutes() < 10 ? "0"+thisDate.getMinutes() : thisDate.getMinutes()}`;
																	if (settings && settings["miscellaneous"]["time_in_12h_format"])
																		time = time12h(time);
																	moreReviewsDate.innerText = `${thisDate.getMonthName().slice(0, 3)} ${thisDate.getDate() < 10 ? "0"+thisDate.getDate() : thisDate.getDate()}, ${time}`;
																});
																// create interval delay
																// 10% of a day are 8640000 milliseconds
																// 10% of an hour are 360000 milliseconds
																// 10% of a minute are 6000 milliseconds
																// 10% of a second are 100 milliseconds
																const delays = {
																	"Days":8640000,
																	"Hrs":360000,
																	"Min":6000,
																	"Sec":100
																}

																// timeUnit = "Days, Hrs, etc..."
																let timeUnit = remainingTime.split(" ")[1];

																const timeStampRefresher = () => {
																	const newCurrentDate = new Date().getTime();
																	const newTimeStamp = msToTime(thisDate - newCurrentDate);
																	const newTimeUnit = newTimeStamp.split(" ")[1];
																	// check if has changed the unit of time
																	if (newTimeUnit != timeUnit) {
																		timeUnit = newTimeUnit;
																		// if so then clear the current interval
																		clearInterval(timeStampInterval);
																		// and start a new one with a new interval delay
																		timeStampInterval = setInterval(timeStampRefresher, delays[newTimeUnit]);
																	}

																	// if time stamp reached 0
																	if (thisDate <= newCurrentDate) {
																		moreReviews.innerHTML = `<b>${reviewsForNextHour.length}</b> more <span style="color:#2c7080;font-weight:bold">Reviews</span> <b class="refresh clickable">now</b>`;
																		// refresh popup automatically
																		setTimeout(() => window.location.reload(), 1000);
																		clearInterval(timeStampInterval);
																		return;
																	}

																	// refresh time stamp
																	moreReviews.getElementsByTagName("B")[1].innerText = newTimeStamp;
																}

																let timeStampInterval = setInterval(timeStampRefresher, delays[timeUnit]);
																// 10% of a minute are 6000 milliseconds
																break;
															}
														}
													}

													if (lessons) {
														const currentValue = parseInt(document.getElementById("summaryLessons").innerText);
														if (currentValue === 0)
															document.getElementById("summaryLessons").innerText = lessons["count"] ? lessons["count"] : "...";
														else {
															if (lessons["count"] && typeof currentValue === "number" && !isNaN(currentValue) && lessons["count"] != lastLessonsValue) {
																counterAnimation(currentValue, lessons["count"], document.getElementById("summaryLessons"), 5);
																lastLessonsValue = lessons["count"];
															}	
														}												
													}
													
													reviewsLoadingElem.remove();
													clearInterval(reviewsLoadingVal[1]);
												}

												reviews = response["wkhighlight_reviews"];
												lessons = response["wkhighlight_lessons"];
												
												setupAvailableAssignments(apiKey, setupSummary);

												setupSummary(reviews, lessons);
												
											});
									}
								});
						});
						document.body.style.cursor = "inherit";
				
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
	const apiKey = document.getElementById("apiKeyInput").value.trim();
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

	fetchUserInfo(apiKey, user => {
		if (!invalidKey && user.code != 401) {
			let msg, color;
			chrome.storage.local.set({"wkhighlight_apiKey":apiKey, "wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
			msg = "The API key was accepted!";
			color = "green";

			const apiInputWrapper = document.getElementsByClassName("apiKey_wrapper")[0];
			if (apiInputWrapper)
				apiInputWrapper.remove();

			main.appendChild(reloadPage(msg, color));
		}
		else {
			const submitMessage = document.createElement("p");
			main.appendChild(submitMessage);
			submitMessage.id = "message";
			submitMessage.style.marginTop = "5px";	
			submitMessage.style.color = "red";
			submitMessage.appendChild(document.createTextNode("The API key is invalid!"));
		}
	});
}

const secondaryPage = (titleText, width) => {
	document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(width, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");

	// remove any active secondary page
	if (document.getElementById("secPageMain"))
		document.getElementById("secPageMain").remove();

	document.getElementById("main").style.display = "none";
	document.getElementById("footer").style.display = "none";

	const main = document.createElement("div");
	main.id = "secPageMain";
	document.body.prepend(main); 

	const navbar = document.createElement("div");
	navbar.classList.add("topNav");
	main.appendChild(navbar);

	// go back arrow
	const arrowWrapper = document.createElement("div");
	arrowWrapper.id = "goBack";
	arrowWrapper.title = "Go back";
	const arrow = document.createElement("i");
	arrow.className = "left clickable";
	arrow.style.pointerEvents = "none";
	arrow.style.padding = "4px";
	arrowWrapper.appendChild(arrow);
	navbar.appendChild(arrowWrapper); 

	const title = document.createElement("h3");
	title.style.margin = "0 0 0 10px";
	title.appendChild(document.createTextNode(titleText));
	navbar.appendChild(title);

	const content = document.createElement("div");
	content.style.marginTop = "45px";
	main.appendChild(content);

	return content;
}

const arrowsDisplay = (leftArrow, rightArrow, value, min, max) => {
	if (value === min) {
		leftArrow.classList.add("hidden");
		if (rightArrow.classList.contains("hidden"))
			rightArrow.classList.remove("hidden");
	}
	if (value === max) {
		rightArrow.classList.add("hidden");
		if (leftArrow.classList.contains("hidden"))
			leftArrow.classList.remove("hidden");
	}
	if (value !== min && value !== max) {
		if (rightArrow.classList.contains("hidden"))
			rightArrow.classList.remove("hidden");
		if (leftArrow.classList.contains("hidden"))
			leftArrow.classList.remove("hidden");
	}

	const previousDay = changeDay(value, -1);
	const nextDay = changeDay(value, 1);
	leftArrow.title = `${previousDay.getWeekDay()}, ${previousDay.getMonthName()} ${previousDay.getDate()+ordinalSuffix(previousDay.getDate())}`;
	rightArrow.title = `${nextDay.getWeekDay()}, ${nextDay.getMonthName()} ${nextDay.getDate()+ordinalSuffix(nextDay.getDate())}`;
}

document.addEventListener("click", e => {
	const targetElem = e.target;

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
		const content = secondaryPage("API Key", 250);

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

	if (targetElem.id === "goBack") {
		document.getElementById("secPageMain").remove();
		document.getElementById("main").style.removeProperty("display");
		if (!sidePanelOn)
			document.getElementById("footer").style.removeProperty("display");

		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(defaultWindowSize, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
		
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));
	}

	if (sidePanelIconTargeted(targetElem, "exit")) {
		const main = document.getElementById("main");
		chrome.storage.local.clear();
		if (main) {
			main.replaceChild(reloadPage("Logout successfully", "green"), main.childNodes[1]);
		}
	}

	if (targetElem.id === "blacklistButton") {
		chrome.storage.local.get(["wkhighlight_blacklist"], blacklist => {
			let blacklistedUrls = blacklist["wkhighlight_blacklist"] ? blacklist["wkhighlight_blacklist"] : [];
			chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
				activeTab = tabs[0];
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
						chrome.browserAction.setBadgeText({text: '', tabId:activeTab.id});
					});
				}
			});
		});
	}

	if (sidePanelIconTargeted(targetElem, "settings")) {
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));

		const targetIcon = Array.from(document.getElementsByClassName("navbar_icon"))
			.filter(icon => icon.getElementsByTagName("IMG")[0].title === "Settings" && icon.closest(".side-panel"))[0];
		targetIcon?.classList.add("disabled");

		const content = secondaryPage("Settings", 300);
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
		chrome.storage.local.get(["wkhighlight_blacklist"], result => {
			blackListedlink.innerText += result["wkhighlight_blacklist"] ? ` (${result["wkhighlight_blacklist"].length})` : " (0)";
			blackListedlink.appendChild(arrow);
		});

		const settingsChecks = document.createElement("div");
		content.appendChild(settingsChecks);
		settingsChecks.id = "settingsOptionsWrapper";
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (settings && settingsInterface) {
				settingsInterface.forEach(section => {
					const wrapper = document.createElement("div");
					settingsChecks.appendChild(wrapper);
					wrapper.classList.add("settingsSection", "bellow-border");

					const title = document.createElement("p");
					wrapper.appendChild(title);
					title.appendChild(document.createTextNode(section["title"]));

					section["options"].forEach(option => {
						const textJoiner = (text, separator, connector) => {
							return text.toLowerCase().split(separator).join(connector);
						}

						const valueFromStorage = settings[textJoiner(section["title"], " ", "_")][textJoiner(option["title"], " ", "_")];
						switch(option["type"]) {
							case "checkbox":
								wrapper.appendChild(singleOptionCheck(option["id"], option["title"], valueFromStorage, option["description"]))
								break;
							case "select":
								wrapper.appendChild(selector(option["id"], option["title"], option["options"], valueFromStorage, option["description"]));
								break;
							case "slider":
								wrapper.appendChild(slider(option["id"], option["title"], option["range"]["min"], option["range"]["max"], valueFromStorage, option["description"]));
								break;
						}
					});
				});
						
				// add time to reminder
				const settingsLabels = document.getElementsByClassName("settingsItemLabel");
				if (settingsLabels) {
					const practiceReminderLabel = Array.from(settingsLabels).filter(label => label.getAttribute("for") === "settings-notifications-practice_reminder")[0];
					if (practiceReminderLabel) {
						practiceReminderLabel.style.display = "flex";
						practiceReminderLabel.style.flexDirection = "column";
						chrome.storage.local.get(["wkhighlight_practice_timestamp"], result => {
							practiceReminderLabel.parentElement.style.setProperty("align-items", "unset", "important");
							const input = document.createElement("input");
							input.id = "practice-reminder-time";
							input.type = "time";
							input.value = result["wkhighlight_practice_timestamp"];
							if (!result["wkhighlight_practice_timestamp"]) {
								input.value = defaultSettings["notifications"]["practice_reminder_timestamp"];
								chrome.storage.local.set({"wkhighlight_practice_timestamp":input.value});
							}
							practiceReminderLabel.appendChild(input);
							input.addEventListener("input", e => {
								chrome.storage.local.set({"wkhighlight_practice_timestamp":e.target.value});
								chrome.alarms.clear("practice");
								chrome.runtime.connect();
								chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
							});
						});

						const checkbox = practiceReminderLabel.parentElement?.getElementsByClassName("settingsItemInput")[0];
						if (!checkbox?.checked && document.getElementById("practice-reminder-time"))
							document.getElementById("practice-reminder-time").classList.add("disabled");
					}

					const popupOpacitySliderSpan = document.getElementById("settings-kanji_details_popup-popup_opacity").nextElementSibling;
					if (popupOpacitySliderSpan) {
						const parsedValue = parseInt(popupOpacitySliderSpan.innerText);
						popupOpacitySliderSpan.innerText = parsedValue/10;
						chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
							chrome.tabs.sendMessage(tabs[0].id, {popupOpacity:parsedValue/10}, () => window.chrome.runtime.lastError);
						});
					}
				}

				// HIGHLIGHT STYLE SECTION
				const highlightStyleWrapper = document.createElement("div");
				settingsChecks.appendChild(highlightStyleWrapper);
				highlightStyleWrapper.classList.add("settingsSection", "bellow-border");
				const highlightStyleTitle = document.createElement("p");
				highlightStyleWrapper.appendChild(highlightStyleTitle);
				highlightStyleTitle.appendChild(document.createTextNode("Highlight Style"));

				const labels = ["Learned", "Not Learned"];
				["wkhighlighter_highlighted", "wkhighlighter_highlightedNotLearned"].forEach((mainClass, i) => {
					const div = document.createElement("div");
					highlightStyleWrapper.appendChild(div);

					const label = document.createElement("label");
					div.appendChild(label);
					label.classList.add("settingsItemLabel");
					label.appendChild(document.createTextNode(labels[i]));

					const inputDiv = document.createElement("div");
					inputDiv.classList.add("checkbox_wrapper");
					div.appendChild(inputDiv);
					[mainClass, mainClass+"_underlined", mainClass+"_bold"].forEach(className => {
						const span = document.createElement("span");
						inputDiv.appendChild(span);
						span.classList.add(className);
						span.appendChild(document.createTextNode("A"));
						span.classList.add("settings_highlight_style_option", "clickable");
					});
				});

				chrome.storage.local.get(["wkhighlight_settings"], result => ["learned", "not_learned"].forEach(settigsIndex => document.querySelectorAll(`.${result["wkhighlight_settings"]["highlight_style"][settigsIndex]}`)[0].classList.add("full_opacity")));

				// APPEARANCE
				const appearanceWrapper = document.createElement("div");
				settingsChecks.appendChild(appearanceWrapper);
				appearanceWrapper.classList.add("settingsSection", "bellow-border");
				const appearanceTitle = document.createElement("p");
				appearanceWrapper.appendChild(appearanceTitle);
				appearanceTitle.appendChild(document.createTextNode("Appearance"));
				
				[{
					id:["settings-appearance-highlight_learned", "settings-appearance-highlight_not_learned"],
					label:"Highlight",
					color:[settings["appearance"]["highlight_learned"], settings["appearance"]["highlight_not_learned"]]
				},{
					id:["settings-appearance-details_popup", "settings-appearance-details_popup-font"],
					label:"Details Popup",
					color:[settings["appearance"]["details_popup"]]
				},{
					id:["settings-appearance-radical_color", "settings-appearance-kanji_color", "settings-appearance-vocab_color"],
					label:"Subjects (R/K/V)",
					color:[settings["appearance"]["radical_color"], settings["appearance"]["kanji_color"], settings["appearance"]["vocab_color"]]
				},{
					id:["settings-appearance-ap1_color", "settings-appearance-ap2_color", "settings-appearance-ap3_color", "settings-appearance-ap4_color"],
					label:"Apprentice (1/2/3/4)",
					color:[settings["appearance"]["ap1_color"], settings["appearance"]["ap2_color"], settings["appearance"]["ap3_color"], settings["appearance"]["ap4_color"]]
				},{
					id:["settings-appearance-gr1_color", "settings-appearance-gr2_color"],
					label:"Guru (1/2)",
					color:[settings["appearance"]["gr1_color"], settings["appearance"]["gr2_color"]]
				},{
					id:["settings-appearance-mst_color", "settings-appearance-enl_color"],
					label:"Master/Enlightened",
					color:[settings["appearance"]["mst_color"], settings["appearance"]["enl_color"]]
				},{
					id:["settings-appearance-brn_color", "settings-appearance-lkd_color"],
					label:"Burned/Initiate",
					color:[settings["appearance"]["brn_color"], settings["appearance"]["int_color"]]
				}].forEach(option => {
					const colorInputWrapper = colorOption(option["id"], option["label"], option["color"]);
					appearanceWrapper.appendChild(colorInputWrapper);
					Array.from(colorInputWrapper.getElementsByTagName("INPUT")).forEach(colorInput => {
						colorInput.addEventListener("input", e => {
							chrome.storage.local.get(["wkhighlight_settings"], data => {
								settings = data["wkhighlight_settings"];
								const color = e.target.value;
								const id = colorInput.id.replace("settings-", "").split("-");
								if (id[1] === "highlight_learned" || id[1] === "highlight_not_learned") {
									const target = id[1] === "highlight_learned" ? "wkhighlighter_highlighted" : "wkhighlighter_highlightedNotLearned";
									// change color of the three highlight styles
									document.getElementsByClassName(target+" settings_highlight_style_option")[0].style.setProperty("background-color", color, "important");
									document.getElementsByClassName(target+"_underlined settings_highlight_style_option")[0].style.setProperty("border-bottom", "3px solid "+color, "important");
									document.getElementsByClassName(target+"_bold settings_highlight_style_option")[0].style.setProperty("color", color, "important");
								}

								if (id[1] === "kanji_color" || id[1] === "vocab_color") {
									const randomSubjectType = document.getElementById("random-subject-type");
									if (randomSubjectType) {
										if (id[1].charAt(0) === randomSubjectType.innerText.toLowerCase())
											randomSubjectType.style.backgroundColor = color;
									}
								}

								settings[id[0]][id[1]] = color;
								chrome.storage.local.set({"wkhighlight_settings":settings});
							});
						});
					})
				});
				const appearancePresetWrapper = document.createElement("div");
				appearanceWrapper.appendChild(appearancePresetWrapper);
				appearancePresetWrapper.style.margin = "10px auto 0px auto";
				const appearanceReset = document.createElement("div");
				appearancePresetWrapper.appendChild(appearanceReset);
				appearanceReset.classList.add("button");
				appearanceReset.style.marginRight = "5px";
				appearanceReset.appendChild(document.createTextNode("Reset"));
				appearanceReset.addEventListener("click", () => {
					if (window.confirm("Reset all colors?")) {
						Object.keys(settings["appearance"]).forEach(key => settings["appearance"][key] = undefined);
						chrome.storage.local.set({"wkhighlight_settings":settings}, () => window.location.reload());
					}
				});
				const appearanceWaniKani = document.createElement("div");
				appearancePresetWrapper.appendChild(appearanceWaniKani);
				appearanceWaniKani.classList.add("button");
				appearanceWaniKani.style.marginRight = "5px";
				appearanceWaniKani.style.backgroundColor = "var(--wanikani)";
				appearanceWaniKani.appendChild(document.createTextNode("WaniKani"));
				appearanceWaniKani.addEventListener("click", () => {
					if (window.confirm("Change colors to WaniKani pattern?")) {
						Object.keys(wanikaniPattern).forEach(key => settings["appearance"][key] = wanikaniPattern[key]);
						chrome.storage.local.set({"wkhighlight_settings":settings}, () => window.location.reload());
					}
				});
				const appearanceFlamingDurtles = document.createElement("div");
				appearancePresetWrapper.appendChild(appearanceFlamingDurtles);
				appearanceFlamingDurtles.classList.add("button");
				appearanceFlamingDurtles.style.backgroundColor = "#ffffff";
				appearanceFlamingDurtles.style.color = "red";
				appearanceFlamingDurtles.style.border = "1px solid black";
				appearanceFlamingDurtles.style.fontWeight = "bold";
				appearanceFlamingDurtles.appendChild(document.createTextNode("Flaming Durtles"));
				appearanceFlamingDurtles.addEventListener("click", () => {
					if (window.confirm("Change colors to Flaming Durtles pattern?")) {
						Object.keys(flamingDurtlesPattern).forEach(key => settings["appearance"][key] = flamingDurtlesPattern[key]);
						chrome.storage.local.set({"wkhighlight_settings":settings}, () => window.location.reload());
					}
				});

				// DANGER ZONE
				const dangerZone = document.createElement("div");
				settingsChecks.appendChild(dangerZone);
				dangerZone.classList.add("settingsSection", "bellow-border");
				const clearCacheTitle = document.createElement("p");
				dangerZone.appendChild(clearCacheTitle);
				clearCacheTitle.appendChild(document.createTextNode("Danger Section"));
				[{name: "Clear Subjects Data", description: "Clears only the data related to subjects from WaniKani. This won't affect your WaniKani account!"},
				{name:"Clear All", description: "Clears ALL local changes. This won't affect your WaniKani account!"}].forEach(button => {
					const clearCache = document.createElement("div");
					clearCache.classList.add("dangerItem");
					dangerZone.appendChild(clearCache);
					const clearCacheButton = document.createElement("div");
					clearCache.appendChild(clearCacheButton);
					clearCacheButton.classList.add("button");
					clearCacheButton.id = button["name"].charAt(0).toLowerCase()+button["name"].split(" ").join("").slice(1);
					clearCacheButton.appendChild(document.createTextNode(button["name"]));
					const clearCacheDescription = document.createElement("div");
					clearCache.appendChild(clearCacheDescription);
					clearCacheDescription.classList.add("dangerItemDescription");
					clearCacheDescription.appendChild(document.createTextNode(button["description"]));
				});
			}
		});
	}

	if (sidePanelIconTargeted(targetElem, "create")) {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, {createSubjectFromPopup:true}, () => window.chrome.runtime.lastError);
		});
	}

	// clicked button search in lateral panel
	if (sidePanelIconTargeted(targetElem, "search")) {
		const input = document.getElementById("kanjiSearchInput");
		if (input) {
			if (document.getElementById("goBack"))
				document.getElementById("goBack").dispatchEvent(new MouseEvent("click", {
					"view": window,
					"bubbles": true,
					"cancelable": false
				}));

			const userInfoNav = document.getElementById("userInfoNavbar");
			if (userInfoNav)
				userInfoNav.classList.add("hidden");

			input.focus();
			input.click();
			if (kanjiList.length == 0 || vocabList.length == 0) {
				document.body.style.setProperty("cursor", "progress", "important");
				loadItemsLists(() => {
					document.body.style.cursor = "inherit";
					searchSubject(input)
				});
			}
			else
				searchSubject(input);
		}
	}

	if (sidePanelIconTargeted(targetElem, "blacklist")) {
		if (document.getElementById("blacklistButton")) {
			document.getElementById("blacklistButton").dispatchEvent(new MouseEvent("click", {
				"view": window,
				"bubbles": true,
				"cancelable": false
			}));
		}
	}

	if (sidePanelIconTargeted(targetElem, "about")) {
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));

		const targetIcon = Array.from(document.getElementsByClassName("navbar_icon"))
			.filter(icon => icon.getElementsByTagName("IMG")[0].title === "About" && icon.closest(".side-panel"))[0];
		targetIcon?.classList.add("disabled");

		const content = secondaryPage("About", 300);

		const appInfo = document.createElement("div");
		content.appendChild(appInfo);
		appInfo.style.padding = "20px 10px";
		appInfo.style.borderBottom = "1px solid silver";
		const title = document.createElement("h2");
		appInfo.appendChild(title);
		title.appendChild(document.createTextNode("WaniKani Kanji Highlighter"));
		const version = document.createElement("h3");
		appInfo.appendChild(version);
		version.appendChild(document.createTextNode("Version: "));
		reposFirstVersion("digas99", "wanikani-kanji-highlighter").then(result => version.appendChild(document.createTextNode(result)));
		const description = document.createElement("p");
		appInfo.appendChild(description)
		description.appendChild(document.createTextNode("Unofficial kanji highlighter, matching kanji learned with WaniKani."));

		const readme = document.createElement("div");
		content.appendChild(readme);
		readme.style.padding = "20px 10px";
		readme.style.borderBottom = "1px solid silver";
		const readmeContent = document.createElement("div");
		readmeContent.style.maxHeight = "245px";
		readmeContent.style.overflowY = "auto";
		readme.appendChild(readmeContent);
		fetch('../CHANGELOG.md')
			.then(response => response.text())
			.then(text => {
				text.split("\n").forEach(line => readmeContent.appendChild(mdToHTML(line)));
				readmeContent.getElementsByTagName("h2")[0].style.removeProperty("margin-top");

				Array.from(readmeContent.getElementsByTagName("h2"))
					.forEach(h2 => {
						h2.style.backgroundColor = "var(--default-color)";
						h2.style.padding = "4px";
						h2.style.color = "white";
					});
			});
		
		const apiKeyDisplayWrapper = document.createElement("div");
		content.appendChild(apiKeyDisplayWrapper);
		apiKeyDisplayWrapper.style.padding = "20px 10px";
		apiKeyDisplayWrapper.style.borderBottom = "1px solid silver";
		const apiKeyTitle = document.createElement("h3");
		apiKeyDisplayWrapper.appendChild(apiKeyTitle);
		apiKeyTitle.appendChild(document.createTextNode("API Key"));
		const apiKeyValue = document.createElement("p");
		apiKeyDisplayWrapper.appendChild(apiKeyValue);
		chrome.storage.local.get(["wkhighlight_apiKey"], result => apiKeyValue.appendChild(document.createTextNode(result["wkhighlight_apiKey"])));

		const footer = document.createElement("div");
		content.appendChild(footer);
		footer.style.padding = "20px 10px";
		const myself = document.createElement("p");
		footer.appendChild(myself);
		myself.appendChild(document.createTextNode(`Hi, my name is Diogo. I'm from Portugal and I'm a student at Universidade de Aveiro. I am ${new Date().getFullYear() - new Date(1999, 5, 29).getFullYear()} years old.`));
		myself.appendChild(document.createElement("br"));
		const inspiration = document.createElement("span");
		myself.appendChild(inspiration);
		inspiration.innerHTML = "Building this project, I took huge inspiration from <a target='_blank' href='https://www.wanikani.com'>WaniKani</a> (obviously) and from <a target='_blank' href='https://play.google.com/store/apps/details?id=com.the_tinkering.wk'>Flaming Durtles</a>, an amazing app to use WaniKani on mobile.";
		const links = document.createElement("div");
		footer.appendChild(links);
		links.style.paddingTop = "10px";
		[
			{
				link: "https://github.com/digas99/wanikani-kanji-highlighter",
				title: "Source Code",
				img: "../images/github-logo.png"
			},
			{
				link: "https://www.wanikani.com",
				title: "WaniKani",
				img: "../images/wanikani-logo.png"
			}
		].forEach(logo => {
			const link = document.createElement("a");
			links.appendChild(link);
			link.href = logo["link"];
			link.target = "_blank";
			link.title = logo["title"];
			link.style.marginRight = "5px";
			const githublogo = document.createElement("img");
			link.appendChild(githublogo);
			githublogo.src = logo["img"];
			githublogo.style.width = "30px";
		});
	}

	// settings checkboxes
	if (targetElem.classList.contains("settingsItemInput") && targetElem.type === "checkbox") {
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (!settings)
				settings = {};
			
			const settingsID = targetElem.id.replace("settings-", "").split("-");
			const group = settingsID[0];
			const setting = settingsID[1];

			settings[group][setting] = targetElem.checked;

			const checkbox_wrapper = targetElem.parentElement;
			if (targetElem.checked) {
				if (!checkbox_wrapper.classList.contains("checkbox-enabled"))
					checkbox_wrapper.classList.add("checkbox-enabled");
			}
			else {
				if (checkbox_wrapper.classList.contains("checkbox-enabled"))
					checkbox_wrapper.classList.remove("checkbox-enabled");
			}

			switch(group) {
				case "extension_icon":
					// const settingsSection = targetElem.closest(".settingsSection");
					// if (settingsSection) {
					// 	const enabledInput = settingsSection.getElementsByClassName("checkbox-enabled")[0]
					// 	if (enabledInput) {
					// 		enabledInput.dispatchEvent(new MouseEvent("click", {
					// 			"view": window,
					// 			"bubbles": true,
					// 			"cancelable": false
					// 		}));
					// 	}
					// }
					
					switch (setting) {
						case "kanji_counter":
							let value = "";

							if (targetElem.checked) {
								chrome.storage.local.get(["wkhighlight_nmrHighLightedKanji"], result => {
									value = (result && result["wkhighlight_nmrHighLightedKanji"] ? result["wkhighlight_nmrHighLightedKanji"] : 0).toString();
									chrome.browserAction.setBadgeText({text: value, tabId:activeTab.id});
								});
							}
							else
								chrome.browserAction.setBadgeText({text: '', tabId:activeTab.id});

							break;
					}
					break;
				case "notifications":
					switch(setting) {
						case "new_reviews":
							if (!targetElem.checked)
								chrome.alarms.clear("next-reviews");
							else {
								chrome.runtime.connect();
								chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
							}
							break;
						case "practice_reminder":
							const timeInput = document.getElementById("practice-reminder-time");
							if (targetElem.checked) {
								if (timeInput.classList.contains("disabled"))
									timeInput.classList.remove("disabled");
								chrome.alarms.clear("practice");
								chrome.runtime.connect();
								chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
							}
							else {
								if (!timeInput.classList.contains("disabled"))
									timeInput.classList.add("disabled");
								chrome.alarms.clear("practice");
							}
							break;
					}
					break;
				case "miscellaneous":
					switch(setting) {
						case "kana_writing":
							// update both on web page and background
							chrome.tabs.query({currentWindow: true, active: true}, tabs => chrome.tabs.sendMessage(tabs[0].id, {kanaWriting: targetElem.checked}));
							chrome.runtime.sendMessage({kanaWriting: targetElem.checked});
							break;
					}
					break;
			}
			
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	}

	if (targetElem.classList.contains("checkbox_wrapper")) {
		targetElem.getElementsByClassName("settingsItemInput")[0].dispatchEvent(new MouseEvent("click", {
			"view": window,
			"bubbles": true,
			"cancelable": false
		}));
	}

	if (targetElem.id === "clearAll")
		clearCache();

	if (targetElem.id === "clearSubjectsData")
		clearSubjects();

	if (targetElem.id === "blacklistedSitesList" || (targetElem.parent && targetElem.parentElement.id === "blacklistedSitesList")) {
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
						binWrapper.title = "Remove "+site;
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
		targetElem.parentNode.querySelectorAll(".full_opacity").forEach(elem => elem.classList.remove("full_opacity"));
		targetElem.classList.add("full_opacity");
		const targetClass = targetElem.classList[0];
		const highlightTarget = targetClass.split("_")[1] == "highlighted" ? "learned" : "not_learned";
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (!settings)
				settings = {};
			
			settings["highlight_style"][highlightTarget] = targetClass;
			chrome.storage.local.set({"wkhighlight_settings":settings})

			// change highlight class immediately
			chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, {target: highlightTarget, newHighlightClass:targetElem.classList[0]}, () => window.chrome.runtime.lastError);
			});
		});
	}

	if (targetElem.classList.contains("bin_wrapper") || (targetElem.parentElement?.classList.contains("bin_wrapper"))) {
		let site = (targetElem.id ? targetElem.id : targetElem.parentElement.id).replace("_", "\\.");
		chrome.storage.local.get(["wkhighlight_blacklist"], data => {
			let blacklisted = data["wkhighlight_blacklist"];
			let index = blacklisted.indexOf(site);
			blacklisted.splice(index,1);
			chrome.storage.local.set({"wkhighlight_blacklist": blacklisted});

			site = site.replace("\\.", ".");
			for (let elem of document.querySelectorAll(".blacklisted_site_wrapper")) {
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

	if (targetElem.id == "kanjiSearchInput") {
		const targetIcon = Array.from(document.getElementsByClassName("navbar_icon"))
			.filter(icon => icon.getElementsByTagName("IMG")[0].title === "Search" && icon.closest(".side-panel"))[0];
		targetIcon?.classList.add("disabled");

		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(defaultWindowSize, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");

		document.getElementById("userInfoNavbar").style.display = "none";
		
		let searchResultWrapper = document.getElementById("searchResultWrapper");
		if (!searchResultWrapper) {
			searchResultWrapper = document.createElement("div");
			searchResultWrapper.id = "searchResultWrapper";
			document.getElementById("userInfoWrapper").appendChild(searchResultWrapper);
		}

		if (!document.getElementById("searchResultNavbar")) {
			const navbarWrapper = document.createElement("div");
			navbarWrapper.id = "searchResultNavbar";
			searchResultWrapper.appendChild(navbarWrapper);

			const nmrKanjiFound = document.createElement("div");
			navbarWrapper.appendChild(nmrKanjiFound);
			nmrKanjiFound.innerHTML = "<span>Found <strong>0</strong> items<span>";
			nmrKanjiFound.id = "nmrKanjiFound";

			const navbarOptions = document.createElement("div");
			navbarOptions.classList.add("searchResultNavbarOptionsWrapper");
			navbarOptions.style.display = "flex";

			chrome.storage.local.get(["wkhighlight_settings"], result => {
				const settings = result["wkhighlight_settings"];
				if (settings) {
					navbarWrapper.appendChild(navbarOptions);
					const targetDiv = document.createElement("div");
					navbarOptions.appendChild(targetDiv);
					if (settings["search"]["targeted_search"])
						targetDiv.classList.add("full_opacity");
					targetDiv.classList.add("searchResultNavbarTarget", "clickable");
					targetDiv.title = "Precise Search";
					const tagretImg = document.createElement("img");
					targetDiv.appendChild(tagretImg);
					tagretImg.src = "../images/target.png";
		
					const listOfOptions = document.createElement("ul");
					navbarOptions.appendChild(listOfOptions);
					listOfOptions.style.display = "flex";
					const titles = ["List", "Big Grid", "Small Grid"];
					["list", "menu", "grid"].forEach((option, i) => {
						const li = document.createElement("li");
						listOfOptions.appendChild(li);
						li.classList.add("searchResultNavbarOption", "clickable");
						li.title = titles[i];
						li.id = "searchResultOption"+option;
						if (settings["search"]["results_display"] == li.id)
							li.classList.add("full_opacity");

						const img = document.createElement("img");
						li.appendChild(img);
						img.src = "../images/"+option+".png";
					});
				}
			});
	
			if (kanjiList.length == 0 || vocabList.length == 0) {
				const loadingSubjects = loading(["main-loading", "search-loading"], ["kanjiHighlightedLearned"], 50, "Loading Subjects...");
				const loadingSubjectsElem = loadingSubjects[0];
				document.getElementById("userInfoWrapper").appendChild(loadingSubjectsElem);
				loadItemsLists(() => {
					loadingSubjectsElem.remove();
					clearInterval(loadingSubjects[1]);
				});
			}
		}
	}

	// clicked outside search area and searching related
	if (document.getElementById("searchResultNavbar") && !document.getElementById("notRunAtWK") && !targetElem.closest("#userInfoWrapper") && targetElem.id !== "search" && !targetElem.closest(".side-panel")) {
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));

		const wrapper = document.getElementById("searchResultItemWrapper");
		if (wrapper)
			wrapper.remove();
		
		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(defaultWindowSize, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");

		if (document.getElementById("kanjiSearchInput"))
			document.getElementById("kanjiSearchInput").value = "";

		if (document.getElementById("userInfoNavbar")) {
			document.getElementById("userInfoNavbar").style.removeProperty("display");
			document.getElementById("userInfoNavbar").classList.remove("hidden");	
		}

		const searchResultNavbar = document.getElementById("searchResultNavbar");
		if (searchResultNavbar) {
			searchResultNavbar.remove();
		}
	}

	const typeWrapper = document.getElementsByClassName("kanjiSearchTypeWrapper")[0];
	if ((typeWrapper && typeWrapper.contains(targetElem)) || targetElem.classList.contains("kanjiSearchTypeWrapper")) {
		const input = document.getElementById("kanjiSearchInput");
		input?.select();
		const target = targetElem.classList.contains("kanjiSearchTypeWrapper") ? targetElem.firstChild : targetElem;
		
		if (target?.innerText == "あ") {
			target.innerText = "A";
			target.parentElement.id = "kanjiSearchTypeRomaji";
			target.parentElement.title = "Romaji";
			input.placeholder = "きん";
		}
		else {
			target.innerText = "あ";
			target.parentElement.id = "kanjiSearchTypeKana";
			target.parentElement.title = "Kana";
			input.placeholder = "Gold / 金 / 5";
		}

		input.value = "";
	}

	// clicked in the kanji on item search
	if (targetElem.classList.contains("searchResultItem")) {
		const input = document.getElementById("kanjiSearchInput");
		input.value = targetElem.innerText;
		if (kanjiList.length == 0 || vocabList.length == 0) {
			document.body.style.cursor = "progress";
			loadItemsLists(() => {
				document.body.style.cursor = "inherit";
				searchSubject(input, "あ");
			});
		}
		else
			searchSubject(input, "あ");
	}

	// clicked in a search result line, but not the character itself
	if (targetElem.classList.contains("searchResultItemLine")) {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, {infoPopupFromSearch:targetElem.getAttribute("data-item-id")}, () => window.chrome.runtime.lastError);
		});
	}

	// clicked in the menu option in search results
	if (targetElem.classList.contains("searchResultNavbarOption")) {
		Array.from(document.getElementsByClassName("searchResultNavbarOption")).forEach(elem => {
			if (elem.classList.contains("full_opacity"))
				elem.classList.remove("full_opacity");
		});
		targetElem.classList.add("full_opacity");

		chrome.storage.local.get(["wkhighlight_settings"], result => {
			let settings = result["wkhighlight_settings"];
			if (settings && settings["search"])
				settings["search"]["results_display"] = targetElem.id;
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});

		const removeSquareClasses = elem => {
			const classes = elem.classList;
			if (classes.contains("searchResultItemSquare")) classes.remove("searchResultItemSquare");
			if (classes.contains("searchResultItemSquareSmall")) classes.remove("searchResultItemSquareSmall");
		}

		if (["searchResultOptionmenu", "searchResultOptiongrid"].includes(targetElem.id)) {
			Array.from(document.getElementsByClassName("searchResultItemInfo")).forEach(elem => {
				const parent = elem.parentElement;
				removeSquareClasses(parent);
				parent.classList.add(targetElem.id == "searchResultOptionmenu" ? "searchResultItemSquare" : "searchResultItemSquareSmall");
				elem.style.display = "none";
			});
			// if there are results in the search
			const resultsWrapper = document.getElementById("searchResultItemWrapper");
			if (resultsWrapper && resultsWrapper.childNodes.length > 0)
				document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(630, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
			
			const newClass = targetElem.id === "searchResultOptionmenu" ? "searchResultItemType-small" : "searchResultItemType-tiny"; 
			Array.from(document.getElementsByClassName("searchResultItemType")).forEach(elem => elem.classList.replace(elem.classList[2], newClass));
		}
		else {
			Array.from(document.getElementsByClassName("searchResultItemLine")).forEach(elem => {
				elem.getElementsByClassName("searchResultItemInfo")[0].style.display = "grid";
				removeSquareClasses(elem);
			});
			Array.from(document.getElementsByClassName("searchResultItemType")).forEach(elem => elem.classList.replace(elem.classList[2], "searchResultItemType-normal"));
		}
	}

	if (targetElem.id == "searchResultOptionlist") {
		Array.from(document.getElementsByClassName("searchResultItemSquare")).forEach(elem => {
			elem.getElementsByClassName("searchResultItemInfo")[0].style.display = "grid";
			removeSquareClasses(elem);
		});
		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(defaultWindowSize, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
	}

	// clicked in target icon
	if (targetElem.classList.contains("searchResultNavbarTarget")) {
		chrome.storage.local.get(["wkhighlight_settings"], result => {
			const settings = result["wkhighlight_settings"];
			if (settings && settings["search"]) {
				if (settings["search"]["targeted_search"]) {
					targetElem.classList.remove("full_opacity");
					settings["search"]["targeted_search"] = false;
				}
				else {
					targetElem.classList.add("full_opacity");
					settings["search"]["targeted_search"] = true;
				}
				chrome.storage.local.set({"wkhighlight_settings":settings});

				searchSubject(document.getElementById("kanjiSearchInput"));
			}
		});
	}

	// if clicked on a kanji that can generate detail info popup
	if (targetElem.classList.contains("kanjiDetails")) {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			chrome.tabs.sendMessage(tabs[0].id, {infoPopupFromSearch:targetElem.getAttribute("data-item-id")}, () => window.chrome.runtime.lastError);
		});
	}

	if (targetElem.classList.contains("refresh")) {
		window.location.reload();
	}

	const displayAssignmentMaterials = (data, container, loading) => {
		data.map(assignment => assignment["data"])
			.sort((as1, as2) => new Date(as1["available_at"]).getTime() - new Date(as2["available_at"]).getTime())
			.map(assignment => ({"srs_stage":assignment["srs_stage"], "subject_id":assignment["subject_id"], "subject_type":assignment["subject_type"]}));
		
		chrome.storage.local.get(["wkhighlight_settings"], result => {
			if (loading) loading.remove();

			const settings = result["wkhighlight_settings"];
			if (settings) {
				const displaySettings = settings["assignments"]["srsMaterialsDisplay"];
				// filter by srs stages
				const lessonsBarData = [];
				const reviewsBarData = [];
				Object.keys(srsStages).forEach(srsId => {
					const assignments = data.filter(assignment => assignment["data"]["srs_stage"] == srsId);
					// setup srsrStages bar
					if (srsId == 0) {
						lessonsBarData.push({
							link: "reviews"+srsStages[srsId]["short"],
							color: `var(--${srsStages[srsId]["short"].toLowerCase()}-color)`,
							value: assignments.length,
						});
					}
					else {
						reviewsBarData.push({
							link: "reviews"+srsStages[srsId]["short"],
							color: `var(--${srsStages[srsId]["short"].toLowerCase()}-color)`,
							value: assignments.length,
						});
					}

					if (assignments.length > 0) {
						const srsWrapper = document.createElement("li");
						container.appendChild(srsWrapper);
						srsWrapper.style.marginBottom = "5px";
						const srsTitle = document.createElement("div");
						srsWrapper.appendChild(srsTitle);
						srsTitle.classList.add("clickable");
						srsId = parseInt(srsId);
						if (srsId != 0) {
							const srsTitleEgg = document.createElement("div");
							srsTitle.appendChild(srsTitleEgg);
							srsTitleEgg.classList.add("srsTitleEgg");
							if (srsId > 4 && srsId < 7)
								srsTitleEgg.style.backgroundPositionX = "-22px";
							if (srsId == 7)
								srsTitleEgg.style.backgroundPositionX = "-45px";
							if (srsId == 8)
								srsTitleEgg.style.backgroundPositionX = "-67px";

						}
						srsTitle.appendChild(document.createTextNode(srsStages[srsId]["name"]+` (${assignments.length})`));
						srsTitle.id = "reviews"+srsStages[srsId]["short"];
						srsTitle.style.color = "white";
						srsTitle.style.padding = "5px";
						srsTitle.style.backgroundColor= "var(--default-color)";
						srsTitle.style.display = "-webkit-box";
						srsTitle.addEventListener("click", e => {
							const materialsForThisSrs = e.target.parentElement.children[1];
							if (materialsForThisSrs.classList.contains("hidden")) {
								materialsForThisSrs.classList.remove("hidden");
								settings["assignments"]["srsMaterialsDisplay"][srsId] = true;
							}
							else {
								materialsForThisSrs.classList.add("hidden");
								settings["assignments"]["srsMaterialsDisplay"][srsId] = false;
							}
							chrome.storage.local.set({"wkhighlight_settings":settings});
						});
						const srsTitleArrowRight = document.createElement("i");
						srsTitle.appendChild(srsTitleArrowRight);
						srsTitleArrowRight.classList.add("right");
						srsTitleArrowRight.style.borderColor = settings["appearance"][srsStages[srsId]["short"][0].toLowerCase()+srsStages[srsId]["short"].slice(1)+"_color"];
						srsTitleArrowRight.style.padding = "5px";
						srsTitleArrowRight.style.pointerEvents = "none";
						srsTitleArrowRight.style.marginLeft = "5px";
						const itemsListWrapper = document.createElement("div");
						srsWrapper.appendChild(itemsListWrapper);
						itemsListWrapper.classList.add("simple-grid");
						itemsListWrapper.style.padding = "5px";
						if (!displaySettings[srsId])
							itemsListWrapper.classList.add("hidden");
						const itemsList = document.createElement("ul");
						itemsListWrapper.appendChild(itemsList);
						assignments.map(assignment => assignment["data"])
							.forEach(assignment => {
							const li = document.createElement("li");
							itemsList.appendChild(li);
							let characters = "";
							let cssVar, filtered;
							switch(assignment["subject_type"]) {
								case "kanji":
									filtered = kanjiList.filter(kanji => kanji["id"] == assignment["subject_id"]);
									li.classList.add("kanji_back" , "kanjiDetails", "clickable");
									cssVar = "--kanji-tag-color";
									break;
								case "vocabulary":
									filtered = vocabList.filter(vocab => vocab["id"] == assignment["subject_id"]);
									li.classList.add("vocab_back" , "kanjiDetails", "clickable");
									cssVar = "--vocab-tag-color";
									break;
								case "radical":
									filtered = radicalList.filter(radical => radical["id"] == assignment["subject_id"]);
									li.classList.add("radical_back");
									li.style.height = "30px";
									cssVar = "--radical-tag-color";
									break;
							}
							const subject = filtered[0];
							if (subject) {
								characters = subject["characters"];
								if (!atWanikani) {					
									if (subject["meanings"]) li.title = subject["meanings"][0];
									if (subject["readings"]) {
										if (subject["readings"][0]["reading"])
											li.title += " | "+subject["readings"].filter(reading => reading["primary"])[0]["reading"];
										else
											li.title += " | "+subject["readings"][0];
									}
								}
							}
							let backColor = hexToRGB(getComputedStyle(document.body).getPropertyValue(cssVar));
							li.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);
							if (characters !== "L")
								li.innerHTML = characters;
							else {
								const wrapperForL = document.createElement("div");
								li.appendChild(wrapperForL);
								wrapperForL.style.marginTop = "5px";
								wrapperForL.appendChild(document.createTextNode(characters));
							}
							li.setAttribute('data-item-id', assignment["subject_id"]);
							if (characters !== "L" && li.children.length > 0 && li.style.color == "rgb(255, 255, 255)") li.children[0].style.filter = "invert(1)";
						});
					}
				});

				const lessonsListBar = document.getElementById("lessonsListBar");
				if (lessonsListBar)
					lessonsListBar.parentElement.replaceChild(itemsListBar(lessonsBarData), lessonsListBar);
				
				const reviewsListBar = document.getElementById("reviewsListBar");
				if (reviewsListBar)
					reviewsListBar.parentElement.replaceChild(itemsListBar(reviewsBarData), reviewsListBar);
			}
		});
	}

	// clicked in the number of reviews
	if (targetElem.id == "summaryReviews") {
		const content = secondaryPage("Reviews", 470);

		chrome.storage.local.get(["wkhighlight_reviews"], result => {
			reviews = result["wkhighlight_reviews"] ? result["wkhighlight_reviews"] : reviews;

			const futureReviewsWrapper = document.createElement("div");
			content.appendChild(futureReviewsWrapper);
			const reviewsList = document.createElement("div");
			futureReviewsWrapper.appendChild(reviewsList);
			reviewsList.id = "assignmentsMaterialList";
			reviewsList.classList.add("resizable");
			reviewsList.style.maxHeight = defaultSettings["sizes"]["reviews_list_height"]+"px";
			const resizableS = document.createElement("div");
			reviewsList.appendChild(resizableS);
			resizableS.classList.add("resizable-s");
			const reviewsListTitle = document.createElement("p");
			reviewsList.appendChild(reviewsListTitle);
			reviewsListTitle.innerHTML = `<b>${reviews && reviews["count"] ? reviews["count"] : 0}</b> Reviews available right now!`;
			const reviewsListBar = document.createElement("div");
			reviewsListBar.id = "reviewsListBar";
			reviewsList.appendChild(reviewsListBar);
			const reviewsListUl = document.createElement("ul");
			reviewsList.appendChild(reviewsListUl);
			reviewsListUl.classList.add("bellow-border");
			reviewsListUl.style.maxHeight = "inherit";
			const futureReviewsChart = document.createElement("div");
			futureReviewsWrapper.appendChild(futureReviewsChart);
			const loadingChart = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading Reviews Chart...");
			const loadingChartElem = loadingChart[0];
			futureReviewsChart.appendChild(loadingChartElem);

			if (reviews) {
				//setup list of material for current reviews
				if (reviews["data"]) {
					if (radicalList.length === 0 || kanjiList.length === 0 || vocabList.length === 0) {
						const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading Subjects...");
						const loadingElem = loadingVal[0];
						reviewsListUl.appendChild(loadingElem);

						loadItemsLists(() => {
							displayAssignmentMaterials(reviews["data"], reviewsListUl, loadingElem);
							clearInterval(loadingVal[1])
						});
					}
					else
						displayAssignmentMaterials(reviews["data"], reviewsListUl);
				}

				// setup chart for the next reviews
				if (reviews["next_reviews"]) {
					chrome.storage.local.get(["wkhighlight_settings"], result => {
						const futureReviewsCanvas = document.createElement("canvas");
						futureReviewsChart.appendChild(futureReviewsCanvas);
						futureReviewsCanvas.style.display = "none";
						const leftArrow = document.createElement("i");
						futureReviewsChart.appendChild(leftArrow);
						leftArrow.classList.add("left", "clickable", "hidden");
						leftArrow.style.left = "7px";
						const rightArrow = document.createElement("i");
						futureReviewsChart.appendChild(rightArrow);
						rightArrow.style.right = "7px";
						rightArrow.classList.add("right", "clickable");
						const today = new Date();
						const nextDay = changeDay(today, 1);
						rightArrow.title = `${nextDay.getWeekDay()}, ${nextDay.getMonthName()} ${nextDay.getDate()+ordinalSuffix(nextDay.getDate())}`;
						const daySelectorWrapper = document.createElement("div");
						futureReviewsWrapper.appendChild(daySelectorWrapper);
						daySelectorWrapper.id = "reviewsDaySelector";
						const daySelectorLabel = document.createElement("label");
						daySelectorWrapper.appendChild(daySelectorLabel);
						daySelectorLabel.appendChild(document.createTextNode("Select another day:"));
						const daySelectorInput = document.createElement("input");
						daySelectorWrapper.appendChild(daySelectorInput);
						daySelectorInput.type = "date";
						// setup values for input
						daySelectorInput.value = simpleFormatDate(today, "ymd"); 
						daySelectorInput.min = simpleFormatDate(changeDay(today, 1), "ymd");
						daySelectorInput.max = simpleFormatDate(changeDay(today, 13), "ymd");
						const futureReviewsLabel = document.createElement("p");
						futureReviewsWrapper.appendChild(futureReviewsLabel);
						futureReviewsLabel.id = "reviewsPage-nmrReviews24hLabel";
						futureReviewsLabel.innerHTML = "<b>0</b> more Reviews in the next 24 hours";

						const settings = result["wkhighlight_settings"];
						if (settings) {
							const time12h_format = settings["miscellaneous"]["time_in_12h_format"];
							const days = 1;

							const nmrReviewsNext = filterAssignmentsByTime(reviews["next_reviews"], today, changeDay(today, days))
															.map(review => ({hour:new Date(review["available_at"]).getHours(), day:new Date(review["available_at"]).getDate(), srs:review["srs_stage"]}));
							futureReviewsLabel.getElementsByTagName("B")[0].innerText = nmrReviewsNext.length;
		
							const chartData = setupReviewsDataForChart(nmrReviewsNext, today, days, 1, time12h_format);
		
							const apprData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] > 0 && review["srs"] <= 4), today, days, 1, time12h_format);
							const guruData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 5 || review["srs"] == 6), today, days, 1, time12h_format);
							const masterData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 7), today, days, 1, time12h_format);
							const enliData = setupReviewsDataForChart(nmrReviewsNext.filter(review => review["srs"] == 8), today, days, 1, time12h_format);
		
							const style = getComputedStyle(document.body);
							const data = {
								labels: chartData["hours"],
								datasets: [{
									label: 'Apprentice',
									backgroundColor: style.getPropertyValue('--ap4-color'),
									borderColor: 'rgb(255, 255, 255)',
									data: apprData["reviewsPerHour"],
									order: 1
								},{
									label: 'Guru',
									backgroundColor: style.getPropertyValue('--gr2-color'),
									borderColor: 'rgb(255, 255, 255)',
									data: guruData["reviewsPerHour"],
									order: 2
								},{
									label: 'Master',
									backgroundColor: style.getPropertyValue('--mst-color'),
									borderColor: 'rgb(255, 255, 255)',
									data: masterData["reviewsPerHour"],
									order: 3
								},{
									label: 'Enlightened',
									backgroundColor: style.getPropertyValue('--enl-color'),
									borderColor: 'rgb(255, 255, 255)',
									data: enliData["reviewsPerHour"],
									order: 4
								}]
							};
		
							reviewsChart = new Chart(futureReviewsCanvas, {
								type: 'bar',
								data,
								options: {
									plugins: {
										title: {
											display: true,
											text: 'Reviews in the next 24 hours'
										},
										datalabels: {
											color: '#000000',
											anchor: 'end',
											align: 'top',
											display: ctx => ctx["dataset"]["data"][ctx["dataIndex"]] != 0,
											formatter: (value, ctx) => {
												const type = ctx.dataset.order;
												const values = [];
												for (let t = 1; t <= ctx.chart._metasets.length; t++) {
													values[t] = t != type ? ctx.chart._metasets[t-1]._dataset.data[ctx.dataIndex] : value;
												}
												// create an array with only values != 0
												const finalValues = [];
												Object.keys(values).forEach(key => {
													if (values[key] != 0)
														finalValues[key] = values[key];
												});
												// check if current type is the type at the top of the bar
												if (Math.max.apply(Math, Object.keys(finalValues)) == type)
													return values.reduce((a,b) => a+b);
												else
													return "";
		
											}
										},
										legend: {
											position: 'bottom',
											labels: {
												padding: 7
											}
										}
									},
									animation: {
										duration: 0
									},
									scales: {
										x: {
										stacked: true
										},
										y: {
										stacked: true
										}
									}
								},
								plugins: [ChartDataLabels]
							});

							clearInterval(loadingChart[1]);
							loadingChartElem.remove();
							futureReviewsChart.id = "futureReviewsWrapper";
							futureReviewsCanvas.style.removeProperty("display");

							const nextReviewsData = reviews["next_reviews"];
							// changing date event listener
		
							daySelectorInput.addEventListener("input", e => {
								const newDate = e.target.value;
								updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel, time12h_format);
								arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
							});
							// arrows event listener
							leftArrow.addEventListener("click", () => {
								const newDate = changeDay(daySelectorInput.value, -1);
								updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel, time12h_format);
								daySelectorInput.value = simpleFormatDate(newDate, "ymd");
								arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
							});
							rightArrow.addEventListener("click", () => {
								const newDate = changeDay(daySelectorInput.value, 1);
								rightArrow.title = `${newDate.getWeekDay()}, ${newDate.getMonthName()} ${newDate.getDate()+ordinalSuffix(newDate.getDate())}`;
								updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel, time12h_format);
								daySelectorInput.value = simpleFormatDate(newDate, "ymd");
								arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
							});
						}
					});
				}
			}
		});
	}

	// clicked in the number of lessons
	if (targetElem.id == "summaryLessons") {
		const content = secondaryPage("Lessons", 470);

		chrome.storage.local.get(["wkhighlight_lessons"], result => {
			lessons = result["wkhighlight_lessons"] ? result["wkhighlight_lessons"] : lessons;
			
			const lessonsWrapper = document.createElement("div");
			content.appendChild(lessonsWrapper);
			const lessonsList = document.createElement("div");
			lessonsWrapper.appendChild(lessonsList);
			lessonsList.classList.add("resizable");
			lessonsList.style.maxHeight = defaultSettings["sizes"]["lessons_list_height"]+"px";
			const resizableS = document.createElement("div");
			lessonsList.appendChild(resizableS);
			resizableS.classList.add("resizable-s");
			lessonsList.id = "assignmentsMaterialList";
			const lessonsListTitle = document.createElement("p");
			lessonsList.appendChild(lessonsListTitle);
			lessonsListTitle.innerHTML = `<b>${lessons && lessons["count"] ? lessons["count"] : 0}</b> Lessons available right now!`;
			const lessonsListBar = document.createElement("div");
			lessonsListBar.id = "lessonsListBar";
			lessonsList.appendChild(lessonsListBar);
			const lessonsListUl = document.createElement("ul");
			lessonsList.appendChild(lessonsListUl);
			lessonsListUl.style.maxHeight = "inherit";
			lessonsListUl.classList.add("bellow-border");

			if (lessons) {
				//setup list of material for current reviews
				if (lessons["data"]) {
					if (radicalList.length === 0 || kanjiList.length === 0 || vocabList.length === 0) {
						const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading Subjects...");
						const loadingElem = loadingVal[0];
						lessonsListUl.appendChild(loadingElem);
	
						loadItemsLists(() => {
							displayAssignmentMaterials(lessons["data"], lessonsListUl, loadingElem);
							clearInterval(loadingVal[1]);
						});
					}
					else
						displayAssignmentMaterials(lessons["data"], lessonsListUl);
				}
			}
		});
	}

	// clicked outside side panel
	const sidePanel = document.getElementsByClassName("side-panel")[0];
	if (sidePanel && sidePanel.classList.contains("side-panel-focus") && (targetElem.closest("#main") || targetElem.closest("#footer") || targetElem.closest("#secPageMain") || (targetElem.closest("body") && !targetElem.closest(".side-panel")))) {
		const sidePanelLogo = document.getElementById("side-panel-logo");
		if (sidePanelLogo) {
			sidePanelLogo.dispatchEvent(new MouseEvent("click", {
				"view": window,
				"bubbles": true,
				"cancelable": false
			}));
		}
	}
});

document.addEventListener("input", e => {
	const target = e.target;

	if (target.classList.contains("settingsItemInput")) {
		if (target.type === "select-one") {
			const value = target.value;
			chrome.storage.local.get(["wkhighlight_settings"], data => {
				let settings = data["wkhighlight_settings"];
				if (!settings)
					settings = {};
				
				const settingsID = target.id.replace("settings-", "").split("-");
				const group = settingsID[0];
				const setting = settingsID[1];
	
				settings[group][setting] = value;
	
				switch(group) {
					case "kanji_details_popup":
						switch (setting) {
							case "random_subject":
								const randomSubjectType = document.getElementById("random-subject-type");
								if (randomSubjectType) {
									randomSubjectType.innerText = value.charAt(0);
	
									const img = randomSubjectType.parentElement.getElementsByTagName("img")[0];
									if (value === "Any") {
										img.setAttribute("data-item-id", "rand");
										randomSubjectType.style.removeProperty("background-color");
										randomSubjectType.style.removeProperty("filter");
									}
									else if (value === "Kanji") {
										img.setAttribute("data-item-id", "rand-kanji");
										randomSubjectType.style.backgroundColor = "var(--kanji-tag-color)";
										randomSubjectType.style.filter = "invert(1)";
									}
									else if (value === "Vocabulary") {
										img.setAttribute("data-item-id", "rand-vocab");
										randomSubjectType.style.backgroundColor = "var(--vocab-tag-color)";
										randomSubjectType.style.filter = "invert(1)";
									}
								}
								break;
						}
						break;
				}
	
				chrome.storage.local.set({"wkhighlight_settings":settings});
			});
		}

		if (target.type === "range") {
			const value = target.value;
			chrome.storage.local.get(["wkhighlight_settings"], data => {
				let settings = data["wkhighlight_settings"];
				if (!settings)
					settings = {};
				
				const settingsID = target.id.replace("settings-", "").split("-");
				const group = settingsID[0];
				const setting = settingsID[1];
	
				settings[group][setting] = value;

				switch(group) {
					case "kanji_details_popup":
						switch (setting) {
							case "popup_opacity":
								if (target.nextElementSibling)
									target.nextElementSibling.innerText = value/10;
								chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
									chrome.tabs.sendMessage(tabs[0].id, {popupOpacity:value}, () => window.chrome.runtime.lastError);
								});
								break;
						}
						break;
					case "miscellaneous":
						switch (setting) {
							case "extension_popup_width":
								if (target.nextElementSibling)
									target.nextElementSibling.innerText = value;
								document.documentElement.style.setProperty('--body-base-width', value+'px');
								break;
						}
				}
	
				chrome.storage.local.set({"wkhighlight_settings":settings});
			});
		}

	}
});

const sidePanelIconTargeted = (target, id) => target.id === id || (target.parentElement?.childNodes[0] && target.parentElement.childNodes[0].id === id) || target.childNodes[0]?.id === id;

const singleOptionCheck = (id, labelTitle, checked, description) => {
	const div = document.createElement("div");
	div.title = description;
	const label = document.createElement("label");
	div.appendChild(label);
	label.classList.add("settingsItemLabel");
	label.appendChild(document.createTextNode(labelTitle));
	label.htmlFor = id;

	const inputDiv = document.createElement("div");
	inputDiv.classList.add("checkbox_wrapper", "clickable");
	if (checked) inputDiv.classList.add("checkbox-enabled");
	div.appendChild(inputDiv);
	const checkbox = document.createElement("input");
	inputDiv.appendChild(checkbox);
	checkbox.checked = checked;
	checkbox.type = "checkbox";
	checkbox.id = id;
	checkbox.style.display = "none";
	checkbox.classList.add("settingsItemInput");
	const customCheckboxBall = document.createElement("div");
	inputDiv.appendChild(customCheckboxBall);
	customCheckboxBall.classList.add("custom-checkbox-ball");
	const customCheckboxBack = document.createElement("div");
	inputDiv.appendChild(customCheckboxBack);
	customCheckboxBack.classList.add("custom-checkbox-back");

	return div;
}

const selector = (id, labelTitle, options, defaultOption, description) => {
	const div = document.createElement("div");
	div.title = description;
	const label = document.createElement("label");
	div.appendChild(label);
	label.classList.add("settingsItemLabel");
	label.appendChild(document.createTextNode(labelTitle));
	label.htmlFor = id;

	const select = document.createElement("select");
	div.appendChild(select);
	select.id = id;
	select.classList.add("settingsItemInput", "select");
	options.forEach(value => {
		const option = document.createElement("option");
		select.appendChild(option);
		option.appendChild(document.createTextNode(value));

		if (value === defaultOption)
			option.selected = true;
	});

	return div;
}

const slider = (id, labelTitle, min, max, defaultOption, description) => {
	const div = document.createElement("div");
	div.title = description;
	const label = document.createElement("label");
	div.appendChild(label);
	label.classList.add("settingsItemLabel");
	label.appendChild(document.createTextNode(labelTitle));
	label.htmlFor = id;

	const sliderWrapper = document.createElement("div");
	div.appendChild(sliderWrapper);
	sliderWrapper.style.display = "flex";
	sliderWrapper.style.alignItems = "center";
	sliderWrapper.classList.add("slider");
	sliderWrapper.title = "Mouse Wheel: +1\x0DShift + Mouse Wheel: +10\x0DCtrl + Mouse Wheel: +100";
	const sliderElem = document.createElement("input");
	sliderElem.classList.add("settingsItemInput");
	sliderWrapper.appendChild(sliderElem);
	sliderElem.type = "range";
	sliderElem.min = min;
	sliderElem.max = max;
	sliderElem.value = defaultOption;
	sliderElem.id = id;
	const valueElem = document.createElement("span");
	sliderWrapper.appendChild(valueElem);
	valueElem.appendChild(document.createTextNode(defaultOption));

	sliderWrapper.addEventListener("wheel", e => {
		e.preventDefault();
		const up = e.deltaY < 0;
		let scale = 1;
		if (e.shiftKey) scale = 10;
		else if (e.ctrlKey) scale = 100;

		// use a loop to make be able to use ++, which maintains the numerical magnitue
		for (let i = 0; i < scale; i++) {
			if (up) sliderElem.value++;
			else sliderElem.value--;
		}
		
		sliderElem.dispatchEvent(new Event('input', {
			bubbles: true,
			cancelable: true,
		}));
	});

	return div;
}

const colorOption = (ids, labelTitle, defaultColors) => {
	const div = document.createElement("div");
	const label = document.createElement("label");
	div.appendChild(label);
	label.classList.add("settingsItemLabel");
	label.appendChild(document.createTextNode(labelTitle));

	const inputDiv = document.createElement("div");
	inputDiv.classList.add("checkbox_wrapper");
	inputDiv.style.display = "inline-flex";

	let index = 0;
	defaultColors.forEach(color => {
		const checkbox = document.createElement("input");
		div.appendChild(inputDiv);
		inputDiv.appendChild(checkbox);
		checkbox.value = color;
		checkbox.type = "color";
		checkbox.id = ids[index];
		checkbox.style.width = (80/(defaultColors.length))+"px";
		checkbox.classList.add("settingsItemInput", "clickable");
		index++;
	});

	return div;
}

const textInput = (id, iconSrc, placeholder, action) => {
	const searchArea = document.createElement("div");
	searchArea.classList.add("searchArea");

	const searchWrapper = document.createElement("div");
	searchWrapper.id = id+"InputWrapper";
	searchWrapper.classList.add("textInputWrapper");
	searchArea.appendChild(searchWrapper);

	const iconImg = document.createElement("img");
	iconImg.classList.add("textInputIcon");
	iconImg.src = iconSrc;
	searchWrapper.appendChild(iconImg);

	const textInput = document.createElement("input");
	textInput.type = "text";
	textInput.placeholder = placeholder;
	textInput.id = id+"Input";
	if (action) textInput.oninput = action;
	searchWrapper.appendChild(textInput);

	return searchArea;
}

document.addEventListener("keydown", e => {
	// if user hit Enter key
	if (e.key === "Enter")
		submitAction();

	const inputKey = document.getElementById("apiInput");
	if (inputKey)
		inputKey.value = inputKey.value.trim();

});

const searchSubject = (event, searchType) => {
	let wrapper = document.getElementById("searchResultItemWrapper");
	if (wrapper)
		wrapper.remove();

	const searchResultUL = document.createElement("ul");
	searchResultUL.id = "searchResultItemWrapper";

	if (!document.getElementById("searchResultWrapper")) {
		const searchResultWrapper = document.createElement("div");
		searchResultWrapper.id = "searchResultWrapper";
		document.getElementById("userInfoWrapper").appendChild(searchResultWrapper);
	}
	document.getElementById("searchResultWrapper").appendChild(searchResultUL);

	const input = event.tagName && event.tagName == "INPUT" ? event : event.target; 
	let type;
	if (searchType)
		type = searchType;
	else
		type = document.getElementById("kanjiSearchType").innerText;
	
	const value = (type == "A" ? input.value : input.value.toLowerCase()).trim();

	let filteredKanji = [];
	let filteredVocab = [];


	chrome.storage.local.get(["wkhighlight_settings"], result => {
		const settings = result["wkhighlight_settings"];
		if (settings && settings["search"]) {
			if (type == "A") {
				input.value = convertToKana(input.value);
			
				// if it is hiragana
				if (input.value.match(/[\u3040-\u309f]/)) {
					const filterByReadings = (itemList, value) => itemList.filter(item => matchesReadings(value, item["readings"], settings["search"]["targeted_search"]));
					filteredKanji = filterByReadings(kanjiList, input.value);
					filteredVocab = filterByReadings(vocabList, input.value);
				}
			}
			else {
				// if it is a chinese character
				if (value.match(/[\u3400-\u9FBF]/)) {
					filteredKanji = filteredKanji.concat(kanjiList.filter(kanji => value == kanji["characters"]));
					if (filteredKanji.length > 0 && !settings["search"]["targeted_search"]) {
						const mainKanji = filteredKanji[0];
						mainKanji["visually_similar_subject_ids"].forEach(id => filteredKanji.push(kanjiList.filter(kanji => kanji.id==id)[0]));
						mainKanji["amalgamation_subject_ids"].forEach(id => filteredVocab.push(vocabList.filter(vocab => vocab.id == id)[0]));
					}
					filteredVocab = filteredVocab.concat(vocabList.filter(vocab => value == vocab["characters"]));
					if (filteredVocab.length > 0) {
						filteredVocab[0]["component_subject_ids"].forEach(id => filteredKanji.push(kanjiList.filter(kanji => kanji.id==id)[0]));
					}
				}
				// if is number check for level
				else if (!isNaN(value)) {
					const filterByLevel = (itemList, value) => itemList.filter(item => value == item["level"]);
					filteredKanji = filterByLevel(kanjiList, value);
					filteredVocab = filterByLevel(vocabList, value);
				}
				else {
					const filterByMeanings = (itemList, value) => itemList.filter(item => matchesMeanings(value, item["meanings"], settings["search"]["targeted_search"]));
					const cleanInput = input.value.toLowerCase().trim();
					filteredKanji = filterByMeanings(kanjiList, cleanInput);
					filteredVocab = filterByMeanings(vocabList, cleanInput);
				}
			}
		
			const nmrItemsFound = document.getElementById("nmrKanjiFound");
			if (nmrItemsFound) 
				nmrItemsFound.innerHTML = `<span>Found <strong>0</strong> items<span>`;
		
			if (filteredKanji.length > 0 || filteredVocab.length > 0) {
				const firstKanji = filteredKanji[0];
				const firstVocab = filteredVocab[0];
		
				const sortObjectByLevel = itemList => itemList.sort((a,b) => a["level"] > b["level"] ? 1 : -1);
				if (filteredKanji.length > 0) sortObjectByLevel(filteredKanji).unshift(firstKanji);
				if (filteredVocab.length > 0) sortObjectByLevel(filteredVocab).unshift(firstVocab);
				const filteredContent = [...new Set(filteredKanji.concat(filteredVocab))];
			
				if (nmrItemsFound) 
					nmrItemsFound.innerHTML = `<span>Found <strong>${filteredContent.length}</strong> items<span>`;
		
				for (const index in filteredContent) {
					const data = filteredContent[index];
					const type = data["type"];
					const chars = data["characters"];
		
					const kanjiAlike = type == "kanji" || chars.length == 1;
					const vocabAlike = type == "vocabulary" && chars.length > 1;	
					
					const li = document.createElement("li");
					li.classList.add("searchResultItemLine"); 
					searchResultUL.appendChild(li);
					li.setAttribute('data-item-id', data["id"]);
					if (data["srs_stage"])
						li.style.borderLeft = `4px solid var(--${srsStages[data["srs_stage"]]["short"].toLowerCase()}-color)`;
					
					const itemSpan = document.createElement("span");
					itemSpan.classList.add("searchResultItem");
		
					li.appendChild(itemSpan);
					itemSpan.appendChild(document.createTextNode(chars));
		
					if (vocabAlike)
						li.style.display = "inherit";
		
					const itemInfoWrapper = document.createElement("div");
					itemInfoWrapper.classList.add("searchResultItemInfo");
					li.appendChild(itemInfoWrapper);
					if (kanjiAlike)
						itemInfoWrapper.style.width = "100%";
					const level = document.createElement("span");
					itemInfoWrapper.appendChild(level);
					level.classList.add("searchResultItemLevel");
					level.appendChild(document.createTextNode(data["level"]));
					const meaning = document.createElement("span");
					itemInfoWrapper.appendChild(meaning);
					meaning.classList.add("searchResultItemTitle");
					meaning.appendChild(document.createTextNode(data["meanings"].join(", ")));
		
					if (type == "kanji") {
						const on = document.createElement("span");
						itemInfoWrapper.appendChild(on); 
						on.appendChild(document.createTextNode("on: "));
						on.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "onyomi").map(kanji => kanji.reading).join(", ")));
						const kun = document.createElement("span");
						itemInfoWrapper.appendChild(kun); 
						kun.appendChild(document.createTextNode("kun: "));
						kun.appendChild(document.createTextNode(data["readings"].filter(reading => reading.type == "kunyomi").map(kanji => kanji.reading).join(", ")));
					}
		
					if (type == "vocabulary") {
						const read = document.createElement("span");
						itemInfoWrapper.appendChild(read);
						read.appendChild(document.createTextNode(data["readings"].join(", ")));
					}

					// subject type
					const subjectType = document.createElement("div");
					li.appendChild(subjectType);
					let colorClass;
					if (type == "kanji")
						colorClass = "kanji_back";
					else if (type == "vocabulary")
						colorClass = "vocab_back";
					subjectType.classList.add("searchResultItemType", colorClass);
					
					// if it is not in list type
					if (settings["search"]["results_display"] != "searchResultOptionlist") {
						if (settings["search"]["results_display"] == "searchResultOptionmenu") {
							li.classList.add("searchResultItemSquare");
							subjectType.classList.add("searchResultItemType-small");
						}
						else if (settings["search"]["results_display"] == "searchResultOptiongrid") {
							li.classList.add("searchResultItemSquareSmall");
							subjectType.classList.add("searchResultItemType-tiny");
						}
						itemInfoWrapper.style.display = "none";
					}
					else
						subjectType.classList.add("searchResultItemType-normal");
				}

				if (settings["search"]["results_display"] != "searchResultOptionlist")
					document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(630, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
					
			}

		}
	});
}

const matchesMeanings = (input, meanings, precise) => {
	let expr;
	if (input.length > 3 && !precise) {
		expr = new RegExp(input, "g");
		for (const index in meanings) {
			if (expr.test(meanings[index].toLowerCase())) {
				return true;
			}
		}
	}
	else {
		expr = input;
		for (const index in meanings) {
			if (expr == meanings[index].toLowerCase()) {
				return true;
			}
		}
	}
	return false;
}

const matchesReadings = (input, readings, precise) => {
	if (!precise) {
		const expr = new RegExp(input, "g");
		for (const index in readings) {
			const reads = readings[index];
			if (expr.test(reads.reading ? reads.reading : reads)) {
				return true;
			}
		}
	}
	else {
		for (const index in readings) {
			const reads = readings[index];
			if ((reads.reading ? reads.reading : reads)  == input) {
				return true;
			}
		}
	}
	return false;
}

let lastValueForKanjiHighlighted = 0;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.nmrKanjiHighlighted) {
		let nmrKanjiHighlightedElem = document.getElementById("nmrKanjiHighlighted")?.getElementsByTagName("strong")[0];
		if (!nmrKanjiHighlightedElem) {
			const kanjiFoundWrapper = document.createElement("li");
			document.getElementById("userInfoNavbar")?.insertBefore(kanjiFoundWrapper, document.getElementById("userInfoNavbar").childNodes[0]);
			kanjiFoundWrapper.classList.add("resizable");
			kanjiFoundWrapper.style.maxHeight = defaultSettings["sizes"]["highlighted_kanji_height"]+"px";
			chrome.storage.local.get(["wkhighlight_settings"], result => {
				if (result["wkhighlight_settings"] && result["wkhighlight_settings"]["sizes"])
					kanjiFoundWrapper.style.maxHeight = result["wkhighlight_settings"]["sizes"]["highlighted_kanji_height"]+"px";
			});
			const resizableS = document.createElement("div");
			kanjiFoundWrapper.appendChild(resizableS);
			resizableS.classList.add("resizable-s");
			const kanjiFound = document.createElement("div");
			kanjiFoundWrapper.appendChild(kanjiFound);
			kanjiFound.id = "nmrKanjiHighlighted";
			kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${request.nmrKanjiHighlighted}</strong> (in the page)`;
			const kanjiFoundBar = document.createElement("div");
			kanjiFoundWrapper.appendChild(kanjiFoundBar);
			const kanjiFoundList = document.createElement("div");
			kanjiFoundWrapper.appendChild(kanjiFoundList);
			kanjiFoundList.id = "kanjiHighlightedList";
			kanjiFoundList.classList.add("simple-grid");
			const kanjiFoundUl = document.createElement("ul");
			kanjiFoundList.appendChild(kanjiFoundUl);
		}
		else {
			const currentValue = parseInt(nmrKanjiHighlightedElem.innerText);
			if (typeof currentValue === "number" && !isNaN(currentValue) && request.nmrKanjiHighlighted != lastValueForKanjiHighlighted) {
				counterAnimation(currentValue, request.nmrKanjiHighlighted, nmrKanjiHighlightedElem, 50);
				lastValueForKanjiHighlighted = request.nmrKanjiHighlighted;
			}
		}
	}
	if (request.kanjiHighlighted) {
		chrome.storage.local.get(["wkhighlight_kanji_assoc"], result => {
			const kanjiAssoc = result["wkhighlight_kanji_assoc"];
			const kanjiHighlightedList = request.kanjiHighlighted;
			const kanjiFoundList = document.getElementById("kanjiHighlightedList");
			if (kanjiFoundList) {
				kanjiFoundList.childNodes[0].remove();
				const kanjiFoundUl = document.createElement("ul");
				kanjiFoundList.appendChild(kanjiFoundUl);
				const learned = kanjiHighlightedList["learned"];
				const notLearned = kanjiHighlightedList["notLearned"];
				[learned, notLearned].forEach(type => {
					type.forEach(kanji => {
						const kanjiFoundLi = document.createElement("li");
						kanjiFoundUl.appendChild(kanjiFoundLi);
						kanjiFoundLi.classList.add("clickable", "kanjiDetails", type === learned ? "kanjiHighlightedLearned" : "kanjiHighlightedNotLearned");
						kanjiFoundLi.appendChild(document.createTextNode(kanji));
						if (kanjiAssoc) kanjiFoundLi.setAttribute("data-item-id", kanjiAssoc[kanji]);
					});
				});
			}
		});
	}

	// if (request.uptime) {
	// 	const wrapper = document.getElementById("scriptsUptime");
	// 	switch(request.uptime) {
	// 		case "Highlight":
	// 			wrapper.getElementsByTagName("DIV")[0].style.backgroundColor = "#80fd80";
	// 			break;

	// 		case "Details Popup":
	// 			wrapper.getElementsByTagName("DIV")[1].style.backgroundColor = "#80fd80";
	// 			break;
	// 	}
	// }
});

const setupSubjectsLists = (callback) => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allvocab", "wkhighlight_allradicals"], result => {
		const allKanji = result["wkhighlight_allkanji"];
		const allVocab = result["wkhighlight_allvocab"];
		const allRadicals = result["wkhighlight_allradicals"];

		if (allKanji && kanjiList.length == 0) {
			for (const index in allKanji) {
				const kanji = allKanji[index];
				const list = {
					"type" : "kanji",
					"id": index, 
					"characters": kanji["characters"],
					"meanings": kanji["meanings"],
					"level": kanji["level"],
					"readings": kanji["readings"],
					"visually_similar_subject_ids": kanji["visually_similar_subject_ids"],
					"amalgamation_subject_ids": kanji["amalgamation_subject_ids"],
				};
				if (kanji["srs_stage"])
					list["srs_stage"] = kanji["srs_stage"];
				kanjiList.push(list);
			}
		}
		if (allVocab && vocabList.length == 0) {
			for (const index in allVocab) {
				const vocab = allVocab[index];
				const list = {
					"type" : "vocabulary",
					"id": index,
					"characters": vocab["characters"],
					"meanings": vocab["meanings"],
					"meaning_mnemonic": vocab["meaning_mnemonic"],
					"level": vocab["level"],
					"readings": vocab["readings"],
					"reading_mnemonic": vocab["reading_mnemonic"],
					"component_subject_ids": vocab["component_subject_ids"],
					"context_sentences" : vocab["context_sentences"],
				};
				if (vocab["srs_stage"])
					list["srs_stage"] = vocab["srs_stage"];
				vocabList.push(list);
			}
		}
		if (allRadicals && radicalList.length == 0) {
			for (const index in allRadicals) {
				const radical = allRadicals[index];
				const list = {
					"type" : "vocabulary",
					"id": index,
					"meanings": radical["meanings"],
					"characters": radical["characters"] ? radical["characters"] : `<img height="22px" style="margin-top:-3px;margin-bottom:-4px;padding-top:8px" src="${radical["character_images"].filter(image => image["content_type"] == "image/png")[0]["url"]}"><img>`,
					"level": radical["level"],
				};
				if (radical["srs_stage"])
					list["sts_stage"] = radical["srs_stage"];
				radicalList.push(list);
			}
		}

		if (callback)
			callback();
	});
}

const loadItemsLists = callback => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allvocab", "wkhighlight_allradicals"], result => {
		const allKanji = result["wkhighlight_allkanji"];
		const allVocab = result["wkhighlight_allvocab"];
		const allRadicals = result["wkhighlight_allradicals"];

		if (!allRadicals || !allKanji || !allVocab) {
			Promise.all([setupKanji(apiKey), setupRadicals(apiKey), setupVocab(apiKey)])
				.then(values => {
					setupSubjectsLists(callback);
					
					const allKanji = values[0][0];
					const allRadicals = values[1][0];
					const allVocab = values[2][0];
					
					// associate assignments and stats info to subjects
					[allKanji, allRadicals, allVocab].forEach(list => {
						if (list) {
							assignUponSubjects(list);
							revStatsUponSubjects(apiKey, list);
						}
					});
				});
		}
		else
			setupSubjectsLists(callback);
	});
}

const loading = (wrapperClasses, iconClasses, size, message) => {
	const wrapper = document.createElement("div");
	wrapper.style.textAlign = "center";
	if (wrapperClasses)
		wrapperClasses.forEach(className => wrapper.classList.add(className));

	// Common and uncommon kanji ( 4e00 - 9faf)
	const img = document.createElement("div");
	wrapper.appendChild(img);
	// get random hexadecimal number from 0x4e00 to 9faf
	const randHex = rand(parseInt("4e00", 16), parseInt("9faf", 16)).toString(16);
	img.innerHTML = String.fromCharCode(`0x${randHex}`);
	if (iconClasses)
		iconClasses.forEach(className => img.classList.add(className));
	img.style.fontSize = `${size}px`;
	
	let counter = rand(0, 360);
	const interval = setInterval(() => {
		if (counter == 360)
			counter = 0;
		
		img.style.filter="hue-rotate("+(counter++)+"deg)";
	}, 4);

	if (message) {
		const messageWrapper = document.createElement("p");
		wrapper.appendChild(messageWrapper);
		messageWrapper.style.textAlign = "center";
		messageWrapper.style.marginTop = "20px";
		messageWrapper.style.fontWeight = "bold";
		messageWrapper.style.fontSize = "13px";
		messageWrapper.appendChild(document.createTextNode(message));
	}

	return [wrapper, interval];
}

document.addEventListener("keydown", e => {
	const key = e.key;

	// shortcut keys for REVIEWS PAGE
	const futureReviewsWrapper = document.getElementById("futureReviewsWrapper");
	if (futureReviewsWrapper) {
		const leftArrow = futureReviewsWrapper.getElementsByTagName("I")[0];
		const rightArrow = futureReviewsWrapper.getElementsByTagName("I")[1];
		if (key === 'ArrowLeft' && !leftArrow.classList.contains("hidden")) {
			leftArrow.dispatchEvent(new MouseEvent("click", {
				"view": window,
				"bubbles": true,
				"cancelable": false
			}));
		}

		if (key === 'ArrowRight' && !rightArrow.classList.contains("hidden")) {
			rightArrow.dispatchEvent(new MouseEvent("click", {
				"view": window,
				"bubbles": true,
				"cancelable": false
			}));
		}
	}
});
