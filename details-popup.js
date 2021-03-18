popupDetailsFix = false;
collapseFunction = null;
infoInPopup = false;

allKanji = {};
chrome.storage.local.get(["wkhighlight_allkanji"], data => allKanji = data["wkhighlight_allkanji"]);
allRadicals = {};
chrome.storage.local.get(["wkhighlight_allradicals"], data => allRadicals = data["wkhighlight_allradicals"]);

document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const div = document.createElement("div");
		div.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
		document.body.appendChild(div);
		setTimeout(() => document.getElementsByClassName("wkhighlighter_detailsPopup")[0].classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
		return div;
	}
	
	const node = e.target;

	const verticalCenterTopValue = (node) => node.parentNode.offsetHeight/2-node.offsetHeight/2;

	const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];

	// If hovering over a kanji
	if (node.classList.contains("wkhighlighter_highlighted") && !(detailsPopup && detailsPopup.contains(node))) {
		let popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		if (!popup)
			popup = createPopup();
		
		const mainWrapper = document.createElement("div");
		//mainWrapper.style.pointerEvents = "none";

		const kanji = node.textContent;
		const mainChar = document.createElement("p");
		mainChar.appendChild(document.createTextNode(kanji));
		mainChar.className = "wkhighlighter_detailsPopup_kanji wkhighlighter_highlighted";

		chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
			const kanjiID = data["wkhighlight_kanji_assoc"][kanji];
			const kanjiInfo = allKanji[kanjiID];
			chrome.storage.local.set({"currentKanjiInfo": kanjiInfo});
			const readings = kanjiInfo.readings;

			const ul = document.createElement("ul");
			ul.classList.add("wkhighlighter_popupDetails_readings");

			const on = document.createElement("li");
			on.innerHTML = "<strong>ON: </strong>";
			const onReadings = 
			on.appendChild(document.createTextNode(readings.filter(reading => reading.type==="onyomi").map(reading => reading.reading).join(", ")));
			on.classList.add("wkhighlighter_popupDetails_readings_row");

			const kun = document.createElement("li");
			kun.innerHTML = "<strong>KUN: </strong>";
			kun.appendChild(document.createTextNode(readings.filter(reading => reading.type==="kunyomi").map(reading => reading.reading).join(", ")));
			kun.classList.add("wkhighlighter_popupDetails_readings_row");
			
			ul.appendChild(on);
			ul.appendChild(kun);
			
			mainWrapper.appendChild(mainChar);
			mainWrapper.appendChild(ul);

			const firstChild = popup.firstChild;
			if (!firstChild || (firstChild && firstChild.textContent !== kanji)) {
				if (firstChild)
					firstChild.remove();
				popup.prepend(mainWrapper);		
				const verticalCenter = verticalCenterTopValue(mainWrapper);
				mainWrapper.style.marginTop = popupDetailsFix ? (verticalCenter-25)+"px" : verticalCenter+"px";
			}
		});
	}

	const infoTable = (titleText, paragraphs) => {
		const wrapper = document.createElement("div");
		wrapper.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		
		if (titleText) {
			const title = document.createElement("strong");
			title.classList.add("wkhighlighter_popupDetails_title");
			title.appendChild(document.createTextNode(titleText));
			wrapper.appendChild(title);
		}

		paragraphs.forEach(pText => {
			const p = document.createElement("p");
			p.classList.add("wkhighlighter_popupDetails_p");
			p.innerHTML = pText;
			wrapper.appendChild(p);
		});

		return wrapper;
	}

	// parse tags specific to wanikani
	const parseTags = string => {
		const tags = ["radical", "kanji", "reading", "ja"];
		const filter = string.split(/[<>\/]+/g);
		let finalString = "";
		let tagOpen = false;
		filter.forEach(substring => {
			if (!tags.includes(substring)) {
				if (tagOpen)
					finalString += `<span class="wkhighlighter_${tagOpen}Tag">${substring}</span>`;
				else
					finalString += substring;
			}
			else
				tagOpen = !tagOpen ? substring : false;
		});
		return finalString;
	}

	const kanjiCards = (kanjiIDs, kanjisData, className) => {
		const wrapper = document.createElement("ul");
		wrapper.style.padding = "0";
		
		kanjiIDs.forEach(ID => {
			const li = document.createElement("li");
			li.classList.add(className);
			wrapper.appendChild(li);

			const p = document.createElement("p");
			p.appendChild(document.createTextNode(kanjisData[ID].characters));
			p.className = "wkhighlighter_detailsPopup_cards wkhighlighter_highlighted";
			li.appendChild(p);
		});

		return kanjiIDs.length > 0 ? wrapper : document.createDocumentFragment();
	}

	// if hovering over the details popup or any of it's children
	if (!infoInPopup && detailsPopup && (node === detailsPopup || detailsPopup.contains(node))) {
		if (detailsPopup.childNodes.length === 1) {
			detailsPopup.classList.add("wkhighlighter_focusPopup");
			detailsPopup.style.height = window.innerHeight+"px";

			setTimeout(() => {
				detailsPopup.childNodes[0].classList.add("wkhighlighter_focusPopup_kanji");
				detailsPopup.childNodes[0].style.width = node.offsetWidth+"px";
				detailsPopup.style.overflowY = "auto";
				detailsPopup.style.maxHeight = window.innerHeight+"px";
			}, 300);

			chrome.storage.local.get(["currentKanjiInfo"], info => {
				info = info["currentKanjiInfo"];

				// detailed info section
				const detailedInfoWrapper = document.createElement("div");
				detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
				detailsPopup.appendChild(detailedInfoWrapper);

				// white border separator
				// const separation = document.createElement("div");
				// separation.classList.add("wkhighlighter_popupDetails_separator");
				// detailedInfoWrapper.appendChild(separation);

				// details container
				const details = document.createElement("div");
				details.style.padding = "15px";
				detailedInfoWrapper.appendChild(details);

				// level container
				const level = document.createElement("div");
				const levelTitle = document.createElement("strong");
				levelTitle.appendChild(document.createTextNode(`Level ${info["level"]} kanji`));
				level.appendChild(levelTitle);
				details.appendChild(level);

				// meaning container
				const meaning = document.createElement("div");
				meaning.classList.add("wkhighlighter_popupDetails_kanjiTitle");
				const meaningTitle = document.createElement("strong");
				meaningTitle.appendChild(document.createTextNode(Array.from(info["meanings"]).map(meaning => meaning.meaning).join(", ")));
				meaning.appendChild(meaningTitle);
				details.appendChild(meaning);

				// meaning mnemonic container
				details.appendChild(infoTable("Meaning Mnemonic:", [parseTags(info["meaning_mnemonic"]), parseTags(info["meaning_hint"])]));

				// reading mnemonic container
				details.appendChild(infoTable("Reading Mnemonic:", [parseTags(info["reading_mnemonic"]), parseTags(info["reading_hint"])]));
			
				// used radicals cards
				const usedRadicals = infoTable("Radicals from kanji:", []);
				usedRadicals.classList.add("wkhighlighter_detailsPopup_sectionContainer");
				details.appendChild(usedRadicals);
				usedRadicals.appendChild(kanjiCards(info["component_subject_ids"], allRadicals, "wkhighlighter_detailsPopup_usedRadicals_row"));

				// similar kanji cards
				const similarKanji = infoTable("Similar kanji:", []);
				similarKanji.classList.add("wkhighlighter_detailsPopup_sectionContainer");
				details.appendChild(similarKanji);
				similarKanji.appendChild(kanjiCards(info["visually_similar_subject_ids"], allKanji, "wkhighlighter_detailsPopup_similarKanji_row"));
			});

			infoInPopup = true;
		}

		if (collapseFunction)
			clearTimeout(collapseFunction);
	}

	// if details popup is not fixed and is not the popup or any of its children
	if (detailsPopup && !detailsPopup.contains(node) && !popupDetailsFix && node !== detailsPopup) {
		collapseFunction = setTimeout(() => {
			detailsPopup.classList.remove("wkhighlighter_focusPopup");
			const detailsPopupFirstChild = document.getElementsByClassName("wkhighlighter_popupDetails_detailedInfoWrapper")[0];
			if (detailsPopupFirstChild)
				detailsPopupFirstChild.remove();
			detailsPopup.style.height = "150px";
			detailsPopup.childNodes[0].classList.remove("wkhighlighter_focusPopup_kanji");
			detailsPopup.childNodes[0].style.width = "inherit";
			detailsPopup.overflow = "hidden";
			infoInPopup = false;
		}, 1000);
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
	
	if (detailsPopup) {
		// not clicked on details popup
		if (node !== detailsPopup && !detailsPopup.contains(node) && getComputedStyle(node).cursor !== "pointer") {
			detailsPopup.classList.add("wkhighlighter_rightOverFlowPopup");
			setTimeout(() => {
				if (detailsPopup)
				detailsPopup.remove();
			}, 200);
			popupDetailsFix = false;
		}
		// if clicked on details popup
		if (node === detailsPopup || detailsPopup.contains(node)) {
			popupDetailsFix = true;
			
		}
	}
});