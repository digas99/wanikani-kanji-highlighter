let kanjiList = [];
let vocabList = [];
let radicalList = [];
let activeTab;

let reviews, lessons, reviewsChart;

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
		version.href = `https://github.com/digas99/wanikani-kanji-highlighter/releases/tag/${result}`;
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
				if (!result["wkhighlight_blacklist"] || result["wkhighlight_blacklist"].length === 0 || !blacklisted(result["wkhighlight_blacklist"], url)) {
					const apiKey = result["wkhighlight_apiKey"];
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
						const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50);
						const loadingElem = loadingVal[0];
						main.appendChild(loadingElem);

						let settings = result["wkhighlight_settings"];
		
						// set settings
						if (!settings)
							settings = defaultSettings;
						else {
							// check if all settings are stored
							notStored = [];
							Object.keys(defaultSettings).map(key => {
								if (!Object.keys(settings).includes(key))
									settings[key] = {};

								Object.keys(defaultSettings[key]).map(innerKey => {
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
						document.documentElement.style.setProperty('--highlight-default-color', appearance["highlight_learned"]);
						document.documentElement.style.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
						document.documentElement.style.setProperty('--radical-tag-color', appearance["radical_color"]);
						document.documentElement.style.setProperty('--kanji-tag-color', appearance["kanji_color"]);
						document.documentElement.style.setProperty('--vocab-tag-color', appearance["vocab_color"]);

						if (kanjiList.length == 0 || vocabList.length == 0) {
							document.body.style.cursor = "progress";
							chrome.storage.local.get(["wkhighlight_userInfo_updated","wkhighlight_summary_updated", "wkhighlight_reviews", "wkhighlight_lessons"], response => {									
								const date = response["wkhighlight_userInfo_updated"] ? response["wkhighlight_userInfo_updated"] : formatDate(new Date());

								modifiedSince(apiKey, date, "https://api.wanikani.com/v2/user")
									.then(modified => {
										// if user info has been updated in wanikani, then update cache
										if (modified) {
											fetchPage(apiKey, "https://api.wanikani.com/v2/user")
												.then(user => {
													// code 429 is Rate limit exceeded
													if (!window.chrome.runtime.lastError && user && user.code != 429) 
														chrome.storage.local.set({"wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
											});
										}
		
										const userInfo = result["wkhighlight_userInfo"]["data"];
										if (userInfo) {
											// remove loading animation
											loadingElem.remove();
											clearInterval(loadingVal[1]);	

											const userInfoWrapper = document.createElement("div");
											userInfoWrapper.id = "userInfoWrapper";
											main.appendChild(userInfoWrapper);
				
											const topRightNavbar = document.createElement("div");
											userInfoWrapper.appendChild(topRightNavbar);
											topRightNavbar.id = "topRightNavbar";
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
	
											const userElementsList = document.createElement("ul");
											userElementsList.id = "userInfoNavbar";
											userInfoWrapper.appendChild(userElementsList);
				
											const greetings = document.createElement("li");
											greetings.innerHTML = `Hello, <a href="${userInfo["profile_url"]}" target="_blank">${userInfo["username"]}</a>!`;
											userElementsList.appendChild(greetings);
				
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
											userElementsList.appendChild(level);
											
											const kanjiFound = document.createElement("li");
											kanjiFound.id = "nmrKanjiHighlighted";
											kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: (in the page)`;
											userElementsList.appendChild(kanjiFound);
	
											const kanjiFoundList = document.createElement("li");
											userElementsList.appendChild(kanjiFoundList);
											kanjiFoundList.id = "kanjiHighlightedList";
											kanjiFoundList.classList.add("simple-grid", "bellow-border");
											const kanjiFoundUl = document.createElement("ul");
											kanjiFoundList.appendChild(kanjiFoundUl);
	
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
	
												const title = document.createElement("div");
												summaryLi.appendChild(title);
												title.appendChild(document.createTextNode(topic));
												title.classList.add("summaryTitle");
	
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
											moreReviews.classList.add("bellow-border");
											moreReviews.innerHTML = 'More <span style="color:#2c7080;font-weight:bold">Reviews</span> in';
											
											if (!/(http(s)?:\/\/)?www.wanikani\.com.*/g.test(url)) {					
												const searchArea = textInput("kanjiSearch", "../images/search.png", "Gold / 金 / 5", searchKanji);
												chrome.storage.local.get(["wkhighlight_contextMenuSelectedText", "wkhighlight_kanjiPerSite"], result => {
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
																searchKanji(input)
															});
														}
														else
															searchKanji(input);
															
														chrome.storage.local.remove(["wkhighlight_contextMenuSelectedText"]);
														chrome.storage.local.get(["wkhighlight_nmrHighLightedKanji"], result => {
															chrome.browserAction.setBadgeText({text: result["wkhighlight_nmrHighLightedKanji"].toString(), tabId:activeTab.id});
															chrome.browserAction.setBadgeBackgroundColor({color: "#4d70d1", tabId:activeTab.id});
														});
													}
	
													const kanjiPerSite = result["wkhighlight_kanjiPerSite"];
													if (kanjiPerSite) {
														chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
															const currentTabUrl = tabs[0]["url"];
															if (kanjiPerSite[currentTabUrl]) {
																kanjiFound.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${kanjiPerSite[currentTabUrl]["number"]}</strong> (in the page)`;
																if (kanjiPerSite[currentTabUrl]["number"] <= 10)
																	kanjiFoundUl.style.textAlign = "center";
																const learned = kanjiPerSite[currentTabUrl]["kanji"]["learned"];
																const notLearned = kanjiPerSite[currentTabUrl]["kanji"]["notLearned"];
																[learned, notLearned].forEach(type => {
																	type.forEach(kanji => {
																		const kanjiFoundLi = document.createElement("li");
																		kanjiFoundUl.appendChild(kanjiFoundLi);
																		kanjiFoundLi.classList.add("clickable", "kanjiDetails", type === learned ? "kanjiHighlightedLearned" : "kanjiHighlightedNotLearned");
																		kanjiFoundLi.appendChild(document.createTextNode(kanji));
																	});
																});
															}
														});
													}
												});
												topRightNavbar.insertBefore(searchArea, topRightNavbar.firstChild);
												const searchWrapper = searchArea.firstChild;
												const searchTypeWrapper = document.createElement("div");
												searchWrapper.appendChild(searchTypeWrapper);
												searchTypeWrapper.classList.add("kanjiSearchTypeWrapper");
												searchTypeWrapper.id = "kanjiSearchTypeKana";
												const searchType = document.createElement("span");
												searchTypeWrapper.appendChild(searchType);
												searchType.id = "kanjiSearchType";
												searchType.appendChild(document.createTextNode("あ"));
											}
											else {
												const notRunAtWK = document.createElement("li");
												notRunAtWK.appendChild(document.createTextNode("Limited features while @wanikani, sorry!"));
												notRunAtWK.id = "notRunAtWK";
												userElementsList.appendChild(notRunAtWK);
											}
	
											const blacklistButtonWrapper = document.createElement("div");
											userInfoWrapper.appendChild(blacklistButtonWrapper);
											blacklistButtonWrapper.id = "blacklistButtonWrapper";
											const blacklistButton = document.createElement("div");
											blacklistButton.id = "blacklistButton";
											blacklistButtonWrapper.appendChild(blacklistButton);
											blacklistButton.classList.add("button");
											blacklistButton.appendChild(document.createTextNode("Don't Run On This Site"));

	
											// get all assignments if there are none in storage or if they were modified
											chrome.storage.local.get(["wkhighlight_assignments", "wkhighlight_assignments_updated"], result => {
												const assignments = result["wkhighlight_assignments"];
												modifiedSince(apiKey, result["wkhighlight_assignments_updated"], "https://api.wanikani.com/v2/assignments")
													.then(modified => {
														if (!assignments || modified) {
															fetchAllPages(apiKey, "https://api.wanikani.com/v2/assignments")
																.then(data => {
																	const allAssignments = data.map(arr => arr["data"]).reduce((arr1, arr2) => arr1.concat(arr2));
																	const allFutureAssignments = filterAssignmentsByTime(allAssignments, new Date(), null);
																	const allAvailableReviews = filterAssignmentsByTime(allAssignments, new Date(), changeDay(new Date(), -1000));
																	chrome.storage.local.set({"wkhighlight_assignments":{
																		"all":allAssignments,
																		"future":allFutureAssignments,
																		"past":allAvailableReviews
																	}, "wkhighlight_assignments_updated":formatDate(new Date())});
																});
														}
													});
											});
	
											const setupSummary = (reviews, lessons) => {
												if (reviews) {
													const currentTime = new Date().getTime();			
													document.getElementById("summaryReviews").innerText = reviews["count"];
	
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
												if (lessons)
													document.getElementById("summaryLessons").innerText = lessons["count"];
												
												reviewsLoadingElem.remove();
												clearInterval(reviewsLoadingVal[1]);
											}
	
											reviews = response["wkhighlight_reviews"];
											lessons = response["wkhighlight_lessons"];
											
											fetchPage(apiKey, "https://api.wanikani.com/v2/assignments?immediately_available_for_lessons")
												.then(lessons => {
													fetchPage(apiKey, "https://api.wanikani.com/v2/assignments?immediately_available_for_review")
														.then(reviews => {
															chrome.storage.local.get(["wkhighlight_assignments"], result => {
																	const assignments = result["wkhighlight_assignments"];
																	if (lessons && reviews && assignments) {
																		const updateReviews = {
																			"count":reviews["total_count"],
																			"data":reviews["data"],
																			"next_reviews":filterAssignmentsByTime(assignments["future"], new Date(), changeDay(new Date(), 14))
																		};
																		const updatedLessons = {
																			"count":lessons["total_count"],
																			"data":lessons["data"]
																		};
																		setupSummary(updateReviews, updatedLessons);
																		chrome.storage.local.set({"wkhighlight_reviews": updateReviews, "wkhighlight_lessons": updatedLessons});
																	}
																});
														});
												});
	
											setupSummary(reviews, lessons);
										}
									});
							});
							document.body.style.cursor = "inherit";
						}
					
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

		// rate message
		chrome.storage.local.get(["wkhighlight_rateme"], result => {
			if (!result["wkhighlight_rateme"] || !result["wkhighlight_rateme"]["closed"]) {
				const rateMeWrapper = document.createElement("div");
				document.body.appendChild(rateMeWrapper);
				rateMeWrapper.classList.add("rateMeWrapper");

				rateMeWrapper.appendChild(document.createTextNode("Enjoying the app? "));
				const rateMeLink = document.createElement("a");
				rateMeWrapper.appendChild(rateMeLink);
				rateMeLink.href = "https://chrome.google.com/webstore/detail/wanikani-kanji-highlighte/pdbjikelneighjgjojikkmhiehpcokjm/reviews#:~:text=Rate%20this%20extension";
				rateMeLink.appendChild(document.createTextNode("Give me a Rate!"));
				rateMeLink.target = "_blank";
				rateMeWrapper.appendChild(document.createTextNode(" :)"));
				const rateMeX = document.createElement("div");
				rateMeWrapper.appendChild(rateMeX);
				rateMeX.id = "rateMeX";
				rateMeX.classList.add("clickable");
				rateMeX.appendChild(document.createTextNode("X"));
				chrome.storage.local.set({"wkhighlight_rateme":{closed:false}});
			}
		});
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

const secundaryPage = (titleText, width) => {
	document.documentElement.style.setProperty('--body-base-width', width+"px");

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
	arrow.style.pointerEvents = "none";
	arrow.style.padding = "4px";
	arrowWrapper.appendChild(arrow);
	navbar.appendChild(arrowWrapper); 

	const title = document.createElement("h3");
	title.style.margin = "0 0 0 10px";
	title.appendChild(document.createTextNode(titleText));
	navbar.appendChild(title);

	const content = document.createElement("div");
	content.style.padding = "28px 0 0 0";
	// content.style.padding = "28px 0 55px 0";
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
		const content = secundaryPage("API Key", 250);

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
		document.getElementById("main").style.display = "inherit";
		document.documentElement.style.setProperty('--body-base-width', '225px');

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

	if (targetElem.id === "settings" || (targetElem.childNodes[0] && targetElem.childNodes[0].id === "settings")) {
		const content = secundaryPage("Settings", 275);
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
			if (settings) {
				// KANJI DETAILS POPUP SECTION
				const detailsPopupWrapper = document.createElement("div");
				settingsChecks.appendChild(detailsPopupWrapper);
				detailsPopupWrapper.classList.add("settingsSection", "bellow-border");
				const detailsPopupTitle = document.createElement("p");
				detailsPopupWrapper.appendChild(detailsPopupTitle);
				detailsPopupTitle.appendChild(document.createTextNode("Kanji Details Popup"));
				detailsPopupWrapper.appendChild(singleOptionCheck("settings-kanji_details_popup-activated", "Activated", settings["kanji_details_popup"]["activated"]));

				// EXTENSION ICON
				const extensionIconWrapper = document.createElement("div");
				settingsChecks.appendChild(extensionIconWrapper);
				extensionIconWrapper.classList.add("settingsSection", "bellow-border");
				const extensionIconTitle = document.createElement("p");
				extensionIconWrapper.appendChild(extensionIconTitle);
				extensionIconTitle.appendChild(document.createTextNode("Extension Icon"));
				extensionIconWrapper.appendChild(singleOptionCheck("settings-extension_icon-kanji_counter", "Kanji Counter", settings["extension_icon"]["kanji_counter"]));

				// HIGHLIGHT STYLE SECTION
				const highlightStyleWrapper = document.createElement("div");
				settingsChecks.appendChild(highlightStyleWrapper);
				highlightStyleWrapper.classList.add("settingsSection", "bellow-border");
				const highlightStyleTitle = document.createElement("p");
				highlightStyleWrapper.appendChild(highlightStyleTitle);
				highlightStyleTitle.appendChild(document.createTextNode("Highlight Style"));

				["wkhighlighter_highlighted", "wkhighlighter_highlightedNotLearned"]. forEach(mainClass => {
					const div = document.createElement("div");
					highlightStyleWrapper.appendChild(div);

					const label = document.createElement("label");
					div.appendChild(label);
					label.classList.add("settingsItemLabel");
					label.appendChild(document.createTextNode(mainClass == "wkhighlighter_highlighted" ? "Learned" : "Not Learned"));

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
					id:["settings-appearance-highlight_learned", "settings-appearance-highlight_learned-font"],
					label:"Highlight Learned",
					// color:[settings["appearance"]["highlight_learned"], "#ffffff"]
					color:[settings["appearance"]["highlight_learned"]]
				},{
					id:["settings-appearance-highlight_not_learned", "settings-appearance-highlight_not_learned-font"],
					label:"Highlight Not Learned",
					// color:[settings["appearance"]["highlight_not_learned"], "#ffffff"]
					color:[settings["appearance"]["highlight_not_learned"]]
				},{
					id:["settings-appearance-details_popup", "settings-appearance-details_popup-font"],
					label:"Details Popup",
					// color:[settings["appearance"]["details_popup"], "#ffffff"]
					color:[settings["appearance"]["details_popup"]]
				},{
					id:["settings-appearance-radical_color", "settings-appearance-radical_color-font"],
					label:"Radical",
					// color:[settings["appearance"]["radical_color"], "#ffffff"]
					color:[settings["appearance"]["radical_color"]]
				},{
					id:["settings-appearance-kanji_color", "settings-appearance-kanji_color-font"],
					label:"Kanji",
					// color:[settings["appearance"]["kanji_color"], "#ffffff"]
					color:[settings["appearance"]["kanji_color"]]
				},{
					id:["settings-appearance-vocab_color", "settings-appearance-vocab_color-font"],
					label:"Vocabulary",
					// color:[settings["appearance"]["vocab_color"], "#ffffff"]
					color:[settings["appearance"]["vocab_color"]]
				}].forEach(option => {
					const colorInput = colorOption(option["id"], option["label"], option["color"]);
					appearanceWrapper.appendChild(colorInput);
					colorInput.addEventListener("input", e => {
						const color = e.target.value;
						const id = option["id"].replace("settings-", "").split("-");
						if (id[1] === "highlight_learned" || id[1] === "highlight_not_learned") {
							const target = id[1] === "highlight_learned" ? "wkhighlighter_highlighted" : "wkhighlighter_highlightedNotLearned";
							// change color of the three highlight styles
							document.getElementsByClassName(target+" settings_highlight_style_option")[0].style.setProperty("background-color", color, "important");
							document.getElementsByClassName(target+"_underlined settings_highlight_style_option")[0].style.setProperty("border-bottom", "3px solid "+color, "important");
							document.getElementsByClassName(target+"_bold settings_highlight_style_option")[0].style.setProperty("color", color, "important");
						}
						settings[id[0]][id[1]] = color;
						chrome.storage.local.set({"wkhighlight_settings":settings});
					});
				});
				const appearancePresetWrapper = document.createElement("div");
				appearanceWrapper.appendChild(appearancePresetWrapper);
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
				appearanceWaniKani.style.backgroundColor = "var(--wanikani)";
				appearanceWaniKani.appendChild(document.createTextNode("WaniKani"));
				appearanceWaniKani.addEventListener("click", () => {
					if (window.confirm("Change colors to WaniKani pattern?")) {
						Object.keys(wanikaniPattern).forEach(key => settings["appearance"][key] = wanikaniPattern[key]);
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
				const clearCache = document.createElement("div");
				clearCache.classList.add("dangerItem");
				dangerZone.appendChild(clearCache);
				const clearCacheButton = document.createElement("div");
				clearCache.appendChild(clearCacheButton);
				clearCacheButton.classList.add("button");
				clearCacheButton.id = "clearCash";
				clearCacheButton.appendChild(document.createTextNode("Clear Cache"));
				const clearCacheDescription = document.createElement("div");
				clearCache.appendChild(clearCacheDescription);
				clearCacheDescription.classList.add("dangerItemDescription");
				clearCacheDescription.appendChild(document.createTextNode("Clears local data. This won't affect your WaniKani account!"));
			}
		});

		if (!document.getElementById("rateMeX")) {
			const rateApp = document.createElement("div");
			content.parentNode.appendChild(rateApp);
			rateApp.style.fontSize = "16px";
			rateApp.innerHTML = "Enjoying the app? <a target='_blank' href='https://chrome.google.com/webstore/detail/wanikani-kanji-highlighte/pdbjikelneighjgjojikkmhiehpcokjm/reviews#:~:text=Rate%20this%20extension'>Rate me!</a>";
		}
	}

	if (targetElem.classList.contains("settingsItemInput")) {
		chrome.storage.local.get(["wkhighlight_settings"], data => {
			let settings = data["wkhighlight_settings"];
			if (!settings)
				settings = {};
			
			const settingsID = targetElem.id.replace("settings-", "").split("-");

			switch(settingsID[0]) {
				// KANJI DETAILS POPUP SECTION
				case "kanji_details_popup":
					switch (settingsID[1]) {
						case "activated":
							settings[settingsID[0]][settingsID[1]] = targetElem.checked;
							break;
					}
					
					break;

				// EXTENSION ICON SECTION
				case "extension_icon":
					switch (settingsID[1]) {
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

							settings[settingsID[0]][settingsID[1]] = targetElem.checked;
							break;
					}
					break;
			}
			
			chrome.storage.local.set({"wkhighlight_settings":settings});
		});
	}

	if (targetElem.id === "clearCash") {
		clearCache();
	}

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

	if (targetElem.classList.contains("bin_wrapper") || targetElem.parentElement.classList.contains("bin_wrapper")) {
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
		document.documentElement.style.setProperty('--body-base-width', '250px');

		document.getElementById("userInfoNavbar").style.display = "none";
	
		if (kanjiList.length == 0 || vocabList.length == 0) {
			loadItemsLists(() => {
				if (!document.getElementById("searchResultWrapper")) {
					const searchResultWrapper = document.createElement("div");
					searchResultWrapper.id = "searchResultWrapper";
					document.getElementById("userInfoWrapper").insertBefore(searchResultWrapper, document.getElementById("blacklistButton").parentElement);
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
							const tagretImg = document.createElement("img");
							targetDiv.appendChild(tagretImg);
							tagretImg.src = "../images/target.png";
				
							const listOfOptions = document.createElement("ul");
							navbarOptions.appendChild(listOfOptions);
							listOfOptions.style.display = "flex";
							["list", "menu", "grid"].forEach(option => {
								const li = document.createElement("li");
								listOfOptions.appendChild(li);
								li.classList.add("searchResultNavbarOption", "clickable");
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
			});
		}
	}

	// clicked outside search area and searching related
	const resultWrapper = document.getElementById("searchResultWrapper");
	if (!document.getElementById("notRunAtWK") && (!document.getElementsByClassName("searchArea")[0].contains(targetElem) && resultWrapper && !resultWrapper.contains(targetElem))) {
		const wrapper = document.getElementById("searchResultItemWrapper");
		if (wrapper)
			wrapper.remove();
		
		document.documentElement.style.setProperty('--body-base-width', '225px');

		document.getElementById("kanjiSearchInput").value = "";

		document.getElementById("userInfoNavbar").style.display = "inline-block";

		const searchResultNavbar = document.getElementById("searchResultNavbar");
		if (searchResultNavbar) {
			searchResultNavbar.remove();
		}
	}

	const typeWrapper = document.getElementsByClassName("kanjiSearchTypeWrapper")[0];
	if ((typeWrapper && typeWrapper.contains(targetElem)) || targetElem.classList.contains("kanjiSearchTypeWrapper")) {
		const input = document.getElementById("kanjiSearchInput");
		input.select();
		const target = targetElem.classList.contains("kanjiSearchTypeWrapper") ? targetElem.firstChild : targetElem;
		
		if (target.innerText == "あ") {
			target.innerText = "A";
			target.parentElement.id = "kanjiSearchTypeRomaji";
			input.placeholder = "きん";
		}
		else {
			target.innerText = "あ";
			target.parentElement.id = "kanjiSearchTypeKana";
			input.placeholder = "Gold / 金 / 5";
		}

		input.value = "";
		const searchResultWrapper = document.getElementById("searchResultItemWrapper");
		if (searchResultWrapper)
			searchResultWrapper.remove();
	}

	// clicked in the kanji on item search
	if (targetElem.classList.contains("searchResultItem")) {
		const input = document.getElementById("kanjiSearchInput");
		input.value = targetElem.innerText;
		if (kanjiList.length == 0 || vocabList.length == 0) {
			document.body.style.cursor = "progress";
			loadItemsLists(() => {
				document.body.style.cursor = "inherit";
				searchKanji(input)
			});
		}
		else
			searchKanji(input);
	}

	// clicked in a search result line, but not the character itself
	if (targetElem.classList.contains("searchResultItemLine")) {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			const type = targetElem.classList.contains("kanji_back") ? "kanji" : "vocabulary";
			if (type == "vocabulary")
				chrome.storage.local.set({wkhighlight_currentVocabInfo: vocabList.filter(vocab => vocab.id == targetElem.getAttribute('data-item-id'))[0]});
			chrome.tabs.sendMessage(tabs[0].id, {infoPopupFromSearch: {characters: targetElem.firstChild.textContent, type: type}}, () => window.chrome.runtime.lastError);
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
				document.documentElement.style.setProperty('--body-base-width', '700px');
		}
		else {
			Array.from(document.getElementsByClassName("searchResultItemLine")).forEach(elem => {
				elem.getElementsByClassName("searchResultItemInfo")[0].style.display = "grid";
				removeSquareClasses(elem);
			});
		}
	}

	if (targetElem.id == "searchResultOptionlist") {
		Array.from(document.getElementsByClassName("searchResultItemSquare")).forEach(elem => {
			elem.getElementsByClassName("searchResultItemInfo")[0].style.display = "grid";
			const classes = elem.classList;
			if (classes.contains("searchResultItemSquare")) classes.remove("searchResultItemSquare");
			if (classes.contains("searchResultItemSquareSmall")) classes.remove("searchResultItemSquareSmall");
		});
		document.documentElement.style.setProperty('--body-base-width', '250px');
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
			}
		});
	}

	// if clicked on rateMeX
	if (targetElem.id == "rateMeX") {
		document.getElementsByClassName("rateMeWrapper")[0].remove();
		chrome.storage.local.set({"wkhighlight_rateme":{closed:true}});
	}

	// if clicked on a kanji that can generate detail info popup
	if (targetElem.classList.contains("kanjiDetails")) {
		chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
			chrome.storage.local.get(["wkhighlight_kanji_assoc"], result => {
				const kanjiAssoc = result["wkhighlight_kanji_assoc"];
				if (kanjiAssoc)
					chrome.tabs.sendMessage(tabs[0].id, {infoPopupFromSearch: {characters: targetElem.innerText, type: kanjiAssoc[targetElem.innerText] ? "kanji" : "vocabulary"}}, () => window.chrome.runtime.lastError);
			});
		});
	}

	if (targetElem.classList.contains("refresh")) {
		window.location.reload();
	}

	const displayAssignmentMaterials = (data, container) => {
		data.map(assignment => assignment["data"])
			.sort((as1, as2) => new Date(as1["available_at"]).getTime() - new Date(as2["available_at"]).getTime())
			.map(assignment => ({"srs_stage":assignment["srs_stage"], "subject_id":assignment["subject_id"], "subject_type":assignment["subject_type"]}));
		
		chrome.storage.local.get(["wkhighlight_settings"], result => {
			console.log(result);
			const settings = result["wkhighlight_settings"];
			if (settings) {
				const displaySettings = settings["assignments"]["srsMaterialsDisplay"];
				// filter by srs stages
				Object.keys(srsStages).forEach(srsId => {
					const assignments = data.filter(assignment => assignment["data"]["srs_stage"] == srsId);
					if (assignments.length > 0) {
						const srsWrapper = document.createElement("li");
						container.appendChild(srsWrapper);
						const srsTitle = document.createElement("p");
						srsWrapper.appendChild(srsTitle);
						srsTitle.classList.add("clickable");
						srsTitle.appendChild(document.createTextNode(srsStages[srsId]["name"]+` (${assignments.length})`));
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
						srsTitleArrowRight.style.borderColor = "#8b8b8b";
						srsTitleArrowRight.style.padding = "5px";
						srsTitleArrowRight.style.pointerEvents = "none";
						const itemsListWrapper = document.createElement("div");
						srsWrapper.appendChild(itemsListWrapper);
						itemsListWrapper.classList.add("simple-grid");
						if (!displaySettings[srsId])
							itemsListWrapper.classList.add("hidden");
						const itemsList = document.createElement("ul");
						itemsListWrapper.appendChild(itemsList);
						assignments.map(assignment => assignment["data"])
									.forEach(assignment => {
									const li = document.createElement("li");
									li.style.color = "black";
									itemsList.appendChild(li);
									let characters = "";
									switch(assignment["subject_type"]) {
										case "kanji":
											characters = kanjiList.filter(kanji => kanji["id"] == assignment["subject_id"])[0]["characters"];
											li.classList.add("kanji_back" , "kanjiDetails", "clickable");
											break;
										case "vocabulary":
											characters = vocabList.filter(vocab => vocab["id"] == assignment["subject_id"])[0]["characters"];
											li.classList.add("vocab_back" , "kanjiDetails", "clickable");
											break;
										case "radical":
											characters = radicalList.filter(radical => radical["id"] == assignment["subject_id"])[0]["characters"];
											li.classList.add("radical_back");
											break;
									}
									li.innerHTML = characters;
						});
					}
				});	
			}
		});
	}

	// clicked in the number of reviews
	if (targetElem.id == "summaryReviews") {
		const content = secundaryPage("Reviews", 400);

		// future reviews chart
		const futureReviewsWrapper = document.createElement("div");
		content.appendChild(futureReviewsWrapper);
		const reviewsList = document.createElement("div");
		futureReviewsWrapper.appendChild(reviewsList);
		reviewsList.id = "assignmentsMaterialList";
		const reviewsListTitle = document.createElement("div");
		reviewsList.appendChild(reviewsListTitle);
		reviewsListTitle.innerHTML = `<b>${reviews && reviews["count"] ? reviews["count"] : 0}</b> Reviews available right now!`;
		const reviewsListUl = document.createElement("ul");
		reviewsList.appendChild(reviewsListUl);
		reviewsListUl.classList.add("bellow-border");
		const futureReviewsChart = document.createElement("div");
		futureReviewsWrapper.appendChild(futureReviewsChart);
		futureReviewsChart.id = "futureReviewsWrapper";
		const leftArrow = document.createElement("i");
		futureReviewsChart.appendChild(leftArrow);
		leftArrow.classList.add("left", "clickable", "hidden");
		leftArrow.style.left = "7px";
		const futureReviewsCanvas = document.createElement("canvas");
		futureReviewsChart.appendChild(futureReviewsCanvas);
		const rightArrow = document.createElement("i");
		futureReviewsChart.appendChild(rightArrow);
		rightArrow.style.right = "7px";
		rightArrow.classList.add("right", "clickable");
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
		const today = new Date();
		daySelectorInput.value = simpleFormatDate(today, "ymd"); 
		daySelectorInput.min = simpleFormatDate(changeDay(today, 1), "ymd");
		daySelectorInput.max = simpleFormatDate(changeDay(today, 13), "ymd");
		const futureReviewsLabel = document.createElement("p");
		futureReviewsWrapper.appendChild(futureReviewsLabel);
		futureReviewsLabel.id = "reviewsPage-nmrReviews24hLabel";
		futureReviewsLabel.innerHTML = "<b>0</b> more Reviews in the next 24 hours";

		if (reviews) {
			//setup list of material for current reviews
			if (reviews["data"]) {
				if (radicalList.length === 0 || kanjiList.length === 0 || vocabList.length === 0) {
					const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50);
					const loadingElem = loadingVal[0];
					reviewsListUl.appendChild(loadingElem);

					loadItemsLists(() => {
						loadingElem.remove();
						clearInterval(loadingVal[1]);
						displayAssignmentMaterials(reviews["data"], reviewsListUl);
					});
				}
				else
					displayAssignmentMaterials(reviews["data"], reviewsListUl);
			}

			// setup chart for the next reviews
			if (reviews["next_reviews"]) {
				const days = 1;
				const nmrReviewsNext = filterAssignmentsByTime(reviews["next_reviews"], today, changeDay(today, days))
												.map(review => ({hour:new Date(review["available_at"]).getHours(), day:new Date(review["available_at"]).getDate()}));
				futureReviewsLabel.getElementsByTagName("B")[0].innerText = nmrReviewsNext.length;

				const chartData = setupReviewsDataForChart(nmrReviewsNext, today, days, 1);
				
				const data = {
					labels: chartData["hours"],
					datasets: [{
						label: 'Reviews',
						backgroundColor: 'rgb(44, 112, 128)',
						borderColor: 'rgb(255, 255, 255)',
						data: chartData["reviewsPerHour"],
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
								color: '#2c7080',
								anchor: 'end',
								align: 'top',
								display: ctx => ctx["dataset"]["data"][ctx["dataIndex"]] != 0
							}
						},
						animation: {
							duration: 0
						}
					},
					plugins: [ChartDataLabels]
				});

				const nextReviewsData = reviews["next_reviews"];
				// changing date event listener

				daySelectorInput.addEventListener("input", e => {
					const newDate = e.target.value;
					updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel);
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
				// arrows event listener
				leftArrow.addEventListener("click", () => {
					const newDate = changeDay(daySelectorInput.value, -1);
					updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
				rightArrow.addEventListener("click", () => {
					const newDate = changeDay(daySelectorInput.value, 1);
					updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel);
					daySelectorInput.value = simpleFormatDate(newDate, "ymd");
					arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
				});
			}
		}
	}

	// clicked in the number of lessons
	if (targetElem.id == "summaryLessons") {
		const content = secundaryPage("Lessons", 400);

		const lessonsWrapper = document.createElement("div");
		content.appendChild(lessonsWrapper);
		const lessonsList = document.createElement("div");
		lessonsWrapper.appendChild(lessonsList);
		lessonsList.classList.add("simple-grid");
		lessonsList.id = "assignmentsMaterialList";
		const lessonsListTitle = document.createElement("div");
		lessonsList.appendChild(lessonsListTitle);
		lessonsListTitle.innerHTML = `<b>${lessons && lessons["count"] ? lessons["count"] : 0}</b> Lessons available right now!`;
		const lessonsListUl = document.createElement("ul");
		lessonsList.appendChild(lessonsListUl);
		lessonsListUl.classList.add("bellow-border");

		if (lessons) {
			//setup list of material for current reviews
			if (lessons["data"]) {
				if (radicalList.length === 0 || kanjiList.length === 0 || vocabList.length === 0) {
					const loadingVal = loading(["main-loading"], ["kanjiHighlightedLearned"], 50);
					const loadingElem = loadingVal[0];
					lessonsListUl.appendChild(loadingElem);

					loadItemsLists(() => {
						loadingElem.remove();
						clearInterval(loadingVal[1]);
						displayAssignmentMaterials(lessons["data"], lessonsListUl);
					});
				}
				else
					displayAssignmentMaterials(lessons["data"], lessonsListUl);
			}
		}
	}
});

const singleOptionCheck = (id, labelTitle, checked) => {
	const div = document.createElement("div");
	idValue = id;
	const label = document.createElement("label");
	div.appendChild(label);
	label.classList.add("settingsItemLabel");
	label.appendChild(document.createTextNode(labelTitle));
	label.htmlFor = idValue;

	const inputDiv = document.createElement("div");
	inputDiv.classList.add("checkbox_wrapper");
	const checkbox = document.createElement("input");
	div.appendChild(inputDiv);
	inputDiv.appendChild(checkbox);
	checkbox.checked = checked;
	checkbox.type = "checkbox";
	checkbox.id = idValue;
	checkbox.classList.add("settingsItemInput", "clickable");

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
		checkbox.style.width = (42/(defaultColors.length))+"px";
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

const searchKanji = (event) => {
	let wrapper = document.getElementById("searchResultItemWrapper");
	if (wrapper)
		wrapper.remove();

	const searchResultUL = document.createElement("ul");
	searchResultUL.id = "searchResultItemWrapper";

	if (!document.getElementById("searchResultWrapper")) {
		const searchResultWrapper = document.createElement("div");
		searchResultWrapper.id = "searchResultWrapper";
		document.getElementById("userInfoWrapper").insertBefore(searchResultWrapper, document.getElementById("blacklistButton").parentElement);
	}
	document.getElementById("searchResultWrapper").appendChild(searchResultUL);

	const type = document.getElementById("kanjiSearchType").innerText;
	const input = event.tagName && event.tagName == "INPUT" ? event : event.target; 
	const value = (type == "A" ? input.value : input.value.toLowerCase()).trim();

	let filteredKanji = [];
	let filteredVocab = [];


	chrome.storage.local.get(["wkhighlight_settings"], result => {
		const settings = result["wkhighlight_settings"];
		if (settings && settings["search"]) {
			if (type == "A") {
				let finalValue = "";
				const split = separateRomaji(value);
				for (const word of split) {
					const kanaValue = kana[word];
					finalValue += kanaValue ? kanaValue : word;
				}
				input.value = finalValue;
			
				// if it is hiragana
				if (finalValue.match(/[\u3040-\u309f]/)) {
					const filterByReadings = (itemList, value) => itemList.filter(item => matchesReadings(value, item["readings"]));
					filteredKanji = filterByReadings(kanjiList, finalValue);
					filteredVocab = filterByReadings(vocabList, finalValue);
				}
			}
			else {
				// if it is a chinese character
				if (value.match(/[\u3400-\u9FBF]/)) {
					filteredKanji = filteredKanji.concat(kanjiList.filter(kanji => value == kanji["characters"]));
					if (filteredKanji.length > 0) {
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
		
					let colorClass;
					if (type == "kanji")
						colorClass = "kanji_back";
					else if (type == "vocabulary")
						colorClass = "vocab_back";
					
					const li = document.createElement("li");
					li.classList.add("searchResultItemLine", colorClass); 
					searchResultUL.appendChild(li);
					li.setAttribute('data-item-id', data["id"]);
					
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
		
					// if it is not in list type
					if (settings["search"]["results_display"] != "searchResultOptionlist") {
						if (settings["search"]["results_display"] == "searchResultOptionmenu")
							li.classList.add("searchResultItemSquare");
						else if (settings["search"]["results_display"] == "searchResultOptiongrid")
							li.classList.add("searchResultItemSquareSmall");
						itemInfoWrapper.style.display = "none";
					}
				}
				if (settings["search"]["results_display"] != "searchResultOptionlist")
					document.documentElement.style.setProperty('--body-base-width', '700px');
			}

		}
	});
}


const matchesMeanings = (input, meanings, target) => {
	if (input.length > 3 && !target) {
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

const matchesReadings = (input, readings) => {
	for (const index in readings) {
		const reads = readings[index];
		if ((reads.reading ? reads.reading : reads)  == input) {
			return true;
		}
	}
	return false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.nmrKanjiHighlighted) {
		const nmrKanjiHighlightedElem = document.getElementById("nmrKanjiHighlighted");
		if (nmrKanjiHighlightedElem) {
			nmrKanjiHighlightedElem.innerHTML = `<span id="nmrKanjiIndicator">Kanji</span>: <strong>${request.nmrKanjiHighlighted}</strong> (in the page)`;
		}
	}
	if (request.kanjiHighlighted) {
		const kanjiHighlightedList = request.kanjiHighlighted;
		const kanjiFoundWrapper = document.getElementById("kanjiHighlightedList");
		if (kanjiFoundWrapper) {
			kanjiFoundWrapper.childNodes[0].remove();
			const kanjiFoundUl = document.createElement("ul");
			kanjiFoundWrapper.appendChild(kanjiFoundUl);
			const allKanjiSize = kanjiHighlightedList["learned"].length + kanjiHighlightedList["notLearned"].length;
			if (allKanjiSize <= 10)
				kanjiFoundUl.style.textAlign = "center";
			const learned = kanjiHighlightedList["learned"];
			const notLearned = kanjiHighlightedList["notLearned"];
			[learned, notLearned].forEach(type => {
				type.forEach(kanji => {
					const kanjiFoundLi = document.createElement("li");
					kanjiFoundUl.appendChild(kanjiFoundLi);
					kanjiFoundLi.classList.add("clickable", "kanjiDetails", type === learned ? "kanjiHighlightedLearned" : "kanjiHighlightedNotLearned");
					kanjiFoundLi.appendChild(document.createTextNode(kanji));
				});
			});
		}
	}
});

const loadItemsLists = (callback) => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allvocab", "wkhighlight_allradicals"], result => {
		const allKanji = result["wkhighlight_allkanji"];
		const allVocab = result["wkhighlight_allvocab"];
		const allRadicals = result["wkhighlight_allradicals"];
		if (allKanji && kanjiList.length == 0) {
			for (const index in allKanji) {
				const kanji = allKanji[index];
				kanjiList.push({
					"type" : "kanji",
					"id": index, 
					"characters": kanji["characters"],
					"meanings": kanji["meanings"],
					"level": kanji["level"],
					"readings": kanji["readings"],
					"visually_similar_subject_ids": kanji["visually_similar_subject_ids"],
					"amalgamation_subject_ids": kanji["amalgamation_subject_ids"]
				});
			}
		}
		if (allVocab && vocabList.length == 0) {
			for (const index in allVocab) {
				const vocab = allVocab[index];
				vocabList.push({
					"type" : "vocabulary",
					"id": index,
					"characters": vocab["characters"],
					"meanings": vocab["meanings"],
					"meaning_mnemonic": vocab["meaning_mnemonic"],
					"level": vocab["level"],
					"readings": vocab["readings"],
					"reading_mnemonic": vocab["reading_mnemonic"],
					"component_subject_ids": vocab["component_subject_ids"],
					"context_sentences" : vocab["context_sentences"]
				});
			}
		}
		if (allRadicals && radicalList.length == 0) {
			for (const index in allRadicals) {
				const radical = allRadicals[index];
				radicalList.push({
					"type" : "vocabulary",
					"id": index,
					"characters": radical["characters"] ? radical["characters"] : `<img height="28px" style="margin-top:-9px;margin-bottom:-4px;padding-top:8px" src="${radical["character_images"].filter(image => image["content_type"] == "image/png")[0]["url"]}"><img>`,
					"level": radical["level"],
				});
			}
		}
		
		if (callback)
			callback();
	});
}

const loading = (wrapperClasses, iconClasses, size) => {
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

	return [wrapper, interval];
}

const filterAssignmentsByTime = (list, currentDate, capDate) => {
	list = list[0]["data"] ? list.map(review => review["data"]) : list;
	const date = capDate ? new Date(capDate) : null;
	if (date) {
		// if the given date is in the future
		if (date.getTime() > new Date().getTime()) {
			return list.filter(assignment =>
					new Date(assignment["available_at"]).getTime() >= currentDate.getTime()
					&& new Date(assignment["available_at"]).getTime() <= date.getTime());
		}
		// if it is in the past
		else {
			return list.filter(assignment =>
				new Date(assignment["available_at"]).getTime() <= currentDate.getTime()
				&& new Date(assignment["available_at"]).getTime() >= date.getTime());
		}
	}
	// if capDate is null then return all assignments with dates greater than today
	return list.filter(assignment =>
			new Date(assignment["available_at"]).getTime() > currentDate.getTime());
}

document.addEventListener("keydown", e => {
	const key = e.key;

	// shortcut keys for REVIEWS PAGE
	const futureReviewsWrapper = document.getElementById("futureReviewsWrapper");
	if (futureReviewsWrapper) {
		const daySelectorInput = document.getElementById("reviewsDaySelector").getElementsByTagName("INPUT")[0];
		const futureReviewsLabel = document.getElementById("reviewsPage-nmrReviews24hLabel");
		const nextReviewsData = reviews["next_reviews"];
		const leftArrow = futureReviewsWrapper.getElementsByTagName("I")[0];
		const rightArrow = futureReviewsWrapper.getElementsByTagName("I")[1];
		if (key === 'ArrowLeft' && !leftArrow.classList.contains("hidden")) {
			const newDate = changeDay(daySelectorInput.value, -1);
			updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel);
			daySelectorInput.value = simpleFormatDate(newDate, "ymd");
			arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
		}

		if (key === 'ArrowRight' && !rightArrow.classList.contains("hidden")) {
			const newDate = changeDay(daySelectorInput.value, 1);
			updateChartReviewsOfDay(nextReviewsData, reviewsChart, newDate, futureReviewsLabel);
			daySelectorInput.value = simpleFormatDate(newDate, "ymd");
			arrowsDisplay(leftArrow, rightArrow, daySelectorInput.value, daySelectorInput.min, daySelectorInput.max);
		}
	}
});