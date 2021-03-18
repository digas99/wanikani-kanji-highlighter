popupDetailsFix = false;

allKanji = {};
chrome.storage.local.get(["wkhighlight_allkanji"], data => allKanji = data["wkhighlight_allkanji"]);

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

	// If hovering over a kanji
	if (node.classList.contains("wkhighlighter_highlighted")) {
		let popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		if (!popup)
			popup = createPopup();
		
		const mainWrapper = document.createElement("div");
		mainWrapper.style.pointerEvents = "none";

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

	const kanjiCards = (kanjiIDs, className) => {
		const wrapper = document.createElement("ul");
		wrapper.style.padding = "0";
		
		kanjiIDs.forEach(ID => {
			const li = document.createElement("li");
			li.classList.add(className);
			wrapper.appendChild(li);

			const p = document.createElement("p");
			p.appendChild(document.createTextNode(allKanji[ID].slug));
			p.className = "wkhighlighter_detailsPopup_cards wkhighlighter_highlighted";
			li.appendChild(p);
		});

		return wrapper;
	}

	// if hovering over the details popup
	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		if (node.childNodes.length === 1) {
			node.classList.add("wkhighlighter_focusPopup");
			node.style.height = window.innerHeight+"px";

			setTimeout(() => {
				node.childNodes[0].classList.add("wkhighlighter_focusPopup_kanji");
				node.childNodes[0].style.width = node.offsetWidth+"px";
				node.style.overflowY = "auto";
				node.style.maxHeight = window.innerHeight+"px";
			}, 300);

			chrome.storage.local.get(["currentKanjiInfo"], info => {
				info = info["currentKanjiInfo"];

				// detailed info section
				const detailedInfoWrapper = document.createElement("div");
				detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
				node.appendChild(detailedInfoWrapper);

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
			
				const usedRadicals = infoTable("Radicals from kanji:", []);
				usedRadicals.classList.add("wkhighlighter_detailsPopup_sectionContainer");
				details.appendChild(usedRadicals);

				const wrapper = document.createElement("ul");
				wrapper.style.padding = "0";
				usedRadicals.appendChild(wrapper);

				info["component_subject_ids"].forEach(radicalID => {
					const li = document.createElement("li");
					li.classList.add("wkhighlighter_detailsPopup_usedRadicals_row");
					wrapper.appendChild(li);
	
					const p = document.createElement("p");
					p.appendChild(document.createTextNode(radicalID));
					p.className = "wkhighlighter_detailsPopup_cards wkhighlighter_highlighted";
					li.appendChild(p);
				});

				const similarKanji = infoTable("Similar kanji:", []);
				similarKanji.classList.add("wkhighlighter_detailsPopup_sectionContainer");
				details.appendChild(similarKanji);

				similarKanji.appendChild(kanjiCards(info["visually_similar_subject_ids"], "wkhighlighter_detailsPopup_similarKanji_row"));
			});
		}
	}
});

document.addEventListener("mouseout", e => {
	const node = e.target;

	if (!popupDetailsFix && node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.remove("wkhighlighter_focusPopup");
		document.getElementsByClassName("wkhighlighter_popupDetails_detailedInfoWrapper")[0].remove();
		node.style.height = "150px";
		node.childNodes[0].classList.remove("wkhighlighter_focusPopup_kanji");
		node.childNodes[0].style.width = "inherit";
		node.overflow = "hidden";
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	const popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
	if (popup) {
		// not clicked on popup
		if (!node.classList.contains("wkhighlighter_detailsPopup") && getComputedStyle(node).cursor !== "pointer") { // && getComputedStyle(node).cursor !== 'pointer'
			popup.classList.add("wkhighlighter_rightOverFlowPopup");
			setTimeout(() => {
				if (popup)
					popup.remove();
			}, 200);
			popupDetailsFix = false;
			popup.style.cursor = "pointer";
		}
		// if clicked on popup
		if (node.classList.contains("wkhighlighter_detailsPopup")) {
			popupDetailsFix = true;
			popup.style.cursor = "default";
			
		}
	}
});