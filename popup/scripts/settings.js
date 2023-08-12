chrome.storage.local.get(["settings"], data => {
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
});

const checkboxStyle = (checkbox, checked) => {
	if (checked) {
		if (!checkbox.classList.contains("checkbox-enabled"))
			checkbox.classList.add("checkbox-enabled");
	}
	else {
		if (checkbox.classList.contains("checkbox-enabled"))
			checkbox.classList.remove("checkbox-enabled");
	}
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

document.addEventListener('click', e => {
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
	
			handleSettingsAction(target, target.checked, (group, setting) => {
				switch(group) {
					case "extension_icon":
						switch (setting) {
							case "kanji_counter":
								let value = "";
	
								if (target.checked) {
									chrome.storage.local.get(["nmrHighLightedKanji"], result => {
										value = (result && result["nmrHighLightedKanji"] ? result["nmrHighLightedKanji"] : 0).toString();
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
								if (!target.checked)
									chrome.alarms.clear("next-reviews");
								else {
									chrome.runtime.connect();
									//chrome.runtime.sendMessage({onDisconnect:"reload"}, () => window.chrome.runtime.lastError);
								}
								break;
							case "practice_reminder":
								const timeInput = document.getElementById("practice-reminder-time");
								if (target.checked) {
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
								chrome.tabs.query({currentWindow: true, active: true}, tabs => chrome.tabs.sendMessage(tabs[0].id, {kanaWriting: target.checked}));
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
				case "Wanikani":
					if (window.confirm("Change colors to WaniKani pattern?"))
						updateColorSchema(wanikaniPattern);
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
						clearSubjects();
					}
					break;
				case "clearAll":
					if (window.confirm("Clear all extension data?")) {

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
						}
						break;
				}
			});
		}

		// RANGE ACTIONS
		if (type === "range") {
			const value = target.value;
			handleSettingsAction(target, value, (group, setting) => {
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
							case "extension_popup_width":
								if (target.nextElementSibling)
									target.nextElementSibling.innerText = value;
								document.documentElement.style.setProperty('--body-base-width', value+'px');
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
	}
});