(() => {
	document.addEventListener("input", e => {
		const input = e.target;

		if (input.tagName === "INPUT" && ["search", "text", "url"].includes(input.type))
			input.value = convertToKana(input.value);
	});
})();