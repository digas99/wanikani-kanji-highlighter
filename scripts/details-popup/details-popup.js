(() => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allradicals", "wkhighlight_allvocab", "wkhighlight_settings"], result => {
		chrome.runtime.sendMessage({uptime:"Details Popup"});

		const allKanji = result["wkhighlight_allkanji"];
		const allRadicals = result["wkhighlight_allradicals"];
		const allVocab = result["wkhighlight_allvocab"];
		if (allKanji && allRadicals && allVocab) {
			const detailsPopup = new SubjectDisplay(allRadicals, allKanji, allVocab, 275, document.documentElement);
			
			const highlightStyleSettings = result["wkhighlight_settings"]["highlight_style"];
			let highlightingClass, notLearnedHighlightingClass;
			if (highlightStyleSettings) {
				highlightingClass = highlightStyleSettings["learned"];
				notLearnedHighlightingClass = highlightStyleSettings["not_learned"];
			}

			chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
				// create kanji details popup coming from search
				if (request.infoPopupFromSearch)  {
					let id = request.infoPopupFromSearch;
					if (id.split("-")[0] === "rand") {
						let allSubjectsKeys = [Object.keys(allKanji), Object.keys(allVocab)].flat(1);
						if (id.split("-")[1] === "kanji") allSubjectsKeys = Object.keys(allKanji);
						else if (id.split("-")[1] === "vocab") allSubjectsKeys = Object.keys(allVocab);

						if (allSubjectsKeys)
							id = allSubjectsKeys[rand(0, allSubjectsKeys.length-1)];
					}
					detailsPopup.update(id, true);
				}

				if (request.uptime === "Details Popup")
					sendResponse({uptime:true});
			});

			document.addEventListener("mouseover", e => {
				const node = e.target;

				// If hovering over a kanji
				if ((highlightingClass && node.classList.contains("wkhighlighter_hoverable") && !(detailsPopup.detailsPopup && detailsPopup.detailsPopup.contains(node))) && !detailsPopup.locked) {
					if (!detailsPopup.detailsPopup)
						detailsPopup.create();
						
					chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
						const info = data["wkhighlight_kanji_assoc"];
						if (info)
							detailsPopup.update(info[node.textContent], true);
					});
				}
		
			});
	
			document.addEventListener("click", e => {
				const node = e.target;
								
				if (detailsPopup.detailsPopup) {
					// clicked outside details popup
					if (node !== detailsPopup.detailsPopup && !detailsPopup.detailsPopup.contains(node) && !node.classList.contains("sd-detailsPopup_cardSideBarInfo") && !["sd-detailsPopupGoBack"].includes(node.id) && getComputedStyle(node).cursor !== "pointer")
						detailsPopup.close(200);
					
					// clicked in a highlighted kanji (within the info popup)
					if (node.classList.contains(highlightingClass) || node.classList.contains(notLearnedHighlightingClass)) {
						const character = node.textContent;
						chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
							const assocList = data["wkhighlight_kanji_assoc"];
							if (assocList)
								detailsPopup.update(assocList[character], true);
						});
					}
				}
			});
				
			document.addEventListener("keydown", e => {
				const key = e.key;
				chrome.storage.local.get(["wkhighlight_settings"], result => {
					const settings = result["wkhighlight_settings"];
					const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];
					if (detailsPopup.detailsPopup && keyBindingsActive) {
						if (key == 'x' || key == 'X') {
							// CLOSE DETAILS POPUP
							detailsPopup.close(200);
						}
	
						if (key == 'l' || key == 'L') {
							// LOCK KANJI ON DETAILS POPUP
							detailsPopup.locked = !detailsPopup.locked;
							switchClass(document.getElementById("sd-detailsPopupSubjectLock"), "faded");
						}
	
						// if details popup is expanded
						if (detailsPopup.expanded) {
							if (key == 'f' || key == 'F') {
								// FIX DETAILS POPUP
								detailsPopup.fixed = !detailsPopup.fixed;
								switchClass(document.getElementById("sd-detailsPopupFix"), "faded");
							}	
	
							if (key == 'b' || key == "B") {
								// SHOW PREVIOUS KANJI INFO
								if (detailsPopup.openedSubjects.length > 0)
									detailsPopup.openedSubjects.pop();
	
								const kanji = detailsPopup.openedSubjects[detailsPopup.openedSubjects.length-1];
								if (kanji)
									detailsPopup.update(kanji["id"], false);
							}
							
							if (key == 'u' || key == 'U') {
								// SCROLL UP
								if (detailsPopup.detailsPopup) {
									detailsPopup.detailsPopup.scrollTo(0, 0);
								}
							}
	
							const navbar = document.getElementsByClassName("sd-popupDetails_navbar")[0];
							if (navbar && navbar.getElementsByTagName("li").length > 0) {
								const sectionClick = sectionValue => {
									const infoSection = (typeof sectionValue === "string") ? Array.from(navbar.getElementsByTagName("li")).filter(section => section.title === sectionValue)[0] : sectionValue;
									if (infoSection) {
										infoSection.getElementsByTagName("a")[0].dispatchEvent(new MouseEvent("click", {
											"view": window,
											"bubbles": true,
											"cancelable": false
										}));
									}
								}
	
								if (key == 'i' || key == 'I')
									sectionClick("Info");
	
								if (key == 'c' || key == 'C')
									sectionClick("Cards");
	
								if (key == 's' || key == 'S')
									sectionClick("Statistics");
	
								if (key == 't' || key == 'T')
									sectionClick("Timestamps");
	
								const selected = Array.from(navbar.getElementsByTagName("li")).filter(section => section.style.getPropertyValue("background-color") !== '')[0];
								if (selected) {
									let sectionToClick;
									if (key === "ArrowRight") {
										e.preventDefault();
										sectionToClick = selected.nextElementSibling ? selected.nextElementSibling : navbar.getElementsByTagName("li")[0];
									}
	
									if (key === "ArrowLeft") {
										e.preventDefault();
										sectionToClick = selected.previousElementSibling ? selected.previousElementSibling : navbar.getElementsByTagName("li")[navbar.getElementsByTagName("ul")[0].childElementCount-1];
									}
	
									if (sectionToClick) sectionClick(sectionToClick);
								}
							}
						}
						// if it is not expanded
						else {
							if (key == 'o' || key == 'O') {
								// EXPAND SMALL KANJI DETAILS POPUP
								detailsPopup.expand();
							}
						}
					}
				});
			});
		}
	});

	const switchClass = (node, className) => {
		if (node) {
			if (node.classList.contains(className))
				node.classList.remove(className);
			else
				node.classList.add(className);
		}
	}
})();