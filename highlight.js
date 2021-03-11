// send message to background, requesting some variables
// 	functionDelay: delay of the setTimout function
// 	value: value that is going to be highlighted
chrome.runtime.sendMessage({highlighting: "values_request"}, response => {
	if (response.functionDelay) {
		const value = response.value;
		const filteredObject = Array.from(document.getElementsByTagName("*"))
										.filter(object => object.children.length === 0)
											.filter(object => new RegExp(value).test(object.textContent))
												.filter(object => !unwantedTags.includes(object.localName))
													.filter(object => !changedObjects.includes(object));
		setTimeout(() => replaceAllObjects(filteredObject, value, `<span class="highlighted">${value}</span>`)
					,response.functionDelay);
	}
});

// warn background that this file needs to be injected again
window.onbeforeunload = () => {
	chrome.runtime.sendMessage({exiting: "true"});
}