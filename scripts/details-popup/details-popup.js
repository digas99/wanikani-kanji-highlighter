'use strict';

(() => {
	chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_allradicals", "wkhighlight_allvocab", "wkhighlight_settings"], result => {
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
				const infoPopupFromSearch = request["infoPopupFromSearch"];
				if (infoPopupFromSearch) 
					detailsPopup.update(infoPopupFromSearch, true);
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
					if (node !== detailsPopup.detailsPopup && !detailsPopup.detailsPopup.contains(node) && !node.classList.contains("wkhighlighter_detailsPopup_cardSideBarInfo") && node.id !== "wkhighlighter_detailsPopupGoBack" && getComputedStyle(node).cursor !== "pointer")
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

				// if there is detailsPopup
				if (detailsPopup.detailsPopup) {
					if (key == 'x' || key == 'X') {
						// CLOSE DETAILS POPUP
						detailsPopup.close(200);
					}

					if (key == 'l' || key == 'L') {
						// LOCK KANJI ON DETAILS POPUP
						detailsPopup.locked = !detailsPopup.locked;
						switchClass(document.getElementById("wkhighlighter_detailsPopupKanjiLock"), "faded");
					}
				}

				// if details popup is expanded
				if (detailsPopup.expanded) {
					if (key == 'f' || key == 'F') {
						// FIX DETAILS POPUP
						detailsPopup.fixed = !detailsPopup.fixed;
						switchClass(document.getElementById("wkhighlighter_detailsPopupFix"), "faded");
					}

					if (key == 'u' || key == 'U') {
						// SCROLL UP
						if (detailsPopup.detailsPopup) {
							detailsPopup.detailsPopup.scrollTo(0, 0);
						}
					}

					if (key == 'b' || key == "B") {
						// SHOW PREVIOUS KANJI INFO
						if (detailsPopup.openedSubjects.length > 0)
							detailsPopup.openedSubjects.pop();

						const kanji = detailsPopup.openedSubjects[detailsPopup.openedSubjects.length-1];
						if (kanji)
						detailsPopup.update(kanji["id"], false);
					}
				}
				// if it is not expanded
				else {
					if (key == 'o' || key == 'O') {
						// EXPAND SMALL KANJI DETAILS POPUP
						detailsPopup.expand();
					}
				}
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