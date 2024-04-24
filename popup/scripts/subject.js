let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
    popupLoading.setLoading();
}

const url = new URL(window.location.href);
let id = url.searchParams.get("id");

chrome.storage.local.get(["kanji", "radicals", "vocabulary", "kana_vocabulary", "settings"], async result => {
	if (popupLoading) popupLoading.remove();
	
	const highlightStyleSettings = result["settings"]["highlight_style"];
	let highlightingClass, notLearnedHighlightingClass;
	if (highlightStyleSettings) {
		highlightingClass = highlightStyleSettings["learned"];
		notLearnedHighlightingClass = highlightStyleSettings["not_learned"];
	}

	const allKanji = result["kanji"];
	const allRadicals = result["radicals"];
	const allVocab = {...result["vocabulary"], ...result["kana_vocabulary"]};
	if (allKanji && allRadicals && allVocab) {
		if (id.split("-")[0] === "rand") {
			let allSubjectsKeys = [Object.keys(allKanji), Object.keys(allVocab)].flat(1);
			if (id.split("-")[1] === "kanji") allSubjectsKeys = Object.keys(allKanji);
			else if (id.split("-")[1] === "vocabulary") allSubjectsKeys = Object.keys(allVocab);
	
			if (allSubjectsKeys)
				id = allSubjectsKeys[rand(0, allSubjectsKeys.length-1)];
		}

		const wrapper = document.querySelector("#subject-details");
		const width = window.innerWidth-document.querySelector(".side-panel").offsetWidth;
		const details = new SubjectDisplay(allRadicals, allKanji, allVocab, width, wrapper);
		details.update(id, true);
		details.expand();
		wrapper.firstChild.style.removeProperty("width");

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
				chrome.storage.local.get(["kanji_assoc"], data => {
					const assocList = data["kanji_assoc"];
					if (assocList)
						details.update(assocList[character], true);
				});
			}
		});
	}
});