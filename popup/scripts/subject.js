let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
    popupLoading.setLoading();
}

const url = new URL(window.location.href);
const id = Number(url.searchParams.get("id"));

if (id) {
	chrome.storage.local.get(["kanji", "radicals", "vocabulary", "kana_vocabulary"], async result => {
		if (popupLoading) popupLoading.remove();
		
		const allKanji = result["kanji"];
		const allRadicals = result["radicals"];
		const allVocab = {...result["vocabulary"], ...result["kana_vocabulary"]};
		if (allKanji && allRadicals && allVocab) {
			const wrapper = document.querySelector("#subject-details");
			const width = window.innerWidth-document.querySelector(".side-panel").offsetWidth;
			const detailsPopup = new SubjectDisplay(allRadicals, allKanji, allVocab, width, wrapper);
			detailsPopup.update(id, true);
			detailsPopup.expand();
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
		}
	});
}