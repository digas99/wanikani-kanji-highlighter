(() => {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.kanaWriting)
			document.addEventListener("input", kanaWriting);
		else
			document.removeEventListener("input", kanaWriting);
	});

	const kanaWriting = e => {
		const input = e.target;

		if (input.tagName === "INPUT" && ["search", "text", "url"].includes(input.type) && kanaWriting)
			input.value = convertToKana(input.value);
	}
})();