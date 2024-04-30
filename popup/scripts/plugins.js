chrome.storage.local.get(["settigns"], result => {
	const settings = result.settings;

	// Load plugins status
});

document.addEventListener('click', async e => {
	const target = e.target;

	// CUSTOM CHECKBOX CLICK
	if (target.closest(".checkbox_wrapper")) {
		const checkbox = target.closest(".checkbox_wrapper").querySelector(".settingsItemInput[type='checkbox']");
		if (checkbox) checkbox.click();
	}

	const type = target.getAttribute("type") || target.type || target.parentElement.getAttribute("type") || target.parentElement.type;

	if (target.classList.contains("settingsItemInput")) {
		// CHECKBOX ACTIONS
		if (type === "checkbox") {
			// update checkbox style
			const checkbox_wrapper = target.parentElement;
			checkboxStyle(checkbox_wrapper, target.checked);
		}
	}
});