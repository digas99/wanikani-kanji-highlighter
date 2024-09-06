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
else if (id == "rand-kanji")
	fetchKeys = [...fetchKeys, "kanji_assoc"];
else if (id == "rand-vocabulary")
	fetchKeys = [...fetchKeys, "vocabulary_assoc", "kana_vocab_assoc"];

chrome.storage.local.get(fetchKeys, async result => {
	if (popupLoading) popupLoading.remove();

	if (id.includes("rand")) {
		let assocs = {};
		if (id == "rand") {
			assocs = {...result["kana_vocab_assoc"], ...result["kanji_assoc"], ...result["vocabulary_assoc"]};
		}
		else if (id == "rand-kanji") {
			assocs = result["kanji_assoc"];
		}
		else if (id == "rand-vocabulary") {
			assocs = {...result["vocabulary_assoc"], ...result["kana_vocab_assoc"]};
		}
		
		const ids = Object.values(assocs);
		// get random id
		id = ids[Math.floor(Math.random() * ids.length)];
		// update url
		history.replaceState(null, null, `?id=${id}`);
	} 
	
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
});