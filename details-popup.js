document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const fragment = document.createDocumentFragment();
		
	}
	
	const node = e.target;
	if (node.className === "wkhighlighter_highlighted") {
		createPopup();
	}
});