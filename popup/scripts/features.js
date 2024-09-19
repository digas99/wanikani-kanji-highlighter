window.onload = () => {
	// add buttons
	const buttonsWrapper = document.querySelector('#secPageButtons');
	// history button
	buttonsWrapper.insertAdjacentHTML('beforeend', /*html*/`<a><img src="/images/menu.png" alt="menu" title="Table of Contents"></a>`);
}

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

document.addEventListener("click", e => {
	const target = e.target;

	// clicked on secondary page button
	if (target.closest('#secPageButtons')) {
		const tableOfContents = document.querySelector('.table-of-contents');
		if (tableOfContents) {
			tableOfContents.classList.toggle('slide-from-left');
		}
	}

	// clicked on table of contents
	if (target.closest('.table-of-contents a')) {
		const tableOfContents = document.querySelector('.table-of-contents');
		tableOfContents.classList.toggle('slide-from-left');
	}
	else if (!target.closest('.table-of-contents') && !target.closest('#secPageButtons')) {
		const tableOfContents = document.querySelector('.table-of-contents');
		if (tableOfContents) {
			tableOfContents.classList.remove('slide-from-left');
		}
	}
});