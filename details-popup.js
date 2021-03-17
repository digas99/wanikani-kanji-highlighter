popupDetailsFix = false;

document.addEventListener("mouseover", e => {
	const createPopup = () => {
		const div = document.createElement("div");
		div.className = "wkhighlighter_rightOverFlowPopup wkhighlighter_detailsPopup";
		document.body.appendChild(div);
		setTimeout(() => document.getElementsByClassName("wkhighlighter_detailsPopup")[0].classList.remove("wkhighlighter_rightOverFlowPopup"), 20);
		return div;
	}
	
	const node = e.target;

	const verticalCenterTopValue = (node) => node.parentNode.offsetHeight/2-node.offsetHeight/2;
	
	if (node.classList.contains("wkhighlighter_highlighted")) {
		let popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
		if (!popup)
			popup = createPopup();
		
		const mainWrapper = document.createElement("div");
		mainWrapper.style.pointerEvents = "none";

		const kanji = node.textContent;
		const mainChar = document.createElement("p");
		mainChar.appendChild(document.createTextNode(kanji));
		mainChar.className = "wkhighlighter_detailsPopup_kanji wkhighlighter_highlighted";

		chrome.storage.local.get(["wkhighlight_allkanji", "wkhighlight_kanji_assoc"], data => {
			const allKanji = data["wkhighlight_allkanji"];
			const kanjiID = data["wkhighlight_kanji_assoc"][kanji];
			const readings = allKanji[kanjiID].readings;

			const ul = document.createElement("ul");
			ul.className = "wkhighlighter_popupDetails_readings";

			const on = document.createElement("li");
			on.innerHTML = "<strong>ON: </strong>";
			on.appendChild(document.createTextNode(readings.filter(reading => reading.type==="onyomi").map(reading => reading.reading).join(", ")));
			on.classList.add("wkhighlighter_popupDetails_readings_row");

			const kun = document.createElement("li");
			kun.innerHTML = "<strong>KUN: </strong>";
			kun.appendChild(document.createTextNode(readings.filter(reading => reading.type==="kunyomi").map(reading => reading.reading).join(", ")));
			kun.classList.add("wkhighlighter_popupDetails_readings_row");
			
			ul.appendChild(on);
			ul.appendChild(kun);
			
			mainWrapper.appendChild(mainChar);
			mainWrapper.appendChild(ul);

			const firstChild = popup.firstChild;
			if (!firstChild || (firstChild && firstChild.textContent !== kanji)) {
				if (firstChild)
					firstChild.remove();
				popup.prepend(mainWrapper);		
				const verticalCenter = verticalCenterTopValue(mainWrapper);
				mainWrapper.style.marginTop = popupDetailsFix ? (verticalCenter-25)+"px" : verticalCenter+"px";
			}
		});
	}

	if (node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.add("wkhighlighter_focusPopup");
	}
});

document.addEventListener("mouseout", e => {
	const node = e.target;

	if (!popupDetailsFix && node.classList.contains("wkhighlighter_detailsPopup")) {
		node.classList.remove("wkhighlighter_focusPopup");
	}
});

document.addEventListener("click", e => {
	const node = e.target;
	
	const popup = document.getElementsByClassName("wkhighlighter_detailsPopup")[0];
	if (popup) {
		// not clicked on popup
		if (!node.classList.contains("wkhighlighter_detailsPopup") && getComputedStyle(node).cursor !== "pointer") { // && getComputedStyle(node).cursor !== 'pointer'
			popup.classList.add("wkhighlighter_rightOverFlowPopup");
			setTimeout(() => {
				if (popup)
					popup.remove();
			}, 200);
			popupDetailsFix = false;
			popup.style.cursor = "pointer";
		}
		// if clicked on popup
		if (node.classList.contains("wkhighlighter_detailsPopup")) {
			popupDetailsFix = true;
			popup.style.cursor = "default";
			
		}
	}
});