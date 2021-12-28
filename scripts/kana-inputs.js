(() => {
	Array.from(document.getElementsByTagName("input"))
		.filter(input => input.type === "search" || input.type === "text" || input.type === "url")
		.forEach(input => input.addEventListener("input", () => {
			console.log(input.value);
			input.value = convertToKana(input.value);
			console.log(input.value);
		}));
})();