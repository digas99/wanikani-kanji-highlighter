// REAL TIME SEARCH

// highlight search
const contentArea = document.querySelector(".popout-webpage-content");
if (contentArea) {
	contentArea.addEventListener("click", () => {
		const selectedText = document.getSelection().toString().trim();
		if (selectedText) {
			makeSearch(selectedText);
		}
	});
}