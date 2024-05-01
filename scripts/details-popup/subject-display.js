(function () {
	// construtctor
	const SubjectDisplay = function(id, width, wrapper, fetch, otherIds, options) {
		this.fetch = fetch;
		this.id = id;
		this.width = width;
		this.wrapper = wrapper;
		this.otherIds = otherIds;

		this.fixed = false;
		this.locked = false;
		this.expanded = false;
		this.openedSubjects = [];

		if (options) {
			this.kanjiSource = options["kanjiSource"];
			this.strokes = options["strokes"];
			this.autoplayAudio = options["autoplayAudio"]; 
		}

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
				target.style.setProperty("filter", "unset", "important");
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
					const classes = ["sd-detailsPopup_cardSideBarAudio", "sd-detailsPopup_cardSideBarInfo", "sd-detailsPopup_cardSideBarCopy"];
					const icons = ["https://i.imgur.com/wjbObC4.png", "https://i.imgur.com/z5eKtlN.png", "https://i.imgur.com/kVFZ6bP.png"];
					if (type == "kanji") {
						classes.shift();
						icons.shift();
					}
					for (const [i, src] of icons.entries()) {
						const li = document.createElement("li");
						ul.appendChild(li);
						li.classList.add("sd-detailsPopup_clickable" ,classes[i]);
						const img = document.createElement("img");
						li.appendChild(img);
						li.title = "Subject "+classes[i].split("sd-detailsPopup_cardSideBar")[1];
						img.classList.add("sd-detailsPopup_cardSideBar_icon");
						img.src = src;
					}

					const list = this.other[id];
					if (list) {
						const srsId = list["srs_stage"] < 0 || list["srs_stage"] > 9 ? null : list["srs_stage"];
						if (srsId != null) {
							const srsLi = document.createElement("li");
							ul.appendChild(srsLi);
							srsLi.style.setProperty("font-weight", "900", "important");
							srsLi.title = "SRS Stage";
							srsLi.appendChild(document.createTextNode(srsStages[srsId]["short"]));
							srsLi.style.setProperty("color", `var(--${srsStages[srsId]["short"].toLowerCase()}-color)`);
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

		document.addEventListener("click", async e => {
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
				playSubjectAudio(this.other[getItemIdFromSideBar(node.parentElement.parentElement.parentElement)]["pronunciation_audios"], node);
				node.firstChild.src = "https://i.imgur.com/ETwuWqJ.png";
				setTimeout(() => node.firstChild.src = "https://i.imgur.com/wjbObC4.png", 1500);
			}
	
			// clicked on sidebar info
			if (node.classList.contains("sd-detailsPopup_cardSideBarInfo")) {
				const target = node.parentElement.parentElement.parentElement;
				const id = getItemIdFromSideBar(target);
				if (id) {
					const subject = this.other[id];
					this.update(subject, await this.fetch(this.otherIds(subject)), true);
				}
			}

			// clicked on sidebar copy
			if (node.classList.contains("sd-detailsPopup_cardSideBarCopy")) {
				const id = getItemIdFromSideBar(node.parentElement.parentElement.parentElement);
				if (window.navigator.clipboard && id) {
					const item = this.other[id];
					window.navigator.clipboard.writeText(item["characters"]).
						then(() => {
							node.firstChild.src = "https://i.imgur.com/eL3HiGE.png";
							setTimeout(() => node.firstChild.src = "https://i.imgur.com/kVFZ6bP.png", 1500);
						});
				}
			}

			// clicked a button in kanji container
			if (node.classList.contains("sd-detailsPopupButton")) {
				// don't switchClass in the nodes inside the array
				if (!["sd-detailsPopupCloseX", "sd-detailsPopupGoBack", "sd-detailsPopupGoUp", "sd-detailsPopupCopy"].includes(node.id)) {
					if (node.classList.contains("sd-detailsPopup_faded"))
						node.classList.remove("sd-detailsPopup_faded");
					else
						node.classList.add("sd-detailsPopup_faded");
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
					chrome.storage.local.get(["settings"], result => {
						const settings = result["settings"];
						if (settings) {
							settings["kanji_details_popup"]["key_bindings"] = !settings["kanji_details_popup"]["key_bindings"];
							chrome.storage.local.set({"settings":settings});
						}
					});
				}

				if (node.id == "sd-detailsPopupGoBack") {
					if (this.openedSubjects.length > 0)
						this.openedSubjects.pop();

					const kanji = this.openedSubjects[this.openedSubjects.length-1];
					if (kanji) {
						const id = kanji["id"];
						const subject = this.other[id];
						this.update(subject, await this.fetch(this.otherIds(subject)), true);
					}
				}
				
				if (node.id == "sd-detailsPopupCopy") {
					if (window.navigator.clipboard && this.subject) {
						window.navigator.clipboard.writeText(this.subject["characters"]).
							then(() => {
								Array.from(document.getElementsByClassName("sd-copiedMessage")).forEach(elem => elem.remove());
								const copiedMessage = document.createElement("div");
								node.appendChild(copiedMessage);
								copiedMessage.appendChild(document.createTextNode("Copied!"));
								copiedMessage.classList.add("sd-copiedMessage");
								setTimeout(() => copiedMessage.remove(), 1500);
							});
					}
				}
					
			}
			
			// if clicking on navbar li
			if (node.closest(".sd-popupDetails_navbar") && node.tagName === "LI") {
				node.querySelector("div").click();
			}
		});
	}

	SubjectDisplay.prototype = {

		// create popup
		create: async function(expanded=false, fetchData=true) {
			if (fetchData) {
				const subjectData = await this.fetch(this.id);
				this.subject = subjectData[this.id];
				console.log(this.subject);
				this.other = await this.fetch(this.otherIds(this.subject));
				this.type = this.subject["subject_type"];
			}

			Array.from(document.getElementsByClassName("sd-detailsPopup")).forEach(elem => elem.remove());

			this.detailsPopup = document.createElement("div");
			this.wrapper.appendChild(this.detailsPopup);

			this.detailsPopup.className = "sd-rightOverFlowPopup sd-detailsPopup";
			this.detailsPopup.style.setProperty("transition", "0.3s", "important");
			setTimeout(() => {
				this.detailsPopup.classList.remove("sd-rightOverFlowPopup");
				setTimeout(() => this.detailsPopup.style.removeProperty("transition"), 300);
			}, 20);
			
			if (expanded)
				this.expand();

			this.update(this.subject, this.other, true);
		},

		// update popup
		update: async function (subject, other, save) {
			if (subject && other) {
				this.subject = subject;
				this.other = other;
				this.type = subject["subject_type"];

				if (!this.detailsPopup) await this.create(null, false);

				if (this.autoplayAudio && this.type === "vocabulary")
					playSubjectAudio(this.subject["pronunciation_audios"], null);

				if (this.detailsPopup.firstChild)
					this.detailsPopup.firstChild.remove();
				this.detailsPopup.appendChild(this.charContainer(subject, save));

				// srs stage border
				if (subject["hidden_at"])
					this.detailsPopup.style.setProperty("border-top", "4px solid yellow", "important");	
				else {
					const srsId = subject["srs_stage"] < 0 || subject["srs_stage"] > 9 ? null : subject["srs_stage"];
					this.detailsPopup.style.setProperty("border-top", "4px solid "+(srsId != null ? `var(--${srsStages[srsId]["short"].toLowerCase()}-color)` : "white"), "important");	
				}
				
				const detailedInfoWrapper = this.detailsPopup.getElementsByClassName("sd-popupDetails_detailedInfoWrapper");
				if (detailedInfoWrapper)
					Array.from(detailedInfoWrapper).forEach(wrapper => wrapper.remove());
				
				if (this.expanded) {
					this.detailsPopup.appendChild(this.type === "kanji" ? this.kanjiDetailedInfo(subject) : this.vocabDetailedInfo(subject));

					// show kanji container buttons
					const buttons = Array.from(this.detailsPopup.getElementsByClassName("sd-detailsPopupButton"));
					if (buttons)
						buttons.forEach(button => button.classList.remove("sd-detailsPopup_hidden"));
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
			this.detailsPopup.style.removeProperty("width");
			setTimeout(() => {
				if (itemWrapper) {
					itemWrapper.classList.add("sd-focusPopup_kanji");
					// itemWrapper.style.setProperty("width", this.width+"px");
				}
				this.detailsPopup.style.setProperty("overflow", "hidden auto", "important");
				this.detailsPopup.style.setProperty("max-height", window.innerHeight+"px", "important");
			}, 200);

			if (itemWrapper) {
				const type = itemWrapper.getElementsByClassName("sd-detailsPopup_kanji")[0].getAttribute('data-item-type');
				this.detailsPopup.appendChild(type == "kanji" ? this.kanjiDetailedInfo(this.subject) : this.vocabDetailedInfo(this.subject));
			
				// show kanji container buttons
				const buttons = Array.from(document.getElementsByClassName("sd-detailsPopupButton"));
				if (buttons)
					buttons.forEach(button => button.classList.remove("sd-detailsPopup_hidden"));
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
			
			// if (kanjiInfo["hidden_at"])
			// 	detailedInfoWrapper.parentElement.style.filter = "contrast(5)";

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
			details.classList.add("sd-popupDetails_details");
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
			if (kanjiInfo["hidden_at"]) {
				srsStageText.appendChild(document.createTextNode("Legacy"));
				srsStageText.style.setProperty("color", "yellow", "important");
				srsStageText.title = "This subject no longer shows up in lessons or reviews, since "+kanjiInfo["hidden_at"].split("T")[0]+".";
			}
			else if (srsStageId >= 0 && srsStageId <= 9) {
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

			// strokes container
			if (this.strokes)
				details.appendChild(this.kanjiDrawing(kanjiInfo["characters"]));

			if (kanjiInfo["jlpt"] && kanjiInfo["joyo"]) {
				const schoolLevel = document.createElement("div");
				details.appendChild(schoolLevel);
				schoolLevel.appendChild(document.createTextNode(kanjiInfo["joyo"]+", "+kanjiInfo["jlpt"]));
				schoolLevel.title = "Joyo, JLPT";
				schoolLevel.style.setProperty("color", "#b8b8b8", "important");
			}

			// meaning mnemonic container
			details.appendChild(infoTable("Meaning Mnemonic", [kanjiInfo["meaning_mnemonic"], kanjiInfo["meaning_hint"]]));
		
			// reading mnemonic container
			details.appendChild(infoTable("Reading Mnemonic", [kanjiInfo["reading_mnemonic"], kanjiInfo["reading_hint"]]));
			
			const cardsSection = document.createElement("div");
			details.appendChild(cardsSection);
			cardsSection.id = "sd-popupDetails_CardsSection";
			cardsSection.classList.add("sd-popupDetails_anchor");
			
			// used radicals cards
			details.appendChild(itemCardsSection(kanjiInfo, "component_subject_ids", "Used Radicals", "sd-detailsPopup_radicals_row", this.other));
		
			// similar kanji cards
			details.appendChild(itemCardsSection(kanjiInfo, "visually_similar_subject_ids", "Similar Kanji", "sd-detailsPopup_kanji_row", this.other));
		
			// vocabulary with that kanji
			details.appendChild(itemCardsSection(kanjiInfo, "amalgamation_subject_ids", "Vocabulary", "sd-detailsPopup_vocab_row", this.other));
		
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
				timestampsWrapper.appendChild(timestamps(kanjiInfo["hidden_at"] ? {...kanjiInfo["timestamps"], ...{"legacy":kanjiInfo["hidden_at"]}} : kanjiInfo["timestamps"], kanjiInfo["hidden_at"] ? [...images, ...["https://i.imgur.com/YQVUCpW.png"]] : images, srsStage));
			}

			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		vocabDetailedInfo: function (vocabInfo) {
			// detailed info section
			const detailedInfoWrapper = document.createElement("div");
			detailedInfoWrapper.classList.add("sd-popupDetails_detailedInfoWrapper");

			// if (vocabInfo["hidden_at"])
			// 	detailedInfoWrapper.parentElement.style.filter = "contrast(5)";
			
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

			const sections = [["Info", "https://i.imgur.com/E6Hrw7w.png"]];
			if (vocabInfo["subject_type"] == "vocabulary") sections.push(["Cards", "https://i.imgur.com/r991llA.png"]);
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
			details.style.setProperty("position", "relative", "important");
			details.classList.add("sd-popupDetails_details");
			detailedInfoWrapper.appendChild(details);

			const audioButtonWrapper = document.createElement("div");
			details.appendChild(audioButtonWrapper);
			audioButtonWrapper.style.setProperty("position", "absolute", "important");
			audioButtonWrapper.style.setProperty("top", "45px", "important");
			audioButtonWrapper.style.setProperty("right", "10px", "important");
			audioButtonWrapper.style.setProperty("filter", "invert(1)", "important");
			audioButtonWrapper.classList.add("sd-detailsPopup_clickable")
			audioButtonWrapper.title = "Subject Audio";
			const audioButton = document.createElement("img");
			audioButtonWrapper.appendChild(audioButton);
			audioButton.src = "https://i.imgur.com/ETwuWqJ.png";
			audioButton.style.setProperty("width", "18px", "important");

			audioButton.addEventListener("click", () => playSubjectAudio(this.subject["pronunciation_audios"], audioButtonWrapper));

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
			if (vocabInfo["hidden_at"]) {
				srsStageText.appendChild(document.createTextNode("Legacy"));
				srsStageText.style.setProperty("color", "yellow", "important");
				srsStageText.title = "This subject no longer shows up in lessons or reviews, since "+vocabInfo["hidden_at"].split("T")[0]+".";

				srsStage.classList.add("sd-detailsPopup_label-img");
				const passed = document.createElement("img");
				srsStage.appendChild(passed);
				passed.src = "https://i.imgur.com/YQVUCpW.png";
				passed.style.setProperty("width", "13px", "important");
				srsStage.title = "This subject no longer shows up in lessons or reviews, since "+vocabInfo["hidden_at"].split("T")[0]+".";
			}
			else if (srsStageId >= 0 && srsStageId <= 9) {
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

			// strokes container
			if (this.strokes)
				details.appendChild(this.kanjiDrawing(vocabInfo["characters"]));
			
			if (vocabInfo["parts_of_speech"]) {
				const partOfSpeech = document.createElement("div");
				details.appendChild(partOfSpeech);
				partOfSpeech.appendChild(document.createTextNode(vocabInfo["parts_of_speech"][0].charAt(0).toUpperCase()+vocabInfo["parts_of_speech"].join(", ").slice(1)));
				partOfSpeech.style.setProperty("color", "#b8b8b8", "important");
			}
			
			if (vocabInfo["meaning_mnemonic"]) {
				// meaning mnemonic container
				details.appendChild(infoTable("Meaning Mnemonic", [vocabInfo["meaning_mnemonic"]]));
	
				if (vocabInfo["subject_type"] == "vocabulary") {
					// reading mnemonic container
					details.appendChild(infoTable("Reading Mnemonic", [vocabInfo["reading_mnemonic"]]));
		
					const cardsSection = document.createElement("div");
					details.appendChild(cardsSection);
					cardsSection.id = "sd-popupDetails_CardsSection";
					cardsSection.classList.add("sd-popupDetails_anchor");
		
					// used kanji
					details.appendChild(itemCardsSection(vocabInfo, "component_subject_ids", "Used Kanji", "sd-detailsPopup_kanji_row", this.other));
				}
			}

			// sentences
			if (vocabInfo["context_sentences"]) {
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
			}

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
				timestampsWrapper.appendChild(timestamps(vocabInfo["hidden_at"] ? {...vocabInfo["timestamps"], ...{"legacy":vocabInfo["hidden_at"]}} : vocabInfo["timestamps"], vocabInfo["hidden_at"] ? [...images, ...["https://i.imgur.com/YQVUCpW.png"]] : images, srsStage));
			}

			this.detailsPopup.scrollTo(0, 0);
			return detailedInfoWrapper;
		},

		charContainer: function (subject, save) {
			const id = subject["id"];
			const characters = subject["characters"];
			const itemWrapper = document.createElement("div");
			if (this.expanded) {
				itemWrapper.classList.add("sd-focusPopup_kanji");
				// itemWrapper.style.setProperty("width", this.width+"px");
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
				kanjiTitle.appendChild(document.createTextNode(subject["meanings"][0]));
				kanjiTitle.classList.add("sd-smallDetailsPopupKanjiTitle");

				if (characters.length >= 3)
					this.detailsPopup.style.setProperty("width", this.width+"px");
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
				{id:"sd-detailsPopupFix", alt: "Subject fix (F)", active:this.fixed, src:"https://i.imgur.com/vZqwGZr.png"},
				{id:"sd-detailsPopupCopy", alt: "Copy to Clipboard", active: true, src:"https://i.imgur.com/eL3HiGE.png"}
			];

			for (let i in buttons) {
				const button = buttons[i];

				// don't add go back button if there are no kanji to go back to
				//if (button["id"] == "sd-detailsPopupGoBack" && this.openedSubjects.length == 1)
				//	continue;

				const wrapper = document.createElement("div");
				itemWrapper.appendChild(wrapper);
				wrapper.id = button["id"];
				wrapper.classList.add("sd-detailsPopupButton", "sd-detailsPopup_clickable", "sd-detailsPopup_hidden");
				// add class faded to those buttons only
				if (!button["active"])
					wrapper.classList.add("sd-detailsPopup_faded");
				const img = document.createElement("img");
				img.src = button["src"];
				img.alt = button["alt"];
				wrapper.title = img.alt;
				wrapper.appendChild(img);
			}

			chrome.storage.local.get(["settings"], result => {
				const settings = result["settings"];
				const keyBindingsButton = document.getElementById("sd-detailsPopupKeyBindings");
				if (settings && keyBindingsButton) {
					const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];
					if (keyBindingsActive)
						keyBindingsButton.classList.remove("sd-detailsPopup_faded");
					else
						keyBindingsButton.classList.add("sd-detailsPopup_faded");
				}
			});

			const infoToSave = {"id":id, "char":characters, "type":this.type};
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
			charsWrapper.setAttribute('data-item-type', this.type);
			charsWrapper.setAttribute('data-item-id', id);
			charsWrapper.title = characters+" in WaniKani";
			if (characters.length > 4) 
				charsWrapper.style.setProperty("font-size", (48-6*(characters.length - 5))+"px", "important");
		
			charsWrapper.classList.add("sd-detailsPopup_kanji");
		
			link.href = subject["document_url"];
		
			const ul = document.createElement("ul");
			ul.classList.add("sd-popupDetails_readings");
					
			const readings = subject["readings"];
			if (readings) {
				if (this.type == "kanji") {
					([["ON", "onyomi"], ["KUN", "kunyomi"]]).forEach(type => {
						const li = document.createElement("li");
						li.innerHTML = `<strong>${type[0]}: </strong>`;
						li.classList.add("sd-popupDetails_readings_row");
						const span = document.createElement("span");
						const readingsString = readings.filter(reading => reading.type===type[1]).map(reading => reading.reading).join(", ");
						span.appendChild(document.createTextNode(readingsString));
						if (readingsString === '') li.classList.add("sd-detailsPopup_faded");
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
			}
			kanjiContainerWrapper.appendChild(ul);
		
			return itemWrapper;
		},
		kanjiDrawing: function (kanji) {
			const strokes = document.createElement("div");
			strokes.classList.add("sd-popupDetails_strokes");
			
			const drawingWrapper = document.createElement("div");
			strokes.appendChild(drawingWrapper);
			drawingWrapper.id = "sd-popupDetails_dmak";
			drawingWrapper.innerHTML = /*html*/`
				<div class="sd-popupDetails_svgLoading">Loading Kanji Strokes animation...</div>
			`;

			this.drawStrokes(kanji, drawingWrapper.id);	
	
			// buttons
			const drawButtons = /*html*/`
				<div class="sd-popupDetails_drawButtons">
					<div title="Previous Stroke" class="sd-detailsPopup_clickable" data-action="prevStroke">
						<img src="https://i.imgur.com/HgyjeFO.png" alt="Previous Stroke" style="rotate: -90deg;">
					</div>
					<div title="Pause Drawing" class="sd-detailsPopup_clickable" data-action="pause">
						<img src="https://i.imgur.com/sbYbflm.png" alt="Pause Drawing">
					</div>
					<div title="Resume Drawing" class="sd-detailsPopup_clickable" data-action="resume">
						<img src="https://i.imgur.com/fBG0tV9.png" alt="Resume Drawing">
					</div>
					<div title="Next Stroke" class="sd-detailsPopup_clickable" data-action="nextStroke">
						<img src="https://i.imgur.com/HgyjeFO.png" alt="Next Stroke" style="rotate: 90deg;">
					</div>
					<div title="Reload Strokes" class="sd-detailsPopup_clickable" data-action="reload" style="margin-left: 20px;">
						<img src="https://i.imgur.com/EPJM6mf.png" alt="Reload">
					</div>
					<div title="Clear All Strokes" class="sd-detailsPopup_clickable" data-action="clear">
						<img src="https://i.imgur.com/wvMgsN5.png" alt="Clear">
					</div>
					<a href="https://mbilbille.github.io/dmak/" target="_blank" class="sd-detailsPopup_clickable" style="margin-left: 20px; filter: unset;" title="https://mbilbille.github.io/dmak/">
						<img src="https://i.imgur.com/DFljelz.png" alt="dmak" style="width: 25px;">
					</a>
					<a href="https://kanjivg.tagaini.net/" target="_blank" class="sd-detailsPopup_clickable" style="filter: unset; color: white;" title="https://kanjivg.tagaini.net/">
						<div>KanjiVG</div>
					</a>
				</div>
			`;
			strokes.insertAdjacentHTML("beforeend", drawButtons);
	
			return strokes;
		},
		drawStrokes: function (characters, element, size) {
			// calculate size depending on number of characters
			if (!size)
				size = 130 - (10 * characters.length);

			this.dmak = new Dmak(characters, {
				'element': element,
				'uri': this.kanjiSource,
				'width': size,
				'height': size,
				'step': 0.005,
				'stroke': {
					'attr': {
						'active': getComputedStyle(document.documentElement).getPropertyValue('--wanikani'),
						'stroke': '#fff',
					},
					'order': {
						'visible': true,
						'attr': {
							'font-size': 10,
							'fill': getComputedStyle(document.documentElement).getPropertyValue('--wanikani-sec'),
						}
					}
				},
				'loaded': () => {
					this.detailsPopup.querySelector(".sd-popupDetails_svgLoading")?.remove();

					const papers = this.dmak.papers;
					if (papers) {
						const currentCharacters = document.querySelector(".sd-detailsPopup_kanji").innerText;
						if (characters == currentCharacters) {
							const currentCanvases = papers.map(paper => paper.canvas);

							// iterate all svgs and remove the ones that are not in currentCanvases
							const svgs = document.querySelectorAll("#sd-popupDetails_dmak svg");
							svgs.forEach(svg => {
								if (!currentCanvases.includes(svg))
									svg.remove();
							});
						}
						
						papers.forEach((paper, i) => {
							const canvas = paper.canvas;
							const nStrokes = this.dmak.strokes.filter(stroke => stroke.char == i).length;
							const title = `Kanji ${this.dmak.text.charAt(i)} has ${nStrokes} strokes`;
							const titleWrapper = /*html*/`<title>${title}</title>`;
							canvas.insertAdjacentHTML("afterbegin", titleWrapper);
						});
					}
				}
			});

			console.log(this.dmak);

			document.addEventListener("click", e => {
				if (e.target.closest(".sd-popupDetails_strokes div[data-action='reload']")) {
					this.dmak.pause();
					this.dmak.erase();
					setTimeout(() => this.dmak.render(), 500);
				}
				else if (e.target.closest(".sd-popupDetails_strokes div[data-action='prevStroke']")) {
					this.dmak.pause();
					this.dmak.eraseLastStrokes(1);
				}
				else if (e.target.closest(".sd-popupDetails_strokes div[data-action='nextStroke']")) {
					this.dmak.pause();
					this.dmak.renderNextStrokes(1);
				}
				else if (e.target.closest(".sd-popupDetails_strokes div[data-action='clear']")) {
					this.dmak.pause();
					this.dmak.erase();
				}
				else if (e.target.closest(".sd-popupDetails_strokes div[data-action='resume']")) {
					this.dmak.render();
				}
				else if (e.target.closest(".sd-popupDetails_strokes div[data-action='pause']")) {
					this.dmak.pause();
				}
			});

		}
	}

	// Auxiliar methods

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
		console.log(ids, data);
		if (ids && data) {
			let info = ids.map(id => data[id]);
			if (info.length > 1)
				wrapper.classList.add("sd-justify-list");

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
					const imageUrl = thisData["character_images"]?.find(image => image["content_type"] == "image/svg+xml")["url"];
					const characters = `<svg style="width: 40px; height: 40px;">       
							<image xlink:href="${imageUrl}" src="${imageUrl}" width="40" height="40"></image>    
						</svg>`;
					const img = document.createElement("div");
					img.innerHTML = characters;
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

		li.style.setProperty("border-top", "4px solid " + (srsId >=0 && srsId <= 9 ? `var(--${srsStages[srsId]["short"].toLowerCase()}-color)` : "white"), "important");

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
			navbarLi.title = info[0]+` (${info[0].charAt(0)})`;
			navbarLi.classList.add("sd-detailsPopup_clickable");
			const link = document.createElement("div");
			navbarLi.appendChild(link);
			link.addEventListener("click", () => document.querySelector(".sd-detailsPopup").scrollTo(0, document.getElementById(`sd-popupDetails_${info[0]}Section`).offsetTop));
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

			if (cardsSection && scrollTop < cardsSection.offsetTop) navbarHighlightChanger(navbarUl.children[0]);
			if (cardsSection && statsSection && scrollTop >= cardsSection.offsetTop && scrollTop < statsSection.offsetTop) navbarHighlightChanger(navbarUl.children[1]);
			if (statsSection && timestampsSection && scrollTop >= statsSection.offsetTop && scrollTop < timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[2]);
			if (timestampsSection && scrollTop >= timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[3]);
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
				time.appendChild(document.createTextNode(timeValue.replace("T", "  ")));
				const timePassedWrapper = document.createElement("p");
				wrapper.appendChild(timePassedWrapper);
				timePassedWrapper.style.setProperty("padding", "2px 0px 2px 8px", "important");
				timePassedWrapper.style.setProperty("font-weight", "bold", "important");
				const days = Number(msToDays(new Date() - new Date(values[key])).toFixed(0));
				let timePassed;
				if (days == 0) timePassed = "Today";
				else if (days === 1) timePassed = "Yesterday";
				else if (days === -1) timePassed = "Tomorrow";
				else if (days < 0) timePassed = "In "+(days*-1)+((days*-1) === 1 ? " day" : " days");
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
			const correctPercentage = (valueCorrect/(valueCorrect+valueIncorrect)*100).toFixed(0);
			const incorrectPercentage = (valueIncorrect/(valueCorrect+valueIncorrect)*100).toFixed(0);
			const valueBoth = valueCorrect+valueIncorrect;
			const thisValues = [
				valueCorrect+" ("+(correctPercentage == "NaN" ? "-" : correctPercentage)+"%)",
				valueIncorrect+" ("+(incorrectPercentage == "NaN" ? "-" : incorrectPercentage)+"%)",
				valueBoth, 
				values[type+"_current_streak"]+" ("+values[type+"_max_streak"]+")"
			];			
			["Correct", "Incorrect", "Frequency", "Streak (max)"].forEach((title, j) => {
				const row = dataRow(title, thisValues[j]);
				wrapper.appendChild(row);
				if (title === "Correct") {
					const percentage = (valueCorrect/valueBoth*100).toFixed(0);
					const stateValue = row.getElementsByTagName("span")[0];
					stateValue.style.setProperty("color", percentageColor(percentage), "important");

					const quickStatsVal = quickStatsUl.getElementsByTagName("li")[i+1].getElementsByTagName("span")[0];
					quickStatsVal.appendChild(document.createTextNode((percentage == "NaN" ? "-" : percentage)+"%"));
					quickStatsVal.style.setProperty("color", percentageColor(percentage), "important");
				}
			});
		});
		return stats;
	}

	window.SubjectDisplay = SubjectDisplay;
}());
