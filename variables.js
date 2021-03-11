let changedObjects = [];
const unwantedTags = ["html", "head", "title", "style", "link", "meta", "script", "noscript"];

const replaceAllObjects = (objects, oldValue, newValue) => {
	for (const obj of objects) {
		// find all wanted chars, and put them within a span with a class
		if (obj !== null && obj.innerText !== undefined) {
			changedObjects.push(obj);
			obj.innerHTML = obj.innerText.replace(new RegExp(oldValue, "g"), newValue);
		}
	}
}

// warn background that this file needs to be injected again
window.onbeforeunload = () => {
	chrome.runtime.sendMessage({exiting: "true"});
}