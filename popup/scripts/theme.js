const setTheme = theme => {
	console.log("theme", theme);
	const interfaceAppearance = INTERFACE_COLORS[theme];
	const documentStyle = document.documentElement.style;
	documentStyle.setProperty('--body-color', interfaceAppearance["background"]);
	documentStyle.setProperty('--default-color', interfaceAppearance["default"]);
	documentStyle.setProperty('--fill-color', interfaceAppearance["fill"]);
	documentStyle.setProperty('--font-color', interfaceAppearance["font"]);
	documentStyle.setProperty('--font-sec-color', interfaceAppearance["font-sec"]);
	documentStyle.setProperty('--border-color', interfaceAppearance["border"]);
	documentStyle.setProperty('--highlight', interfaceAppearance["highlight"]);
	documentStyle.setProperty('--fade', interfaceAppearance["fade"]);
	interfaceAppearance["styles"].forEach(style => {
		const styleElem = document.createElement("style");
		styleElem.innerText = style;
		document.head.appendChild(styleElem);
	});
	localStorage.setItem("theme", theme);

	const themeIcon = document.querySelector("#"+theme);
	const newTheme = theme == "light" ? "dark" : "light";
	if (themeIcon) {
		themeIcon.id = newTheme;
        themeIcon.src = `/images/${newTheme}.png`;
        themeIcon.title = newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
		if (themeIcon.nextElementSibling)
			themeIcon.nextElementSibling.innerText = themeIcon.title;
	}
}

// interface appearance
const theme = localStorage.getItem("theme") || "light";
setTheme(theme);

// handle color as soon as possible
chrome.storage.local.get(["settings"], result => {
	const settings = result["settings"];

	// setup css vars
	if (settings) {
		const documentStyle = document.documentElement.style;

		// content appearance
		const appearance = settings["appearance"];
		documentStyle.setProperty('--highlight-default-color', appearance["highlight_learned"]);
		documentStyle.setProperty('--notLearned-color', appearance["highlight_not_learned"]);
		documentStyle.setProperty('--radical-tag-color', appearance["radical_color"]);
		documentStyle.setProperty('--kanji-tag-color', appearance["kanji_color"]);
		documentStyle.setProperty('--vocabulary-tag-color', appearance["vocab_color"]);
		Object.values(srsStages).map(srs => srs["short"].toLowerCase())
			.forEach(srs => documentStyle.setProperty(`--${srs}-color`, appearance[`${srs}_color`]));
	}
});