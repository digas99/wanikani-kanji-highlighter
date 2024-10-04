(function () {
	// construtctor
	const SubjectDisplay = function(id, width, wrapper, fetch, otherIds, options) {
		console.log("SubjectDisplay constructor");
		console.log(id, width, wrapper, fetch, otherIds, options);
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

		this.wrapper.addEventListener("mouseover", e => {
			const node = e.target;

			// if hovering over the details popup or any of it's children (expand small popup)
			if (!this.expanded && this.detailsPopup && node.closest(".sd-detailsPopup"))
				this.expand();

			// if hovering over a kanji card
			if (node.closest(".sd-detailsPopup_cardRow") && !node.closest(".sd-detailsPopup_cardSideBar")) {
				this.wrapper.querySelectorAll(".sd-itemLevelCard").forEach(levelCard => levelCard.style.setProperty("display", "inline", "important"));
				this.wrapper.querySelectorAll(".sd-detailsPopup_cardRow").forEach(card => card.style.setProperty("filter", "brightness(0.5)", "important"));
				this.wrapper.querySelectorAll(".sd-detailsPopup_cardSideBar").forEach(node => node.remove());
				const target = node.closest(".sd-detailsPopup_cardRow");
				if (target) {
					target.style.setProperty("filter", "unset", "important");
					const type = target.dataset.type;
					let id = "";
					Array.from(target.children).forEach(child => {
						if (child.tagName == "A")
							id = child.children[0].getAttribute("data-item-id");
			
						if (child.classList.contains("sd-itemLevelCard"))
							child.style.setProperty("display", "none", "important")
					});
			
					if (target.children.length <= 4) {
						const sideBar = document.createElement("div");
						target.appendChild(sideBar);
						sideBar.classList.add("sd-detailsPopup_cardSideBar");
						const ul = document.createElement("ul");
						sideBar.appendChild(ul);
						const classes = ["sd-detailsPopup_cardSideBarAudio", "sd-detailsPopup_cardSideBarInfo", "sd-detailsPopup_cardSideBarCopy"];
						const icons = ["https://i.imgur.com/wjbObC4.png", "https://i.imgur.com/z5eKtlN.png", "https://i.imgur.com/kVFZ6bP.png"];
						if (!type.includes("vocab")) {
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
			}
			
			// if hovering outside kanji card wrapper
			if (!node.closest(".sd-detailsPopup_cardRow") && !node.closest(".sd-detailsPopup_cardSideBar")) {
				this.wrapper.querySelectorAll(".sd-itemLevelCard").forEach(levelCard => levelCard.style.removeProperty("display"));
				this.wrapper.querySelectorAll(".sd-detailsPopup_cardRow").forEach(card => card.style.removeProperty("filter"));
				this.wrapper.querySelectorAll(".sd-detailsPopup_cardSideBar").forEach(node => node.remove());
			}
		});

		this.wrapper.addEventListener("click", async e => {
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
			
			// clicked on card sidebar audio
			if (node.classList.contains("sd-detailsPopup_cardSideBarAudio")) {
				playSubjectAudio(this.other[getItemIdFromSideBar(node.parentElement.parentElement.parentElement)]["pronunciation_audios"], node);
				node.firstChild.src = "https://i.imgur.com/ETwuWqJ.png";
				setTimeout(() => node.firstChild.src = "https://i.imgur.com/wjbObC4.png", 1500);
			}
	
			// clicked on card sidebar info
			if (node.classList.contains("sd-detailsPopup_cardSideBarInfo")) {
				const target = node.parentElement.parentElement.parentElement;
				const id = getItemIdFromSideBar(target);
				if (id) {
					const subject = this.other[id];
					this.update(subject, await this.fetch(this.otherIds(subject)), true);
				}
			}

			// clicked on card sidebar copy
			if (node.classList.contains("sd-detailsPopup_cardSideBarCopy")) {
				const id = getItemIdFromSideBar(node.parentElement.parentElement.parentElement);
				
				await this.copyCharacters(id);
				node.firstChild.src = "https://i.imgur.com/eL3HiGE.png";
				setTimeout(() => node.firstChild.src = "https://i.imgur.com/kVFZ6bP.png", 1500);
			}


			// menu button
			if (node.closest("#sd-detailsPopupMenu")) {
				const sidebar = this.sidebar || this.detailsPopup.querySelector(".sd-detailsPopup_sidebar");
				if (sidebar) {
					if (sidebar.classList.contains("sd-detailsPopup_sidebar_hidden"))
						sidebar.classList.remove("sd-detailsPopup_sidebar_hidden");
					else
						sidebar.classList.add("sd-detailsPopup_sidebar_hidden");
				}
			}

			console.log(node);
			// sidebar buttons
			if (node.closest("#sd-detailsPopupFix"))
				this.fixed = !this.fixed;
		
			if (node.closest("#sd-detailsPopupSubjectLock"))
				this.locked = !this.locked;

			if (node.closest("#sd-detailsPopupGoUp")) {
				if (this.detailsPopup) {
					this.detailedInfoWrapper.scrollTo(0, 0);
				}
			}
				
			if (node.closest("#sd-detailsPopupCopy")) {
				await this.copyCharacters();

				Array.from(document.getElementsByClassName("sd-copiedMessage")).forEach(elem => elem.remove());
				const copiedMessage = document.createElement("div");
				node.appendChild(copiedMessage);
				copiedMessage.appendChild(document.createTextNode("Copied!"));
				copiedMessage.classList.add("sd-copiedMessage");
				setTimeout(() => copiedMessage.remove(), 1500);
			}

			if (node.closest("#sd-detailsPopupKeyBindings")) {
				chrome.storage.local.get(["settings"], result => {
					const settings = result["settings"];
					if (settings) {
						settings["kanji_details_popup"]["key_bindings"] = !settings["kanji_details_popup"]["key_bindings"];
						chrome.storage.local.set({"settings":settings});
					}
				});
			}

			// sidebar buttons selection
			if (node.closest(".sd-detailsPopup_sidebar .sd-detailsPopup_clickable")) {
				const button = node.closest(".sd-detailsPopup_sidebar .sd-detailsPopup_clickable");
				const id = button.id;
				if (!["sd-detailsPopupCopy"].includes(id)) {
					const selected = button.classList.contains("sd-detailsPopup_sidebar_selected");
					if (selected)
						button.classList.remove("sd-detailsPopup_sidebar_selected");
					else
						button.classList.add("sd-detailsPopup_sidebar_selected");
				}
			}

			// clicked a button in kanji container
			if (node.classList.contains("sd-detailsPopupButton")) {
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
			}
			
			// navbar buttons
			if (node.closest(".sd-popupDetails_navbar li")) {
				const li = node.closest(".sd-popupDetails_navbar li");
				const value = li.title.split(" ")[0];
				if (value) {
					const section = this.detailsPopup.querySelector(`#sd-popupDetails_${value}Section`);
					if (section)
						this.detailedInfoWrapper.scrollTo(0, section.offsetTop);
				}
			}

			// dmak clicks
			const target = e.target;
			if (target.closest(".sd-popupDetails_strokes div[data-action='reload']")) {
				this.dmak.pause();
				this.dmak.erase();
				setTimeout(() => this.dmak.render(), 1000);
			}
			else if (target.closest(".sd-popupDetails_strokes div[data-action='prevStroke']")) {
				this.dmak.pause();
				this.dmak.eraseLastStrokes(1);
			}
			else if (target.closest(".sd-popupDetails_strokes div[data-action='nextStroke']")) {
				this.dmak.pause();
				this.dmak.renderNextStrokes(1);
			}
			else if (target.closest(".sd-popupDetails_strokes div[data-action='clear']")) {
				this.dmak.pause();
				this.dmak.erase();
			}
			else if (target.closest(".sd-popupDetails_strokes div[data-action='resume']")) {
				this.dmak.render();
			}
			else if (target.closest(".sd-popupDetails_strokes div[data-action='pause']")) {
				this.dmak.pause();
			}

			if (target.closest("#sd-popupDetails_dmak") || target.closest("#sd-detailsPopup_dmakExpandedClose")) {
				console.log("click");
				const wrapper = target.closest(".sd-popupDetails_strokes");
				if (wrapper.classList.contains("sd-detailsPopup_dmakExpanded")) {
					const kanjTitle = this.wrapper.querySelector(".sd-popupDetails_kanjiTitle");
					if (kanjTitle)
						kanjTitle.parentElement.insertBefore(wrapper, kanjTitle.nextSibling);
					wrapper.classList.remove("sd-detailsPopup_dmakExpanded");
				}
				else {
					this.wrapper.appendChild(wrapper);
					wrapper.classList.add("sd-detailsPopup_dmakExpanded");
				}
			}
		});
	}

	SubjectDisplay.prototype = {

		// create popup
		create: async function(expanded=false, fetchData=true) {
			if (fetchData) {
				const subjectData = await this.fetch(this.id);
				console.log(subjectData);
				this.subject = subjectData[this.id];
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
				console.log(subject, other, this.type);

				if (!this.detailsPopup) await this.create(null, false);

				// clear hanging dmak expanded
				const dmakExpanded = document.querySelectorAll(".sd-detailsPopup_dmakExpanded");
				if (dmakExpanded)
					dmakExpanded.forEach(elem => elem.remove());

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
				
				this.detailedInfoWrapper = this.detailsPopup.getElementsByClassName("sd-popupDetails_detailedInfoWrapper");
				if (this.detailedInfoWrapper)
					Array.from(this.detailedInfoWrapper).forEach(wrapper => wrapper.remove());
				
				if (this.expanded) {
					const detailsInfo = this.detailsInfoContainer(this.subject);
					if (detailsInfo)
						this.detailsPopup.appendChild(detailsInfo);

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
			const tempKanjiTitle = this.detailsPopup.querySelector(".sd-smallDetailsPopupKanjiTitle");
			if (tempKanjiTitle)
				tempKanjiTitle.remove();

			// remove ... from readings
			const readingsRow = Array.from(this.detailsPopup.querySelectorAll(".sd-popupDetails_readings_row"));
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
				// this.detailsPopup.style.setProperty("overflow", "hidden auto", "important");
				this.detailsPopup.style.setProperty("max-height", window.innerHeight+"px", "important");
			}, 200);

			if (itemWrapper) {
				const detailsInfo = this.detailsInfoContainer(this.subject);
				if (detailsInfo)
					this.detailsPopup.appendChild(detailsInfo);
			
				// show kanji container buttons
				const buttons = Array.from(this.detailsPopup.querySelectorAll(".sd-detailsPopupButton"));
				if (buttons)
					buttons.forEach(button => button.classList.remove("sd-detailsPopup_hidden"));

				chrome.storage.local.get(["settings"], result => {
					const settings = result["settings"];
					const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];

					// create sidebar
					const sidebar = /*html*/`
						<div class="sd-detailsPopup_sidebar sd-detailsPopup_sidebar_hidden">
							<div class="sd-detailsPopup_clickable ${keyBindingsActive ? "sd-detailsPopup_sidebar_selected" : ""}" id="sd-detailsPopupKeyBindings" title="Key Bindings">
								<img src="https://i.imgur.com/qbI2bKH.png" alt="Key Bindings">
							</div>
							<div class="sd-detailsPopup_clickable ${this.lock ? "sd-detailsPopup_sidebar_selected" : ""}" id="sd-detailsPopupSubjectLock" title="Subject lock (L)">
								<img src="https://i.imgur.com/gaKRPen.png" alt="Subject lock">
							</div>
							<div class="sd-detailsPopup_clickable ${this.fixed ? "sd-detailsPopup_sidebar_selected" : ""}" id="sd-detailsPopupFix" title="Subject fix (F)">
								<img src="https://i.imgur.com/vZqwGZr.png" alt="Subject fix">
							</div>
							<div class="sd-detailsPopup_separator"></div>
							<div class="sd-detailsPopup_clickable" id="sd-detailsPopupCopy" title="Copy to Clipboard">
								<img src="https://i.imgur.com/eL3HiGE.png" alt="Copy to Clipboard">
							</div>
						</div>
					`;
					this.detailsPopup.insertAdjacentHTML("afterbegin", sidebar);
					this.sidebar = this.detailsPopup.querySelector(".sd-detailsPopup_sidebar");
				});
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

				// clear hanging dmak expanded
				const dmakExpanded = document.querySelectorAll(".sd-detailsPopup_dmakExpanded");
				if (dmakExpanded)
					dmakExpanded.forEach(elem => elem.remove());
			}
		},
		copyCharacters: async function (id) {
			if (!id) {
				if (this.subject)
					window.navigator.clipboard.writeText(this.subject["characters"]);
			}
			else {
				if (window.navigator.clipboard) {
					const item = this.other[id];
					window.navigator.clipboard.writeText(item["characters"]);
				}
			}
		},
		detailsInfoContainer: function (subject) {
			this.detailedInfoWrapper = document.createElement("div");
			this.detailedInfoWrapper.classList.add("sd-popupDetails_detailedInfoWrapper");

			// navbar
			const nav = navbar([true, true, subject.stats, subject.timestamps]);

			// quick reviews stats
			const statsImages = ["https://i.imgur.com/vsRTIFA.png", "https://i.imgur.com/uY358Y7.png", "https://i.imgur.com/01iZdz6.png"];
			const quickStats = subject.stats ? quickRevStats(["Overall", "Meaning", "Reading"], statsImages, subject.stats) : "";

			// details container
			const srsSectionData = {
				"legacy": {text: "Legacy", color: "yellow", title: `This subject no longer shows up in lessons or reviews, since ${subject.hidden_at?.split("T")[0]}.`, icon: "https://i.imgur.com/YQVUCpW.png"},
				"progress": {text: srsStages[subject.srs_stage]?.name, color: `var(--${srsStages[subject.srs_stage]?.short.toLowerCase()}-color)`, title: subject.passed_at ? `Subject passed ${daysPassed(new Date() - new Date(subject.passed_at))}.` : "", icon: subject.passed_at ? "https://i.imgur.com/a0lyk8f.png" : ""},
				"locked": {text: "Locked", color: `var(--${srsStages[0].short.toLowerCase()}-color)`, title: "", icon: null},
			}
			const srsSection = subject.hidden_at ? srsSectionData["legacy"]
							: subject.srs_stage >= 0 && subject.srs_stage <= 9 ? srsSectionData["progress"]
							: srsSectionData["locked"];

			const details = /*html*/`
				<div class="sd-popupDetails_details" style="padding: 45px 15px; margin-bottom: 185px; position: relative;">
				 	<!-- AUDIO -->
					${subject.pronunciation_audios ? /*html*/`
						<div class="sd-detailsPopup_clickable sd-detailsPopup_subjectAudio" title="Subject Audio" style="position: absolute; top: 45px; right: 10px; filter: invert(1);">
							<img src="https://i.imgur.com/ETwuWqJ.png" style="width: 18px;">
						</div>
					` : ""} 

				 	<!-- INFO SECTION -->
					<div id="sd-popupDetails_InfoSection" class="sd-popupDetails_anchor"></div>
					<!-- LEVEL -->
					<div><strong>Level ${subject.level} ${subject.subject_type.split("_").join(" ")}</strong></div>
					<!-- SRS STAGE -->
					<div title="${srsSection.title}" class="sd-detailsPopup_label-img">
						<strong style="color: ${srsSection.color}">${srsSection.text}</strong>
						${srsSection.icon ? `<img src="${srsSection.icon}" style="width: 13px;">` : ""}
					</div>
					<!-- JLPT & JOYO -->
					${subject.jlpt || subject.joyo ? /*html*/`<div title="JLPT, Joyo" style="color: #b8b8b8;">${subject.jlpt || "" }${subject.jlpt && subject.joyo ? "," : ""} ${subject.joyo || "" }</div>` : ""}
					<!-- PARTS OF SPEECH -->
					${subject.parts_of_speech ? /*html*/`<div title="Parts of Speech" style="color: #b8b8b8;">${subject.parts_of_speech[0][0].toUpperCase() + subject.parts_of_speech.join(", ").slice(1)}</div>`: ""}

					<!-- MEANING -->
					<div><strong class="sd-popupDetails_kanjiTitle">${subject.meanings.join(", ")}</strong></div>
					
					<!-- STROKES -->
					${this.strokes ? /*html*/`<div class="sd-popupDetails_strokes"></div>` : ""}
					
					<!-- MEANING MNEMONIC -->
					${subject.meaning_mnemonic ? infoTable("Meaning Mnemonic", [subject.meaning_mnemonic, subject.meaning_hint]) : ""}
					<!-- READING MNEMONIC -->
					${subject.reading_mnemonic ? infoTable("Reading Mnemonic", [subject.reading_mnemonic, subject.reading_hint]) : ""}
					
					<!-- CARDS SECTION -->
					<div id="sd-popupDetails_CardsSection" class="sd-popupDetails_anchor"></div>
					<!-- COMPONENT_SUBJECTS CARDS -->
					${subject.component_subject_ids ? itemCardsSection(subject, "component_subject_ids", "Used Radicals", "sd-detailsPopup_kanji_row", this.other) : ""}
					<!-- VISUALLY_SIMILAR_SUBJECTS CARDS -->
					${subject.visually_similar_subject_ids ? itemCardsSection(subject, "visually_similar_subject_ids", "Similar Kanji", "sd-detailsPopup_kanji_row", this.other) : ""}
					<!-- AMALGAMATION SUBJECTS CARDS -->
					${subject.amalgamation_subject_ids ? itemCardsSection(subject, "amalgamation_subject_ids", "Included in Subjects", "sd-detailsPopup_kanji_row", this.other) : ""}
					
					<!-- CONTEXT SENTENCES -->
					${subject.context_sentences ? contextSentences(subject.context_sentences) : ""}		

					<!-- STATISTICS SECTION -->
					<div id="sd-popupDetails_StatisticsSection" class="sd-popupDetails_anchor"></div>
					<!-- STATISTICS -->
					${subject.stats ? revStats(subject.stats) : ""}
					
					<!-- TIMESTAMPS SECTION -->
					<div id="sd-popupDetails_TimestampsSection" class="sd-popupDetails_anchor"></div>
					<!-- TIMESTAMPS -->
					${subject.timestamps ? timestamps(subject.timestamps) : ""}
				</div>
			`;

			this.detailedInfoWrapper.insertAdjacentHTML("beforeend", `
				${nav}
				${quickStats}
				${details}
			`);


			// PLAY AUDIO
			if (subject.pronunciation_audios) {
				const audioButton = this.detailedInfoWrapper.querySelector(".sd-detailsPopup_subjectAudio");
				audioButton.addEventListener("click", () => playSubjectAudio(subject.pronunciation_audios, audioButton));
			}

			// STROKES DRAW
			if (this.strokes) {
				const strokesWrapper = this.detailedInfoWrapper.querySelector(".sd-popupDetails_strokes");
				this.kanjiDrawing(subject.characters, strokesWrapper);
			}

			// NAVBAR INTERACTIONS
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
			this.detailedInfoWrapper.addEventListener("scroll", e => {
				const navbarUl = this.detailsPopup.querySelector(".sd-popupDetails_navbar ul");
				const scrollTop = e.target.scrollTop;
	
				const cardsSection = this.detailsPopup.querySelector("#sd-popupDetails_CardsSection");
				const statsSection = this.detailsPopup.querySelector("#sd-popupDetails_StatisticsSection");
				const timestampsSection = this.detailsPopup.querySelector("#sd-popupDetails_TimestampsSection");
	
				if (cardsSection && scrollTop < cardsSection.offsetTop) navbarHighlightChanger(navbarUl.children[0]);
				if (cardsSection && statsSection && scrollTop >= cardsSection.offsetTop && scrollTop < statsSection.offsetTop) navbarHighlightChanger(navbarUl.children[1]);
				if (statsSection && timestampsSection && scrollTop >= statsSection.offsetTop && scrollTop < timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[2]);
				if (timestampsSection && scrollTop >= timestampsSection.offsetTop) navbarHighlightChanger(navbarUl.children[3]);
			});

			this.detailedInfoWrapper.scrollTo(0, 0);
			
			return this.detailedInfoWrapper;
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

				if (characters?.length >= 3)
					this.detailsPopup.style.setProperty("width", this.width+"px");
				else
				 	this.detailsPopup.style.removeProperty("width");
			}
			
			// kanji container buttons
			const buttons = [
				{id:"sd-detailsPopupCloseX", alt: "Close (X)", active:true, src:"https://i.imgur.com/KUjkFI9.png"},
				{id:"sd-detailsPopupGoBack", alt: "Go back (B)", active:true, src:"https://i.imgur.com/e6j4jSV.png"},
				{id:"sd-detailsPopupMenu", alt: "Menu (M)", active:true, src:"https://i.imgur.com/UwE9HGj.png"},
				{id:"sd-detailsPopupGoUp", alt: "Go up (U)", active:true, src:"https://i.imgur.com/fszQn7s.png"},
			];

			for (let i in buttons) {
				const button = buttons[i];

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
		
			let charsWrapper = null;
			if (characters) {
				charsWrapper = document.createElement("p");
				link.appendChild(charsWrapper);
				charsWrapper.appendChild(document.createTextNode(characters));
				charsWrapper.setAttribute('data-item-type', this.type);
				charsWrapper.setAttribute('data-item-id', id);
				charsWrapper.title = characters+" in WaniKani";
				if (characters?.length > 4) 
					charsWrapper.style.setProperty("font-size", (48-6*(characters.length - 5))+"px", "important");
			}
			// add character image
			else {
				charsWrapper = document.createElement("img");
				link.appendChild(charsWrapper);
				const characterImages = subject["character_images"];
				charsWrapper.style.width = "80px";
				charsWrapper.style.filter = "invert(1)";
				const svg = characterImages.find(image => image["content_type"] == "image/svg+xml");
				if (svg)
					charsWrapper.src = svg["url"];
				else
					charsWrapper.src = characterImages[0]["url"];
			}

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
			else {
				// add first meaning instead
				const li = document.createElement("li");
				li.classList.add("sd-popupDetails_readings_row");
				li.appendChild(document.createTextNode(subject["meanings"].join(", ")));
				ul.appendChild(li);
			}
			kanjiContainerWrapper.appendChild(ul);
		
			return itemWrapper;
		},
		kanjiDrawing: function (kanji, strokes) {
			// close button
			const close = /*html*/`
				<div class="sd-detailsPopup_clickable" id="sd-detailsPopup_dmakExpandedClose" title="Close Drawing">
					<img src="https://i.imgur.com/KUjkFI9.png" alt="Close">
				</div>
			`;
			strokes.insertAdjacentHTML("beforeend", close);
			
			const drawingWrapper = document.createElement("div");
			strokes.appendChild(drawingWrapper);
			drawingWrapper.id = "sd-popupDetails_dmak";
			drawingWrapper.classList.add("sd-detailsPopup_clickable");
			drawingWrapper.innerHTML = /*html*/`<div class="sd-popupDetails_svgLoading">Loading Kanji Strokes animation...</div>`;
			
			// save dmak wrapper outside the shadow dom
			const dmakWrapper = document.createElement("div");
			dmakWrapper.id = "sd-popupDetails_dmak_draw";
			document.body.appendChild(dmakWrapper);

			this.drawStrokes(kanji, dmakWrapper.id);	
	
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
		},
		drawStrokes: function (characters, element, size) {
			if (!characters) return;

			// calculate size depending on number of characters
			if (!size)
				size = 130 - (10 * characters.length);

			console.log(characters, element, size);
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
				'loaded': async () => {
					// put strokes back into the shadow dom
					const dmakWrapper = document.querySelector("#sd-popupDetails_dmak_draw");
					if (dmakWrapper) {
						const drawingWrapper = this.wrapper.querySelector("#sd-popupDetails_dmak");
						if (drawingWrapper) {
							Array.from(dmakWrapper.children).forEach(child => drawingWrapper.appendChild(child));
							dmakWrapper.remove();
						}
					}

					const papers = this.dmak.papers;
					if (papers) {
						const currentCharacters = this.wrapper.querySelector(".sd-detailsPopup_kanji")?.innerText;
						console.log(currentCharacters, characters);
						if (characters == currentCharacters) {
							const currentCanvases = papers.map(paper => paper.canvas);

							// iterate all svgs and remove the ones that are not in currentCanvases
							const svgs = this.wrapper.querySelectorAll("#sd-popupDetails_dmak svg");
							svgs.forEach(svg => {
								if (!currentCanvases.includes(svg))
									svg.remove();
								else {
									this.wrapper.querySelector(".sd-popupDetails_svgLoading")?.remove();
									svg.style.setProperty("display", "block", "important");
								}
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
		}
	}

	// Auxiliar methods

	const navbar = tabs => {
		const sections = [
			{title: "Info", icon: "https://i.imgur.com/E6Hrw7w.png"},
			{title: "Cards", icon: "https://i.imgur.com/r991llA.png"},
			{title: "Statistics", icon: "https://i.imgur.com/Ufz4G1K.png"},
			{title: "Timestamps", icon: "https://i.imgur.com/dcT0L48.png"}
		].filter((_, i) => tabs[i]);

		const defaultTab = section => section.title == "Info";
		return /*html*/`
			<div class="sd-popupDetails_navbar">
				<ul>
					${sections.map(section => /*html*/`
						<li title="${section.title} (${section.title[0].toUpperCase()})" class="sd-detailsPopup_clickable" style="${defaultTab(section) ? "background-color: #d73267;" : ""}">
							<div>
								<img src="${section.icon}" style="${defaultTab(section) ? "filter: invert(1);" : ""}">
							</div>
						</li>
					`).join('')}
				</ul>
			</div>
		`;
	}

	const itemCardsSection = (subject, idsTag, title, itemCardsclass, list) => {
		return /*html*/`
			${infoTable(`${title} (${subject[idsTag].length})`, [], [
				itemCards(subject[idsTag], list, itemCardsclass, title !== "Used Kanji")
			])}
		`;
	}

	const itemCards = (ids, data, className, sorted) => {
		let info = ids.map(id => data[id]);
		if (sorted && info)
			info = info.sort((a,b) => a.level - b.level)

		return info.length > 0 ? /*html*/`
			<ul style="margin-top: 10px;" class="${info.length > 1 ? "sd-justify-list" : ""}">
				${info.map(subject => {
					const rows = [];
					if (subject.meanings) rows.push(subject.meanings[0]);
					if (subject.readings) rows.push(subject.subject_type == "kanji" ? subject.readings.filter(reading => reading.primary)[0].reading : subject.readings[0]);
					return itemCard(subject, rows, className);
				}).join("")}
			</ul>
		`
		: /*html*/`<p style="padding: 10px 5px;"><em>[None Found]</em></p>`;
	}

	const itemCard = (subject, textRows, className) => {
		const borderColor = subject.srs_stage >=0 && subject.srs_stage <= 9 ? `var(--${srsStages[subject.srs_stage].short.toLowerCase()}-color)` : "white";

		return /*html*/`
			<li class="sd-detailsPopup_cardRow ${className}" title="${subject.characters} in WaniKani" style="border-top: 4px solid ${borderColor}" data-type="${subject.subject_type}">
				<a target="_blank" href="${subject.document_url}">
					<p class="sd-detailsPopup_cards" data-item-id="${subject.id}">
						${subject.characters ? subject.characters : `<div>${subject.characters}</div>`}
					</p>
				</a>
				${textRows.map(row => row ? `<div style="text-align: center;">${row}</div>` : '').join("")}
				${subject.level ? `<div class="sd-itemLevelCard">${subject.level}</div>` : ""}
			</li>
		`;
	}

	const infoTable = (titleText, paragraphs, sections) => {
		return /*html*/`
			<div class="sd-detailsPopup_sectionContainer">
				${titleText ? `<strong class="sd-popupDetails_title">${titleText}</strong>` : ""}
				${paragraphs.map(p => p ? `<p class="sd-popupDetails_p">${p}</p>` : '').join("")}
				${sections ? sections.join("") : ""}
			</div>
		`;
	}

	const timestamps = values => {
		const icons = ["https://i.imgur.com/fszQn7s.png", "https://i.imgur.com/Pi3fG6f.png", "https://i.imgur.com/bsZwaVy.png", "https://i.imgur.com/x7ialfz.png", "https://i.imgur.com/a0lyk8f.png", "https://i.imgur.com/VKoEfQD.png", "https://i.imgur.com/pXqcusW.png", "https://i.imgur.com/1EA2EWP.png"];

		return /*html*/`
			${infoTable("Timestamps", [], [
				/*html*/`
					<div style="margin-top: 10px;">
						${Object.keys(values).map((key, i) => {
							const titleValue = key !== "data_updated_at" ? key.split("_")[0].charAt(0).toUpperCase()+key.split("_")[0].slice(1) : "Last Session";
							return /*html*/`
								<div style="padding: 5px 0px; margin-bottom: 5px;">
									<div class="sd-detailsPopup_img-label">
										<img src="${icons[i]}" style="width: 22px;">
										<strong style="font-size: 22px;">${titleValue}</strong>
									</div>
									<p style="padding: 5px 0px 2px 8px; color: #c5c5c4;">${values[key] ? values[key].split(".")[0].replace("T", "  ") : "No Data"}</p>
									<p style="padding: 2px 0px 2px 8px; font-weight: bold;">${values[key] ? daysPassed(new Date() - new Date(values[key])) : ""}</p>
								</div>
							`;
						}).join("")}
					</div>
				`
			])}
		`;
	}

	const percentageColor = percentage => {
		let color;
		if (percentage < 25) color = "#ff0000";
		else if (percentage >= 25 && percentage < 50) color = "#ff8d00";
		else if (percentage >= 50 && percentage < 75) color = "#efff00";
		else color = "#00ff00";
		return color;
	}

	const quickRevStats = (titles, images, stats) => {
		const percentages = [
			stats.percentage_correct,
			stats.meaning_correct/(stats.meaning_correct+stats.meaning_incorrect)*100,
			stats.reading_correct/(stats.reading_correct+stats.reading_incorrect)*100
		];

		return /*html*/`
			<div class="sd-popupDetails_quickStats">
				<ul style="display: inline-flex !important;">
					${titles.map((title, i) => {
						return /*html*/`
							<li title="${title}" style="margin-left: 5px;" class="sd-detailsPopup_img-label">
								<img src="${images[i]}" style="width: 17px !important;">
								<span style="color: ${percentageColor(percentages[i])}">${percentages[i].toFixed(0)}%</span>
							</li>
						`;
					}).join("")}
				</ul>
			</div>
		`;
	}

	const contextSentences = sentences => {
		return /*html*/`
			${infoTable("Context Sentences", [], [
				/*html*/`
					${sentences.map(sentence => {
						return /*html*/`
							<ul class="sd-detailsPopup_sentencesWrapper">
								<li class="sd-popupDetails_p" style="background-color: #3a374a; padding: 5px;">${sentence["en"]}</li>
								<li style="padding: 0px 5px;">${sentence["ja"]}</li>
							</ul>
						`;
					}).join("")}
				`
			])}
		`;
	} 


	const revStats = stats => {
		const icons = ["https://i.imgur.com/vsRTIFA.png", "https://i.imgur.com/uY358Y7.png", "https://i.imgur.com/01iZdz6.png"];

		return /*html*/`
			${infoTable("Statistics", [], [
				/*html*/`
					<div style="margin-top: 10px;">
						<!-- Overall -->
						<div style="margin-bottom: 10px;">
							<div class="sd-detailsPopup_img-label">
								<img src="${icons[0]}" style="width: 22px;">
								<strong style="font-size: 22px;">Overall</strong>
							</div>
							<div style="padding-left: 8px;"><strong>Correct: </strong><span style="color: ${percentageColor(stats.percentage_correct)}">${stats.percentage_correct.toFixed(0)}%</span></div>
							<div style="padding-left: 8px;"><strong>Frequency: </strong>${stats.meaning_correct+stats.meaning_incorrect+stats.reading_correct+stats.reading_incorrect}</div>
						</div>
						<!-- Meaning & Reading -->
						${["Meaning", "Reading"].map((type, i) => {
							const typeLower = type.toLowerCase();
							const correctPercentage = (stats[typeLower+"_correct"]/(stats[typeLower+"_correct"]+stats[typeLower+"_incorrect"])*100).toFixed(0);
							const incorrectPercentage = (stats[typeLower+"_incorrect"]/(stats[typeLower+"_correct"]+stats[typeLower+"_incorrect"])*100).toFixed(0);
							const both = stats[typeLower+"_correct"]+stats[typeLower+"_incorrect"];
							return /*html*/`
								<div style="margin-bottom: 10px;">
									<div class="sd-detailsPopup_img-label">
										<img src="${icons[i+1]}" style="width: 22px;">
										<strong style="font-size: 22px;">${type}</strong>
									</div>
									<div style="padding-left: 8px;"><strong>Correct: </strong><span style="color: ${percentageColor(correctPercentage)}">${stats[typeLower+"_correct"]} (${correctPercentage}%)</span></div>
									<div style="padding-left: 8px;"><strong>Incorrect: </strong><span>${stats[typeLower+"_incorrect"]} (${incorrectPercentage}%)</span></div>
									<div style="padding-left: 8px;"><strong>Frequency: </strong>${both}</div>
									<div style="padding-left: 8px;"><strong>Streak (max): </strong>${stats[typeLower+"_current_streak"]} (${stats[typeLower+"_max_streak"]})</div>
								</div>
							`;
						}).join("")}
					</div>
				`
			])}
		`;
	}

	window.SubjectDisplay = SubjectDisplay;
}());
