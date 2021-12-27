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
			if (node.classList.contains("sd-detailsPopup_vocab_row") || node.classList.contains("sd-detailsPopup_kanji_row") || (node.classList.contains("sd-detailsPopup_cards") && (node.parentElement.parentElement.classList.contains("sd-detailsPopup_kanji_row") || node.parentElement.parentElement.classList.contains("sd-detailsPopup_vocab_row")))) {
				document.querySelectorAll(".sd-itemLevelCard").forEach(levelCard => levelCard.style.setProperty("display", "inline", "important"));
				document.querySelectorAll(".sd-detailsPopup_cardRow").forEach(card => card.style.setProperty("filter", "brightness(0.5)", "important"));
				document.querySelectorAll(".sd-detailsPopup_cardSideBar").forEach(node => node.remove());
				const target = node.classList.contains("sd-detailsPopup_cards") ? node.parentElement.parentElement : node;
				target.style.setProperty("filter", "unset", "important")
				const type = target.classList.contains("sd-detailsPopup_vocab_row") ? "vocabulary" : "kanji";
				let id = "";
				target.childNodes.forEach(child => {
					if (child.tagName == "A")
						id = child.childNodes[0].getAttribute("data-item-id");
		
					if (child.classList.contains("sd-itemLevelCard"))
						child.style.setProperty("display", "none", "important")
				});
		
				if (target.childNodes.length == 4) {
					const sideBar = document.createElement("div");
					target.appendChild(sideBar);
					sideBar.classList.add("sd-detailsPopup_cardSideBar");
					const ul = document.createElement("ul");
					sideBar.appendChild(ul);
					const classes = ["sd-detailsPopup_cardSideBarAudio", "sd-detailsPopup_cardSideBarInfo"];
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
						li.title = "Subject "+classes[i].split("sd-detailsPopup_cardSideBar")[1];
						img.classList.add("sd-detailsPopup_cardSideBar_icon");
						img.src = src;
					}

					const list = type == "kanji" ? this.allKanji[id] : this.allVocab[id];
					if (list) {
						if (list["srs_stage"] != undefined) {
							const srsLi = document.createElement("li");
							ul.appendChild(srsLi);
							srsLi.style.setProperty("font-weight", "900", "important");
							srsLi.title = "SRS Stage";
							srsLi.appendChild(document.createTextNode(srsStages[list["srs_stage"]]["short"]));
							srsLi.style.setProperty("color", `var(--${srsStages[list["srs_stage"]]["short"].toLowerCase()}-color)`);
							srsLi.style.setProperty("font-size", "13px", "important")
						}
	
						const levelLi = document.createElement("li");
						ul.appendChild(levelLi);
						levelLi.style.setProperty("font-weight", "900", "important")
						levelLi.title = "Subject Level";
						levelLi.appendChild(document.createTextNode(list["level"]));
					}	
				}
			}
			
			// if hovering outside kanji card wrapper
			if (node && !(node.classList.contains("sd-detailsPopup_cardRow") || (node.parentElement && node.parentElement.classList.contains("sd-detailsPopup_cardRow")) || node.classList.contains("sd-detailsPopup_cards") || (node.parentElement && node.parentElement.classList.contains("sd-detailsPopup_cardSideBar")) || (node. parentElement && node.parentElement.parentElement && node.parentElement.parentElement.classList.contains("sd-detailsPopup_cardSideBar")) || (node.parentElement && node.parentElement.parentElement && node.parentElement.parentElement.parentElement && node.parentElement.parentElement.parentElement.classList.contains("sd-detailsPopup_cardSideBar")))) {
				document.querySelectorAll(".sd-itemLevelCard").forEach(levelCard => levelCard.style.removeProperty("display"));
				document.querySelectorAll(".sd-detailsPopup_cardRow").forEach(card => card.style.removeProperty("filter"));
				document.querySelectorAll(".sd-detailsPopup_cardSideBar").forEach(node => node.remove());
			}
		});

		document.addEventListener("click", e => {
			const node = e.target;

			// if clicked on close button
			if (node.id == "sd-detailsPopupCloseX")
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
			if (node.classList.contains("sd-detailsPopup_cardSideBarAudio")) {
				const id = getItemIdFromSideBar(node.parentElement.parentElement.parentElement);
				if (id) {
					const audio = new Audio();
					const audioList = this.allVocab[id]["pronunciation_audios"];
					audio.src = audioList[Math.floor(Math.random() * audioList.length)].url;
					audio.play();
				}
			}
	
			// clicked on sidebar info
			if (node.classList.contains("sd-detailsPopup_cardSideBarInfo")) {
				const target = node.parentElement.parentElement.parentElement;
				const id = getItemIdFromSideBar(target);
				if (id)
					this.update(id, true);
			}

			// clicked a button in kanji container
			if (node.classList.contains("sd-detailsPopupButton")) {
				// don't switchClass in the nodes inside the array
				if (!["sd-detailsPopupCloseX", "sd-detailsPopupGoBack", "sd-detailsPopupGoUp"].includes(node.id)) {
					if (node.classList.contains("faded"))
						node.classList.remove("faded");
					else
						node.classList.add("faded");
				}

				if (node.id == "sd-detailsPopupFix")
					this.fixed = !this.fixed;
				
				if (node.id == "sd-detailsPopupSubjectLock")
					this.locked = !this.locked;

				if (node.id == "sd-detailsPopupGoUp") {
					if (this.detailsPopup) {
						this.detailsPopup.scrollTo(0, 0);
					}
				}

				if (node.id == "sd-detailsPopupKeyBindings") {
					chrome.storage.local.get(["wkhighlight_settings"], result => {
						const settings = result["wkhighlight_settings"];
						if (settings) {
							settings["kanji_details_popup"]["key_bindings"] = !settings["kanji_details_popup"]["key_bindings"];
							chrome.storage.local.set({"wkhighlight_settings":settings});
						}
					});
				}

				if (node.id == "sd-detailsPopupGoBack") {
					if (this.openedSubjects.length > 0)
						this.openedSubjects.pop();

					const kanji = this.openedSubjects[this.openedSubjects.length-1];
					if (kanji) {
						this.update(kanji["id"], false);
					}
				}
					
			}
			
			// if clicking on navbar li
			if (node.closest(".sd-popupDetails_navbar") && node.tagName === "LI") {
				node.getElementsByTagName("A")[0].dispatchEvent(new MouseEvent("click", {
					"view": window,
					"bubbles": true,
					"cancelable": false
				}));
			}
		});
	}

	SubjectDisplay.prototype = {

		// create popup
		create: function() {
			this.detailsPopup = document.createElement("div");
			this.detailsPopup.className = "sd-rightOverFlowPopup sd-detailsPopup";
			this.detailsPopup.style.setProperty("transition", "0.3s", "important");
			this.wrapper.appendChild(this.detailsPopup);
			setTimeout(() => {
				this.detailsPopup.classList.remove("sd-rightOverFlowPopup");
				setTimeout(() => this.detailsPopup.style.removeProperty("transition"), 300);
			}, 20);
		},

		// update popup
		update: function (id, save) {
			if (id) {
				const type = this.allKanji[id] ? "kanji" : "vocabulary";
				const item = type === "kanji" ? this.allKanji[id] : this.allVocab[id];

				if (!this.detailsPopup) this.create();

				if (this.detailsPopup.firstChild)
					this.detailsPopup.firstChild.remove();
				this.detailsPopup.appendChild(this.charContainer(item["characters"], id, save));

				// srs stage border
				const srsId = item["srs_stage"];
				this.detailsPopup.style.setProperty("border-top", "4px solid "+(srsId != undefined ? `var(--${srsStages[srsId]["short"].toLowerCase()}-color)` : "black"), "important");

				
				const detailedInfoWrapper = this.detailsPopup.getElementsByClassName("sd-popupDetails_detailedInfoWrapper");
				if (detailedInfoWrapper)
					Array.from(detailedInfoWrapper).forEach(wrapper => wrapper.remove());
				
				if (this.expanded) {
					this.detailsPopup.appendChild(type === "kanji" ? this.kanjiDetailedInfo(item) : this.vocabDetailedInfo(item));

					// show kanji container buttons
					const buttons = Array.from(this.detailsPopup.getElementsByClassName("sd-detailsPopupButton"));
					if (buttons)
						buttons.forEach(button => button.classList.remove("hidden"));
				}
			}
		},

		// expand popup
		expand : function () {
			this.detailsPopup.classList.add("sd-focusPopup");
			this.detailsPopup.style.setProperty("height", window.innerHeight+"px", "important");
			
			setTimeout(() => this.detailsPopup.style.setProperty("top", "0", "important"), 400);

			// remove temp kanji info from small details popup
			const tempKanjiTitle = this.detailsPopup.getElementsByClassName("sd-smallDetailsPopupKanjiTitle")[0];
			if (tempKanjiTitle)
				tempKanjiTitle.remove();

			// remove ... from readings
			const readingsRow = Array.from(this.detailsPopup.getElementsByClassName("sd-popupDetails_readings_row"));
			readingsRow.forEach(row => {
				const ellipsis = row.childNodes[row.childNodes.length-1];
				if (ellipsis && ellipsis.innerText == "...")
					ellipsis.remove();
			});

			const itemWrapper = this.detailsPopup.firstChild;
			setTimeout(() => {
				if (itemWrapper) {
					itemWrapper.classList.add("sd-focusPopup_kanji");
					itemWrapper.style.setProperty("width", this.width+"px", "important")
				}
				this.detailsPopup.style.setProperty("overflow", "hidden auto", "important");
				this.detailsPopup.style.setProperty("max-height", window.innerHeight+"px", "important");
			}, 200);

			if (itemWrapper) {
				const type = itemWrapper.getElementsByClassName("sd-detailsPopup_kanji")[0].getAttribute('data-item-type');
				const id = itemWrapper.getElementsByClassName("sd-detailsPopup_kanji")[0].getAttribute('data-item-id');
				this.detailsPopup.appendChild(type == "kanji" ? this.kanjiDetailedInfo(this.allKanji[id]) : this.vocabDetailedInfo(this.allVocab[id]));
			
				// show kanji container buttons
				const buttons = Array.from(document.getElementsByClassName("sd-detailsPopupButton"));
				if (buttons)
					buttons.forEach(button => button.classList.remove("hidden"));
			}

			this.expanded = true;
		},

		// close popup
		close: function (delay) {
			if (!this.fixed) {
				this.locked = false;
				this.detailsPopup.classList.add("sd-rightOverFlowPopup");

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
			detailedInfoWrapper.classList.add("sd-popupDetails_detailedInfoWrapper");
			
			const updateMarginTop = () => {
				let kanjiWrapper = document.getElementsByClassName("sd-focusPopup_kanji")[0];
				if (kanjiWrapper)
					detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");
				return kanjiWrapper;
			}

			if (!updateMarginTop()) {
				const updater = setInterval(() => {
					if (updateMarginTop()) clearInterval(updater);
				}, 200);
			}

			const sections = [["Info", "https://i.imgur.com/E6Hrw7w.png"], ["Cards", "https://i.imgur.com/r991llA.png"]];
			if (kanjiInfo["stats"]) sections.push(["Statistics", "https://i.imgur.com/Ufz4G1K.png"]);
			if (kanjiInfo["timestamps"]) sections.push(["Timestamps", "https://i.imgur.com/dcT0L48.png"]);
			// navbar
			if (this.expanded)
				detailedInfoWrapper.appendChild(navbar(this.detailsPopup, sections));
			else
				setTimeout(() => detailedInfoWrapper.appendChild(navbar(this.detailsPopup, sections)), 200);

			// details container
			const details = document.createElement("div");
			details.style.setProperty("padding", "45px 15px", "important");
			detailedInfoWrapper.appendChild(details);
		
			const infoSection = document.createElement("div");
			details.appendChild(infoSection);
			infoSection.id = "sd-popupDetails_InfoSection";
			infoSection.classList.add("sd-popupDetails_anchor");

			// level container
			const level = document.createElement("div");
			const levelTitle = document.createElement("strong");
			levelTitle.appendChild(document.createTextNode(`Level ${kanjiInfo["level"]} kanji`));
			level.appendChild(levelTitle);
			details.appendChild(level);

			// srs stage container
			const srsStage = document.createElement("div");
			details.appendChild(srsStage);
			const srsStageText = document.createElement("strong");
			srsStage.appendChild(srsStageText);
			const srsStageId = kanjiInfo["srs_stage"];
			if (srsStageId != undefined) {
				srsStageText.appendChild(document.createTextNode(srsStages[srsStageId]["name"]));
				srsStageText.style.setProperty("color", `var(--${srsStages[srsStageId]["short"].toLowerCase()}-color)`, "important");				
			}
			else {
				srsStageText.appendChild(document.createTextNode("Locked"));
				srsStageText.style.setProperty("color", `var(--${srsStages[0]["short"].toLowerCase()}-color)`, "important");				
			}
		
			// meaning container
			const meaning = document.createElement("div");
			meaning.classList.add("sd-popupDetails_kanjiTitle");
			const meaningTitle = document.createElement("strong");
			meaningTitle.appendChild(document.createTextNode(kanjiInfo["meanings"].join(", ")));
			meaning.appendChild(meaningTitle);
			details.appendChild(meaning);

			if (kanjiInfo["jlpt"] && kanjiInfo["joyo"]) {
				const schoolLevel = document.createElement("div");
				details.appendChild(schoolLevel);
				schoolLevel.appendChild(document.createTextNode(kanjiInfo["joyo"]+", "+kanjiInfo["jlpt"]));
				schoolLevel.title = "Joyo, JLPT";
				schoolLevel.style.setProperty("color", "#b8b8b8", "important");
			}
			
			// meaning mnemonic container
			details.appendChild(infoTable("Meaning Mnemonic", [parseTags(kanjiInfo["meaning_mnemonic"]), parseTags(kanjiInfo["meaning_hint"])]));
		
			// reading mnemonic container
			details.appendChild(infoTable("Reading Mnemonic", [parseTags(kanjiInfo["reading_mnemonic"]), parseTags(kanjiInfo["reading_hint"])]));
			
			const cardsSection = document.createElement("div");
			details.appendChild(cardsSection);
			cardsSection.id = "sd-popupDetails_CardsSection";
			cardsSection.classList.add("sd-popupDetails_anchor");
			
			// used radicals cards
			details.appendChild(itemCardsSection(kanjiInfo, "component_subject_ids", "Used Radicals", "sd-detailsPopup_radicals_row", this.allRadicals));
		
			// similar kanji cards
			details.appendChild(itemCardsSection(kanjiInfo, "visually_similar_subject_ids", "Similar Kanji", "sd-detailsPopup_kanji_row", this.allKanji));
		
			// vocab with that kanji
			details.appendChild(itemCardsSection(kanjiInfo, "amalgamation_subject_ids", "Vocabulary", "sd-detailsPopup_vocab_row", this.allVocab));
		
			const statsSection = document.createElement("div");
			details.appendChild(statsSection);
			statsSection.id = "sd-popupDetails_StatisticsSection";
			statsSection.classList.add("sd-popupDetails_anchor");

			if (kanjiInfo["stats"]) {
				const statsImages = ["https://i.imgur.com/vsRTIFA.png", "https://i.imgur.com/uY358Y7.png", "https://i.imgur.com/01iZdz6.png"];

				const quickStats = quickRevStats(["Overall", "Meaning", "Reading"], statsImages);
				detailedInfoWrapper.insertBefore(quickStats, details);
				
				details.appendChild(revStats(kanjiInfo["stats"], quickStats.getElementsByTagName("ul")[0]));
			}

			const timestampsSection = document.createElement("div");
			details.appendChild(timestampsSection);
			timestampsSection.id = "sd-popupDetails_TimestampsSection";
			timestampsSection.classList.add("sd-popupDetails_anchor");

			if (kanjiInfo["timestamps"]) {
				const timestampsWrapper = infoTable("Timestamps", []);
				details.appendChild(timestampsWrapper);
				const images = ["https://i.imgur.com/fszQn7s.png", "https://i.imgur.com/Pi3fG6f.png", "https://i.imgur.com/bsZwaVy.png", "https://i.imgur.com/x7ialfz.png", "https://i.imgur.com/a0lyk8f.png", "https://i.imgur.com/VKoEfQD.png", "https://i.imgur.com/pXqcusW.png", "https://i.imgur.com/1EA2EWP.png"];
				timestampsWrapper.appendChild(timestamps(kanjiInfo["timestamps"], images, srsStage));
			}

			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		vocabDetailedInfo: function (vocabInfo) {
			// detailed info section
			const detailedInfoWrapper = document.createElement("div");
			detailedInfoWrapper.classList.add("sd-popupDetails_detailedInfoWrapper");
			
			const updateMarginTop = () => {
				let kanjiWrapper = document.getElementsByClassName("sd-focusPopup_kanji")[0];
				if (kanjiWrapper)
					detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");
				return kanjiWrapper;
			}

			if (!updateMarginTop()) {
				const updater = setInterval(() => {
					if (updateMarginTop()) clearInterval(updater);
				}, 200);
			}

			const sections = [["Info", "https://i.imgur.com/E6Hrw7w.png"], ["Cards", "https://i.imgur.com/r991llA.png"]];
			if (vocabInfo["stats"]) sections.push(["Statistics", "https://i.imgur.com/Ufz4G1K.png"]);
			if (vocabInfo["timestamps"]) sections.push(["Timestamps", "https://i.imgur.com/dcT0L48.png"]);		
			// navbar
			if (this.expanded)
				detailedInfoWrapper.appendChild(navbar(this.detailsPopup, sections));
			else
				setTimeout(() => detailedInfoWrapper.appendChild(navbar(this.detailsPopup, sections)), 200);

			// details container
			const details = document.createElement("div");
			details.style.setProperty("padding", "45px 15px", "important");
			detailedInfoWrapper.appendChild(details);

			const infoSection = document.createElement("div");
			details.appendChild(infoSection);
			infoSection.id = "sd-popupDetails_InfoSection";
			infoSection.classList.add("sd-popupDetails_anchor");

			// level container
			const level = document.createElement("div");
			const levelTitle = document.createElement("strong");
			levelTitle.appendChild(document.createTextNode(`Level ${vocabInfo["level"]} vocabulary`));
			level.appendChild(levelTitle);
			details.appendChild(level);

			// srs stage container
			const srsStage = document.createElement("div");
			details.appendChild(srsStage);
			const srsStageText = document.createElement("strong");
			srsStage.appendChild(srsStageText);
			const srsStageId = vocabInfo["srs_stage"];
			if (srsStageId != undefined) {
				srsStageText.appendChild(document.createTextNode(srsStages[srsStageId]["name"]));
				srsStageText.style.setProperty("color", `var(--${srsStages[srsStageId]["short"].toLowerCase()}-color)`, "important");				
			}
			else {
				srsStageText.appendChild(document.createTextNode("Locked"));
				srsStageText.style.setProperty("color", `var(--${srsStages[0]["short"].toLowerCase()}-color)`, "important");				
			}

			// meaning container
			const meaning = document.createElement("div");
			meaning.classList.add("sd-popupDetails_kanjiTitle");
			const meaningTitle = document.createElement("strong");
			meaningTitle.appendChild(document.createTextNode(vocabInfo["meanings"].join(", ")));
			meaning.appendChild(meaningTitle);
			details.appendChild(meaning);

			const partOfSpeech = document.createElement("div");
			details.appendChild(partOfSpeech);
			partOfSpeech.appendChild(document.createTextNode(vocabInfo["parts_of_speech"][0].charAt(0).toUpperCase()+vocabInfo["parts_of_speech"].join(", ").slice(1)));
			partOfSpeech.style.setProperty("color", "#b8b8b8", "important");

			// meaning mnemonic container
			details.appendChild(infoTable("Meaning Mnemonic", [parseTags(vocabInfo["meaning_mnemonic"])]));

			// reading mnemonic container
			details.appendChild(infoTable("Reading Mnemonic", [parseTags(vocabInfo["reading_mnemonic"])]));

			const cardsSection = document.createElement("div");
			details.appendChild(cardsSection);
			cardsSection.id = "sd-popupDetails_CardsSection";
			cardsSection.classList.add("sd-popupDetails_anchor");

			// used kanji
			details.appendChild(itemCardsSection(vocabInfo, "component_subject_ids", "Used Kanji", "sd-detailsPopup_kanji_row", this.allKanji));

			// sentences
			const sentencesTable = infoTable("Example Sentences", []); 
			details.appendChild(sentencesTable);
			vocabInfo["context_sentences"].forEach(sentence => {
				const wrapper = document.createElement("ul");
				sentencesTable.appendChild(wrapper);
				wrapper.classList.add("sd-detailsPopup_sentencesWrapper");

				const en = document.createElement("li");
				wrapper.appendChild(en);
				en.classList.add("sd-popupDetails_p");
				en.style.setProperty("background-color", "#3a374a", "important");
				en.style.setProperty("padding", "5px", "important");
				en.appendChild(document.createTextNode(sentence["en"]));

				const ja = document.createElement("li");
				wrapper.appendChild(ja);
				ja.style.setProperty("padding", "0px 5px", "important");
				ja.appendChild(document.createTextNode(sentence["ja"]));

			});

			const statsSection = document.createElement("div");
			details.appendChild(statsSection);
			statsSection.id = "sd-popupDetails_StatisticsSection";
			statsSection.classList.add("sd-popupDetails_anchor");

			if (vocabInfo["stats"]) {
				const statsImages = ["https://i.imgur.com/vsRTIFA.png", "https://i.imgur.com/uY358Y7.png", "https://i.imgur.com/01iZdz6.png"];

				const quickStats = quickRevStats(["Overall", "Meaning", "Reading"], statsImages);
				detailedInfoWrapper.insertBefore(quickStats, details);
				
				details.appendChild(revStats(vocabInfo["stats"], quickStats.getElementsByTagName("ul")[0]));
			}

			const timestampsSection = document.createElement("div");
			details.appendChild(timestampsSection);
			timestampsSection.id = "sd-popupDetails_TimestampsSection";
			timestampsSection.classList.add("sd-popupDetails_anchor");

			if (vocabInfo["timestamps"]) {
				const timestampsWrapper = infoTable("Timestamps", []);
				details.appendChild(timestampsWrapper);
				const images = ["https://i.imgur.com/fszQn7s.png", "https://i.imgur.com/Pi3fG6f.png", "https://i.imgur.com/bsZwaVy.png", "https://i.imgur.com/x7ialfz.png", "https://i.imgur.com/a0lyk8f.png", "https://i.imgur.com/VKoEfQD.png", "https://i.imgur.com/pXqcusW.png", "https://i.imgur.com/1EA2EWP.png"];
				timestampsWrapper.appendChild(timestamps(vocabInfo["timestamps"], images, srsStage));
			}

			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		charContainer: function (characters, id, save) {
			const type = this.allKanji[id] ? "kanji" : "vocabulary";
			const item = type === "kanji" ? this.allKanji[id] : this.allVocab[id];

			const itemWrapper = document.createElement("div");
			if (this.expanded) {
				itemWrapper.classList.add("sd-focusPopup_kanji");
				itemWrapper.style.setProperty("width", this.width+"px", "important");
			}
			else {
				// add kanji first meaning to small details popup
				const kanjiTitle = document.createElement("p");
				itemWrapper.appendChild(kanjiTitle);
				kanjiTitle.style.setProperty("color", "black", "important");
				kanjiTitle.style.setProperty("font-size", "19px", "important");
				kanjiTitle.style.setProperty("background-color", "white", "important");
				kanjiTitle.style.setProperty("margin-bottom", "8px", "important");
				kanjiTitle.style.setProperty("text-align", "center", "important");
				kanjiTitle.appendChild(document.createTextNode(item["meanings"][0]));
				kanjiTitle.classList.add("sd-smallDetailsPopupKanjiTitle");

				if (characters.length >= 3)
					this.detailsPopup.style.setProperty("width", this.width+"px", "important");
				else
					this.detailsPopup.style.removeProperty("width");
			}
			
			// kanji container buttons
			const buttons = [
				{id:"sd-detailsPopupCloseX", alt: "Close (X)", active:true, src:"https://i.imgur.com/KUjkFI9.png"},
				{id:"sd-detailsPopupGoBack", alt: "Go back (B)", active:true, src:"https://i.imgur.com/e6j4jSV.png"},
				{id:"sd-detailsPopupGoUp", alt: "Go up (U)", active:true, src:"https://i.imgur.com/fszQn7s.png"},
				{id:"sd-detailsPopupKeyBindings", alt: "Key Bindings", active:defaultSettings["kanji_details_popup"]["key_bindings"], src:"https://i.imgur.com/qbI2bKH.png"},
				{id:"sd-detailsPopupSubjectLock", alt: "Subject lock (L)", active:this.locked, src:"https://i.imgur.com/gaKRPen.png"},
				{id:"sd-detailsPopupFix", alt: "Subject fix (F)", active:this.fixed, src:"https://i.imgur.com/vZqwGZr.png"}
			];

			for (let i in buttons) {
				const button = buttons[i];

				// don't add go back button if there are no kanji to go back to
				if (button["id"] == "sd-detailsPopupGoBack" && this.openedSubjects.length == 1)
					continue;

				const wrapper = document.createElement("div");
				itemWrapper.appendChild(wrapper);
				wrapper.id = button["id"];
				wrapper.classList.add("sd-detailsPopupButton", "clickable", "hidden");
				// add class faded to those buttons only
				if (!button["active"])
					wrapper.classList.add("faded");
				const img = document.createElement("img");
				img.src = button["src"];
				img.alt = button["alt"];
				wrapper.title = img.alt;
				wrapper.appendChild(img);
			}

			chrome.storage.local.get(["wkhighlight_settings"], result => {
				const settings = result["wkhighlight_settings"];
				const keyBindingsButton = document.getElementById("sd-detailsPopupKeyBindings");
				if (settings && keyBindingsButton) {
					const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];
					if (keyBindingsActive)
						keyBindingsButton.classList.remove("faded");
					else
						keyBindingsButton.classList.add("faded");
				}
			});

			const infoToSave = {"id":id, "char":characters, "type":type};
			// only save if the last save wasn't this kanji already
			if (save && !(this.openedSubjects.length > 0 && this.openedSubjects[this.openedSubjects.length-1]["id"] == infoToSave["id"]))
				this.openedSubjects.push(infoToSave);
			
			const kanjiContainerWrapper = document.createElement("div");
			itemWrapper.appendChild(kanjiContainerWrapper);
			kanjiContainerWrapper.style.setProperty("text-align", "center", "important");
	
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
		
			charsWrapper.classList.add("sd-detailsPopup_kanji");
		
			link.href = item["document_url"];
		
			const ul = document.createElement("ul");
			ul.classList.add("sd-popupDetails_readings");
					
			const readings = item["readings"];
			if (type == "kanji") {
				([["ON", "onyomi"], ["KUN", "kunyomi"]]).forEach(type => {
					const li = document.createElement("li");
					li.innerHTML = `<strong>${type[0]}: </strong>`;
					li.classList.add("sd-popupDetails_readings_row");
					const span = document.createElement("span");
					const readingsString = readings.filter(reading => reading.type===type[1]).map(reading => reading.reading).join(", ");
					span.appendChild(document.createTextNode(readingsString));
					if (readingsString === '') li.classList.add("faded");
					li.appendChild(span);
					if (readingsString.length > 8) {
						const overflowSpan = document.createElement("span");
						if (!this.expanded) overflowSpan.appendChild(document.createTextNode("..."));
						li.appendChild(overflowSpan);
					}
					ul.appendChild(li);
				});
			}
			else {
				const li = document.createElement("li");
				li.classList.add("sd-popupDetails_readings_row");
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
						finalString += `<span class="sd-${tagOpen}Tag">${substring}</span>`;
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
		table.classList.add("sd-detailsPopup_sectionContainer");
		if (nmrItems > 0)
			table.appendChild(itemCards(ids, list, itemCardsclass, title !== "Used Kanji"));
		else {
			const nonefound = document.createElement("p");
			table.appendChild(nonefound);
			nonefound.appendChild(document.createTextNode("(None found)"));
			nonefound.style.setProperty("font-weight", "900", "important");
			nonefound.style.setProperty("padding", "5px", "important");
		}
		return table;
	}

	const itemCards = (ids, data, className, sorted) => {
		const wrapper = document.createElement("ul");
		wrapper.style.setProperty("margin-top", "10px", "important");
		if (ids && data) {
			let info = ids.map(id => data[id]);
			if (sorted && info)
				info = info.sort((a,b) => a.level - b.level)
			info.forEach(thisData => {
				const rows = [];
				if (thisData["meanings"]) rows.push(thisData["meanings"][0]);
				if (thisData["readings"]) rows.push(thisData["subject_type"] == "kanji" ? thisData["readings"].filter(reading => reading["primary"])[0]["reading"] : thisData["readings"][0]);
				const card = itemCard(thisData["characters"], rows, thisData["srs_stage"], thisData["level"]);
				wrapper.appendChild(card);
				card.classList.add("sd-detailsPopup_cardRow", className);
				card.title = thisData["characters"]+" in WaniKani";

				card.getElementsByTagName("A")[0].href = thisData["document_url"];

				const p = card.getElementsByTagName("p")[0];
				if (!thisData["characters"]) {
					const img = document.createElement("img");
					const svgs = thisData["character_images"].filter(img => img["content_type"] === "image/png" && img["metadata"]["dimensions"] === "64x64");
					img.src = svgs[0].url;
					img.style.setProperty("width", "40px", "important");
					p.appendChild(img);
				}

				p.classList.add("sd-detailsPopup_cards");
				p.setAttribute('data-item-id', thisData.id);
			});
		}

		return ids.length > 0 ? wrapper : document.createDocumentFragment();
	}

	const itemCard = (characters, textRows, srsId, level) => {
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

		if (textRows) {
			textRows.forEach(row => {
				if (row) {
					const rowDiv = document.createElement("div");
					li.appendChild(rowDiv);
					rowDiv.appendChild(document.createTextNode(row));
					rowDiv.style.setProperty("text-align", "center", "important");
				}
			});
	
		}

		li.style.setProperty("border-top", "4px solid "+(srsId != undefined ? `var(--${srsStages[srsId]["short"].toLowerCase()}-color)` : "black"), "important");

		if (level) {
			const levelDiv = document.createElement("div");
			li.appendChild(levelDiv);
			levelDiv.appendChild(document.createTextNode(level));
			levelDiv.classList.add("sd-itemLevelCard");
		}

		return li;
	}

	const infoTable = (titleText, paragraphs) => {
		const wrapper = document.createElement("div");
		wrapper.classList.add("sd-detailsPopup_sectionContainer");
		
		if (titleText) {
			const title = document.createElement("strong");
			title.classList.add("sd-popupDetails_title");
			title.appendChild(document.createTextNode(titleText));
			wrapper.appendChild(title);
		}
	
		paragraphs.forEach(pText => {
			const p = document.createElement("p");
			p.classList.add("sd-popupDetails_p");
			p.innerHTML = pText;
			wrapper.appendChild(p);
		});
	
		return wrapper;
	}

	const navbar = (detailsPopup, sections) => {
		const navbar = document.createElement("div");
		navbar.classList.add("sd-popupDetails_navbar");
		const navbarUl = document.createElement("ul");
		navbar.appendChild(navbarUl);

		sections.forEach(info => {
			const navbarLi = document.createElement("li");
			navbarUl.appendChild(navbarLi);
			navbarLi.title = info[0];
			navbarLi.classList.add("clickable");
			const link = document.createElement("a");
			navbarLi.appendChild(link);
			link.href = `#sd-popupDetails_${info[0]}Section`;
			const icon = document.createElement("img");
			link.append(icon);
			icon.src = info[1];
			
			if (info[0] == "Info") {
				navbarLi.style.setProperty("background-color", "#d73267", "important");
				icon.style.setProperty("filter", "invert(1)", "important");
			}
		});

		const navbarHighlightChanger = li => {
			if (li && li.parentElement) {
				Array.from(li.parentElement.children).forEach(child => {
					child.style.removeProperty("background-color");
					child.getElementsByTagName("img")[0].style.removeProperty("filter");
				});
				li.style.setProperty("background-color", "#d73267", "important");
				li.getElementsByTagName("img")[0].style.setProperty("filter", "invert(1)", "important");
			}	
		}

		// navbar changes on scroll
		detailsPopup.addEventListener("scroll", e => {
			const scrollTop = e.target.scrollTop;

			const cardsSection = document.getElementById("sd-popupDetails_CardsSection");
			const statsSection = document.getElementById("sd-popupDetails_StatisticsSection");
			const timestampsSection = document.getElementById("sd-popupDetails_TimestampsSection");

			if (scrollTop < cardsSection.offsetTop) navbarHighlightChanger(navbarUl.children[0]);
			if (scrollTop >= cardsSection.offsetTop && scrollTop < statsSection.offsetTop) navbarHighlightChanger(navbarUl.children[1]);
			if (scrollTop >= statsSection.offsetTop && scrollTop < timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[2]);
			if (scrollTop >= timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[3]);
		});

		return navbar;
	}


	const dataLabel = (image, title) => {
		const wrapper = document.createElement("div");
		wrapper.classList.add("sd-detailsPopup_img-label");
		const icon = document.createElement("img");
		wrapper.appendChild(icon);
		icon.src = image;
		icon.style.setProperty("width", "22px", "important");
		const titleElem = document.createElement("strong");
		wrapper.appendChild(titleElem);
		titleElem.appendChild(document.createTextNode(title));
		titleElem.style.setProperty("font-size", "22px", "important");
		return wrapper;
	}

	const dataRow = (title, value) => {
		const wrapper = document.createElement("div");
		wrapper.style.setProperty("padding-left", "8px", "important");
		const titleElem = document.createElement("strong");
		wrapper.appendChild(titleElem);
		titleElem.appendChild(document.createTextNode(title+": "));
		const valueElem = document.createElement("span");
		wrapper.appendChild(valueElem);
		valueElem.appendChild(document.createTextNode(value));
		return wrapper;
	}

	const timestamps = (values, images, srsStage) => {
		const timestampsWrapper = document.createElement("div");
		timestampsWrapper.style.setProperty("margin-top", "10px", "important");
		for (const key in values) {
			const wrapper = document.createElement("div");
			timestampsWrapper.appendChild(wrapper);
			wrapper.style.setProperty("padding", "5px 0px", "important");
			wrapper.style.setProperty("maring-bottom", "5px", "important");

			const titleValue = key !== "data_updated_at" ? key.split("_")[0].charAt(0).toUpperCase()+key.split("_")[0].slice(1) : "Last Session";
			wrapper.appendChild(dataLabel(images[Object.keys(values).indexOf(key)], titleValue));
			
			const time = document.createElement("p");
			wrapper.appendChild(time);
			time.style.setProperty("padding", "5px 0px 2px 8px", "important");
			time.style.setProperty("color", "#c5c5c4", "important");
			if (!values[key])
				time.appendChild(document.createTextNode("No Data"));
			else {
				const timeValue = values[key].split(".")[0];
				time.appendChild(document.createTextNode(timeValue.replace("T", " / ")));
				const timePassedWrapper = document.createElement("p");
				wrapper.appendChild(timePassedWrapper);
				timePassedWrapper.style.setProperty("padding", "2px 0px 2px 8px", "important");
				timePassedWrapper.style.setProperty("font-weight", "bold", "important");
				const days = msToDays(new Date() - new Date(timeValue.split("T")[0])).toFixed(0);
				let timePassed;
				if (days === '0') timePassed = "Today";
				else if (days === '1') timePassed = "Yesterday";
				else if (parseInt(days) < 0) timePassed = "In "+(parseInt(days)*-1)+((parseInt(days)*-1) === 1 ? " day" : " days");
				else timePassed = days+" days ago";
				timePassedWrapper.appendChild(document.createTextNode(timePassed));

				if (key === "passed_at" && srsStage) {
					srsStage.classList.add("sd-detailsPopup_label-img");
					const passed = document.createElement("img");
					srsStage.appendChild(passed);
					passed.src = images[Object.keys(values).indexOf(key)];
					passed.style.setProperty("width", "13px", "important");
					srsStage.title = "Subject passed "+timePassed;
				}
			}
		}
		return timestampsWrapper;
	}

	const percentageColor = percentage => {
		let color;
		if (percentage < 25) color = "#ff0000";
		else if (percentage >= 25 && percentage < 50) color = "#ff8d00";
		else if (percentage >= 50 && percentage < 75) color = "#efff00";
		else color = "#00ff00";
		return color;
	}

	const quickRevStats = (titles, images) => {
		const quickStats = document.createElement("div");
		quickStats.classList.add("sd-popupDetails_quickStats");
		const quickStatsUl = document.createElement("ul");
		quickStats.appendChild(quickStatsUl);
		quickStatsUl.style.setProperty("display", "inline-flex", "important");
		titles.forEach((title, i) => {
			const quickStatsLi = document.createElement("li");
			quickStatsUl.appendChild(quickStatsLi);
			quickStatsLi.title = title;
			quickStatsLi.style.setProperty("margin-left", "5px", "important");
			quickStatsLi.classList.add("sd-detailsPopup_img-label");
			const img = document.createElement("img");
			quickStatsLi.appendChild(img);
			img.src = images[i];
			img.style.setProperty("width", "17px", "important");
			const valueElem = document.createElement("span");
			quickStatsLi.appendChild(valueElem);
		});
		return quickStats;
	}

	const revStats = (values, quickStatsUl) => {
		const stats = infoTable("Statistics", []);
		const statsWrapper = document.createElement("div");
		stats.appendChild(statsWrapper);
		statsWrapper.style.setProperty("margin-top", "10px", "important");
	
		const overallWrapper = document.createElement("div");
		overallWrapper.style.setProperty("margin-bottom", "10px", "important");
		statsWrapper.appendChild(overallWrapper);
		overallWrapper.appendChild(dataLabel("https://i.imgur.com/vsRTIFA.png", "Overall"));
		const overallCorrectValues = [values["percentage_correct"].toFixed(0)+"%", values["meaning_correct"]+values["meaning_incorrect"]+values["reading_correct"]+values["reading_incorrect"]];
		["Correct", "Frequency"].forEach((state, i) => {
			const data = dataRow(state, overallCorrectValues[i]);
			overallWrapper.appendChild(data);
			if (i === 0)
				data.getElementsByTagName("span")[0].style.setProperty("color", percentageColor(values["percentage_correct"]), "important")
		});
		const quickStatsOverall = quickStatsUl.getElementsByTagName("li")[0].getElementsByTagName("span")[0];
		quickStatsOverall.appendChild(document.createTextNode(values["percentage_correct"].toFixed(0)+"%"));
		quickStatsOverall.style.setProperty("color", percentageColor(values["percentage_correct"]), "important");

		const images = ["https://i.imgur.com/uY358Y7.png", "https://i.imgur.com/01iZdz6.png"];
		["Meaning", "Reading"].forEach((type, i) => {
			const wrapper = document.createElement("div");
			wrapper.style.setProperty("margin-bottom", "10px", "important");
			statsWrapper.appendChild(wrapper);
			wrapper.appendChild(dataLabel(images[i], type));

			type = type.toLowerCase();
			const valueCorrect = values[type+"_correct"];
			const valueIncorrect = values[type+"_incorrect"];
			const valueBoth = valueCorrect+valueIncorrect;
			const thisValues = [
				valueCorrect+" ("+((valueCorrect/valueBoth*100).toFixed(0))+"%)",
				valueIncorrect+" ("+((valueIncorrect/valueBoth*100).toFixed(0))+"%)",
				valueBoth, 
				values[type+"_current_streak"]+" ("+values[type+"_max_streak"]+")"
			];			
			["Correct", "Incorrect", "Frequency", "Streak (max)"].forEach((title, j) => {
				const row = dataRow(title, thisValues[j]);
				wrapper.appendChild(row);
				if (title === "Correct") {
					const percentage = valueCorrect/valueBoth*100;
					const stateValue = row.getElementsByTagName("span")[0];
					stateValue.style.setProperty("color", percentageColor(percentage), "important");

					const quickStatsVal = quickStatsUl.getElementsByTagName("li")[i+1].getElementsByTagName("span")[0];
					quickStatsVal.appendChild(document.createTextNode(percentage.toFixed(0)+"%"));
					quickStatsVal.style.setProperty("color", percentageColor(percentage), "important");
				}
			});
		});
		return stats;
	}

	window.SubjectDisplay = SubjectDisplay;
}());