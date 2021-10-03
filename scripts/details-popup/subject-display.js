(function () {
	// construtctor
	const SubjectDisplay = function(radicals, kanji, vocabulary, width, wrapper) {
		this.allRadicals = radicals;
		this.allKanji = kanji;
		this.allVocab = vocabulary;
		this.width = width;
		this.fixed = false;
		this.locked = false;
		this.expanded = false;
		this.openedSubjects = [];
		this.wrapper = wrapper;

		document.addEventListener("mouseover", e => {
			const node = e.target;

			// if hovering over the details popup or any of it's children (expand small popup)
			if (!this.expanded && this.detailsPopup && (node === this.detailsPopup || this.detailsPopup.contains(node)))
				this.expand();

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
		
				if (target.childNodes.length == 4) {
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
						li.title = "Subject "+classes[i].split("wkhighlighter_detailsPopup_cardSideBar")[1];
						img.classList.add("wkhighlighter_detailsPopup_cardSideBar_icon");
						img.src = src;
					}
					const li = document.createElement("li");
					ul.appendChild(li);
					li.style.fontWeight = "900";
					li.title = "Subject Level";
					const list = type == "kanji" ? this.allKanji[id] : this.allVocab[id];
					if (list)
						li.appendChild(document.createTextNode(list["level"]));
				}
			}
			
			// if hovering outside kanji card wrapper
			if (node && !(node.classList.contains("wkhighlighter_detailsPopup_cardRow") || (node.parentElement && node.parentElement.classList.contains("wkhighlighter_detailsPopup_cardRow")) || node.classList.contains("wkhighlighter_detailsPopup_cards") || (node.parentElement && node.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")) || (node. parentElement && node.parentElement.parentElement && node.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")) || (node.parentElement && node.parentElement.parentElement && node.parentElement.parentElement.parentElement && node.parentElement.parentElement.parentElement.classList.contains("wkhighlighter_detailsPopup_cardSideBar")))) {
				document.querySelectorAll(".itemLevelCard").forEach(levelCard => levelCard.style.removeProperty("display"));
				document.querySelectorAll(".wkhighlighter_detailsPopup_cardRow").forEach(card => card.style.removeProperty("filter"));
				document.querySelectorAll(".wkhighlighter_detailsPopup_cardSideBar").forEach(node => node.remove());
			}
		});

		document.addEventListener("click", e => {
			const node = e.target;

			// if clicked on close button
			if (node.id == "wkhighlighter_detailsPopupCloseX")
				this.close(200);

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
					const audioList = this.allVocab[id]["pronunciation_audios"];
					audio.src = audioList[Math.floor(Math.random() * audioList.length)].url;
					audio.play();
				}
			}
	
			// clicked on sidebar info
			if (node.classList.contains("wkhighlighter_detailsPopup_cardSideBarInfo")) {
				const target = node.parentElement.parentElement.parentElement;
				const id = getItemIdFromSideBar(target);
				if (id)
					this.update(id, true);
			}

			// clicked a button in kanji container
			if (node.classList.contains("wkhighlighter_detailsPopupButton")) {
				// don't switchClass in the nodes inside the array
				if (!["wkhighlighter_detailsPopupCloseX", "wkhighlighter_detailsPopupGoBack", "wkhighlighter_detailsPopupGoUp"].includes(node.id)) {
					if (node.classList.contains("faded"))
						node.classList.remove("faded");
					else
						node.classList.add("faded");
				}

				if (node.id == "wkhighlighter_detailsPopupFix")
					this.fixed = !this.fixed;
				
				if (node.id == "wkhighlighter_detailsPopupKanjiLock")
					this.locked = !this.locked;

				if (node.id == "wkhighlighter_detailsPopupGoUp") {
					if (this.detailsPopup) {
						this.detailsPopup.scrollTo(0, 0);
					}
				}

				if (node.id == "wkhighlighter_detailsPopupGoBack") {
					if (this.openedSubjects.length > 0)
						this.openedSubjects.pop();

					const kanji = this.openedSubjects[this.openedSubjects.length-1];
					if (kanji) {
						this.update(kanji["id"], false);
					}
				}
					
			}
		});
	}

	SubjectDisplay.prototype = {

		// create popup
		create: function() {
			this.detailsPopup = document.createElement("div");
			this.detailsPopup.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
			this.wrapper.appendChild(this.detailsPopup);
			setTimeout(() => this.detailsPopup.classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
		},

		// update popup
		update: function (id, save) {
			if (id) {
				console.log(this);
				const type = this.allKanji[id] ? "kanji" : "vocabulary";
				const item = type === "kanji" ? this.allKanji[id] : this.allVocab[id];
				console.log(id);

				if (!this.detailsPopup) this.create();

				if (this.detailsPopup.firstChild)
					this.detailsPopup.firstChild.remove();
				this.detailsPopup.appendChild(this.charContainer(item["characters"], id, save));

				
				const detailedInfoWrapper = this.detailsPopup.getElementsByClassName("wkhighlighter_popupDetails_detailedInfoWrapper");
				if (detailedInfoWrapper)
					Array.from(detailedInfoWrapper).forEach(wrapper => wrapper.remove());
				
				if (this.expanded) {
					this.detailsPopup.appendChild(type === "kanji" ? this.kanjiDetailedInfo(item) : this.vocabDetailedInfo(item));

					// show kanji container buttons
					const buttons = Array.from(this.detailsPopup.getElementsByClassName("wkhighlighter_detailsPopupButton"));
					if (buttons)
						buttons.forEach(button => button.classList.remove("hidden"));
				}
			}
		},

		// expand popup
		expand : function () {
			this.detailsPopup.classList.add("wkhighlighter_focusPopup");
			this.detailsPopup.style.height = window.innerHeight+"px";
			console.log(this.detailsPopup);

			// remove temp kanji info from small details popup
			const tempKanjiTitle = this.detailsPopup.getElementsByClassName("wkhighlighter_smallDetailsPopupKanjiTitle")[0];
			if (tempKanjiTitle)
				tempKanjiTitle.remove();

			// remove ... from readings
			const readingsRow = Array.from(this.detailsPopup.getElementsByClassName("wkhighlighter_popupDetails_readings_row"));
			readingsRow.forEach(row => {
				const ellipsis = row.childNodes[row.childNodes.length-1];
				if (ellipsis && ellipsis.innerText == "...")
					ellipsis.remove();
			});

			const itemWrapper = this.detailsPopup.firstChild;
			setTimeout(() => {
				itemWrapper.classList.add("wkhighlighter_focusPopup_kanji");
				itemWrapper.style.width = this.width+"px";
				this.detailsPopup.style.overflowY = "auto";
				this.detailsPopup.style.maxHeight = window.innerHeight+"px";
			}, 200);

			const type = itemWrapper.getElementsByClassName("wkhighlighter_detailsPopup_kanji")[0].getAttribute('data-item-type');
			const id = itemWrapper.getElementsByClassName("wkhighlighter_detailsPopup_kanji")[0].getAttribute('data-item-id');
			this.detailsPopup.appendChild(type == "kanji" ? this.kanjiDetailedInfo(this.allKanji[id]) : this.vocabDetailedInfo(this.allVocab[id]));

			// show kanji container buttons
			const buttons = Array.from(document.getElementsByClassName("wkhighlighter_detailsPopupButton"));
			if (buttons)
				buttons.forEach(button => button.classList.remove("hidden"));

			this.expanded = true;
		},

		// close popup
		close: function (delay) {
			if (!this.fixed) {
				this.detailsPopup.classList.add("wkhighlighter_rightOverFlowPopup");

				setTimeout(() => {
					this.expanded = false;
					this.detailsPopup.remove();
					this.detailsPopup = null;
				}, delay);
			}
		},

		// kanji detailed info container
		kanjiDetailedInfo: function (kanjiInfo) {
			// detailed info section
			const detailedInfoWrapper = document.createElement("div");
			detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
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
			details.appendChild(infoTable("Meaning Mnemonic", [parseTags(kanjiInfo["meaning_mnemonic"]), parseTags(kanjiInfo["meaning_hint"])]));
		
			// reading mnemonic container
			details.appendChild(infoTable("Reading Mnemonic", [parseTags(kanjiInfo["reading_mnemonic"]), parseTags(kanjiInfo["reading_hint"])]));
			
			// used radicals cards
			details.appendChild(itemCardsSection(kanjiInfo, "component_subject_ids", "Used Radicals", "wkhighlighter_detailsPopup_usedRadicals_row", this.allRadicals));
		
			// similar kanji cards
			details.appendChild(itemCardsSection(kanjiInfo, "visually_similar_subject_ids", "Similar Kanji", "wkhighlighter_detailsPopup_similarKanji_row", this.allKanji));
		
			// vocab with that kanji
			details.appendChild(itemCardsSection(kanjiInfo, "amalgamation_subject_ids", "Vocabulary", "wkhighlighter_detailsPopup_vocab_row", this.allVocab));
		
			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		vocabDetailedInfo: function (vocabInfo) {
			// detailed info section
			const detailedInfoWrapper = document.createElement("div");
			detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
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
			details.appendChild(itemCardsSection(vocabInfo, "component_subject_ids", "Used Kanji", "wkhighlighter_detailsPopup_similarKanji_row", this.allKanji));

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

			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		charContainer: function (characters, id, save) {
			const type = this.allKanji[id] ? "kanji" : "vocabulary";
			const item = type === "kanji" ? this.allKanji[id] : this.allVocab[id];

			const itemWrapper = document.createElement("div");
			if (this.expanded) {
				itemWrapper.classList.add("wkhighlighter_focusPopup_kanji");
				itemWrapper.style.width = this.width+"px";
			}
			else {
				// add kanji first meaning to small details popup
				const kanjiTitle = document.createElement("p");
				itemWrapper.appendChild(kanjiTitle);
				kanjiTitle.style.color = "black";
				kanjiTitle.style.fontSize = "19px";
				kanjiTitle.style.backgroundColor = "white";
				kanjiTitle.style.marginBottom = "8px";
				kanjiTitle.style.textAlign = "center";
				kanjiTitle.appendChild(document.createTextNode(item["meanings"][0]));
				kanjiTitle.classList.add("wkhighlighter_smallDetailsPopupKanjiTitle");

				if (characters.length >= 3)
					this.detailsPopup.style.width = this.width+"px";
			}
			
			// kanji container buttons
			const buttons = [
				{id:"wkhighlighter_detailsPopupCloseX", alt: "Close", active:true, src:"https://i.imgur.com/KUjkFI9.png"},
				{id:"wkhighlighter_detailsPopupGoBack", alt: "Go back", active:true, src:"https://i.imgur.com/e6j4jSV.png"},
				{id:"wkhighlighter_detailsPopupGoUp", alt: "Go up", active:true, src:"https://i.imgur.com/fszQn7s.png"},
				{id:"wkhighlighter_detailsPopupKanjiLock", alt: "Kanji lock", active:this.locked, src:"https://i.imgur.com/gaKRPen.png"},
				{id:"wkhighlighter_detailsPopupFix", alt: "Kanji fix", active:this.fixed, src:"https://i.imgur.com/vZqwGZr.png"}
			];
			for (let i in buttons) {
				const button = buttons[i];

				// don't add go back button if there are no kanji to go back to
				if (button["id"] == "wkhighlighter_detailsPopupGoBack" && this.openedSubjects.length == 1)
					continue;

				const wrapper = document.createElement("div");
				itemWrapper.appendChild(wrapper);
				wrapper.id = button["id"];
				wrapper.classList.add("wkhighlighter_detailsPopupButton", "clickable", "hidden");
				// add class faded to those buttons only
				if (!button["active"])
					wrapper.classList.add("faded");
				const img = document.createElement("img");
				img.src = button["src"];
				img.alt = button["alt"];
				wrapper.title = img.alt;
				wrapper.appendChild(img);
			}

			const infoToSave = {"id":id, "char":characters, "type":type};
			// only save if the last save wasn't this kanji already
			if (save && !(this.openedSubjects.length > 0 && this.openedSubjects[this.openedSubjects.length-1]["id"] == infoToSave["id"]))
				this.openedSubjects.push(infoToSave);
			
			const kanjiContainerWrapper = document.createElement("div");
			itemWrapper.appendChild(kanjiContainerWrapper);
			kanjiContainerWrapper.style.margin = `${characters.length >= 4 ? 30 : 0}px 0`;
			kanjiContainerWrapper.style.textAlign = "center";
	
			const link = document.createElement("a");
			link.target = "_blank";
			kanjiContainerWrapper.appendChild(link);
		
			const charsWrapper = document.createElement("p");
			link.appendChild(charsWrapper);
			charsWrapper.appendChild(document.createTextNode(characters));
			charsWrapper.setAttribute('data-item-type', type);
			charsWrapper.setAttribute('data-item-id', id);
			charsWrapper.title = characters+" in WaniKani";
			if (characters.length > 4) 
				charsWrapper.style.setProperty("font-size", (48-6*(characters.length - 5))+"px", "important");
		
			charsWrapper.classList.add("wkhighlighter_detailsPopup_kanji");
		
			link.href = item["document_url"];
		
			const ul = document.createElement("ul");
			ul.classList.add("wkhighlighter_popupDetails_readings");
					
			const readings = item["readings"];
			if (type == "kanji") {
				([["ON", "onyomi"], ["KUN", "kunyomi"]]).forEach(type => {
					const li = document.createElement("li");
					li.innerHTML = `<strong>${type[0]}: </strong>`;
					li.classList.add("wkhighlighter_popupDetails_readings_row");
					const span = document.createElement("span");
					const readingsString = readings.filter(reading => reading.type===type[1]).map(reading => reading.reading).join(", ");
					span.appendChild(document.createTextNode(readingsString));
					if (readingsString === '') li.classList.add("faded");
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
			kanjiContainerWrapper.appendChild(ul);
		
			return itemWrapper;
		}
	}

	// Auxiliar methods

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

	const itemCardsSection = (kanjiInfo, idsTag, title, itemCardsclass, list) => {
		const ids = kanjiInfo[idsTag];
		const nmrItems = ids.length;
		const table = infoTable(`${title} (${nmrItems})`, []);
		table.classList.add("wkhighlighter_detailsPopup_sectionContainer");
		if (nmrItems > 0)
			table.appendChild(itemCards(ids, list, itemCardsclass, title !== "Used Kanji"));
		else {
			const nonefound = document.createElement("p");
			table.appendChild(nonefound);
			nonefound.appendChild(document.createTextNode("(None found)"));
			nonefound.style.fontWeight = "900";
			nonefound.style.padding = "5px";
		}
		return table;
	}

	const itemCards = (ids, data, className, sorted) => {
		const wrapper = document.createElement("ul");
		wrapper.style.padding = "0";
		if (ids && data) {
			let info = ids.map(id => data[id]);
			if (sorted && info)
				info = info.sort((a,b) => a.level - b.level)
			info.forEach(thisData => {
				const rows = [];
				if (thisData["meanings"]) rows.push(thisData["meanings"][0]);
				if (thisData["readings"]) rows.push(thisData["subject_type"] == "kanji" ? thisData["readings"].filter(reading => reading["primary"])[0]["reading"] : thisData["readings"][0]);
				const card = itemCard(thisData["characters"], rows, thisData["level"]);
				wrapper.appendChild(card);
				card.classList.add("wkhighlighter_detailsPopup_cardRow", className);
				card.title = thisData["characters"]+" in WaniKani";

				card.getElementsByTagName("A")[0].href = thisData["document_url"];

				const p = card.getElementsByTagName("p")[0];
				if (!thisData["characters"]) {
					const img = document.createElement("img");
					const svgs = thisData["character_images"].filter(img => img["content_type"] === "image/png" && img["metadata"]["dimensions"] === "64x64");
					img.src = svgs[0].url;
					img.style.width = "40px";
					p.appendChild(img);
				}

				p.classList.add("wkhighlighter_detailsPopup_cards", "wkhighlighter_highlightedNotLearned");
				p.setAttribute('data-item-id', thisData.id);
			});
		}

		return ids.length > 0 ? wrapper : document.createDocumentFragment();
	}

	const itemCard = (characters, textRows, level) => {
		const li = document.createElement("li");

		const a = document.createElement("a");
		li.appendChild(a);
		a.target = "_blank";

		const p = document.createElement("p");
		a.appendChild(p);

		if (characters) {
			p.appendChild(document.createTextNode(characters));
			if (characters.length > 4)
				p.style.setProperty("font-size",(170/characters.length)+"px", "important");
		}

		textRows.forEach(row => {
			if (row) {
				const rowDiv = document.createElement("div");
				li.appendChild(rowDiv);
				rowDiv.appendChild(document.createTextNode(row));
				rowDiv.style.textAlign = "center";
			}
		});

		if (level) {
			const levelDiv = document.createElement("div");
			li.appendChild(levelDiv);
			levelDiv.appendChild(document.createTextNode(level));
			levelDiv.classList.add("itemLevelCard");
		}

		return li;
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

	window.SubjectDisplay = SubjectDisplay;
}());