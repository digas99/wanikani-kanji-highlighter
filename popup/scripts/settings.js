chrome.storage.local.get(["settings", "blacklist"], data => {
	const settings = data["settings"];
	if (settings) {
		// INPUTS VALUE
		for (const group in settings) {
			for (const setting in settings[group]) {
				const input = document.getElementById(`settings-${group}-${setting}`);
				const type = input?.getAttribute("type") || input?.type;
				if (input && type) {
					const value = settings[group][setting];
					switch(type) {
						case "checkbox":
							input.checked = value
							checkboxStyle(input.parentElement, input.checked);
							break;
						case "range":
							input.value = value;
							input.nextElementSibling.innerText = value;
							break
						case "color":
							input.value = value;
							break;	
						case "select-one":
							input.value = value;
							break;
						case "time":
							input.value = value;
							break;
						case 'pick':
							const picked = input.querySelector(`.${value}`);
							if (picked) picked.classList.add("wkhighlighter_picked");
							break;
					}
				}
			}
		}
	}

	// BLACKLIST
	const blacklist_data = data["blacklist"];
	const wrapper = document.querySelector("#blacklistedSitesWrapper");
	if (blacklist_data) {
		// title
		const blacklistTitle = document.querySelector("#blacklistedSitesList").firstChild;
		blacklistTitle.nodeValue = `Blacklisted sites (${blacklist_data.length})`;
		
		// list
		blacklist_data.forEach(site => wrapper.appendChild(blacklistEntry(site)));
	}
	
	if (!blacklist_data || blacklist_data.length === 0) {
		const p = document.createElement("p");
		wrapper.appendChild(p);
		p.appendChild(document.createTextNode("There are no sites blacklisted!"));
	}

	// PRACTICE REMINDER
	const practiceReminder = document.querySelector(".practice-reminder-time");
	if (settings["notifications"]["practice_reminder"]) {
		practiceReminder.classList.remove("disabled");
		practiceReminder.value = settings["notifications"]["practice_reminder_timestamp"];
	}
});

const blacklistEntry = (site) => {
	site = site.replace("\\.", ".");

	const div = document.createElement("div");
	div.classList.add("blacklisted_site_wrapper");

	// site
	const a = document.createElement("a");
	div.appendChild(a);
	a.target = "_black";
	a.href = "https://"+site;
	a.style.width = "100%";
	a.appendChild(document.createTextNode(site));

	// bin
	const binWrapper = document.createElement("div");
	binWrapper.classList.add("bin_container");
	binWrapper.title = "Run on "+site;
	div.appendChild(binWrapper);
	const span = document.createElement("span");
	binWrapper.appendChild(span);
	span.classList.add("bin_wrapper", "clickable", "icon");
	span.addEventListener("click", async () => {
		const size = await blacklistRemove(site);
		div.remove();

		// decrease counter in title and navbar
		const blacklistTitle = document.querySelector("#blacklistedSitesList").firstChild;
		blacklistTitle.nodeValue = `Blacklisted sites (${size})`;
		const blacklistNavbar = document.querySelector("#blacklist");
		if (blacklistNavbar)
			blacklistNavbar.nextElementSibling.innerText = `${size}`;
	});
	const bin = document.createElement("img");
	bin.src = "/images/trash.png";
	bin.classList.add("bin_icon");
	span.appendChild(bin);

	return div;
}

const handleSettingsAction = (target, value, callback) => {
	chrome.storage.local.get(["settings"], async data => {
		let settings = data["settings"];
		if (!settings)
			settings = {};
		
		const settingsID = target.id.replace("settings-", "").split("-");
		const group = settingsID[0];
		const setting = settingsID[1];
		settings[group][setting] = value;

		await callback(group, setting);

		chrome.storage.local.set({"settings":settings});
	
	});
}

document.addEventListener('click', async e => {
	const target = e.target;

	// CUSTOM CHECKBOX CLICK
	if (target.closest(".checkbox_wrapper")) {
		const checkbox = target.closest(".checkbox_wrapper").querySelector(".settingsItemInput[type='checkbox']");
		if (checkbox) checkbox.click();
	}

	const type = target.getAttribute("type") || target.type || target.parentElement.getAttribute("type") || target.parentElement.type;

	if (target.classList.contains("settingsItemInput")) {
		// CHECKBOX ACTIONS
		if (type === "checkbox") {
			// update checkbox style
			const checkbox_wrapper = target.parentElement;
			checkboxStyle(checkbox_wrapper, target.checked);
	
			handleSettingsAction(target, target.checked, async (group, setting) => {
				switch(group) {
					case "extension_icon":
						switch (setting) {
							case "kanji_counter":
								let value = "";
								const tab = await getTab();
								if (tab) {
									if (target.checked) {
										chrome.storage.local.get(["nmrHighLightedKanji"], result => {
											value = (result && result["nmrHighLightedKanji"] ? result["nmrHighLightedKanji"] : 0).toString();
											chrome.action.setBadgeText({text: value, tabId:tab.id});
										});
									}
									else
										chrome.action.setBadgeText({text: '', tabId:tab.id});
								}
	
								break;
						}
						break;
					case "notifications":
						switch(setting) {
							case "new_reviews":
								if (!target.checked)
									chrome.alarms.clear("next-reviews");
								else {
									chrome.runtime.connect();
									chrome.storage.local.get(["reviews"], result => {
										const date = setupReviewsAlarm(result["reviews"]);
										if (date) {
											const notif = new MessagePopup(document.body, "bottom");
											notif.create(`You'll be reminded of your next review at ${date.toLocaleString()}`, "Review reminder set!");
											setTimeout(() => notif.remove(), 3000);
										}
									});
									//chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
								}
								break;
							case "practice_reminder":
								const timeInput = document.querySelector(".practice-reminder-time");
								if (!target.checked) {
									chrome.alarms.clear("practice");
									if (!timeInput.classList.contains("disabled"))
										timeInput.classList.remove("disabled");
									//chrome.runtime.connect();
									//chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
								}
								else {
									if (timeInput.classList.contains("disabled"))
										timeInput.classList.add("disabled");
									const date = setupPracticeAlarm(timeInput.value);
									console.log(date);
									if (date) {
										const notif = new MessagePopup(document.body, "bottom");
										notif.create(`You'll be reminded to practice at ${date.toLocaleString()}`, "Practice reminder set!");
										setTimeout(() => notif.remove(), 3000);
									}
								}
								break;
						}
						break;
					case "miscellaneous":
						switch(setting) {
							case "sidebar_animation":
								if (typeof sidebarAnimation === "function") {
									if (!target.checked)
										window.removeEventListener("mouseover", sidebarAnimation);
									else
										window.addEventListener("mouseover", sidebarAnimation);
								}
								break;
							}
						break;
				}
			});
		}

		// OPTION PICK ACTIONS
		if (type == "pick") {
			target.parentElement.querySelectorAll(".wkhighlighter_picked").forEach(elem => elem.classList.remove("wkhighlighter_picked"));
			target.classList.add("wkhighlighter_picked");
			const targetClass = target.classList[0];
			const highlightTarget = targetClass.split("_")[1] == "highlighted" ? "learned" : "not_learned";
			handleSettingsAction(target.parentElement, targetClass, (group, setting) => {
				switch(group) {
					case "highlight_style":
						// change highlight class immediately
						chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
							chrome.tabs.sendMessage(tabs[0].id, {target: highlightTarget, newHighlightClass:target.classList[0]}, () => window.chrome.runtime.lastError);
						});
						break;
				}
			});
		}
	}

	// BUTTONS
	if (target.closest(".settingsSection .button")) {
		// BLACKLIST
		if (target.closest("#blacklistedSitesList")) {
			const blacklistWrapper = document.getElementById("blacklistedSitesWrapper");
			const arrow = target.querySelector(".arrow");
			if (arrow.classList.contains("down")) {
				flipArrow(arrow, "down", "up");
				blacklistWrapper.style.removeProperty("display");
			}
			else {
				flipArrow(arrow, "up", "down");
				blacklistWrapper.style.display = "none";
			}
		}
		
		// APPEARANCE BUTTONS
		if (target.parentElement.classList.contains("appearence-buttons")) {
			const updateColorSchema = (colors) => {
				chrome.storage.local.get(["settings"], data => {
					const settings = data["settings"];
					settings["appearance"] = colors;
					chrome.storage.local.set({"settings":settings}, () => window.location.reload());
				});
			}

			switch(target.innerText) {
				case "Reset":
					if (window.confirm("Reset all colors?"))
						updateColorSchema(defaultSettings["appearance"]);
					break;
				case "Grays":
					if (window.confirm("Change colors to a pattern of grays?"))
						updateColorSchema(graysPattern);
					break;
				case "Flaming Durtles":
					if (window.confirm("Change colors to Flaming Durtles pattern?"))
						updateColorSchema(flamingDurtlesPattern);
					break;
			}
		}

		// DANGER SECTION
		if (target.closest(".dangerItem")) {
			switch (target.id) {
				case "clearSubjectsData":
					if (window.confirm("Clear all subject data?")) {
						await clearSubjects();
						// return to page home.html if not already there
						if (window.location.pathname != "/popup/home.html")
							window.location.href = "/popup/home.html";
					}
					break;
			}
		}
	}
});

document.addEventListener('input', e => {
	const target = e.target;
	
	const type = target.getAttribute("type") || target.type;

	if (target.classList.contains("settingsItemInput")) {
		// SELECT ACTIONS
		if (type === "select-one") {
			const value = target.value;
			handleSettingsAction(target, value, (group, setting) => {
				switch(group) {
					case "kanji_details_popup":
						switch (setting) {
							case "random_subject":
								setRandomSubjectType(value);
								break;
							case "popup_width":
								console.log(value);
								chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
									chrome.tabs.sendMessage(tabs[0].id, {popupWidth:value}, () => window.chrome.runtime.lastError);
								});
								break;
						}
						break;
				}
			});
		}

		// RANGE ACTIONS
		if (type === "range") {
			const value = target.value;
			handleSettingsAction(target, Number(value), (group, setting) => {
				switch(group) {
					case "kanji_details_popup":
						switch (setting) {
							case "popup_opacity":
								if (target.nextElementSibling)
									target.nextElementSibling.innerText = value;
								chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
									chrome.tabs.sendMessage(tabs[0].id, {popupOpacity:value}, () => window.chrome.runtime.lastError);
								});
								break;
						}
						break;
					case "miscellaneous":
						switch (setting) {
							case "update_interval":
								if (target.nextElementSibling)
									target.nextElementSibling.innerText = value;
								break;
						}
				}
			});
		}

		// COLOR ACTIONS
		if (type === "color") {
			const value = target.value;
			handleSettingsAction(target, value, (group, setting) => {
				switch(group) {
					case "appearance":
						switch (setting) {
							case "highlight_learned":
							case "highlight_not_learned":
								const highlightClass = setting == "highlight_learned" ? "wkhighlighter_highlighted" : "wkhighlighter_highlightedNotLearned";
								// change color of the three highlight styles
								document.querySelector(`.${highlightClass}.settings_highlight_style_option`).style.setProperty("background-color", value, "important");
								document.querySelector(`.${highlightClass}_underlined.settings_highlight_style_option`).style.setProperty("border-bottom", "3px solid "+value, "important");
								document.querySelector(`.${highlightClass}_bold.settings_highlight_style_option`).style.setProperty("color", value, "important");
								break;
							case "kanji_color":
							case "vocab_color":
								const randomSubjectType = document.querySelector("#random-subject-type");
								if (randomSubjectType) {
									if (setting.charAt(0) == randomSubjectType.innerText.toLowerCase())
										randomSubjectType.style.backgroundColor = value;
								}
								break;
							case "details_popup":
								chrome.tabs.query({currentWindow: true, active: true}, (tabs) => {
									chrome.tabs.sendMessage(tabs[0].id, {detailsPopupColor:value}, () => window.chrome.runtime.lastError);
								});
								break;
						}
					break;
				}
			});
		}

		// TIME
		if (type === "time") {
			console.log(target.value);
			const value = target.value;
			handleSettingsAction(target, value, (group, setting) => {
				switch(group) {
					case "notifications":
						switch (setting) {
							case "practice_reminder_timestamp":
								chrome.alarms.clear("practice");
								const date = setupPracticeAlarm(value);
								if (date) {
									const notif = new MessagePopup(document.body, "bottom");
									notif.create(`You'll be reminded to practice at ${date.toLocaleString()}`, "Practice reminder set!");
									setTimeout(() => notif.remove(), 3000);
								}
								break;
						}
						break;
				}
			});
		}
	}
});