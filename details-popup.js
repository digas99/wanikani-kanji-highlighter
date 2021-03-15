document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const div = document.createElement("div");
		div.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
		document.body.appendChild(div);
		setTimeout(() => document.getElementsByClassName("wkhighlighter_detailsPopup")[0].classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
	}
	
	const node = e.target;

	if (node.classList.contains("wkhighlighter_highlighted")) {
		if (document.getElementsByClassName("wkhighlighter_detailsPopup").length < 1) {
			createPopup();
		}
	}

	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.add("wkhighlighter_focusPopup");
	}
});

document.addEventListener("mouseout", e => {
	const node = e.target;

	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.remove("wkhighlighter_focusPopup");
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	if (document.getElementsByClassName("wkhighlighter_detailsPopup").length > 0 && !node.classList.contains("wkhighlighter_detailsPopup")) {
		const popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		popup.classList.add("wkhighlighter_rightOverFlowPopup");
		setTimeout(() => {
			if (popup)
				document.body.removeChild(popup)
		, 200});
	}
});