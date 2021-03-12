// send message to background, requesting some variables
// 	functionDelay: delay of the setTimout function
// 	value: value that is going to be highlighted
chrome.runtime.sendMessage({highlighting: "values_request"}, response => {
	const textChildNodes = obj => Array.from(obj.childNodes).filter(node => node.nodeName === "#text");

	// replace a matching regex in a text node with a document element, preserving everything else, even other 
	// none text node siblings from that text node (the parent node must have atleast one text node as a childNode)
	const replaceWithElem = (parentNode, regex, elem) => {
		for (const node of textChildNodes(parentNode)) {
			const fragment = document.createDocumentFragment();
			const split = node.textContent.split(regex);
			split.forEach((content, i) => {
				fragment.appendChild(document.createTextNode(content));
				if (i !== split.length-1)
					fragment.appendChild(elem.cloneNode(true));
			});
			node.parentElement.replaceChild(fragment, node);
		}
	}

	if (response.functionDelay) {
		setTimeout(() => {
			for (const value of response.values) {
				const span = document.createElement("span");
				span.className = "highlighted";
				span.appendChild(document.createTextNode(value));
				// filter all tag elements of the document and then chall replaceWithElem() on each element
				Array.from(document.getElementsByTagName("*")).filter(object => textChildNodes(object).length > 0).filter(object => new RegExp(value).test(object.textContent)).filter(object => !response.unwantedTags.includes(object.localName)).forEach(obj => replaceWithElem(obj, new RegExp(value, "g"), span));
			}
		},response.functionDelay);
	}
});