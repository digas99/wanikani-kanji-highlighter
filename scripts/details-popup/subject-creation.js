const itemCardsCreator = (sectionTitle, type, cards) => {
	const table = infoTable(`${sectionTitle} (${cards ? cards.length : 0})`, []);
	table.classList.add("wkhighlighter_detailsPopup_sectionContainer");
	table.appendChild(itemCard("+", `Add ${type}`));
	return table;
}

const infoTableCreator = (titleText, placeholder, value) => {
	const wrapper = document.createElement("div");
	wrapper.classList.add("wkhighlighter_detailsPopup_sectionContainer");
	
	if (titleText) {
		const title = document.createElement("strong");
		title.classList.add("wkhighlighter_popupDetails_title");
		title.appendChild(document.createTextNode(titleText));
		wrapper.appendChild(title);
	}

	const textArea = document.createElement("textarea");
	wrapper.appendChild(textArea);
	textArea.style.width = "100%";
	textArea.style.marginTop = "5px";
	textArea.rows = "7";
	if (placeholder)
		textArea.placeholder = placeholder;
	
	if (value)
		textArea.value = value;
	
	return wrapper;
}

const kanjiMaker = (detailsPopup, values) => {
	// detailed info section
	const detailedInfoWrapper = document.createElement("div");
	detailedInfoWrapper.classList.add("wkhighlighter_popupDetails_detailedInfoWrapper");
	detailsPopup.appendChild(detailedInfoWrapper);
	const kanjiWrapper = document.getElementsByClassName("wkhighlighter_focusPopup_kanji")[0];
	if (kanjiWrapper)
		detailedInfoWrapper.style.setProperty("margin-top", kanjiWrapper.clientHeight+"px", "important");

	// details container
	const details = document.createElement("div");
	details.style.padding = "15px";
	detailedInfoWrapper.appendChild(details);

	const typeSelectorWrapper = document.createElement("div");
	details.appendChild(typeSelectorWrapper);
	typeSelectorWrapper.style.marginBottom = "10px";
	const selector = document.createElement("select");
	typeSelectorWrapper.appendChild(selector);
	selector.title = "Subject type";
	["Kanji", "Vocabulary"].forEach(type => {
		const option = document.createElement("option");
		selector.appendChild(option);
		option.appendChild(document.createTextNode(type));
	});

	const meaning = document.createElement("div");
	details.appendChild(meaning);
	const meaningInput = document.createElement("input");
	meaning.appendChild(meaningInput);
	meaningInput.placeholder = "Meanings";
	meaning.style.width = "100%";
	meaning.style.fontSize = "20px";
	if (values["meanings"]) meaning.value = values["meanings"];

	["Meaning", "Reading"].forEach(type => details.appendChild(infoTableCreator(type+" Mnemonic", "Your mnemonic for the "+type.toLowerCase()+"s...", values[type.toLowerCase()+"_mnemonic"])));

	details.appendChild(itemCardsCreator("Used Radicals", "Radical", values["radicals"]));

	details.appendChild(itemCardsCreator("Similar Kanji", "Kanji", values["kanji"]));

	details.appendChild(itemCardsCreator("Vocabulary", "Vocabulary", values["vocabulary"]));

	detailsPopup.scrollTo(0, 0);
	return detailedInfoWrapper;
}