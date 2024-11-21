let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
    popupLoading.setLoading();
}

const url = new URL(window.location.href);
let id = url.searchParams.get("id");

let fetchKeys = ["settings"];
if (id == "rand")
	fetchKeys = [...fetchKeys, "kana_vocab_assoc", "kanji_assoc", "vocabulary_assoc"];
else if (id == "rand-radical")
	fetchKeys = [...fetchKeys, "radical_id_list"];
else if (id == "rand-kanji")
	fetchKeys = [...fetchKeys, "kanji_assoc"];
else if (id == "rand-vocabulary")
	fetchKeys = [...fetchKeys, "vocabulary_assoc", "kana_vocab_assoc"];
else if (id == "rand-learned" || id == "rand-not-learned")
	fetchKeys = [...fetchKeys, "highlight_setup", "kanji_assoc"];
else if (id == "rand-lessons")
	fetchKeys = [...fetchKeys, "lessons"];
else if (id == "rand-reviews")
	fetchKeys = [...fetchKeys, "reviews"];

chrome.storage.local.get(fetchKeys, async result => {
	if (popupLoading) popupLoading.remove();

	if (id.includes("rand")) {
		id = subjectRandomId(id, result);
		if (!id)
			window.history.back();	

		// update url
		history.replaceState(null, null, `?id=${id}`);
	} 

	id = Number(id);
	
	const highlightStyleSettings = result["settings"]["highlight_style"];
	let highlightingClass, notLearnedHighlightingClass;
	if (highlightStyleSettings) {
		highlightingClass = highlightStyleSettings["learned"];
		notLearnedHighlightingClass = highlightStyleSettings["not_learned"];
	}

	const db = new Database("wanikani");

	const wrapper = document.querySelector("#subject-details");
	const width = window.innerWidth-document.querySelector(".side-panel").offsetWidth;
	const details = new SubjectDisplay(Number(id), width, wrapper,
		async ids => {
			if (!Array.isArray(ids))
				ids = [ids];

			const opened = await db.open("subjects");
			if (opened) {
				return await db.getAll("subjects", "id", ids);
			}
			return [];
		},
		getIds,
		{
			kanjiSource: KANJI_STROKES_URI.popup,
			strokes: result["settings"]["kanji_details_popup"]["subject_drawing"],
			autoplayAudio: result["settings"]["kanji_details_popup"]["audio_autoplay"],
		}
	);
	console.log("details", details);

	await details.create(true);

	// remove menu button
	const menuButton = document.querySelector("#sd-detailsPopupMenu");
	if (menuButton)
		menuButton.remove();

	wrapper.addEventListener("click", e => {
		if (e.target.closest(".sd-detailsPopup_cardSideBarInfo")) {
			const card = e.target.closest(".sd-detailsPopup_cardRow");
			const subject = card.querySelector(".sd-detailsPopup_cards");
			if (subject) {
				const id = subject.dataset.itemId;
				if (id) {
					history.replaceState(null, null, `?id=${id}`);
				}
			}
		}
	});

	document.addEventListener("click", e => {
		const node = e.target;
						
		// clicked in a highlighted kanji (within the info popup)
		if (node.classList.contains(highlightingClass) || node.classList.contains(notLearnedHighlightingClass)) {
			const character = node.textContent;

			chrome.storage.local.get(["kanji_assoc"], async data => {
				const assocList = data["kanji_assoc"];
				if (assocList) {
					const id = assocList[character];
					history.replaceState(null, null, `?id=${id}`);
					const opened = db.open("subjects");
					if (opened) {
						const subject = await db.get("subjects", id);
						const others = await db.getAll("subjects", "id", getIds(subject));
						details.update(subject, others, true);
					}	
				}
			});
		}
	});

	document.addEventListener("keydown", e => {
		const key = e.key;
		chrome.storage.local.get(["settings"], result => {
			const settings = result["settings"];
			const keyBindingsActive = settings["kanji_details_popup"] ? settings["kanji_details_popup"]["key_bindings"] : defaultSettings["kanji_details_popup"]["key_bindings"];
			if (details && details.detailsPopup && keyBindingsActive) {
				if (key == 'b' || key == "B") {
					// SHOW PREVIOUS KANJI INFO
					if (details.openedSubjects.length > 0)
						details.openedSubjects.pop();

					const kanji = details.openedSubjects[details.openedSubjects.length-1];
					if (kanji)
						updateDetailsPopup(details, kanji.id);
				}
				
				if (key == 'u' || key == 'U') {
					// SCROLL UP
					if (details.detailsPopup) {
						details.detailsPopup.scrollTo(0, 0);
					}
				}

				if (key == 'y' || key == 'Y') {
					// COPY CHARACTERS
					if (details.detailsPopup) {
						details.copyCharacters();
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
		});
	}); 
});
