const createDetailsPopup = async id => {
	const detailsPopup = new SubjectDisplay(Number(id), 270, document.body,
		async ids => {
			if (!Array.isArray(ids))
				ids = [ids];

			return new Promise(async resolve => {
				chrome.runtime.sendMessage({fetchSubjects:ids}, function(response) {
					resolve(response);
				});
			});
		},
		getIds
	);

	await detailsPopup.create();
	return detailsPopup;
}

const updateDetailsPopup = (detailsPopup, id) => {
	chrome.runtime.sendMessage({fetchSubjects:[id]}, (response) => {
		const subject = response[id];
		chrome.runtime.sendMessage({fetchSubjects:getIds(subject)}, async (response) => {
			const others = response;
			await detailsPopup.update(subject, others, true);
		});
	});
}

(() => {
	chrome.storage.local.get(["settings"], result => {
		chrome.runtime.sendMessage({uptimeDetailsPopup:true});

		const settings = result["settings"];
		if (settings["kanji_details_popup"]["popup_opacity"])
			document.documentElement.style.setProperty('--detailsPopup-opacity', settings["kanji_details_popup"]["popup_opacity"]/10);

		if (settings["kanji_details_popup"]["popup_width"])
			document.documentElement.style.setProperty('--detailsPopup-width', settings["kanji_details_popup"]["popup_width"] + "px");

		const atWanikani = /(http(s)?:\/\/)?www.wanikani\.com.*/g.test(window.location.origin);
		let detailsPopup;
		
		const highlightStyleSettings = settings["highlight_style"];
		let highlightingClass, notLearnedHighlightingClass;
		if (highlightStyleSettings) {
			highlightingClass = highlightStyleSettings["learned"];
			notLearnedHighlightingClass = highlightStyleSettings["not_learned"];
		}

		document.addEventListener("mouseover", e => {
			const node = e.target;

			// If hovering over a kanji
			if ((highlightingClass && node.classList.contains("wkhighlighter_hoverable") && !(detailsPopup && detailsPopup.detailsPopup && detailsPopup.detailsPopup.contains(node))) && !detailsPopup?.locked) {
				chrome.storage.local.get(["kanji_assoc"], async data => {
					const info = data["kanji_assoc"];
					const id = info[node.textContent];
					if (id) {
						if (!detailsPopup)
							detailsPopup = await createDetailsPopup(id);
						else
							updateDetailsPopup(detailsPopup, id);
					}
				});
			}
	
		});

		chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
			// create kanji details popup coming from search
			if (request.infoPopupFromSearch && !atWanikani)  {
				let id = Number(request.infoPopupFromSearch);
				console.log(id);
				// TODO: random kanji/vocab
				/*if (id.split("-")[0] === "rand") {
					let allSubjectsKeys = [Object.keys(allKanji), Object.keys(allVocab)].flat(1);
					if (id.split("-")[1] === "kanji") allSubjectsKeys = Object.keys(allKanji);
					else if (id.split("-")[1] === "vocabulary") allSubjectsKeys = Object.keys(allVocab);

					if (allSubjectsKeys)
						id = allSubjectsKeys[rand(0, allSubjectsKeys.length-1)];
				}*/
				if (!detailsPopup)
					detailsPopup = await createDetailsPopup(id);
				else
					updateDetailsPopup(detailsPopup, id);
			}

			if (request.uptime === "Details Popup") {
				sendResponse({uptime:true});
				return true;
			}

			if (request.popupOpacity)
				document.documentElement.style.setProperty('--detailsPopup-opacity', request.popupOpacity > 1 ? request.popupOpacity/10 : request.popupOpacity);
			
			if (request.detailsPopupColor)
				document.documentElement.style.setProperty('--default-color', request.detailsPopupColor);

			if (request.popupWidth)
				document.documentElement.style.setProperty('--detailsPopup-width', request.popupWidth + "px");
		});

		document.addEventListener("click", e => {
			const node = e.target;
							
			if (detailsPopup) {
				// clicked outside details popup
				if (node !== detailsPopup.detailsPopup && !detailsPopup.detailsPopup.contains(node) && !node.classList.contains("sd-detailsPopup_cardSideBarInfo") && !["sd-detailsPopupGoBack"].includes(node.id) && getComputedStyle(node).cursor !== "pointer")
					detailsPopup.close(200);
				
				// clicked in a highlighted kanji (within the info popup)
				if (node.classList.contains(highlightingClass) || node.classList.contains(notLearnedHighlightingClass)) {
					chrome.storage.local.get(["kanji_assoc"], async data => {
						const info = data["kanji_assoc"];
						const id = info[node.textContent];
						if (id) {
							if (!detailsPopup)
								detailsPopup = await createDetailsPopup(id);
							else
								updateDetailsPopup(detailsPopup, id);
						}
					});
				}
			}
		});
			
		document.addEventListener("keydown", e => {
			const key = e.key;
			chrome.storage.local.get(["settings"], result => {
				const settings = result["settings"];
				const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];
				if (detailsPopup && detailsPopup.detailsPopup && keyBindingsActive) {
					if (key == 'x' || key == 'X') {
						// CLOSE DETAILS POPUP
						detailsPopup.close(200);
					}

					if (key == 'l' || key == 'L') {
						// LOCK KANJI ON DETAILS POPUP
						detailsPopup.locked = !detailsPopup.locked;
						switchClass(document.getElementById("sd-detailsPopupSubjectLock"), "sd-detailsPopup_faded");
					}

					// if details popup is expanded
					if (detailsPopup.expanded) {
						if (key == 'f' || key == 'F') {
							// FIX DETAILS POPUP
							detailsPopup.fixed = !detailsPopup.fixed;
							switchClass(document.getElementById("sd-detailsPopupFix"), "sd-detailsPopup_faded");
						}	

						if (key == 'b' || key == "B") {
							// SHOW PREVIOUS KANJI INFO
							if (detailsPopup.openedSubjects.length > 0)
								detailsPopup.openedSubjects.pop();

							const kanji = detailsPopup.openedSubjects[detailsPopup.openedSubjects.length-1];
							if (kanji)
								updateDetailsPopup(detailsPopup, kanji.id);
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
								const infoSection = (typeof sectionValue === "string") ? Array.from(navbar.getElementsByTagName("li")).filter(section => section.title.split(" (")[0] === sectionValue)[0] : sectionValue;
								if (infoSection)
									infoSection.querySelector("div").click();
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