let kanjiList = [];
let vocabList = [];
let radicalList = [];
let activeTab;

let settings;

let reviews, lessons, reviewsChart;

let apiKey;

let atWanikani = false;

let lastLessonsValue = 0;
let lastReviewsValue = 0;

let blacklisted_site = false;

let itemsListLoadingElem;

let homePage;

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
	
	const logoWrapper = document.createElement("div");
	wrapper.appendChild(logoWrapper);
	logoWrapper.classList.add("logo-section");
	const logo = document.createElement("img");
	logoWrapper.appendChild(logo);
	logo.src = "../logo/logo.png";
	const extensionTitle = document.createElement("p");
	logoWrapper.appendChild(extensionTitle);
	extensionTitle.appendChild(document.createTextNode("Wanikani Kanji Highlighter"));

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

	const version = document.createElement("p");
	wrapper.appendChild(version);
	version.style.textAlign = "center";
	version.style.color = "silver";
	version.style.marginTop = "5px";
	reposFirstVersion("digas99", "wanikani-kanji-highlighter").then(result => version.appendChild(document.createTextNode(result)));

	return wrapper;
}

window.onload = () => {
	const main = document.createElement("div");
	main.id = "main";
	document.body.appendChild(main);

	const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading account info...");
	const loadingElem = loadingVal[0];
	main.appendChild(loadingElem);

	chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_blacklist", "wkhighlight_settings", "wkhighlight_userInfo_updated","wkhighlight_summary_updated", "wkhighlight_reviews", "wkhighlight_lessons", "wkhighlight_kanji_progress", "wkhighlight_kanji_levelsInProgress", "wkhighlight_radical_progress", "wkhighlight_radical_levelsInProgress", "wkhighlight_vocabulary_progress", "wkhighlight_vocabulary_levelsInProgress", "wkhighlight_settings", "wkhighlight_allkanji_size", "wkhighlight_allradicals_size", "wkhighlight_allvocab_size", "wkhighlight_blacklist", "wkhighlight_kanji_assoc"], response => {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			activeTab = tabs[0];
			chrome.tabs.sendMessage(activeTab.id, {windowLocation: "origin"}, urlValue => {
				const url = urlValue ? urlValue["windowLocation"] : "";

				settings = response["wkhighlight_settings"];
				if (settings && settings["miscellaneous"] && settings["miscellaneous"]["extension_popup_width"])
					document.documentElement.style.setProperty('--body-base-width', settings["miscellaneous"]["extension_popup_width"]+"px");

				if (settings && settings["home_page"] && settings["home_page"]["page"])
					homePage = settings["home_page"]["page"];

				atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url);

				blacklisted_site = blacklisted(response["wkhighlight_blacklist"], url);

				apiKey = response["wkhighlight_apiKey"];
				// if the user did not add a key yet
				if (!apiKey) {
					// remove loading animation
					loadingElem.remove();
					clearInterval(loadingVal[1]);
					
					chrome.action.setBadgeText({text: '', tabId:activeTab.id});

					// key input
					const apiInputWrapper = document.createElement("div");
					apiInputWrapper.classList.add("apiKey_wrapper");
					main.appendChild(apiInputWrapper);

					const logoWrapper = document.createElement("div");
					apiInputWrapper.appendChild(logoWrapper);
					logoWrapper.classList.add("logo-section");
					const logo = document.createElement("img");
					logoWrapper.appendChild(logo);
					logo.src = "../logo/logo.png";
					const extensionTitle = document.createElement("p");
					logoWrapper.appendChild(extensionTitle);
					extensionTitle.appendChild(document.createTextNode("Wanikani Kanji Highlighter"));

					const apiLabel = document.createElement("p");
					apiLabel.style.marginBottom = "10px";
					apiLabel.style.marginLeft = "10px";
					apiLabel.style.fontSize = "16px";
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
					whatIsAPIKey.style.marginTop = "10px";
					whatIsAPIKey.style.textAlign = "center";
					apiInputWrapper.appendChild(whatIsAPIKey);
					const whatIsAPIKeyLink = document.createElement("a");
					whatIsAPIKeyLink.href = "#";
					whatIsAPIKeyLink.id = "whatIsAPIKey";
					whatIsAPIKeyLink.appendChild(document.createTextNode("What is an API Key?"));
					whatIsAPIKey.appendChild(whatIsAPIKeyLink);

					const version = document.createElement("p");
					apiInputWrapper.appendChild(version);
					version.style.textAlign = "center";
					version.style.color = "silver";
					version.style.marginTop = "5px";
					reposFirstVersion("digas99", "wanikani-kanji-highlighter").then(result => version.appendChild(document.createTextNode(result)));
				}
				else {
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
					const date = response["wkhighlight_userInfo_updated"] ? response["wkhighlight_userInfo_updated"] : formatDate(new Date());

					modifiedSince(apiKey, date, "https://api.wanikani.com/v2/user")
						.then(modified => {
							const userInfo = response["wkhighlight_userInfo"]["data"];	
							
							// remove loading animation
							loadingElem.remove();
							clearInterval(loadingVal[1]);

							// if user info has been updated in wanikani, then update cache
							if (!userInfo || modified)
								fetchUserInfo(apiKey)
							
							if (userInfo) {
								const userInfoWrapper = document.createElement("div");
								userInfoWrapper.id = "userInfoWrapper";
								main.appendChild(userInfoWrapper);
	
								// messages if at wanikani or site blacklisted
								if (atWanikani) userInfoWrapper.appendChild(enhancedWarning("Limited features at wanikani, sorry!", "var(--wanikani)"));
								else if (blacklisted_site) userInfoWrapper.appendChild(enhancedWarning("Site blacklisted by you!", "red"));

								// scripts uptime
								if (response["wkhighlight_settings"] && response["wkhighlight_settings"]["extension_popup_interface"] ? response["wkhighlight_settings"]["extension_popup_interface"]["scripts_status"] : settingsInterface["extension_popup_interface"]["scripts_status"]) {
									const scriptsUptimeWrapper = document.createElement("div");
									userInfoWrapper.appendChild(scriptsUptimeWrapper);
									scriptsUptimeWrapper.title = "Scripts Uptime Status";
									scriptsUptimeWrapper.id = "scriptsUptime";
									const scriptsUptimeUl = document.createElement("ul");
									scriptsUptimeWrapper.appendChild(scriptsUptimeUl);
									chrome.tabs.query({currentWindow: true, active: true}, tabs => {
										["Highlighter", "Details Popup"].forEach(script => {
											const scriptsUptimeLi = document.createElement("li");
											scriptsUptimeUl.appendChild(scriptsUptimeLi);
											scriptsUptimeLi.appendChild(document.createTextNode(script));
											const scriptsUptimeSignal = document.createElement("div");
											scriptsUptimeLi.appendChild(scriptsUptimeSignal);

											chrome.tabs.sendMessage(tabs[0].id, {uptime: script}, response => {
												if (response) scriptsUptimeSignal.style.backgroundColor = "#80fd80";
											});
										});
									});
								}

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
								const sideUserInfoWrapper = document.createElement("div");
								container.appendChild(sideUserInfoWrapper);
								sideUserInfoWrapper.classList.add("clickable");
								sideUserInfoWrapper.id = "profile";
								const avatarWrapper = document.createElement("div");
								sideUserInfoWrapper.appendChild(avatarWrapper);
								avatarWrapper.style.marginTop = "10px";
								const avatar = document.createElement("img");
								avatarWrapper.appendChild(avatar);
								avatar.title = userInfo["username"];
								avatar.src = "/images/wanikani-default.png";
								// get user avatar
								if (!userInfo["avatar"]) {
									fetch("https://www.wanikani.com/users/"+userInfo["username"])
										.then(result => result.text())
										.then(content => {
											const parser = new DOMParser();
											const doc = parser.parseFromString(content, 'text/html');
											const avatarElem = doc.getElementsByClassName("avatar user-avatar-default")[0];
											const avatarSrc = "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0];
											userInfo["avatar"] = avatarSrc;
											avatar.src = userInfo["avatar"];
											chrome.storage.local.set({"wkhighlight_userInfo":response["wkhighlight_userInfo"]});
										});
								}
								else
									avatar.src = userInfo["avatar"];
								avatar.style.borderRadius = "50%";
								avatar.style.border = "3px solid white";
								avatar.style.width = "26px";
								const level = document.createElement("p");
								sideUserInfoWrapper.appendChild(level);
								level.style.fontWeight = "bold";
								level.style.color = "#ccc";
								level.title = "Level";
								level.id = "user-level";
								level.appendChild(document.createTextNode(userInfo["level"]));
								sideUserInfoWrapper.addEventListener("click", () => {
									Array.from(document.getElementsByClassName("side-panel")[0].getElementsByClassName("disabled")).forEach(elem => elem.classList.remove("disabled"));

									const content = secondaryPage("Profile");

									const levelsChooser = document.createElement("div");
									content.appendChild(levelsChooser);
									levelsChooser.classList.add("levels-chooser-wrapper");
									const cover = document.createElement("div");
									levelsChooser.appendChild(cover);
									cover.classList.add("levels-chooser-cover");
									const avatarWrapper = document.createElement("div");
									levelsChooser.appendChild(avatarWrapper);
									avatarWrapper.style.padding = "15px";
									avatarWrapper.style.position = "absolute";
									avatarWrapper.style.zIndex = "1";
									const userHandler = document.createElement("div");
									levelsChooser.appendChild(userHandler);
									userHandler.appendChild(document.createTextNode(userInfo["username"]));
									userHandler.style.position = "absolute";
									userHandler.style.left = "170px";
									userHandler.style.top = "110px";
									userHandler.style.fontSize = "17px";
									userHandler.style.color = "white";
									const profileEditWrapper = document.createElement("div");
									levelsChooser.appendChild(profileEditWrapper);
									profileEditWrapper.style.position = "absolute";
									profileEditWrapper.style.right = "15px";
									profileEditWrapper.style.top = "115px";
									profileEditWrapper.style.filter = "invert(1)";
									profileEditWrapper.style.zIndex = "1";
									profileEditLink = document.createElement("a");
									profileEditWrapper.appendChild(profileEditLink);
									profileEditLink.href = "https://www.wanikani.com/settings/profile";
									profileEditLink.target = "a_blank";
									profileEditLink.title = "https://www.wanikani.com/settings/profile";
									profileEdit = document.createElement("img");
									profileEditLink.appendChild(profileEdit);
									profileEdit.src = "../images/edit.png";
									profileEdit.style.width = "14px";
									const avatarLink = document.createElement("a");
									avatarWrapper.appendChild(avatarLink);
									avatarLink.href = userInfo["profile_url"];
									avatarLink.title = userInfo["profile_url"];
									avatarLink.target = "_blank";
									const avatar = document.createElement("img");
									avatarLink.appendChild(avatar);
									avatar.src = userInfo["avatar"] ? userInfo["avatar"] : "/images/wanikani-default.png";
									avatar.style.borderRadius = "50%";
									avatar.style.border = "4px solid white";
									avatar.style.width = "140px";

									const levels_chooser = levelValue => {
										const wrapper = document.createElement("ul");
										wrapper.classList.add("levels-chooser");
										[
											levelValue > 1 ? levelValue-1 : " ",
											levelValue,
											levelValue < 60 ? levelValue+1 : " "
										].forEach((level, i) => {
											const levelWrapper = document.createElement("li");
											wrapper.appendChild(levelWrapper);
											const levelContent = document.createElement("div");
											levelWrapper.appendChild(levelContent);
											levelContent.appendChild(document.createTextNode(level));
											levelContent.style.width = "100%";
											levelWrapper.title = i == 0 ? "Previous" : i == 2 ? "Next" : "";
										});	
										return wrapper;
									}

									const levelsList = levels_chooser(Number(userInfo["level"]));
									levelsChooser.appendChild(levelsList);
									levelsList.style.paddingTop = "175px";

									const levelProgressWrapper = document.createElement("div");
									levelsChooser.appendChild(levelProgressWrapper);
									levelProgressWrapper.style.padding = "15px 35px";
									const levelProgressBarTitle = document.createElement("p");
									levelProgressWrapper.appendChild(levelProgressBarTitle);
									levelProgressBarTitle.style.fontSize = "16px";
									levelProgressBarTitle.style.marginBottom = "10px";
									levelProgressBarTitle.style.paddingLeft = "10px";
									levelProgressBarTitle.appendChild(document.createTextNode("Level Progress"));
									const levelProgress = document.createElement("div");
									levelProgressWrapper.appendChild(levelProgress);
									levelProgress.classList.add("level-progress-bar");
									const goDownArrowWrapper = document.createElement("div");
									levelsChooser.appendChild(goDownArrowWrapper);
									goDownArrowWrapper.style.padding = "15px 35px";
									goDownArrowWrapper.style.textAlign = "center";
									goDownArrowWrapper.classList.add("clickable");
									goDownArrowWrapper.title = "Scroll Down";
									const  goDownArrow = document.createElement("i");
									goDownArrowWrapper.appendChild(goDownArrow);
									goDownArrow.classList.add("down");
									goDownArrow.style.borderColor = "white";
									goDownArrow.style.padding = "8px";
									goDownArrowWrapper.addEventListener("click", () => window.scroll(0, 420));

									let initialSetup = true;
									const level_subjects = (levelValue, levelProgressBar) => {
										const createMenuIcons = (icons, id, wrapper, contentWrapper) => {
											const menuIcons = document.createElement("div");
											menuIcons.classList.add("menu-icons");
											menuIcons.setAttribute("data-id", id);

											settings_menus = settings["profile_menus"] ? settings["profile_menus"] : defaultSettings["profile_menus"];

											icons.forEach(key => {
												const img = document.createElement("img");
												menuIcons.appendChild(img);
												img.src = `../images/${key}.png`;
												img.classList.add("clickable");
												img.title = key.charAt(0).toUpperCase()+key.substring(1);
												
												let menuWrapper;
												img.addEventListener("click", () => {
													// close all opened menus except this one
													Array.from(document.getElementsByClassName("menu-popup")).forEach(popup => {
														if (popup !== menuWrapper)
															popup.remove();
													});

													if (wrapper.lastChild.classList.contains("menu-popup")) {
														menuWrapper.style.maxHeight = "0px";
														setTimeout(() => {
															if (wrapper && wrapper.lastChild && wrapper.lastChild.classList.contains("menu-popup"))
																wrapper.lastChild.remove();
														}, 300);
													}
													else {
														menuWrapper = document.createElement("div");
														if (!initialSetup)
															wrapper.appendChild(menuWrapper);
														menuWrapper.classList.add("menu-popup");
														menuWrapper.style.maxHeight = "0px";
														setTimeout(() => menuWrapper.style.maxHeight = "200px", 100);
														const menuTitle = document.createElement("p");
														menuWrapper.appendChild(menuTitle);
														menuTitle.appendChild(document.createTextNode(img.title));
														const menu = document.createElement("ul");
														menuWrapper.appendChild(menu);
														const contentWrapperUl = Array.from(contentWrapper.getElementsByTagName("UL"));
														let subjects = Array.from(contentWrapper.getElementsByTagName("li"));
														switch(key) {
															case "sort":
																let typeDefault, directionDefault;

																const sortings = (value, direction) => {
																	switch(value) {
																		case "SRS Stage":
																			contentWrapperUl.forEach(wrapper => {
																				Array.from(wrapper.getElementsByTagName("LI")).sort((a, b) => Number((direction == "Descending" ? b : a).getAttribute("data-srs")) - Number((direction == "Descending" ? a : b).getAttribute("data-srs")))
																					.forEach(elem => wrapper.appendChild(elem));
																			});
																			break;
																		case "Next Review":
																			contentWrapperUl.forEach(wrapper => {
																				Array.from(wrapper.getElementsByTagName("LI"))
																					.filter(elem => elem.getAttribute("data-available_at"))
																					.sort((a, b) => new Date((direction == "Descending" ? b : a).getAttribute("data-available_at")) - new Date((direction == "Descending" ? a : b).getAttribute("data-available_at")))
																					.forEach(elem => wrapper.appendChild(elem));
																				
																				Array.from(wrapper.getElementsByTagName("LI"))
																					.filter(elem => !elem.getAttribute("data-available_at"))
																					.forEach(elem => wrapper.appendChild(elem));
																			});
																			break;
																	}
																}

																// types
																const sort = document.createElement("li");
																menu.appendChild(sort);
																const sortLabel = document.createElement("label");
																sort.appendChild(sortLabel);
																sortLabel.appendChild(document.createTextNode("Type"));
																const sortSelect = document.createElement("select");
																sort.appendChild(sortSelect);
																sortSelect.classList.add("select");
																sortSelect.style.width = "auto";
																["None", "SRS Stage", "Next Review"].forEach(option => {
																	const sortOption = document.createElement("option");
																	sortSelect.appendChild(sortOption);
																	sortOption.appendChild(document.createTextNode(option));
																});

																sortSelect.addEventListener("input", e => {
																	const value = e.target.value;
																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-sort-type", value));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["sort"]["type"] = value);
																	}
																	else {
																		menuIcons.setAttribute("data-sort-type", value);
																		settings_menus[id]["sort"]["type"] = value;
																	}	

																	sortings(value, menuIcons.getAttribute("data-sort-direction"));

																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																typeDefault = menuIcons.getAttribute("data-sort-type") ? menuIcons.getAttribute("data-sort-type") : settings_menus[id]["sort"]["type"];
																if (typeDefault)
																	sortSelect.value = typeDefault;

																// direction
																const direction = document.createElement("li");
																menu.appendChild(direction);
																const directionLabel = document.createElement("label");
																direction.appendChild(directionLabel);
																directionLabel.appendChild(document.createTextNode("Direction"));
																const directionSelect = document.createElement("select");
																direction.appendChild(directionSelect);
																directionSelect.classList.add("select");
																directionSelect.style.width = "auto";
																["Ascending", "Descending"].forEach(option => {
																	const directionOption = document.createElement("option");
																	directionSelect.appendChild(directionOption);
																	directionOption.appendChild(document.createTextNode(option));
																});
																directionSelect.addEventListener("input", e => {
																	const value = e.target.value;
																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-sort-direction", value));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["sort"]["direction"] = value);
																	}
																	else {
																		menuIcons.setAttribute("data-sort-direction", value);
																		settings_menus[id]["sort"]["direction"] = value;
																	}
																	
																	if (menuIcons.getAttribute("data-sort-type"))
																		sortings(menuIcons.getAttribute("data-sort-type"), value);

																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																directionDefault = menuIcons.getAttribute("data-sort-direction") ? menuIcons.getAttribute("data-sort-direction") : settings_menus[id]["sort"]["direction"];
																if (directionDefault)
																	directionSelect.value = directionDefault;

																if (initialSetup)
																	sortings(typeDefault, directionDefault);

																break;
															case "filter":
																let srsDefault, stateDefault;

																const filters = (srs, state) => {
																	if (srs !== "None") {
																		Array.from(subjects).forEach(elem => {
																			const srsChecker = srs !== "None" && (elem.getAttribute("data-srs") == "-1" && srs !== "Locked" || elem.getAttribute("data-srs") !== "-1" && srs !== srsStages[elem.getAttribute("data-srs")]["name"]);
																			if (srsChecker)
																				elem.style.display = "none";
																		});
																	}

																	if (state !== "None") {
																		Array.from(subjects).forEach(elem => {
																			const stateChecker = state !== "None" && (state !== (elem.getElementsByClassName("passed-subject-check").length > 0 ? "Passed" : "Not Passed"));
																			if (stateChecker)
																				elem.style.display = "none";
																		});
																	}
																}

																// srs stage
																const srsStage = document.createElement("li");
																menu.appendChild(srsStage);
																const srsStageLabel = document.createElement("label");
																srsStage.appendChild(srsStageLabel);
																srsStageLabel.appendChild(document.createTextNode("SRS Stage"));
																const srsStageSelect = document.createElement("select");
																srsStage.appendChild(srsStageSelect);
																srsStageSelect.classList.add("select");
																srsStageSelect.style.width = "auto";
																[...["None", "Locked"], ...Object.values(srsStages).map(value => value.name)].forEach(option => {
																	const srsStageOption = document.createElement("option");
																	srsStageSelect.appendChild(srsStageOption);
																	srsStageOption.appendChild(document.createTextNode(option));
																});
																srsStageSelect.addEventListener("input", e => {
																	const value = e.target.value;
																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-filter-srs_stage", value));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["filter"]["srs_stage"] = value);
																	}
																	else {
																		menuIcons.setAttribute("data-filter-srs_stage", value);
																		settings_menus[id]["filter"]["srs_stage"] = value;
																	}
																	subjects.forEach(elem => elem.style.removeProperty("display"));

																	filters(value, menuIcons.getAttribute("data-filter-state") ? menuIcons.getAttribute("data-filter-state") : "None");
																	
																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																srsDefault = menuIcons.getAttribute("data-filter-srs_stage") ? menuIcons.getAttribute("data-filter-srs_stage") : settings_menus[id]["filter"]["srs_stage"];
																if (srsDefault)
																	srsStageSelect.value = srsDefault;

																// state
																const state = document.createElement("li");
																menu.appendChild(state);
																const stateLabel = document.createElement("label");
																state.appendChild(stateLabel);
																stateLabel.appendChild(document.createTextNode("State"));
																const stateSelect = document.createElement("select");
																state.appendChild(stateSelect);
																stateSelect.classList.add("select");
																stateSelect.style.width = "auto";
																["None", "Passed", "Not Passed"].forEach(option => {
																	const stateOption = document.createElement("option");
																	stateSelect.appendChild(stateOption);
																	stateOption.appendChild(document.createTextNode(option));
																});
																stateSelect.addEventListener("input", e => {
																	const value = e.target.value;
																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-filter-state", value));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["filter"]["state"] = value);
																	}
																	else {
																		menuIcons.setAttribute("data-filter-state", value);
																		settings_menus[id]["filter"]["state"] = value;
																	}
																	subjects.forEach(elem => elem.style.removeProperty("display"));

																	filters(menuIcons.getAttribute("data-filter-srs_stage") ? menuIcons.getAttribute("data-filter-srs_stage") : "None", value);
																
																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																stateDefault = menuIcons.getAttribute("data-filter-state") ? menuIcons.getAttribute("data-filter-state") : settings_menus[id]["filter"]["state"];
																if (stateDefault)
																	stateSelect.value = stateDefault;

																if (initialSetup)
																	filters(srsDefault, stateDefault);

																break;
															case "menu":
																let colorDefault, reviewsInfoDefault;

																const color_subjects = value => {
																	switch(value) {
																		case "Subject Type":
																			subjects.forEach(elem => elem.style.removeProperty("background-color"));
																			break;
																		case "SRS Stage":
																			subjects.forEach(elem => {
																				if (elem.getAttribute("data-srs")) {
																					let backColor;
																					if (elem.getAttribute("data-srs") == "-1") {
																						backColor = "#000000";
																						elem.style.setProperty("background-color", backColor, "important");
																					}
																					else {
																						backColor = settings && settings["appearance"] ? settings["appearance"][srsStages[elem.getAttribute("data-srs")]["short"].toLowerCase()+"_color"] : srsStages[elem.getAttribute("data-srs")]["color"];
																						elem.style.setProperty("background-color", backColor, "important");
																					}
																					backColor = hexToRGB(backColor);
																					elem.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);
																				}
																			});
																			break;
																	}
																}

																// color by
																const colorBy = document.createElement("li");
																menu.appendChild(colorBy);
																const colorByLabel = document.createElement("label");
																colorBy.appendChild(colorByLabel);
																colorByLabel.appendChild(document.createTextNode("Color by"));
																const colorBySelect = document.createElement("select");
																colorBy.appendChild(colorBySelect);
																colorBySelect.classList.add("select");
																colorBySelect.style.width = "auto";
																["Subject Type", "SRS Stage"].forEach(option => {
																	const colorByOption = document.createElement("option");
																	colorBySelect.appendChild(colorByOption);
																	colorByOption.appendChild(document.createTextNode(option));
																});
																colorBySelect.addEventListener("input", e => {
																	const value = e.target.value;
																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-menu-color_by", value));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["menu"]["color_by"] = value);
																	}
																	else {
																		menuIcons.setAttribute("data-menu-color_by", value);
																		settings_menus[id]["menu"]["color_by"] = value;																	
																	}

																	color_subjects(value);

																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																colorDefault = menuIcons.getAttribute("data-filter-color_by") ? menuIcons.getAttribute("data-filter-color_by") : settings_menus[id]["menu"]["color_by"];
																if (colorDefault)
																	colorBySelect.value = colorDefault;

																if (initialSetup)
																	color_subjects(colorDefault);

																const show_reviews_info = (checkbox, checked) => {
																	if (!checked) {
																		checkbox.classList.remove("checkbox-enabled");
																		subjects.forEach(elem => {
																			if (elem.getElementsByClassName("reviews-info")[0])
																				elem.getElementsByClassName("reviews-info")[0].style.display = "none"; 
																		});
																	}
																	else {
																		checkbox.classList.add("checkbox-enabled");
																		subjects.forEach(elem => {
																			if (elem.getElementsByClassName("reviews-info")[0])
																				elem.getElementsByClassName("reviews-info")[0].style.removeProperty("display"); 
																		});
																	}
																}
																
																// show reviews info
																const reviewsInfo = document.createElement("li");
																menu.appendChild(reviewsInfo);
																const reviewsInfoLabel = document.createElement("label");
																reviewsInfo.appendChild(reviewsInfoLabel);
																reviewsInfoLabel.appendChild(document.createTextNode("Reviews info"));
																const inputDiv = document.createElement("div");
																inputDiv.classList.add("checkbox_wrapper", "clickable");
																reviewsInfo.appendChild(inputDiv);
																const checkbox = document.createElement("input");
																inputDiv.appendChild(checkbox);
																checkbox.type = "checkbox";
																if (menuIcons.getAttribute("data-menu-reviews_info") == "true") {
																	inputDiv.classList.add("checkbox-enabled");
																	checkbox.checked = true;
																}
																else if (menuIcons.getAttribute("data-menu-reviews_info") == "false")
																	checkbox.checked = false;
																checkbox.style.display = "none";
																const customCheckboxBall = document.createElement("div");
																inputDiv.appendChild(customCheckboxBall);
																customCheckboxBall.classList.add("custom-checkbox-ball");
																const customCheckboxBack = document.createElement("div");
																inputDiv.appendChild(customCheckboxBack);
																customCheckboxBack.classList.add("custom-checkbox-back");	
																inputDiv.addEventListener("click", () => {
																	checkbox.click();

																	if (contentWrapperUl.length > 1) {
																		Array.from(document.getElementsByClassName("menu-icons")).forEach(elem => elem.setAttribute("data-menu-reviews_info", checkbox.checked));
																		["all", "radical", "kanji", "vocabulary"].forEach(type => settings_menus[type]["menu"]["reviews_info"] = checkbox.checked);
																	}
																	else {
																			menuIcons.setAttribute("data-menu-reviews_info", checkbox.checked);			
																		settings_menus[id]["menu"]["reviews_info"] = checkbox.checked;
																	}

																	show_reviews_info(inputDiv, checkbox.checked);

																	chrome.storage.local.set({"wkhighlight_settings":settings});
																});
																reviewsInfoDefault = menuIcons.getAttribute("data-filter-reviews_info") ? menuIcons.getAttribute("data-filter-reviews_info") : settings_menus[id]["menu"]["reviews_info"];

																if (initialSetup)
																	show_reviews_info(inputDiv, reviewsInfoDefault);

																break;
														}											
													}
												});
											});

											// menu close arrow
											const arrowWrapper = document.createElement("div");
											menuIcons.appendChild(arrowWrapper);
											arrowWrapper.style.padding = "0px 7px";
											arrowWrapper.classList.add("clickable");
											arrowWrapper.title = "Close";
											const  arrow = document.createElement("i");
											arrowWrapper.appendChild(arrow);
											arrow.classList.add("up");
											arrow.style.borderColor = "white";
											arrow.style.padding = "5px";
											arrow.style.marginBottom = (-2*(arrow.style.padding.split("px")[0]))+"px";
											arrowWrapper.addEventListener("click", () => {
												if (arrow.classList.contains("up")) {
													flipArrow(arrow, "up", "down", arrow.style.padding);
													arrowWrapper.title = "Open";
													if (contentWrapper) contentWrapper.style.display = "none";
												}
												else {
													flipArrow(arrow, "down", "up", arrow.style.padding);
													arrowWrapper.title = "Close";
													if (contentWrapper) contentWrapper.style.removeProperty("display");
												}

												settings_menus[id]["opened"] = arrow.classList.contains("up");
												chrome.storage.local.set({"wkhighlight_settings":settings});
											});	
											if (!settings_menus[id]["opened"])
												arrowWrapper.click();

											return menuIcons;
										}

										const lib = new localStorageDB("subjects", localStorage);
										
										const levelSubjectsWrapper = document.createElement("div");
										const allTitle = document.createElement("p");
										levelSubjectsWrapper.appendChild(allTitle);
										allTitle.appendChild(document.createTextNode("All"));
										allTitle.style.color = "white";
										allTitle.style.position = "relative";
										allTitle.style.padding = "5px";
										allTitle.style.backgroundColor = "var(--default-color)";
										allTitle.style.paddingLeft = "10px";
										allTitle.style.display = "flex";
										allTitle.style.alignItems = "center";
										allTitle.style.fontSize = "23px";
										allTitle.style.borderTop = "2px solid white";
										const allProgress = document.createElement("span");
										allTitle.appendChild(allProgress);
										allProgress.style.fontSize = "12px";
										allProgress.style.marginLeft = "10px";
										allProgress.style.color = "silver";
										const subjectsDisplay = document.createElement("div");
										allTitle.appendChild(createMenuIcons(["sort", "filter", "menu"], "all", allTitle, subjectsDisplay));
										levelSubjectsWrapper.appendChild(subjectsDisplay);
										subjectsDisplay.style.padding = "7px";
										subjectsDisplay.style.fontSize = "23px";
										subjectsDisplay.style.backgroundColor = "white";
										subjectsDisplay.style.border = "10px solid var(--default-color)";
										let allSubjects = 0, allPassedSubjects = 0;
										["radical", "kanji", "vocab"].forEach(type => {
											const subjects = lib.queryAll(type == "vocab" ? "vocabulary" : type, {
												query: {level:levelValue}
											}).filter(subject => !subject["hidden_at"]);
											const passedSubjects = subjects.filter(subject => subject.passed_at != null);
											allSubjects += subjects.length;
											allPassedSubjects += passedSubjects.length;

											if (type == "kanji") {
												const progressBar = document.createElement("div");
												levelProgressBar.appendChild(progressBar);
												const percentage = passedSubjects.length / subjects.length * 100;
												progressBar.style.width = (percentage >= 1 ? percentage : 100)+"%";
												if (percentage > 8.1 || percentage < 1) {
													const barLabel = document.createElement("p");
													progressBar.appendChild(barLabel);
													barLabel.appendChild(document.createTextNode(percentage.toFixed(percentage > 12 ? 1 : 0)+"%"));
													if (percentage < 1) {
														progressBar.style.backgroundColor = "white";
														barLabel.style.color = "black";
													}
												}

												if (percentage < 81 && percentage >= 1) {
													const progressValues = document.createElement("span");
													levelProgress.appendChild(progressValues);
													progressValues.appendChild(document.createTextNode(passedSubjects.length + " / " + subjects.length));
												}
												progressBar.classList.add("clickable");
												progressBar.title = "Passed Kanji: "+passedSubjects.length+" / "+percentage.toFixed(1)+"%";
											}

											const subjectsWrapper = document.createElement("div");
											subjectsDisplay.appendChild(subjectsWrapper);
											subjectsWrapper.style.position = "relative";
											subjectsWrapper.style.marginBottom = "10px";
											const title = document.createElement("p");
											subjectsWrapper.appendChild(title);
											title.appendChild(document.createTextNode(type.charAt(0).toUpperCase()+(type == "vocab" ? "vocabulary" : type).substring(1)+(type == "radical" ? "s" : "")));
											title.style.color = "white";
											title.style.position = "relative";
											title.style.padding = "5px";
											title.style.backgroundColor = "var(--default-color)";
											title.style.paddingLeft = "10px";
											title.style.display = "flex";
											title.style.alignItems = "center";
											const progress = document.createElement("span");
											title.appendChild(progress);
											progress.appendChild(document.createTextNode(passedSubjects.length+"/"+subjects.length));
											progress.style.fontSize = "12px";
											progress.style.marginLeft = "10px";
											progress.style.color = "silver";
											const subjectsListWrapper = document.createElement("div");
											title.appendChild(createMenuIcons(["sort", "filter", "menu"], type == "vocab" ? "vocabulary" : type, subjectsWrapper, subjectsListWrapper));
											subjectsWrapper.appendChild(subjectsListWrapper);
											subjectsListWrapper.classList.add("simple-grid");
											const subjectsList = document.createElement("ul");
											subjectsListWrapper.appendChild(subjectsList);
											subjectsList.style.padding = "5px";
											subjects.forEach(subject => {
												const subjectWrapper = document.createElement("li");
												subjectsList.appendChild(subjectWrapper);
												const characters = subject["characters"] ? subject["characters"]  : `<img height="22px" style="margin-top:-3px;margin-bottom:-4px;padding-top:8px" src="${subject["character_images"].filter(image => image["content_type"] == "image/png")[0]["url"]}"><img>`;
												subjectWrapper.classList.add(type+"_back");
												if (!atWanikani)
													subjectWrapper.title = subject["meanings"][0];
												subjectWrapper.style.position = "relative";
												if (type !== "radical") {
													subjectWrapper.classList.add("clickable", "kanjiDetails");
													subjectWrapper.setAttribute("data-item-id", subject["id"]);
													if (!atWanikani) {
														if (subject["readings"][0]["reading"])
															subjectWrapper.title += " | "+subject["readings"].filter(reading => reading["primary"])[0]["reading"];
														else
															subjectWrapper.title += " | "+subject["readings"][0];
													}
												}
												let backColor = hexToRGB(getComputedStyle(document.body).getPropertyValue(`--${type}-tag-color`));
												subjectWrapper.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);
												if (characters !== "L")
													subjectWrapper.innerHTML = characters;
												else {
													const wrapperForLi = document.createElement("div");
													subjectWrapper.appendChild(wrapperForLi);
													wrapperForLi.style.marginTop = "5px";
													wrapperForLi.appendChild(document.createTextNode(characters));
												}
												if (characters !== "L" && subjectWrapper.children.length > 0 && subjectWrapper.style.color == "rgb(255, 255, 255)")
													subjectWrapper.children[0].style.filter = "invert(1)";
											
												if (subject["passed_at"]) {
													const check = document.createElement("img");
													subjectWrapper.appendChild(check);
													check.src = "../images/check.png";
													check.classList.add("passed-subject-check", "reviews-info");
													// fix issues with radicals that are images
													if (subjectWrapper.firstChild.tagName == "IMG") {
														subjectWrapper.firstChild.style.marginTop = "unset";
													}
												}
												else if(subject["available_at"]) {
													if (new Date(subject["available_at"]) - new Date() < 0) {
														const time = document.createElement("div");
														subjectWrapper.appendChild(time);
														time.appendChild(document.createTextNode("now"));
														time.classList.add("time-next-review-subject", "reviews-info");
													}
												}

												if (subject["available_at"])
													subjectWrapper.setAttribute("data-available_at", subject["available_at"]);
												

												if (subject["srs_stage"] !== null) {
													subjectWrapper.title += " \x0D"+srsStages[subject["srs_stage"]]["name"];
													subjectWrapper.setAttribute("data-srs", subject["srs_stage"]);
												}
												else {
													subjectWrapper.title += " \x0D"+"Locked";
													subjectWrapper.setAttribute("data-srs", -1);
												}
											});
										});
										
										allProgress.appendChild(document.createTextNode(allPassedSubjects+"/"+allSubjects));

										return levelSubjectsWrapper;
									}

									const levels_chooser_action = levelsList => {
										Array.from(levelsList.getElementsByTagName("LI")).forEach((levelWrapper, i) => {
											const level = Number(levelWrapper.innerText);
											if (!isNaN(level) && i !== 1) {
												levelWrapper.addEventListener("click", () => {
													initialSetup = true;

													levelsChooser.lastChild.remove();
													Array.from(levelProgress.children).forEach(child => child.remove());
													
													const newList = levels_chooser(level);
													levelsChooser.replaceChild(newList, levelsList);
													newList.style.paddingTop = "175px";

													levelsChooser.appendChild(level_subjects(level, levelProgress));

													levels_chooser_action(newList);
												});

												let smallLevel;
												const margin = 50;
												levelWrapper.addEventListener("mouseover", () => {
													smallLevel = document.createElement("div");
													smallLevel.classList.add("levels-chooser-small-level");
													if (i == 0) {
														levelsList.style.marginLeft = margin+"px";
														levelWrapper.style.paddingLeft = margin+"px";
														levelWrapper.style.marginLeft = (-1*margin)+"px";
														if (level !== 1) {
															levelsList.insertBefore(smallLevel, levelsList.firstChild);
															smallLevel.appendChild(document.createTextNode(level-1));
															smallLevel.style.left = (-1*margin/2)+"px";
														}
													}
													else {
														levelsList.style.marginRight = margin+"px";
														levelWrapper.style.paddingRight = margin+"px";
														levelWrapper.style.marginRight = (-1*margin)+"px";
														if (level !== 60) {
															levelsList.appendChild(smallLevel);
															smallLevel.appendChild(document.createTextNode(level+1));
															smallLevel.style.right = (-1*margin/2)+"px";
														}
													}
												});

												levelWrapper.addEventListener("mouseout", () => {
													if (smallLevel) smallLevel.remove();
													if (i == 0) {
														levelsList.style.removeProperty("margin-left");
													}
													else {
														levelsList.style.removeProperty("margin-right");
													}
												});
											}
											
											if (i == 1) middleLevel = levelWrapper;
										});

										settings_menus = settings["profile_menus"] ? settings["profile_menus"] : defaultSettings["profile_menus"];
										Object.keys(settings_menus).forEach(type => {
											const menuIcons = Array.from(document.getElementsByClassName("menu-icons")).filter(elem => (elem.getAttribute("data-id") == type))[0];
											Object.keys(settings_menus[type]).forEach(menu => {
												if (menu !== "opened") {
													Object.keys(settings_menus[type][menu]).forEach(option => {
														menuIcons.setAttribute("data-"+menu+"-"+option, settings_menus[type][menu][option]);
														Array.from(menuIcons.getElementsByTagName("img")).filter(elem => elem.title.toLowerCase() == menu)[0].click();
													});
												}
											});
										});

										initialSetup = false;
									}

									levelsChooser.appendChild(level_subjects(Number(userInfo["level"]), levelProgress));

									levels_chooser_action(levelsList);
								});

								const ul = document.createElement("ul");
								container.appendChild(ul);

								let buttons = ["../images/settings.png", "../images/search.png", "../images/blacklist.png", "../images/about.png", "../images/random.png", "../images/exit.png"];
								if (blacklisted_site)
									buttons = ["../images/settings.png", "../images/search.png", "../images/run.png", "../images/about.png", "../images/random.png", "../images/exit.png"];
								if (atWanikani)
									buttons = ["../images/settings.png", "../images/about.png", "../images/exit.png"];
								buttons.forEach(img => {
									const li = document.createElement("li");
									ul.appendChild(li);
									li.style.position = "relative";
									li.classList.add("clickable");
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

									if (icon_img.title === "Blacklist") {
										let blacklisted = response["wkhighlight_blacklist"];
										const nmrBlacklisted = document.createElement("span");
										link.appendChild(nmrBlacklisted);
										nmrBlacklisted.classList.add("side-panel-info-alert");
										nmrBlacklisted.style.backgroundColor = "red";
										nmrBlacklisted.style.color = "white";
										nmrBlacklisted.style.filter = "invert(1)";
										nmrBlacklisted.appendChild(document.createTextNode(blacklisted ? blacklisted.length : "0"));
									}

									if (icon_img.title === "Random") {
										icon_img.setAttribute("data-item-id", "rand");
										icon_img.classList.add("kanjiDetails");
										
										settings = response["wkhighlight_settings"];
										if (settings && settings["kanji_details_popup"] && settings["kanji_details_popup"]["random_subject"]) {
											const type = document.createElement("span");
											link.appendChild(type);
											type.id = "random-subject-type";
											type.classList.add("side-panel-info-alert");
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

								const exitIcon = Array.from(ul.getElementsByTagName("li")).filter(li => li.getElementsByTagName("img")[0]?.title === "Exit")[0];
								if (exitIcon) exitIcon.style.paddingLeft = "3px";

								const blacklistIcon = Array.from(ul.getElementsByTagName("li")).filter(li => li.getElementsByTagName("img")[0]?.title === "Blacklist")[0];
								if (blacklistIcon) blacklistIcon.style.paddingRight = "3px";

								const logoDiv = document.createElement("div");
								container.appendChild(logoDiv);
								logoDiv.id = "side-panel-logo";
								logoDiv.classList.add("clickable");
								logoDiv.title = "Wanikani Kanji Highlighter";
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
										
										Array.from(document.getElementsByClassName("side-panel-info-alert"))
											.forEach(div => div.style.left = "19px");
									}
									else {
										container.classList.remove("side-panel-focus");
										Array.from(document.getElementsByClassName("navbar_icon"))
											.filter(icon => icon.style.display !== "none")
											.forEach(icon => {
												icon.getElementsByTagName("p")[0].remove();
											});

										Array.from(document.getElementsByClassName("side-panel-info-alert"))
											.forEach(div => {
												div.style.removeProperty("left");
												div.style.display = "none";
												setTimeout(() => div.style.removeProperty("display"), 300);
											});
										
									}
								});
								const logo = document.createElement("img");
								logo.src="logo/logo.png";
								logo.style.pointerEvents = "none";
								logoDiv.appendChild(logo);

								if (!atWanikani) {
									if (!blacklisted_site) {

										// highlighted kanji
										if (response["wkhighlight_settings"] ? response["wkhighlight_settings"]["extension_popup_interface"]["highlighted_kanji"] : settingsInterface["extension_popup_interface"]["highlighted_kanji"]) {
											const kanjiFoundWrapper = document.createElement("div");
											userInfoWrapper.appendChild(kanjiFoundWrapper);
											kanjiFoundWrapper.classList.add("resizable", "highlightedKanjiContainer", "userInfoWrapper-wrapper");
											kanjiFoundWrapper.style.maxHeight = defaultSettings["sizes"]["highlighted_kanji_height"]+"px";
											if (response["wkhighlight_settings"] && response["wkhighlight_settings"]["sizes"])
												kanjiFoundWrapper.style.maxHeight = response["wkhighlight_settings"]["sizes"]["highlighted_kanji_height"]+"px";

											kanjiFoundWrapper.setAttribute("data-settings", "sizes-highlighted_kanji_height");
											const resizableS = document.createElement("div");
											kanjiFoundWrapper.appendChild(resizableS);
											resizableS.classList.add("resizable-s");
											const kanjiFound = document.createElement("div");
											kanjiFoundWrapper.appendChild(kanjiFound);
											const kanjiFoundBar = document.createElement("div");
											kanjiFoundWrapper.appendChild(kanjiFoundBar);
											const kanjiFoundList = document.createElement("div");
											kanjiFoundWrapper.appendChild(kanjiFoundList);

											chrome.tabs.query({currentWindow: true, active: true}, tabs => {
												chrome.tabs.sendMessage(tabs[0].id, {nmrKanjiHighlighted:"popup"}, result => {
													let learned = [], notLearned = [];
													if (result) {
														learned = result["learned"];
														notLearned = result["notLearned"];
													}

													kanjiFound.id = "nmrKanjiHighlighted";
													kanjiFound.classList.add("userInfoWrapper-title");
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
													const parentMaxHeight = kanjiFoundList.parentElement.style.maxHeight;
													kanjiFoundList.style.maxHeight = (Number(parentMaxHeight.substring(0, parentMaxHeight.length-2))-40)+"px";
													kanjiFoundList.classList.add("simple-grid");
													const kanjiFoundUl = document.createElement("ul");
													kanjiFoundList.appendChild(kanjiFoundUl);

													const kanjiAssoc = response["wkhighlight_kanji_assoc"];
													kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${result ? result["nmrKanjiHighlighted"] : 0}</strong> (in the page)`;

													const lib = new localStorageDB("subjects", localStorage);
													const classes = ["kanjiHighlightedLearned", "kanjiHighlightedNotLearned"];
													[learned, notLearned].forEach((type, i) => {
														type.forEach(kanji => {
															const kanjiFoundLi = document.createElement("li");
															kanjiFoundUl.appendChild(kanjiFoundLi);
															kanjiFoundLi.classList.add("clickable", "kanjiDetails", classes[i]);
															kanjiFoundLi.appendChild(document.createTextNode(kanji));
															if (kanjiAssoc && kanjiAssoc[kanji]) kanjiFoundLi.setAttribute("data-item-id", kanjiAssoc[kanji]);
														
															const subject = lib.queryAll("kanji", {
																query: {id: kanjiAssoc[kanji]}
															});
															if (subject[0])
																kanjiFoundLi.title = subject[0]["meanings"][0]+" | "+subject[0]["readings"].filter(reading => reading["primary"])[0]["reading"];
														});
													});
												
													if (learned.length == 0 && notLearned.length == 0) {
														const notFound = document.createElement("div");
														kanjiFoundUl.appendChild(notFound);
														notFound.classList.add("not-found");
														const kanjiModel = document.createElement("p");
														notFound.appendChild(kanjiModel);
														const randHex = rand(parseInt("4e00", 16), parseInt("9faf", 16)).toString(16);
														kanjiModel.appendChild(document.createTextNode(String.fromCharCode(`0x${randHex}`)));
														const noKanjiFound = document.createElement("p");
														notFound.appendChild(noKanjiFound);
														noKanjiFound.appendChild(document.createTextNode("No Kanji found in the current page!"));
														const notFoundSlash = document.createElement("div");
														kanjiModel.appendChild(notFoundSlash);
													}
												});
											});
										}	
									}

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
											searchSubject(input);
												
											chrome.storage.local.remove(["wkhighlight_contextMenuSelectedText"]);
											chrome.storage.local.get(["wkhighlight_nmrHighLightedKanji"], result => {
												chrome.action.setBadgeText({text: result["wkhighlight_nmrHighLightedKanji"].toString(), tabId:activeTab.id});
												chrome.action.setBadgeBackgroundColor({color: "#4d70d1", tabId:activeTab.id});
											});
										}
									});

									userInfoWrapper.insertBefore(searchArea, userInfoWrapper.children[!blacklisted_site ? 1 : 2]);
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

								// lessons and reviews
								if (response["wkhighlight_settings"] ? response["wkhighlight_settings"]["extension_popup_interface"]["lessons_and_reviews"] : settingsInterface["extension_popup_interface"]["lessons_and_reviews"]) {
									const summaryWrapper = document.createElement("div");
									userInfoWrapper.appendChild(summaryWrapper);
									summaryWrapper.style.textAlign = "center";
									summaryWrapper.classList.add("userInfoWrapper-wrapper");
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
										titleWrapper.classList.add("summaryTitle", "userInfoWrapper-title");
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
									moreReviews.style.color = "#747474";
									moreReviews.innerHTML = 'More <span style="color:#2c7080;font-weight:bold">Reviews</span> in';
									const moreReviewsDate  = document.createElement("p");
									summaryWrapper.appendChild(moreReviewsDate);
									moreReviewsDate.style.padding = "3px 0";
									moreReviewsDate.style.color = "#747474";
								
									// get all assignments if there are none in storage or if they were modified
									setupAssignments(apiKey, () => setupAvailableAssignments(apiKey, setupSummary));
							
									const setupSummary = (reviews, lessons) => {
										if (reviews) {
											const currentTime = new Date().getTime();
											
											const currentValue = parseInt(document.getElementById("summaryReviews").innerText);
											if (currentValue === 0)
												document.getElementById("summaryReviews").innerText = reviews["count"] ? reviews["count"] : 0;
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
													settings = response["wkhighlight_settings"];
													let time = `${thisDate.getHours() < 10 ? "0"+thisDate.getHours() : thisDate.getHours()}:${thisDate.getMinutes() < 10 ? "0"+thisDate.getMinutes() : thisDate.getMinutes()}`;
													if (settings && settings["miscellaneous"]["time_in_12h_format"])
														time = time12h(time);
													moreReviewsDate.innerText = `${thisDate.getMonthName().slice(0, 3)} ${thisDate.getDate() < 10 ? "0"+thisDate.getDate() : thisDate.getDate()}, ${time}`;
													
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
												document.getElementById("summaryLessons").innerText = lessons["count"] ? lessons["count"] : 0;
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
								}

								// overall progress
								const radicalProgress = response["wkhighlight_radical_progress"];
								const kanjiProgress = response["wkhighlight_kanji_progress"];
								const vocabularyProgress = response["wkhighlight_vocabulary_progress"];
								let progressBarWrapper, allSize, progress, unlockedSize=0;
								if (radicalProgress || kanjiProgress || vocabularyProgress) {
									// progress bar
									if (response["wkhighlight_settings"] ? response["wkhighlight_settings"]["extension_popup_interface"]["overall_progression_bar"] : settingsInterface["extension_popup_interface"]["overall_progression_bar"]) {
										const radicalsSize = response["wkhighlight_allradicals_size"];
										const kanjiSize = response["wkhighlight_allkanji_size"];
										const vocabularySize = response["wkhighlight_allvocab_size"];
										if (radicalsSize || kanjiSize || vocabularySize) {
											allSize = (radicalsSize ? radicalsSize : 0) + (kanjiSize ? kanjiSize : 0) + (vocabularySize ? vocabularySize : 0);
											
											const progressBar = document.createElement("div");
											userInfoWrapper.appendChild(progressBar);
											progressBar.classList.add("userInfoWrapper-wrapper");
											const progressBarTitle = document.createElement("p");
											progressBar.appendChild(progressBarTitle);
											progressBarTitle.appendChild(document.createTextNode("Overall Progression Bar"));
											progressBarTitle.classList.add("userInfoWrapper-title");

											progressBarWrapper = document.createElement("ul");
											progressBar.appendChild(progressBarWrapper);
											progressBarWrapper.style.height = "25px";
											progressBarWrapper.style.display = "flex";
											progressBarWrapper.style.flexDirection = "row";
										}

									}
									
									// progress stats
									if (response["wkhighlight_settings"] ? response["wkhighlight_settings"]["extension_popup_interface"]["overall_progression_stats"] : settingsInterface["extension_popup_interface"]["overall_progression_stats"]) {
										progress = document.createElement("div");
										userInfoWrapper.appendChild(progress);
										const progressTitle = document.createElement("p");
										progress.appendChild(progressTitle);
										progressTitle.appendChild(document.createTextNode("Overall Progression Stats"));
										progressTitle.classList.add("userInfoWrapper-title");
									}

									let wrapper;
									Object.keys(srsStages).forEach(stage => {
										const stageValue = (radicalProgress && radicalProgress[stage] ? radicalProgress[stage] : 0) + (kanjiProgress && kanjiProgress[stage] ? kanjiProgress[stage] : 0) + (vocabularyProgress && vocabularyProgress[stage] ? vocabularyProgress[stage] : 0);
										const stageColor = response["wkhighlight_settings"] && response["wkhighlight_settings"]["appearance"] ? response["wkhighlight_settings"]["appearance"][srsStages[stage]["short"].toLowerCase()+"_color"] : srsStages[stage]["color"];
										unlockedSize+=stageValue;

										// add bar to progress bar
										if (progressBarWrapper && allSize) {
											const progressBarBar = document.createElement("li");
											progressBarWrapper.appendChild(progressBarBar);
											progressBarBar.classList.add("clickable");
											progressBarBar.style.height = "100%";
											const percentageValue = stageValue/allSize*100;
											progressBarBar.style.width = percentageValue+"%";
											progressBarBar.style.backgroundColor = stageColor;
											progressBarBar.style.overflow = "hidden";
											progressBarBar.style.color = "white";
											progressBarBar.title = srsStages[stage]["name"]+": "+stageValue+" / "+percentageValue.toFixed(1)+"%";
											if (percentageValue > 8.1) {
												const percentage = document.createElement("div");
												progressBarBar.appendChild(percentage);
												percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
												percentage.style.textAlign = "center";
												percentage.style.marginTop = "5px";
											}
										}

										if (progress) {
											// add square to progression stats
											if (stage%5 == 0) {
												wrapper = document.createElement("ul");
												progress.appendChild(wrapper);
												wrapper.classList.add("overall-progress");
											}

											const stageSquare = document.createElement("li");
											stageSquare.style.backgroundColor = stageColor;
											wrapper.appendChild(stageSquare);
											stageSquare.appendChild(document.createTextNode(stageValue));
											stageSquare.title = srsStages[stage]["name"];
											const infoMenu = document.createElement("div");
											stageSquare.appendChild(infoMenu);
											if (stage < 5)
												infoMenu.style.top = "35px";

											if (stage%5 == 0)
												infoMenu.style.left = "20px";

											const infoMenuTitle = document.createElement("p");
											infoMenu.appendChild(infoMenuTitle);
											infoMenuTitle.appendChild(document.createTextNode(srsStages[stage]["name"]));
											infoMenuTitle.style.color = stageColor;
											const infoMenuBar = document.createElement("div");
											infoMenu.appendChild(infoMenuBar);
											const infoMenuListing = document.createElement("ul");
											infoMenu.appendChild(infoMenuListing);
											["Radicals", "Kanji", "Vocabulary"].forEach(type => {
												let typeProgress = type == "Radicals" ? radicalProgress : type == "Kanji" ? kanjiProgress : vocabularyProgress;

												const bar = document.createElement("div");
												infoMenuBar.appendChild(bar);
												bar.style.width = (typeProgress && typeProgress[stage] ? typeProgress[stage] / Number(stageSquare.innerText) *100 : 0)+"%";
												const colorId = (type == "Radicals" ? "radical" : type == "Kanji" ? "kanji" : "vocab")+"_color";
												bar.style.backgroundColor = response["wkhighlight_settings"] && response["wkhighlight_settings"]["appearance"] ? response["wkhighlight_settings"]["appearance"][colorId] : defaultSettings["miscellaneous"][colorId];

												const infoMenuType = document.createElement("li");
												infoMenuListing.appendChild(infoMenuType);
												const typeTitle = document.createElement("b");
												infoMenuType.appendChild(typeTitle);
												typeTitle.appendChild(document.createTextNode(type+": "));
												infoMenuType.appendChild(document.createTextNode(typeProgress && typeProgress[stage] ? typeProgress[stage] : 0));
											});

											stageSquare.addEventListener("mouseover", () => infoMenu.style.display = "inherit");
											stageSquare.addEventListener("mouseout", () => infoMenu.style.removeProperty("display"));
										}
									});

									if (progressBarWrapper && allSize) {
										const lockedSubjectsBar = document.createElement("li");
										progressBarWrapper.appendChild(lockedSubjectsBar);
										const percentageValue = (allSize-unlockedSize)/allSize*100
										lockedSubjectsBar.style.width = percentageValue+"%";
										lockedSubjectsBar.style.overflow = "hidden";
										lockedSubjectsBar.style.height = "100%";
										lockedSubjectsBar.classList.add("clickable");
										lockedSubjectsBar.title = "Locked: "+(allSize-unlockedSize)+" / "+percentageValue.toFixed(1)+"%";
										if (percentageValue > 8.1) {
											const percentage = document.createElement("div");
											lockedSubjectsBar.appendChild(percentage);
											percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
											percentage.style.textAlign = "center";
											percentage.style.marginTop = "5px";
										}
									}
								}

								// Levels in progress
								if (response["wkhighlight_settings"] ? response["wkhighlight_settings"]["extension_popup_interface"]["levels_in_progress"] : settingsInterface["extension_popup_interface"]["levels_in_progress"]) {
									const radicalsLevelInProgress = response["wkhighlight_radical_levelsInProgress"];
									const kanjiLevelInProgress = response["wkhighlight_kanji_levelsInProgress"];
									const vocabularyLevelInProgress = response["wkhighlight_vocabulary_levelsInProgress"];
									if (radicalsLevelInProgress || kanjiLevelInProgress || vocabularyLevelInProgress) {
										const levelsInProgress = document.createElement("div");
										userInfoWrapper.appendChild(levelsInProgress);
										levelsInProgress.classList.add("userInfoWrapper-wrapper");
										levelsInProgress.style.width = "86%";
										const levelsInProgressTitle = document.createElement("p");
										levelsInProgress.appendChild(levelsInProgressTitle);
										levelsInProgressTitle.appendChild(document.createTextNode("Levels In Progress"));
										levelsInProgressTitle.classList.add("userInfoWrapper-title");
										const types = ["radical", "kanji", "vocabulary"];
										let progressBarWrappers = [];
										let lib = new localStorageDB("subjects", localStorage);
										[radicalsLevelInProgress ? radicalsLevelInProgress : [],
										kanjiLevelInProgress ? kanjiLevelInProgress : [],
										vocabularyLevelInProgress ? vocabularyLevelInProgress : []]
											.forEach((levels, i) => {
												const type = types[i];
												levels.forEach(level => {
													let values = [];
													if (lib.tableExists(type)) {
														values = lib.queryAll(type, {
															query: row => {
																return row.level == level && row.hidden_at == null
															}
														});
													}

													const all = values.length;
													const passed = values.filter(subject => subject["passed_at"]).length;
													const notPassed = values.filter(subject => !subject["passed_at"]);
													const locked = notPassed.filter(subject => subject["srs_stage"] == null).length;

													const progressBarWrapper = document.createElement("ul");
													progressBarWrappers.push(progressBarWrapper);
													progressBarWrapper.style.display = "flex";
													progressBarWrapper.style.margin = "1px 0";

													// set order value
													const levelValue = Number(level);
													progressBarWrapper.setAttribute("data-order", levelValue*10+i);

													// bar for passed
													const progressBarBar = document.createElement("li");
													progressBarWrapper.appendChild(progressBarBar);
													progressBarBar.classList.add("clickable");
													progressBarBar.style.height = "25px";
													const percentageValue = passed/all*100;
													progressBarBar.style.width = percentageValue+"%";
													progressBarBar.style.backgroundColor = "black";
													progressBarBar.style.overflow = "hidden";
													progressBarBar.style.color = "white";
													progressBarBar.title = "Passed: "+passed;
													if (percentageValue > 8.1) {
														const percentage = document.createElement("div");
														progressBarBar.appendChild(percentage);
														percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
														percentage.style.textAlign = "center";
														percentage.style.marginTop = "5px";
													}

													// traverse from initiate until apprentice IV
													for (let i = 5; i >= 0; i--) {
														const stageSubjects = notPassed.filter(subject => subject["srs_stage"] == i).length;
														const progressBarBar = document.createElement("li");
														progressBarWrapper.appendChild(progressBarBar);
														progressBarBar.classList.add("clickable");
														progressBarBar.style.height = "25px";
														const percentageValue = stageSubjects/all*100;
														progressBarBar.style.width = percentageValue+"%";
														progressBarBar.style.backgroundColor = response["wkhighlight_settings"] && response["wkhighlight_settings"]["appearance"] ? response["wkhighlight_settings"]["appearance"][srsStages[i]["short"].toLowerCase()+"_color"] : srsStages[i]["color"];
														progressBarBar.style.overflow = "hidden";
														progressBarBar.style.color = "white";
														progressBarBar.title = srsStages[i]["name"]+": "+stageSubjects;
														if (percentageValue > 8.1) {
															const percentage = document.createElement("div");
															progressBarBar.appendChild(percentage);
															percentage.appendChild(document.createTextNode(percentageValue.toFixed(percentageValue > 11 ? 1 : 0)+"%"));
															percentage.style.textAlign = "center";
															percentage.style.marginTop = "5px";
														}
													}

													// bar for locked
													const progressBarLocked = document.createElement("li");
													progressBarWrapper.appendChild(progressBarLocked);
													progressBarLocked.classList.add("clickable");
													progressBarLocked.style.height = "25px";
													const percentageValueLocked = locked/all*100;
													progressBarLocked.style.width = percentageValueLocked+"%";
													progressBarLocked.style.backgroundColor = "white";
													progressBarLocked.style.overflow = "hidden";
													progressBarLocked.style.color = "black";
													progressBarLocked.title = "Locked: "+locked;
													if (percentageValueLocked > 8.1) {
														const percentage = document.createElement("div");
														progressBarLocked.appendChild(percentage);
														percentage.appendChild(document.createTextNode(percentageValueLocked.toFixed(percentageValueLocked > 11 ? 1 : 0)+"%"));
														percentage.style.textAlign = "center";
														percentage.style.marginTop = "5px";
													}

													// bar id
													const barTitle = document.createElement("span");
													progressBarWrapper.appendChild(barTitle);
													barTitle.style.position = "absolute";
													barTitle.style.right = "0px";
													barTitle.style.backgroundColor = "var(--default-color)";
													barTitle.style.color = "white";
													barTitle.style.padding = "5px";
													barTitle.style.width = "42px";
													barTitle.appendChild(document.createTextNode(levelValue+" "+types[i].charAt(0).toUpperCase()+types[i].substring(1, 3)));

													// levelup marker
													if (types[i] == "kanji" && levelValue == userInfo["level"]) {
														const levelupMarkerWrapper = document.createElement("div");
														progressBarWrapper.appendChild(levelupMarkerWrapper);
														levelupMarkerWrapper.classList.add("levelup-marker");
														levelupMarkerWrapper.style.width = "86%";
														const levelupMarker = document.createElement("div");
														levelupMarkerWrapper.appendChild(levelupMarker);
														
														// calculate number of kanji to get atleast 90%
														let final = all;
														for (let k = all; k > 0; k--) {
															if (k/all*100 < 90) break;
															final = k;
														}
														levelupMarker.style.width = final/all*100+"%";
													}
												});
											});

										// giving it some delay to let everything load (FIX THIS LATER)
										setTimeout(() => progressBarWrappers.sort((a,b) => Number(a.dataset.order) - Number(b.dataset.order))
															.forEach(bar => levelsInProgress.appendChild(bar)), 200);
									}
								}

								switch (homePage) {
									case "Lessons":
										document.getElementById("summaryLessons").click();
										break;
									case "Reviews":
										document.getElementById("summaryReviews").click();
										break;
									case "Profile":
										document.getElementById("profile").click();
										break;
									case "Settings":
										document.getElementById("settings").click();
										break;
									case "About":
										document.getElementById("about").click();
										break;
								}
								// const itemsListLoadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading subjects info...");
								// itemsListLoadingElem = itemsListLoadingVal[0];

								// loadItemsLists(() => {
								// 	itemsListLoadingElem.remove();
								// 	itemsListLoadingElem = null;
								// });
								// });

								// console.log("BEGIN");
								// let textPopup, itemsListLoadingVal, itemsListLoadingElem;
								// setupAssignments(apiKey)
								// 	.then(() => {
								// 		setupRadicals(apiKey)
								// 			.then(radicals_dict => {
								// 				if (radicals_dict[1]) {
								// 					itemsListLoadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading subjects info...");
								// 					itemsListLoadingElem = itemsListLoadingVal[0];
								// 					textPopup = messagePopup("this-message", "Loading items...", "Deep loading of subjects. This might happen occasionaly.", true);
								// 					document.body.appendChild(textPopup);
								// 					if (itemsListLoadingElem)
								// 						textPopup.getElementsByTagName("div")[1].appendChild(itemsListLoadingElem);
								// 					assignUponSubjects(radicals_dict[0]);
								// 					revStatsUponSubjects(apiKey, radicals_dict[0]);
								// 				}

								// 				setupVocab(apiKey)
								// 					.then(vocab_dict => {
								// 						if (vocab_dict[1]) {
								// 							assignUponSubjects(vocab_dict[0]);
								// 							revStatsUponSubjects(apiKey, vocab_dict[0]);
								// 						}

								// 						// setup kanji last to make sure scripts run with all subjects
								// 						setupKanji(apiKey)
								// 							.then(kanji_dict => {
								// 								if (kanji_dict[1]) {
								// 									assignUponSubjects(kanji_dict[0]);
								// 									revStatsUponSubjects(apiKey, kanji_dict[0]);
								// 								}
								// 								console.log("END");
								// 								if (itemsListLoadingElem) {
								// 									itemsListLoadingElem.remove();
								// 									itemsListLoadingElem = null;
								// 								}
																
								// 								if (textPopup)
								// 									textPopup.remove();

								// 								location.reload();
								// 							});
								// 					});
								// 			});
								// 	});
							}
						});

					document.body.style.cursor = "inherit";
				}
			});
		});
	});
}

const enhancedWarning = (text, color) => {
	const wrapper = document.createElement("div");
	wrapper.appendChild(document.createTextNode(text));
	wrapper.id = "enhancedMessage";
	wrapper.style.borderBottom = "0px";
	wrapper.style.borderLeft = "10px solid";
	wrapper.style.color = color;
	return wrapper;
}

const messagePopup = (id, title, message, focus, popupSize) => {
	const container = document.createElement("div");
	container.id = id;
	container.classList.add("message-popup");

	const back = document.createElement("div");
	container.appendChild(back);
	if (focus)
		back.style.opacity = "0.5";

	const popup = document.createElement("div");
	container.appendChild(popup);
	if (popupSize) {
		if (popupSize.width) popup.style.width = popupSize.width;
		if (popupSize.height) popup.style.width = popupSize.height;
	}

	const titleElem = document.createElement("p");
	popup.appendChild(titleElem);
	titleElem.appendChild(document.createTextNode(title));

	const messageElem = document.createElement("div");
	popup.appendChild(messageElem);
	messageElem.appendChild(document.createTextNode(message));

	return container;
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
	window.scroll(0, 0);

	if (width)
		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(width, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");

	// remove any active secondary page
	if (document.getElementById("secPageMain"))
		document.getElementById("secPageMain").remove();

	document.getElementById("main").style.display = "none";

	const main = document.createElement("div");
	main.id = "secPageMain";
	document.body.prepend(main); 

	const navbar = document.createElement("div");
	navbar.classList.add("topNav");
	main.appendChild(navbar);

	// go back
	const goBackWrapper = document.createElement("div");
	navbar.appendChild(goBackWrapper); 
	goBackWrapper.id = "goBack";
	goBackWrapper.title = "Go back";
	goBackWrapper.classList.add("clickable");
	const arrowWrapper = document.createElement("div");
	goBackWrapper.appendChild(arrowWrapper);
	arrowWrapper.style.display = "flex";
	arrowWrapper.style.alignItems = "center";
	const arrow = document.createElement("i");
	arrow.classList.add("left");
	arrowWrapper.appendChild(arrow);
	const title = document.createElement("h3");
	title.style.margin = "0 0 0 10px";
	title.appendChild(document.createTextNode(titleText));
	arrowWrapper.appendChild(title);

	const starWrapper = document.createElement("div");
	navbar.appendChild(starWrapper);
	starWrapper.style.position = "absolute";
	starWrapper.style.right = "70px";
	starWrapper.style.filter = "invert(1)";
	starWrapper.classList.add("clickable");
	const star = document.createElement("img");
	starWrapper.appendChild(star);
	star.style.width = "20px";
	chrome.storage.local.get("wkhighlight_settings", result => {
		homePage = result["wkhighlight_settings"]["home_page"]["page"];

		if (homePage == titleText) {
			star.src = "../images/star-filled.png";
			starWrapper.title = "Return to default Home Page";
			star.classList.add("star-active");
		}
		else {
			star.src = "../images/star.png";
			starWrapper.title = "Make this the Home Page";
			star.classList.remove("star-active");
		}

		starWrapper.addEventListener("click", () => {
			if (!star.classList.contains("star-active")) {
				star.src = "../images/star-filled.png";
				star.classList.add("star-active");
				starWrapper.title = "Return to default Home Page";
				settings["home_page"]["page"] = titleText;
			}
			else {
				star.src = "../images/star.png";
				star.classList.remove("star-active");
				starWrapper.title = "Make this the Home Page";
				settings["home_page"]["page"] = null;
			}

			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	});

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
		const content = secondaryPage("API Key");

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
		window.scroll(0, 0);

		chrome.storage.local.get("wkhighlight_settings", result => {
			document.getElementById("secPageMain").remove();
			document.getElementById("main").style.removeProperty("display");
			
			if (result && result["wkhighlight_settings"] && result["wkhighlight_settings"]["miscellaneous"])
				document.documentElement.style.setProperty('--body-base-width', result["wkhighlight_settings"]["miscellaneous"]["extension_popup_width"]+"px");
			else
				document.documentElement.style.setProperty('--body-base-width', defaultWindowSize+"px");
			
			Array.from(document.getElementsByClassName("navbar_icon"))
				.forEach(icon => icon.classList.remove("disabled"));
		});
	}

	if (sidePanelIconTargeted(targetElem, "exit")) {
		if (document.getElementById("goBack")) document.getElementById("goBack").click();

		const main = document.getElementById("main");
		chrome.storage.local.clear();
		localStorage.clear("db_subjects");
		if (main) {
			main.replaceChild(reloadPage("Logout successfully", "green"), document.getElementById("userInfoWrapper"));
		}
	}

	if (sidePanelIconTargeted(targetElem, "run")) {
		if (document.getElementById("goBack")) document.getElementById("goBack").click();

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
							main.replaceChild(reloadPage(`Extension ACTIVATED on <div class="locationDiv"><span>${location}</span></div>`, "green"),  document.getElementById("userInfoWrapper"));
						}
						chrome.action.setBadgeText({text: '', tabId:activeTab.id});
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

		const content = secondaryPage("Settings", 400);
		content.id = "settingsContent";

		const settingsChecks = document.createElement("div");
		content.appendChild(settingsChecks);
		settingsChecks.id = "settingsOptionsWrapper";

		const blacklistedDiv = document.createElement("div");
		settingsChecks.appendChild(blacklistedDiv);
		blacklistedDiv.classList.add("settingsSection");
		const blackListedlink = document.createElement("p");
		blacklistedDiv.appendChild(blackListedlink);
		blackListedlink.id = "blacklistedSitesList";
		blackListedlink.classList.add("clickable");
		blackListedlink.appendChild(document.createTextNode("Blacklisted sites"));
		const arrow = document.createElement("i");
		arrow.classList.add("down", "blacklisted_title_arrow", "arrow");
		chrome.storage.local.get(["wkhighlight_blacklist"], result => {
			blackListedlink.innerText += result["wkhighlight_blacklist"] ? ` (${result["wkhighlight_blacklist"].length})` : " (0)";
			blackListedlink.appendChild(arrow);
		});

		chrome.storage.local.get(["wkhighlight_settings"], data => {
			settings = data["wkhighlight_settings"];
			if (settings && settingsInterface) {
				settingsInterface.forEach(section => {
					const wrapper = document.createElement("div");
					settingsChecks.appendChild(wrapper);
					wrapper.classList.add("settingsSection");

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
				highlightStyleWrapper.classList.add("settingsSection");
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
				appearanceWrapper.classList.add("settingsSection");
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

								// clicked color for highlighted learned and not learned
								if (id[1] === "highlight_learned" || id[1] === "highlight_not_learned") {
									const target = id[1] === "highlight_learned" ? "wkhighlighter_highlighted" : "wkhighlighter_highlightedNotLearned";
									// change color of the three highlight styles
									document.getElementsByClassName(target+" settings_highlight_style_option")[0].style.setProperty("background-color", color, "important");
									document.getElementsByClassName(target+"_underlined settings_highlight_style_option")[0].style.setProperty("border-bottom", "3px solid "+color, "important");
									document.getElementsByClassName(target+"_bold settings_highlight_style_option")[0].style.setProperty("color", color, "important");
								}

								// clicked color for kanji and vocab colors
								if (id[1] === "kanji_color" || id[1] === "vocab_color") {
									const randomSubjectType = document.getElementById("random-subject-type");
									if (randomSubjectType) {
										if (id[1].charAt(0) === randomSubjectType.innerText.toLowerCase())
											randomSubjectType.style.backgroundColor = color;
									}
								}

								// clicked color for details popup
								if (id[1] === "details_popup") {
									chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
										chrome.tabs.sendMessage(tabs[0].id, {detailsPopupColor:color}, () => window.chrome.runtime.lastError);
									});
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
				dangerZone.classList.add("settingsSection");
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
					clearCacheButton.style.borderBottomLeftRadius = "unset";
					clearCacheButton.style.borderBottomRightRadius = "unset";
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
			searchSubject(input);
		}
	}

	if (sidePanelIconTargeted(targetElem, "blacklist")) {
		if (document.getElementById("goBack")) document.getElementById("goBack").click();

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
							main.replaceChild(reloadPage(`Extension DEACTIVATED on: <div class="locationDiv"><span>${response["windowLocation"]}</span></div>`, "green"),  document.getElementById("userInfoWrapper"));
						}
					}
				});
			});
		}); 
	}

	if (sidePanelIconTargeted(targetElem, "about")) {
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));

		const targetIcon = Array.from(document.getElementsByClassName("navbar_icon"))
			.filter(icon => icon.getElementsByTagName("IMG")[0].title === "About" && icon.closest(".side-panel"))[0];
		targetIcon?.classList.add("disabled");

		const content = secondaryPage("About", 400);

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
		
		const apiKeyDisplayWrapper = document.createElement("div");
		content.appendChild(apiKeyDisplayWrapper);
		apiKeyDisplayWrapper.style.padding = "20px 10px";
		apiKeyDisplayWrapper.style.borderBottom = "1px solid silver";
		const apiKeyTitle = document.createElement("h3");
		apiKeyDisplayWrapper.appendChild(apiKeyTitle);
		apiKeyTitle.appendChild(document.createTextNode("API Key"));
		const apiKeyValueWrapper = document.createElement("div");
		apiKeyDisplayWrapper.appendChild(apiKeyValueWrapper);
		apiKeyValueWrapper.style.display = "flex";
		apiKeyValueWrapper.style.alignItems = "center";
		apiKeyValueWrapper.style.columnGap = "10px";
		const apiKeyValue = document.createElement("p");
		apiKeyValueWrapper.appendChild(apiKeyValue);
		chrome.storage.local.get(["wkhighlight_apiKey"], result => {
			apiKeyValue.appendChild(document.createTextNode(result["wkhighlight_apiKey"]));
			// copy to clipboard button
			const copyToClipboard = document.createElement("img");
			apiKeyValueWrapper.appendChild(copyToClipboard);
			copyToClipboard.src = "../images/copy.png";
			copyToClipboard.classList.add("clickable");
			copyToClipboard.style.width = "20px";
			copyToClipboard.addEventListener("click", () => {
				if (window.navigator.clipboard) {
					window.navigator.clipboard.writeText(result["wkhighlight_apiKey"]).
						then(() => {
							Array.from(document.getElementsByClassName("copiedMessage")).forEach(elem => elem.remove());
							const copiedMessage = document.createElement("div");
							apiKeyValueWrapper.appendChild(copiedMessage);
							copiedMessage.appendChild(document.createTextNode("Copied!"));
							copiedMessage.classList.add("copiedMessage");
							copiedMessage.style.color = "gray";
							copiedMessage.style.fontSize = "12px";
							setTimeout(() => copiedMessage.remove(), 1500);
						});
				}
			});
		});

		const usedLibsWrapper = document.createElement("div");
		content.appendChild(usedLibsWrapper);
		usedLibsWrapper.style.padding = "20px 10px";
		usedLibsWrapper.style.borderBottom = "1px solid silver";
		const usedLibsTitle = document.createElement("h3");
		usedLibsWrapper.appendChild(usedLibsTitle);
		usedLibsTitle.appendChild(document.createTextNode("Used libraries"));
		const usedLibsList = document.createElement("ul");
		usedLibsWrapper.appendChild(usedLibsList);
		[
			{
				img: "../images/chart_js.svg",
				title: "Chart.js",
				link: "https://www.chartjs.org/",
				description: "Creation of charts, used to show number of future reviews per day."
			},
			{
				img: "../images/chart_js_plugin_datalabels.svg",
				title: "chartjs-plugin-datalabels",
				link: "https://chartjs-plugin-datalabels.netlify.app/",
				description: "Dynamic content in data labels of charts from Chart.js."
			},
			{
				img: "../images/library.png",
				title: "localStorageDB",
				link: "https://nadh.in/code/localstoragedb/",
				description: "Organize browser local storage for it to behave as a relational database, which allowed for minimal loading times in the Extension Popup."
			}
		].forEach(lib => {
			const libWrapper = document.createElement("li");
			usedLibsList.appendChild(libWrapper);
			libWrapper.style.marginBottom = "10px";
			const link = document.createElement("a");
			libWrapper.appendChild(link);
			link.target = "_blank";
			link.style.display = "flex";
			link.style.alignItems = "center";
			link.style.height = "40px";
			link.href = lib.link;
			if (lib.img) {
				const icon_img = document.createElement("img");
				link.appendChild(icon_img);
				icon_img.src = lib.img;
				icon_img.style.marginRight = "10px";

				if (lib.img == "../images/library.png") {
					icon_img.style.width = "30px";
					icon_img.style.marginLeft = "10px";
					icon_img.title = "Not the real logo"
				}
				else {
					icon_img.style.width = "40px";
					icon_img.title = lib.link;
				}
			}
			const title = document.createElement("b");
			link.appendChild(title);
			title.appendChild(document.createTextNode(lib.title));
			title.title = lib.link;
			const description = document.createElement("p");
			libWrapper.appendChild(description);
			description.appendChild(document.createTextNode(lib.description));
			description.style.paddingLeft = "20px";
			description.style.marginTop = "5px";
		});

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
		links.style.textAlign = "center";
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
			settings = data["wkhighlight_settings"];
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
									chrome.action.setBadgeText({text: value, tabId:activeTab.id});
								});
							}
							else
								chrome.action.setBadgeText({text: '', tabId:activeTab.id});

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
								//chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
							}
							break;
						case "practice_reminder":
							const timeInput = document.getElementById("practice-reminder-time");
							if (targetElem.checked) {
								if (timeInput.classList.contains("disabled"))
									timeInput.classList.remove("disabled");
								chrome.alarms.clear("practice");
								chrome.runtime.connect();
								//chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
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
							break;
					}
					break;
			}
			
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	}

	if (targetElem.id === "clearAll")
		clearCache();

	if (targetElem.id === "clearSubjectsData")
		clearSubjects();

	if (targetElem.id === "blacklistedSitesList" || (targetElem.parent && targetElem.parentElement.id === "blacklistedSitesList")) {
		const wrapper = document.getElementById("blacklistedSitesWrapper");
		if (!wrapper) {
			const parent = targetElem.parentElement;

			flipArrow(targetElem.getElementsByClassName("blacklisted_title_arrow")[0], "down", "up");

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
						binWrapper.title = "Run on "+site;
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
			flipArrow(targetElem.getElementsByClassName("blacklisted_title_arrow")[0], "up", "down");
			wrapper.remove();
		}
	}

	if (targetElem.classList.contains("settings_highlight_style_option")) {
		targetElem.parentNode.querySelectorAll(".full_opacity").forEach(elem => elem.classList.remove("full_opacity"));
		targetElem.classList.add("full_opacity");
		const targetClass = targetElem.classList[0];
		const highlightTarget = targetClass.split("_")[1] == "highlighted" ? "learned" : "not_learned";
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			settings = data["wkhighlight_settings"];
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

			const sidePanelBlackList = document.getElementById("blacklist");
			if (sidePanelBlackList) {
				sidePanelBlackList.nextSibling.innerText = Number(sidePanelBlackList.nextSibling.innerText)-1;
			}
		});
	}

	if (targetElem.id == "kanjiSearchInput") {
		const targetIcon = Array.from(document.getElementsByClassName("navbar_icon"))
			.filter(icon => icon.getElementsByTagName("IMG")[0].title === "Search" && icon.closest(".side-panel"))[0];
		targetIcon?.classList.add("disabled");

		document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(defaultWindowSize, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");

		Array.from(document.getElementById("userInfoWrapper").children).forEach(div => {
			if (!div.classList.contains("searchArea")) div.style.display = "none";	
		});
		
		let searchResultWrapper = document.getElementById("searchResultWrapper");
		if (!searchResultWrapper) {
			searchResultWrapper = document.createElement("div");
			searchResultWrapper.id = "searchResultWrapper";
			document.getElementsByClassName("searchArea")[0].appendChild(searchResultWrapper);
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
				settings = result["wkhighlight_settings"];
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
					["list", "big-grid", "small-grid"].forEach((option, i) => {
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
		}
	}

	// clicked outside search area and searching related
	if (document.getElementById("searchResultNavbar") && !document.getElementById("notRunAtWK") && !targetElem.closest("#userInfoWrapper") && targetElem.id !== "search" && !targetElem.closest(".side-panel")) {
		Array.from(document.getElementsByClassName("navbar_icon"))
			.forEach(icon => icon.classList.remove("disabled"));

		const wrapper = document.getElementById("searchResultWrapper");
		if (wrapper)
			wrapper.remove();
		
		chrome.storage.local.get("wkhighlight_settings", result => {
			if (result && result["wkhighlight_settings"] && result["wkhighlight_settings"]["miscellaneous"])
				document.documentElement.style.setProperty('--body-base-width', result["wkhighlight_settings"]["miscellaneous"]["extension_popup_width"]+"px");
			else
				document.documentElement.style.setProperty('--body-base-width', defaultWindowSize+"px");
		});

		if (document.getElementById("kanjiSearchInput"))
			document.getElementById("kanjiSearchInput").value = "";

		Array.from(document.getElementById("userInfoWrapper").children).forEach(div => div.style.removeProperty("display"));

		const searchResultNavbar = document.getElementById("searchResultNavbar");
		if (searchResultNavbar) {
			searchResultNavbar.remove();
		}
	}

	const typeWrapper = document.getElementsByClassName("kanjiSearchTypeWrapper")[0];
	if ((typeWrapper && typeWrapper.contains(targetElem)) || targetElem.classList.contains("kanjiSearchTypeWrapper")) {
		const input = document.getElementById("kanjiSearchInput");
		input?.select();
		input?.dispatchEvent(new MouseEvent("click", {
			"view": window,
			"bubbles": true,
			"cancelable": false
		}));
		
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
			settings = result["wkhighlight_settings"];
			if (settings && settings["search"])
				settings["search"]["results_display"] = targetElem.id;
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});

		const removeSquareClasses = elem => {
			const classes = elem.classList;
			if (classes.contains("searchResultItemSquare")) classes.remove("searchResultItemSquare");
			if (classes.contains("searchResultItemSquareSmall")) classes.remove("searchResultItemSquareSmall");
		}

		if (["searchResultOptionbig-grid", "searchResultOptionsmall-grid"].includes(targetElem.id)) {
			Array.from(document.getElementsByClassName("searchResultItemInfo")).forEach(elem => {
				const parent = elem.parentElement;
				removeSquareClasses(parent);
				parent.classList.add(targetElem.id == "searchResultOptionbig-grid" ? "searchResultItemSquare" : "searchResultItemSquareSmall");
				elem.style.display = "none";
			});
			// if there are results in the search
			const resultsWrapper = document.getElementById("searchResultItemWrapper");
			if (resultsWrapper && resultsWrapper.childNodes.length > 0)
				document.documentElement.style.setProperty('--body-base-width', manageBodyWidth(630, parseInt(document.documentElement.style.getPropertyValue('--body-base-width')))+"px");
			
			const newClass = targetElem.id === "searchResultOptionbig-grid" ? "searchResultItemType-small" : "searchResultItemType-tiny"; 
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

		chrome.storage.local.get("wkhighlight_settings", result => {
			if (result && result["wkhighlight_settings"] && result["wkhighlight_settings"]["miscellaneous"])
				document.documentElement.style.setProperty('--body-base-width', result["wkhighlight_settings"]["miscellaneous"]["extension_popup_width"]+"px");
			else
				document.documentElement.style.setProperty('--body-base-width', defaultWindowSize+"px");
		});
	}

	// clicked in target icon
	if (targetElem.classList.contains("searchResultNavbarTarget")) {
		chrome.storage.local.get(["wkhighlight_settings"], result => {
			settings = result["wkhighlight_settings"];
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
		console.log(targetElem);
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
			const lib = new localStorageDB("subjects", localStorage);

			if (loading) loading.remove();

			settings = result["wkhighlight_settings"];
			if (settings) {
				const displaySettings = settings["assignments"]["srsMaterialsDisplay"];
				// filter by srs stages
				const lessonsBarData = [];
				const reviewsBarData = [];
				let hasAssignments = false;
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
						hasAssignments = true;

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
						const srsTitleArrow = document.createElement("i");
						srsTitle.appendChild(srsTitleArrow);
						srsTitleArrow.style.borderColor = settings["appearance"][srsStages[srsId]["short"][0].toLowerCase()+srsStages[srsId]["short"].slice(1)+"_color"];
						srsTitleArrow.style.padding = "5px";
						srsTitleArrow.style.pointerEvents = "none";
						srsTitleArrow.style.marginLeft = "10px";
						flipArrow(srsTitleArrow, "_", settings["assignments"]["srsMaterialsDisplay"][srsId] ? "up" : "down");
						srsTitle.addEventListener("click", e => {
							const materialsForThisSrs = e.target.parentElement.children[1];
							if (materialsForThisSrs.classList.contains("hidden")) {
								materialsForThisSrs.classList.remove("hidden");
								settings["assignments"]["srsMaterialsDisplay"][srsId] = true;
								flipArrow(srsTitleArrow, "down", "up");
							}
							else {
								materialsForThisSrs.classList.add("hidden");
								settings["assignments"]["srsMaterialsDisplay"][srsId] = false;
								flipArrow(srsTitleArrow, "up", "down");
							}
							chrome.storage.local.set({"wkhighlight_settings":settings});
						});
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
								let cssVar;
								const filtered = lib.queryAll(assignment["subject_type"], {
									query: {id : assignment["subject_id"]}
								});

								switch(assignment["subject_type"]) {
									case "kanji":
										li.classList.add("kanji_back" , "kanjiDetails", "clickable");
										cssVar = "--kanji-tag-color";
										break;
									case "vocabulary":
										li.classList.add("vocab_back" , "kanjiDetails", "clickable");
										cssVar = "--vocab-tag-color";
										break;
									case "radical":
										li.classList.add("radical_back");
										li.style.height = "30px";
										cssVar = "--radical-tag-color";
										break;
								}

								const subject = filtered[0];
								if (subject) {
									characters = subject["characters"] ? subject["characters"]  : `<img height="22px" style="margin-top:-3px;margin-bottom:-4px;padding-top:8px" src="${subject["character_images"].filter(image => image["content_type"] == "image/png")[0]["url"]}"><img>`;
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
									const wrapperForLi = document.createElement("div");
									li.appendChild(wrapperForLi);
									wrapperForLi.style.marginTop = "5px";
									wrapperForLi.appendChild(document.createTextNode(characters));
								}
								li.setAttribute('data-item-id', assignment["subject_id"]);
								if (characters !== "L" && li.children.length > 0 && li.style.color == "rgb(255, 255, 255)") li.children[0].style.filter = "invert(1)";
						});
					}
				});

				if (!hasAssignments) {
					const notFound = document.createElement("div");
					container.appendChild(notFound);
					notFound.classList.add("not-found");
					const kanjiModel = document.createElement("p");
					notFound.appendChild(kanjiModel);
					const randHex = rand(parseInt("4e00", 16), parseInt("9faf", 16)).toString(16);
					kanjiModel.appendChild(document.createTextNode(String.fromCharCode(`0x${randHex}`)));
					const noKanjiFound = document.createElement("p");
					notFound.appendChild(noKanjiFound);
					noKanjiFound.appendChild(document.createTextNode("No subjects to study for now!"));
					const notFoundSlash = document.createElement("div");
					kanjiModel.appendChild(notFoundSlash);
				}

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
			const reviewsListTitle = document.createElement("p");
			reviewsList.appendChild(reviewsListTitle);
			reviewsListTitle.innerHTML = `<b>${reviews && reviews["count"] ? reviews["count"] : 0}</b> Reviews available right now!`;
			const reviewsListBar = document.createElement("div");
			reviewsListBar.id = "reviewsListBar";
			reviewsList.appendChild(reviewsListBar);
			const reviewsListUl = document.createElement("ul");
			reviewsList.appendChild(reviewsListUl);
			const futureReviewsChart = document.createElement("div");
			futureReviewsWrapper.appendChild(futureReviewsChart);
			const loadingChart = loading(["main-loading"], ["kanjiHighlightedLearned"], 50, "Loading Reviews Chart...");
			const loadingChartElem = loadingChart[0];
			futureReviewsChart.appendChild(loadingChartElem);

			if (reviews) {
				//setup list of material for current reviews
				if (reviews["data"])
					displayAssignmentMaterials(reviews["data"], reviewsListUl);

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

						settings = result["wkhighlight_settings"];
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
			lessonsList.id = "assignmentsMaterialList";
			const lessonsListTitle = document.createElement("p");
			lessonsList.appendChild(lessonsListTitle);
			lessonsListTitle.innerHTML = `<b>${lessons && lessons["count"] ? lessons["count"] : 0}</b> Lessons available right now!`;
			const lessonsListBar = document.createElement("div");
			lessonsListBar.id = "lessonsListBar";
			lessonsList.appendChild(lessonsListBar);
			const lessonsListUl = document.createElement("ul");
			lessonsList.appendChild(lessonsListUl);
			lessonsListUl.style.maxHeight = "unset";

			if (lessons) {
				//setup list of material for current reviews
				if (lessons["data"])
						displayAssignmentMaterials(lessons["data"], lessonsListUl);
			}
		});
	}

	// clicked outside side panel
	const sidePanel = document.getElementsByClassName("side-panel")[0];
	if (sidePanel && sidePanel.classList.contains("side-panel-focus") && (targetElem.closest("#main") || targetElem.closest("#secPageMain") || (targetElem.closest("body") && !targetElem.closest(".side-panel")))) {
		const sidePanelLogo = document.getElementById("side-panel-logo");
		if (sidePanelLogo) {
			sidePanelLogo.dispatchEvent(new MouseEvent("click", {
				"view": window,
				"bubbles": true,
				"cancelable": false
			}));
		}
	}

	// click button animation
	if (targetElem.classList.contains("clickable") || targetElem.closest(".clickable")) {
		const target = targetElem.closest(".clickable") ? targetElem.closest(".clickable") : targetElem;
		target.style.transform = "scale(0.95)";
		setTimeout(() => target.style.removeProperty("transform"), 100);
	}
});

document.addEventListener("input", e => {
	const target = e.target;

	if (target.classList.contains("settingsItemInput")) {
		if (target.type === "select-one") {
			const value = target.value;
			chrome.storage.local.get(["wkhighlight_settings"], data => {
				settings = data["wkhighlight_settings"];
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
				settings = data["wkhighlight_settings"];
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
	inputDiv.addEventListener("click", () => checkbox.click());

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
		document.getElementsByClassName("searchArea")[0].appendChild(searchResultWrapper);
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

	const lib = new localStorageDB("subjects", localStorage);

	chrome.storage.local.get(["wkhighlight_settings"], result => {
		settings = result["wkhighlight_settings"];
		if (settings && settings["search"]) {
			if (type == "A") {
				input.value = convertToKana(input.value);
			
				// if it is hiragana
				if (input.value.match(/[\u3040-\u309f]/)) {
					//const filterByReadings = (itemList, value) => itemList.filter(item => matchesReadings(value, item["readings"], settings["search"]["targeted_search"]));
					filteredKanji = lib.queryAll("kanji", {
						query: row => matchesReadings(input.value, row.readings, settings["search"]["targeted_search"])
					});
					filteredVocab = lib.queryAll("vocabulary", {
						query: row => matchesReadings(input.value, row.readings, settings["search"]["targeted_search"])
					});
				}
			}
			else {
				// if it is a chinese character
				if (value.match(/[\u3400-\u9FBF]/)) {
					filteredKanji = filteredKanji.concat(lib.queryAll("kanji", {
						query: row => value == row.characters
					}));
							
					if (filteredKanji.length > 0 && !settings["search"]["targeted_search"]) {
						filteredKanji[0]["visually_similar_subject_ids"].forEach(id => filteredKanji.push(lib.queryAll("kanji", {
							query: row => id == row.id
						})));
						filteredKanji[0]["amalgamation_subject_ids"].forEach(id => filteredVocab.push(lib.queryAll("vocabulary", {
							query: row => id == row.id
						})));
					}

					filteredVocab = filteredVocab.concat(lib.queryAll("vocabulary", {
						query: row => value == row.characters
					}));

					filteredVocab = filteredVocab.flat();

					if (filteredVocab.length > 0) {
						console.log(filteredVocab);
						filteredVocab[0]["component_subject_ids"].forEach(id => filteredKanji.push(lib.queryAll("kanji", {
							query: row => id == row.id
						})));
					}
				}
				// if is number check for level
				else if (!isNaN(value)) {
					//const filterByLevel = (itemList, value) => itemList.filter(item => value == item["level"]);
					filteredKanji = lib.queryAll("kanji", {
						query: row => row.level == value
					});
					filteredVocab = lib.queryAll("vocabulary", {
						query: row => row.level == value
					});
				}
				else if (value == "legacy") {
					filteredKanji = lib.queryAll("kanji", {
						query: row => row.hidden_at !== null
					});
					filteredVocab = lib.queryAll("vocabulary", {
						query: row => row.hidden_at !== null
					});
				}
				else {
					//const filterByMeanings = (itemList, value) => itemList.filter(item => matchesMeanings(value, item["meanings"], settings["search"]["targeted_search"]));
					const cleanInput = input.value.toLowerCase().trim();
					filteredKanji = lib.queryAll("kanji", {
						query: row => matchesMeanings(cleanInput, row.meanings, settings["search"]["targeted_search"])
					});
					filteredVocab = lib.queryAll("vocabulary", {
						query: row => matchesMeanings(value, row.meanings, settings["search"]["targeted_search"])
					});
				}
			}
		
			filteredKanji = filteredKanji.flat();
			filteredVocab = filteredVocab.flat();

			const nmrItemsFound = document.getElementById("nmrKanjiFound");
			if (nmrItemsFound) 
				nmrItemsFound.innerHTML = `<span>Found <strong>0</strong> items<span>`;
		
			if (filteredKanji.length > 0 || filteredVocab.length > 0) {
				const firstKanji = filteredKanji[0];
				const firstVocab = filteredVocab[0];
		
				const sortObjectByLevel = itemList => itemList.sort((a,b) => a["level"] > b["level"] ? 1 : -1);
				if (filteredKanji.length > 0) sortObjectByLevel(filteredKanji).unshift(firstKanji);
				if (filteredVocab.length > 0) sortObjectByLevel(filteredVocab).unshift(firstVocab);
				const filteredContent = [...new Set(filteredKanji.concat(filteredVocab))].flat(0);
			
				console.log(filteredContent);
				if (nmrItemsFound) 
					nmrItemsFound.innerHTML = `<span>Found <strong>${filteredContent.length}</strong> items<span>`;
		
				for (const index in filteredContent) {
					const data = filteredContent[index];
					const type = data["subject_type"];
					const chars = data["characters"];
		
					const kanjiAlike = type == "kanji" || chars.length == 1;
					const vocabAlike = type == "vocabulary" && chars.length > 1;	
					
					const li = document.createElement("li");
					li.classList.add("searchResultItemLine"); 
					searchResultUL.appendChild(li);
					li.setAttribute('data-item-id', data["id"]);
					console.log(data);
					if (data["hidden_at"]) {
						li.style.borderLeft = "4px solid yellow";
						li.style.opacity = "0.4";
						li.title = "This subject no longer shows up in lessons or reviews, since "+data["hidden_at"].split("T")[0]+".";
					}
					else if (data["srs_stage"]) {
						li.style.borderLeft = `4px solid var(--${srsStages[data["srs_stage"]]["short"].toLowerCase()}-color)`;
						li.title = srsStages[data["srs_stage"]]["name"];
					}

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
						if (settings["search"]["results_display"] == "searchResultOptionbig-grid") {
							li.classList.add("searchResultItemSquare");
							subjectType.classList.add("searchResultItemType-small");
						}
						else if (settings["search"]["results_display"] == "searchResultOptionsmall-grid") {
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
	if (request.nmrKanjiHighlighted && sender.tab.id == activeTab.id) {
		chrome.action.setBadgeText({text: request.nmrKanjiHighlighted.toString(), tabId:activeTab.id});
		chrome.action.setBadgeBackgroundColor({color: "#4d70d1", tabId:activeTab.id});

		let nmrKanjiHighlightedElem = document.getElementById("nmrKanjiHighlighted")?.getElementsByTagName("strong")[0];
		if (!nmrKanjiHighlightedElem) {
			const kanjiFoundWrapper = document.createElement("div");
			kanjiFoundWrapper.classList.add("highlightedKanjiContainer", "userInfoWrapper-wrapper");
			document.getElementById("userInfoNavbar")?.insertBefore(kanjiFoundWrapper, document.getElementById("userInfoNavbar").childNodes[0]);
			kanjiFoundWrapper.classList.add("resizable");
			kanjiFoundWrapper.style.maxHeight = defaultSettings["sizes"]["highlighted_kanji_height"]+"px";
			chrome.storage.local.get(["wkhighlight_settings"], result => {
				if (result["wkhighlight_settings"] && result["wkhighlight_settings"]["sizes"])
					kanjiFoundWrapper.style.maxHeight = result["wkhighlight_settings"]["sizes"]["highlighted_kanji_height"]+"px";
			});
			kanjiFoundWrapper.setAttribute("data-settings", "sizes-highlighted_kanji_height");
			const resizableS = document.createElement("div");
			kanjiFoundWrapper.appendChild(resizableS);
			resizableS.classList.add("resizable-s");
			const kanjiFound = document.createElement("div");
			kanjiFoundWrapper.appendChild(kanjiFound);
			kanjiFound.id = "nmrKanjiHighlighted";
			kanjiFound.classList.add("userInfoWrapper-title");
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
	
	if (request.kanjiHighlighted && document.getElementById("kanjiHighlightedList") && sender.tab.id == activeTab.id) {
		chrome.storage.local.get(["wkhighlight_kanji_assoc"], result => {
			const kanjiAssoc = result["wkhighlight_kanji_assoc"];
			const kanjiHighlightedList = request.kanjiHighlighted;
			const kanjiFoundList = document.getElementById("kanjiHighlightedList");
			const parentMaxHeight = kanjiFoundList.parentElement.style.maxHeight;
			kanjiFoundList.style.maxHeight = (Number(parentMaxHeight.substring(0, parentMaxHeight.length-2))-40)+"px";
			if (kanjiFoundList) {
				kanjiFoundList.childNodes[0].remove();
				const kanjiFoundUl = document.createElement("ul");
				kanjiFoundList.appendChild(kanjiFoundUl);
				const learned = kanjiHighlightedList["learned"];
				const notLearned = kanjiHighlightedList["notLearned"];
				const lib = new localStorageDB("subjects", localStorage);
				[learned, notLearned].forEach(type => {
					type.forEach(kanji => {
						const kanjiFoundLi = document.createElement("li");
						kanjiFoundUl.appendChild(kanjiFoundLi);
						kanjiFoundLi.classList.add("clickable", "kanjiDetails", type === learned ? "kanjiHighlightedLearned" : "kanjiHighlightedNotLearned");
						kanjiFoundLi.appendChild(document.createTextNode(kanji));
						if (kanjiAssoc) kanjiFoundLi.setAttribute("data-item-id", kanjiAssoc[kanji]);

						const subject = lib.queryAll("kanji", {
							query: {id: kanjiAssoc[kanji]}
						});
						if (subject[0])
							kanjiFoundLi.title = subject[0]["meanings"][0]+" | "+subject[0]["readings"].filter(reading => reading["primary"])[0]["reading"];
					});
				});
				
				updateItemsListBar(document.getElementsByClassName("items-list-bar")[0], [learned.length, notLearned.length]);

				if (learned.length == 0 && notLearned.length == 0) {
					const notFound = document.createElement("div");
					kanjiFoundUl.appendChild(notFound);
					notFound.classList.add("not-found");
					const kanjiModel = document.createElement("p");
					notFound.appendChild(kanjiModel);
					const randHex = rand(parseInt("4e00", 16), parseInt("9faf", 16)).toString(16);
					kanjiModel.appendChild(document.createTextNode(String.fromCharCode(`0x${randHex}`)));
					const noKanjiFound = document.createElement("p");
					notFound.appendChild(noKanjiFound);
					noKanjiFound.appendChild(document.createTextNode("No Kanji found in the current page!"));
					const notFoundSlash = document.createElement("div");
					kanjiModel.appendChild(notFoundSlash);
				}
			}
		});
	}

	if (request.uptimeDetailsPopup || request.uptimeHighlight) {
		const wrapper = document.getElementById("scriptsUptime");
		if (wrapper) {
			if (request.uptimeHighlight) 
				wrapper.getElementsByTagName("DIV")[0].style.backgroundColor = "#80fd80";

			if (request.uptimeDetailsPopup) 
				wrapper.getElementsByTagName("DIV")[1].style.backgroundColor = "#80fd80";
		}
	}
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
					"hidden_at": kanji["hidden_at"]
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
					"hidden_at": vocab["hidden_at"]
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
					"hidden_at": radical["hidden_at"]
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
		setTimeout(() => {
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
		}, 1500);
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

window.onscroll = () => {
	let goTop = document.getElementsByClassName("goTop")[0];
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
