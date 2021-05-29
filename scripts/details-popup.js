infoInPopup = false;

allKanji = {};
chrome.storage.local.get(["wkhighlight_allkanji"], data => allKanji = data["wkhighlight_allkanji"]);
allRadicals = {};
chrome.storage.local.get(["wkhighlight_allradicals"], data => allRadicals = data["wkhighlight_allradicals"]);
allVocab = {};
chrome.storage.local.get(["wkhighlight_allvocab"], data => allVocab = data["wkhighlight_allvocab"]);

loaded = false;

document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const div = document.createElement("div");
		div.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
		document.body.appendChild(div);
		setTimeout(() => document.getElementsByClassName("wkhighlighter_detailsPopup")[0].classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
		return div;
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
		let finalString = "";
		if (string) {
			const tags = ["radical", "kanji", "reading", "ja"];
			const filter = string.split(/[<>\/]+/g);
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
		}

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
			const thisKanjiData = kanjisData[ID];

			const a = document.createElement("a");
			a.target = "_blank";
			//a.href = thisKanjiData["document_url"];
			a.style.color = "black";
			a.style.textDecoration = "none";

			if (thisKanjiData.characters)
				p.appendChild(document.createTextNode(thisKanjiData.characters));
			else {
				const img = document.createElement("img");
				const svgs = thisKanjiData.character_images.filter(img => img["content_type"] === "image/png" && img["metadata"]["dimensions"] === "64x64");
				img.src = svgs[0].url;
				img.style.width = "40px";
				p.appendChild(img);
			}
			p.className = `wkhighlighter_detailsPopup_cards ${highlightingClass}`;
			p.setAttribute('data-item-id', ID);
			li.appendChild(a);
			a.appendChild(p);
			const kanjiLevel = document.createElement("div");
			kanjiLevel.classList.add("kanjiLevelCard");
			li.appendChild(kanjiLevel);
			kanjiLevel.appendChild(document.createTextNode(thisKanjiData.level));
		});

		return kanjiIDs.length > 0 ? wrapper : document.createDocumentFragment();
	}

	const createKanjiDetailedInfo = (kanjiInfo) => {
		// detailed info section
		const detailedInfoWrapper = document.createElement("div");
		detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
		detailsPopup.appendChild(detailedInfoWrapper);

		// details container
		const details = document.createElement("div");
		details.style.padding = "15px";
		detailedInfoWrapper.appendChild(details);

		// level container
		const level = document.createElement("div");
		const levelTitle = document.createElement("strong");
		levelTitle.appendChild(document.createTextNode(`Level ${kanjiInfo["level"]} kanji`));
		level.appendChild(levelTitle);
		details.appendChild(level);

		// meaning container
		const meaning = document.createElement("div");
		meaning.classList.add("wkhighlighter_popupDetails_kanjiTitle");
		const meaningTitle = document.createElement("strong");
		meaningTitle.appendChild(document.createTextNode(kanjiInfo["meanings"].join(", ")));
		meaning.appendChild(meaningTitle);
		details.appendChild(meaning);

		// meaning mnemonic container
		details.appendChild(infoTable("Meaning Mnemonic:", [parseTags(kanjiInfo["meaning_mnemonic"]), parseTags(kanjiInfo["meaning_hint"])]));

		// reading mnemonic container
		details.appendChild(infoTable("Reading Mnemonic:", [parseTags(kanjiInfo["reading_mnemonic"]), parseTags(kanjiInfo["reading_hint"])]));
	
		// used radicals cards
		const usedRadicals = infoTable("Radicals from kanji:", []);
		usedRadicals.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		details.appendChild(usedRadicals);
		usedRadicals.appendChild(kanjiCards(kanjiInfo["component_subject_ids"], allRadicals, "wkhighlighter_detailsPopup_usedRadicals_row"));

		// similar kanji cards
		const similarKanji = infoTable("Similar kanji:", []);
		similarKanji.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		details.appendChild(similarKanji);
		similarKanji.appendChild(kanjiCards(kanjiInfo["visually_similar_subject_ids"], allKanji, "wkhighlighter_detailsPopup_similarKanji_row"));

		// vocab with kanji
		const vocab = infoTable("Vocabulary:", []);
		vocab.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		details.appendChild(vocab);
		vocab.appendChild(kanjiCards(kanjiInfo["amalgamation_subject_ids"], allVocab, "wkhighlighter_detailsPopup_vocab_row"));
	
		return detailedInfoWrapper;
	}

	const node = e.target;

	let detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];

	// If hovering over a kanji
	if (node.classList.contains(highlightingClass) && !(detailsPopup && detailsPopup.contains(node))) {
		if (!detailsPopup)
			detailsPopup = createPopup();
		
		const mainWrapper = document.createElement("div");
		//mainWrapper.style.pointerEvents = "none";

		const kanji = node.textContent;
		const kanjiLink = document.createElement("a");
		kanjiLink.target = "_blank";
		const mainChar = document.createElement("p");
		kanjiLink.appendChild(mainChar);
		mainChar.appendChild(document.createTextNode(kanji));
		mainChar.className = `wkhighlighter_detailsPopup_kanji ${highlightingClass}`;

		chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
			const kanjiID = data["wkhighlight_kanji_assoc"][kanji];
			const kanjiInfo = allKanji[kanjiID];
			kanjiLink.href = kanjiInfo.document_url;
			chrome.storage.local.set({"wkhighlight_currentKanjiInfo": kanjiInfo});
			const readings = kanjiInfo.readings;

			const ul = document.createElement("ul");
			ul.classList.add("wkhighlighter_popupDetails_readings");

			([["ON", "onyomi"], ["KUN", "kunyomi"]]).forEach(type => {
				const li = document.createElement("li");
				li.innerHTML = `<strong>${type[0]}: </strong>`;
				li.classList.add("wkhighlighter_popupDetails_readings_row");
				const span = document.createElement("span");
				const readingsString = readings.filter(reading => reading.type===type[1]).map(reading => reading.reading).join(", ");
				span.appendChild(document.createTextNode(readingsString));
				li.appendChild(span);
				if (readingsString.length > 8) {
					const overflowSpan = document.createElement("span");
					overflowSpan.appendChild(document.createTextNode("..."));
					li.appendChild(overflowSpan);
				}
				ul.appendChild(li);
			});
			
			mainWrapper.appendChild(kanjiLink);
			mainWrapper.appendChild(ul);

			// replace kanji and readings
			const firstChild = detailsPopup.firstChild;
			if (!firstChild || (firstChild && firstChild.textContent !== kanji)) {
				if (firstChild)
					firstChild.remove();
				detailsPopup.prepend(mainWrapper);
				mainWrapper.style.textAlign = "center";		
				mainWrapper.style.marginTop = "10px";
			}

			// if popup expanded
			if (infoInPopup) {
				detailsPopup.childNodes[0].classList.add("wkhighlighter_focusPopup_kanji");
				detailsPopup.childNodes[0].style.width = detailsPopup.offsetWidth+"px";
				chrome.storage.local.get(["wkhighlight_currentKanjiInfo"], info => {
					detailsPopup.replaceChild(createKanjiDetailedInfo(info["wkhighlight_currentKanjiInfo"]), detailsPopup.childNodes[1]);
				});
				infoInPopup = true;
			}
		});
	}

	// if hovering over the details popup or any of it's children
	if (!infoInPopup && detailsPopup && (node === detailsPopup || detailsPopup.contains(node))) {
		detailsPopup.classList.add("wkhighlighter_focusPopup");
		detailsPopup.style.height = window.innerHeight+"px";

		setTimeout(() => {
			detailsPopup.childNodes[0].classList.add("wkhighlighter_focusPopup_kanji");
			detailsPopup.childNodes[0].style.width = detailsPopup.offsetWidth+"px";
			detailsPopup.style.overflowY = "auto";
			detailsPopup.style.maxHeight = window.innerHeight+"px";
		}, 300);

		chrome.storage.local.get(["wkhighlight_currentKanjiInfo"], info => {
			detailsPopup.appendChild(createKanjiDetailedInfo(info["wkhighlight_currentKanjiInfo"]));
		});
		infoInPopup = true;
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
	
	if (detailsPopup) {
		// not clicked on details popup
		if (node !== detailsPopup && !detailsPopup.contains(node) && getComputedStyle(node).cursor !== "pointer") {
			detailsPopup.classList.add("wkhighlighter_rightOverFlowPopup");
			infoInPopup = false;
			setTimeout(() => {
				if (detailsPopup)
					detailsPopup.remove();
			}, 200);
		}

		// clicked on a kanji card
		if (node.classList.contains("wkhighlighter_detailsPopup_usedRadicals_row")) {
			
		}
	}

	if (node.classList.contains("wkhighlighter_detailsPopup_cards")) {
		const id = node.getAttribute("data-item-id");
		const audio = new Audio();
		const audioList = allVocab[id]["pronunciation_audios"];
		audio.src = audioList[Math.floor(Math.random() * audioList.length)].url;
		audio.play();
	}
});