'use strict';

var injectedDetailsPopup = true;

(() => {

	let infoInPopup = false;
	let allKanji = {};
	chrome.storage.local.get(["wkhighlight_allkanji"], data => allKanji = data["wkhighlight_allkanji"]);
	let allRadicals = {};
	chrome.storage.local.get(["wkhighlight_allradicals"], data => allRadicals = data["wkhighlight_allradicals"]);
	let allVocab = {};
	chrome.storage.local.get(["wkhighlight_allvocab"], data => allVocab = data["wkhighlight_allvocab"]);

	let highlightingClass;
	chrome.storage.local.get(["wkhighlight_settings"], result => highlightingClass = result["wkhighlight_settings"][2]);

	let extraContainersRemoverInterval;

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
			const tags = ["radical", "kanji", "vocabulary", "reading", "ja"];
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
	
	const itemCards = (ids, data, className) => {
		const wrapper = document.createElement("ul");
		wrapper.style.padding = "0";
		
		ids.forEach(id => {
			const li = document.createElement("li");
			li.classList.add("wkhighlighter_detailsPopup_cardRow", className);
			wrapper.appendChild(li);
	
			const p = document.createElement("p");
			const thisData = data[id];
	
			const a = document.createElement("a");
			a.target = "_blank";
			a.href = thisData["document_url"];
	
			const characters = thisData.characters;
			if (characters) {
				p.appendChild(document.createTextNode(characters));
				if (characters.length > 4)
					p.style.setProperty("font-size", (35-5*(characters.length - 5))+"px", "important");
			}
			else {
				const img = document.createElement("img");
				const svgs = thisData.character_images.filter(img => img["content_type"] === "image/png" && img["metadata"]["dimensions"] === "64x64");
				img.src = svgs[0].url;
				img.style.width = "40px";
				p.appendChild(img);
			}
			p.classList.add("wkhighlighter_detailsPopup_cards", highlightingClass, "wkhighlighter_highlightedNotLearned");
			p.setAttribute('data-item-id', id);
			li.appendChild(a);
			a.appendChild(p);
			const level = document.createElement("div");
			level.classList.add("itemLevelCard");
			li.appendChild(level);
			level.appendChild(document.createTextNode(thisData.level));
		});
	
		return ids.length > 0 ? wrapper : document.createDocumentFragment();
	}
	
	const itemCardsSection = (kanjiInfo, idsTag, title, itemCardsclass, list) => {
		const ids = kanjiInfo[idsTag];
		const nmrItems = ids.length;
		const table = infoTable(`${title} (${nmrItems}):`, []);
		table.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		if (nmrItems > 0)
			table.appendChild(itemCards(ids, list, itemCardsclass));
		else {
			const nonefound = document.createElement("p");
			table.appendChild(nonefound);
			nonefound.appendChild(document.createTextNode("(None found)"));
			nonefound.style.fontWeight = "900";
			nonefound.style.padding = "5px";
		}
		return table;
	}
	
	const createItemCharContainer = (width, characters, highlightingClasses, itemId, inSideBar) => {
		const type = allKanji[itemId] ? "kanji" : "vocabulary";
		const itemInfo = type == "kanji" ? allKanji[itemId] : allVocab[itemId];

		const itemWrapper = document.createElement("div");
		if (inSideBar) {
			itemWrapper.classList.add("wkhighlighter_focusPopup_kanji");
			itemWrapper.style.width = width+"px";
		}
		else {
			// add kanji first meaning to small details popup
			const kanjiTitle = document.createElement("p");
			itemWrapper.appendChild(kanjiTitle);
			kanjiTitle.style.color = "black";
			kanjiTitle.style.fontSize = "19px";
			kanjiTitle.style.backgroundColor = "white";
			kanjiTitle.style.marginBottom = "8px";
			kanjiTitle.appendChild(document.createTextNode(itemInfo["meanings"][0]));
			kanjiTitle.id = "wkhighlighter_smallDetailsPopupKanjiTitle";
		}

		// close details popup X
		const closeXWrapper = document.createElement("div");
		itemWrapper.appendChild(closeXWrapper);
		closeXWrapper.id = "wkhighlighter_detailsPopupCloseX";
		closeXWrapper.classList.add("clickable");
		const closeX = document.createElement("img");
		closeX.src = "https://i.imgur.com/E1OSzfu.png";
		closeX.alt = "close";
		closeXWrapper.appendChild(closeX);

		const link = document.createElement("a");
		link.target = "_blank";
		itemWrapper.appendChild(link);
	
		const charsWrapper = document.createElement("p");
		link.appendChild(charsWrapper);
		charsWrapper.appendChild(document.createTextNode(characters));
		charsWrapper.setAttribute('data-item-type', type);
		if (characters.length > 4) 
			charsWrapper.style.setProperty("font-size", (48-6*(characters.length - 5))+"px", "important");
	
		charsWrapper.classList.add("wkhighlighter_detailsPopup_kanji");
		if (highlightingClasses)
			highlightingClasses.forEach(highlightingClass => charsWrapper.classList.add(highlightingClass));
	
		link.href = itemInfo["document_url"];
	
		const ul = document.createElement("ul");
		ul.classList.add("wkhighlighter_popupDetails_readings");
				
		const readings = itemInfo["readings"];
		if (type == "kanji") {
			chrome.storage.local.set({"wkhighlight_currentKanjiInfo": itemInfo});
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
		}
		else {
			const li = document.createElement("li");
			li.classList.add("wkhighlighter_popupDetails_readings_row");
			li.appendChild(document.createTextNode(readings.join(", ")));
			ul.appendChild(li);
		}
		itemWrapper.appendChild(ul);
	
		return itemWrapper;
	}
	
	const createKanjiDetailedInfo = (detailsPopup, kanjiInfo) => {
		// detailed info section
		const detailedInfoWrapper = document.createElement("div");
		detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
		detailsPopup.appendChild(detailedInfoWrapper);
		const kanjiWrapper = document.getElementsByClassName("wkhighlighter_focusPopup_kanji")[0];
		if (kanjiWrapper)
			detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");

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
	
		// kanji drawing
		// const drawingTable = infoTable("Drawing:", []);
		// details.appendChild(drawingTable);
		// const drawWrapper = document.createElement("div");
		// drawingTable.appendChild(drawWrapper);
		
		// used radicals cards
		details.appendChild(itemCardsSection(kanjiInfo, "component_subject_ids", "Used Radicals", "wkhighlighter_detailsPopup_usedRadicals_row", allRadicals));
	
		// similar kanji cards
		details.appendChild(itemCardsSection(kanjiInfo, "visually_similar_subject_ids", "Similar Kanji", "wkhighlighter_detailsPopup_similarKanji_row", allKanji));
	
		// vocab with that kanji
		details.appendChild(itemCardsSection(kanjiInfo, "amalgamation_subject_ids", "Vocabulary", "wkhighlighter_detailsPopup_vocab_row", allVocab));
	
		detailsPopup.scrollTo(0, 0);
		return detailedInfoWrapper;
	}
	
	const createVocabDetailedInfo = (detailsPopup, vocabInfo) => {
		// detailed info section
		const detailedInfoWrapper = document.createElement("div");
		detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
		detailsPopup.appendChild(detailedInfoWrapper);
		let kanjiWrapper = document.getElementsByClassName("wkhighlighter_focusPopup_kanji")[0];
		if (kanjiWrapper)
			detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");
		else {
			// guarantee that the kanjiWrapper exists and is full setup to get its correct size
			const heightUpdaterInterval = setInterval(() => {
				kanjiWrapper = document.getElementsByClassName("wkhighlighter_focusPopup_kanji")[0];
				if (kanjiWrapper && kanjiWrapper.childElementCount > 1) {
					// wait for the elements to be all setup
					setTimeout(() => {
						detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");
						clearInterval(heightUpdaterInterval);
					}, 200);
				}
			}, 100);
		}
	
		// details container
		const details = document.createElement("div");
		details.style.padding = "15px";
		detailedInfoWrapper.appendChild(details);
	
		// level container
		const level = document.createElement("div");
		const levelTitle = document.createElement("strong");
		levelTitle.appendChild(document.createTextNode(`Level ${vocabInfo["level"]} vocabulary`));
		level.appendChild(levelTitle);
		details.appendChild(level);
	
		// meaning container
		const meaning = document.createElement("div");
		meaning.classList.add("wkhighlighter_popupDetails_kanjiTitle");
		const meaningTitle = document.createElement("strong");
		meaningTitle.appendChild(document.createTextNode(vocabInfo["meanings"].join(", ")));
		meaning.appendChild(meaningTitle);
		details.appendChild(meaning);
	
		// meaning mnemonic container
		details.appendChild(infoTable("Meaning Mnemonic:", [parseTags(vocabInfo["meaning_mnemonic"])]));
	
		// reading mnemonic container
		details.appendChild(infoTable("Reading Mnemonic:", [parseTags(vocabInfo["reading_mnemonic"])]));
	
		// used kanji
		details.appendChild(itemCardsSection(vocabInfo, "component_subject_ids", "Used Kanji", "wkhighlighter_detailsPopup_similarKanji_row", allKanji));
	
		// sentences
		const sentencesTable = infoTable("Example Sentences:", []); 
		details.appendChild(sentencesTable);
		vocabInfo["context_sentences"].forEach(sentence => {
			const wrapper = document.createElement("ul");
			sentencesTable.appendChild(wrapper);
			wrapper.classList.add("wkhighlighter_detailsPopup_sentencesWrapper");
	
			const en = document.createElement("li");
			wrapper.appendChild(en);
			en.classList.add("wkhighlighter_popupDetails_p");
			en.style.backgroundColor = "var(--vocab-tag-color)";
			en.style.padding = "0px 5px";
			en.appendChild(document.createTextNode(sentence["en"]));
	
			const ja = document.createElement("li");
			wrapper.appendChild(ja);
			ja.style.padding = "0px 5px";
			ja.appendChild(document.createTextNode(sentence["ja"]));
	
		});
	
		detailsPopup.scrollTo(0, 0);
		return detailedInfoWrapper;
	}	

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// create kanji details popup coming from search
		const infoPopupFromSearch = request["infoPopupFromSearch"];
		if (infoPopupFromSearch) {
			const characters = infoPopupFromSearch["characters"];
			const type = infoPopupFromSearch["type"];
			let detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
			if (detailsPopup)
				detailsPopup.remove();
			detailsPopup = createPopup();
			infoInPopup = false;
		
			if (type == "kanji") {
				chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
					const assocList = data["wkhighlight_kanji_assoc"];
					if (assocList) 
						detailsPopup.appendChild(createItemCharContainer(detailsPopup.offsetWidth, characters, [highlightingClass, "wkhighlighter_highlightedNotLearned"], assocList[characters], false));
				});
			}
			else {
				const id = Object.entries(allVocab).filter(([key, val]) => val["characters"] == characters)[0][0];
				detailsPopup.appendChild(createItemCharContainer(detailsPopup.offsetWidth, characters, [highlightingClass, "wkhighlighter_highlightedNotLearned"], id, false));
			}
		}
	});

	document.addEventListener("mouseover", e => {
		const node = e.target;
		let detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
	
		// If hovering over a kanji
		if (highlightingClass && node.classList.contains("wkhighlighter_hoverable") && !(detailsPopup && detailsPopup.contains(node))) {

			if (!detailsPopup)
				detailsPopup = createPopup();
				
			const kanji = node.textContent;
			chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
				console.log("creating main wrapper for: ",kanji);

				let mainWrapper = createItemCharContainer(detailsPopup.offsetWidth, kanji, [highlightingClass, "wkhighlighter_highlightedNotLearned"], data["wkhighlight_kanji_assoc"][kanji], infoInPopup);
	
				// replace kanji and readings
				const firstChild = detailsPopup.firstChild;
				if (!firstChild || (firstChild && firstChild.textContent !== kanji)) {
					if (firstChild)
						firstChild.remove();
					detailsPopup.prepend(mainWrapper);
				}
	
				// if popup expanded
				if (infoInPopup) {
					// show close X
					const closeX = document.getElementById("wkhighlighter_detailsPopupCloseX");
					if (closeX)
						closeX.style.display = "inline";

					chrome.storage.local.get(["wkhighlight_currentKanjiInfo"], info => {
						detailsPopup.querySelectorAll(".wkhighlighter_popupDetails_detailedInfoWrapper").forEach(wrapper => wrapper.remove());
						detailsPopup.appendChild(createKanjiDetailedInfo(detailsPopup, info["wkhighlight_currentKanjiInfo"]));
					});
				}

				// make sure only one interval is running
				if (extraContainersRemoverInterval)
					clearInterval(extraContainersRemoverInterval);

				let containers;
				// make sure there is only one info container
				extraContainersRemoverInterval = setInterval(() => {
					containers = document.getElementsByClassName("wkhighlighter_popupDetails_detailedInfoWrapper");
					// i = 1 to ignore first container
					if (containers) {
						for (let i = 1; i < containers.length; i++) {
							console.log("removed extra container!");
							containers[i].remove();
						}
					}
				}, 2000);
			});
		}
	
		// if hovering over the details popup or any of it's children
		if (!infoInPopup && detailsPopup && (node === detailsPopup || detailsPopup.contains(node))) {
			detailsPopup.classList.add("wkhighlighter_focusPopup");
			detailsPopup.style.height = window.innerHeight+"px";

			// show close X
			const closeX = document.getElementById("wkhighlighter_detailsPopupCloseX");
			if (closeX)
				closeX.style.display = "inline";

			// remove temp kanji info from small details popup
			const tempKanjiTitle = document.getElementById("wkhighlighter_smallDetailsPopupKanjiTitle");
			if (tempKanjiTitle)
				tempKanjiTitle.remove();

			// remove ... from readings
			const readingsRow = Array.from(document.getElementsByClassName("wkhighlighter_popupDetails_readings_row"));
			readingsRow.forEach(row => {
				const ellipsis = row.childNodes[row.childNodes.length-1];
				if (ellipsis && ellipsis.innerText == "...")
					ellipsis.remove();
			});
	
			const itemWrapper = detailsPopup.firstChild;
			setTimeout(() => {
				itemWrapper.classList.add("wkhighlighter_focusPopup_kanji");
				itemWrapper.style.width = detailsPopup.offsetWidth+"px";
				detailsPopup.style.overflowY = "auto";
				detailsPopup.style.maxHeight = window.innerHeight+"px";
			}, 200);
	
			chrome.storage.local.get(["wkhighlight_currentKanjiInfo", "wkhighlight_currentVocabInfo"], info => {
				const type = itemWrapper.getElementsByClassName("wkhighlighter_detailsPopup_kanji wkhighlighter_highlighted")[0].getAttribute('data-item-type');
				console.log(type, info);
				detailsPopup.appendChild(type == "kanji" ? createKanjiDetailedInfo(detailsPopup, info["wkhighlight_currentKanjiInfo"]) : createVocabDetailedInfo(detailsPopup, info["wkhighlight_currentVocabInfo"]));
			});
			
			infoInPopup = true;
		}
	
		// if hovering over a kanji card
		if (node.classList.contains("wkhighlighter_detailsPopup_vocab_row") || node.classList.contains("wkhighlighter_detailsPopup_similarKanji_row") || (node.classList.contains("wkhighlighter_detailsPopup_cards") && (node.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_similarKanji_row") || node.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_vocab_row")))) {
			document.querySelectorAll(".itemLevelCard").forEach(levelCard => levelCard.style.display = "inline");
			document.querySelectorAll(".wkhighlighter_detailsPopup_cardRow").forEach(card => card.style.filter = "brightness(0.5)");
			document.querySelectorAll(".wkhighlighter_detailsPopup_cardSideBar").forEach(node => node.remove());
			const target = node.classList.contains("wkhighlighter_detailsPopup_cards") ? node.parentElement.parentElement : node;
			target.style.filter = "unset";
			const type = target.classList.contains("wkhighlighter_detailsPopup_vocab_row") ? "vocabulary" : "kanji";
			let id = "";
			target.childNodes.forEach(child => {
				if (child.tagName == "A")
					id = child.childNodes[0].getAttribute("data-item-id");
	
				if (child.classList.contains("itemLevelCard"))
					child.style.display = "none";
			});
	
			if (target.childNodes.length == 2) {
				const sideBar = document.createElement("div");
				target.appendChild(sideBar);
				sideBar.classList.add("wkhighlighter_detailsPopup_cardSideBar");
				const ul = document.createElement("ul");
				sideBar.appendChild(ul);
				const classes = ["wkhighlighter_detailsPopup_cardSideBarAudio", "wkhighlighter_detailsPopup_cardSideBarInfo"];
				const icons = ["https://i.imgur.com/ETwuWqJ.png", "https://i.imgur.com/z5eKtlN.png"];
				if (type == "kanji") {
					classes.shift();
					icons.shift();
				}
				for (const [i, src] of icons.entries()) {
					const li = document.createElement("li");
					ul.appendChild(li);
					li.classList.add("clickable" ,classes[i]);
					const img = document.createElement("img");
					li.appendChild(img);
					img.classList.add("wkhighlighter_detailsPopup_cardSideBar_icon");
					img.src = src;
				}
				const li = document.createElement("li");
				ul.appendChild(li);
				li.style.fontWeight = "900";
				const list = type == "kanji" ? allKanji[id] : allVocab[id];
				if (list)
					li.appendChild(document.createTextNode(list["level"]));
			}
		}
	
		// if hovering outside kanji card wrapper
		if (node && !(node.classList.contains("wkhighlighter_detailsPopup_cardRow") || (node.parentElement && node.parentElement.classList.contains("wkhighlighter_detailsPopup_cardRow")) || node.classList.contains("wkhighlighter_detailsPopup_cards") || (node.parentElement && node.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")) || (node. parentElement && node.parentElement.parentElement && node.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")) || (node.parentElement && node.parentElement.parentElement && node.parentElement.parentElement.parentElement && node.parentElement.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")))) {
			document.querySelectorAll(".itemLevelCard").forEach(levelCard => levelCard.style.display = "inline");
			document.querySelectorAll(".wkhighlighter_detailsPopup_cardRow").forEach(card => card.style.filter = "unset");
			document.querySelectorAll(".wkhighlighter_detailsPopup_cardSideBar").forEach(node => node.remove());
		}

	});
	
	document.addEventListener("click", e => {
		const node = e.target;
		
		const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		
		if (detailsPopup) {
			// not clicked on details popup or clicked in close X
			if ((node !== detailsPopup && !detailsPopup.contains(node) && getComputedStyle(node).cursor !== "pointer") || node.id == "wkhighlighter_detailsPopupCloseX") {
				detailsPopup.classList.add("wkhighlighter_rightOverFlowPopup");
				// little delay to make sure it is not overwriten
				setTimeout(() => {
					infoInPopup = false;
					if (detailsPopup)
						detailsPopup.remove();
				}, 200);
			}
	
			const getItemIdFromSideBar = (node) => {
				const target = node.childNodes;
				if (target && target.length > 0) {
					for (const n of target) {
						for (const child of n.childNodes) {
							if (child.getAttribute)
								return child.getAttribute("data-item-id");
						}
					}
				}
				return null;
			}
	
			// clicked on sidebar audio
			if (node.classList.contains("wkhighlighter_detailsPopup_cardSideBarAudio")) {
				const id = getItemIdFromSideBar(node.parentElement.parentElement.parentElement);
				if (id) {
					const audio = new Audio();
					const audioList = allVocab[id]["pronunciation_audios"];
					audio.src = audioList[Math.floor(Math.random() * audioList.length)].url;
					audio.play();
				}
			}
	
			// clicked on sidebar info
			if (node.classList.contains("wkhighlighter_detailsPopup_cardSideBarInfo")) {
				const target = node.parentElement.parentElement.parentElement;
				const type = target.classList.contains("wkhighlighter_detailsPopup_vocab_row") ? "vocabulary" : "kanji";
				const id = getItemIdFromSideBar(target);
				console.log(id);
				if (id) {
					const item = type == "kanji" ? allKanji[id] : allVocab[id];
					console.log(item);
					const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
					// replace item from top
					detailsPopup.firstChild.remove();
					detailsPopup.appendChild(createItemCharContainer(detailsPopup.offsetWidth, item["characters"], [highlightingClass, "wkhighlighter_highlightedNotLearned"], id, true));
	
					detailsPopup.querySelectorAll(".wkhighlighter_popupDetails_detailedInfoWrapper").forEach(wrapper => wrapper.remove());
					detailsPopup.appendChild(type == "kanji" ? createKanjiDetailedInfo(detailsPopup, allKanji[id]) : createVocabDetailedInfo(detailsPopup, allVocab[id]));
				}
				console.log("clicked");
			}
	
			// clicked in a highlighted kanji (within the info popup)
			if (node.classList.contains("wkhighlighter_highlighted") || node.classList.contains("wkhighlighter_highlightedNotLearned")) {
				const character = node.textContent;
				chrome.storage.local.get(["wkhighlight_kanji_assoc"], data => {
					const assocList = data["wkhighlight_kanji_assoc"];
					if (assocList) {
						const id = assocList[character];
						const kanji = allKanji[id];
						const detailsPopup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
						// replace item from top
						detailsPopup.firstChild.remove();
						detailsPopup.appendChild(createItemCharContainer(detailsPopup.offsetWidth, kanji["characters"], [highlightingClass, "wkhighlighter_highlightedNotLearned"], id, true));
	
						detailsPopup.querySelectorAll(".wkhighlighter_popupDetails_detailedInfoWrapper").forEach(wrapper => wrapper.remove());
						detailsPopup.appendChild(createKanjiDetailedInfo(detailsPopup, kanji));
					}
				});
			}
		}
	});
	
	document.addEventListener('mousedown', e => {
		const target = e.target;
	
		if (target.classList.contains("wkhighlighter_detailsPopup_resizer")) {
			target.addEventListener('mousemove', e => {
				mousepos = document.body.offsetWidth - e.clientX;
				console.log(mousepos);
				target.style.right = mousepos;
			});
			//console.log(getComputedStyle(target).right);
			//target.style.right = (parseInt(getComputedStyle(target).right.split("px")[0])+20)+"px";
		}
	});
})();