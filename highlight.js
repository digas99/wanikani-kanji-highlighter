// send message to background, requesting some variables
// 	functionDelay: delay of the setTimout function
// 	value: value that is going to be highlighted
chrome.runtime.sendMessage({highlighting: "values_request"}, response => {
	const replaceAllObjects = (objects, oldValue, newValue) => {
		for (const obj of objects) {
			// find all wanted chars, and put them within a span with a class
			if (obj !== null && obj.innerText !== undefined) {
				obj.innerHTML = obj.innerText.replace(new RegExp(oldValue, "g"), newValue);
			}
		}
	}	
	
	if (response.functionDelay) {
		const value = response.value;
		setTimeout(() => replaceAllObjects(Array.from(document.getElementsByTagName("*"))
													.filter(object => object.children.length === 0)
														.filter(object => new RegExp(value).test(object.textContent))
															.filter(object => !["html", "head", "title", "style", "link", "meta", "script", "noscript"].includes(object.localName)), value, `<span class="highlighted">${value}</span>`)
					,response.functionDelay);
	}
});