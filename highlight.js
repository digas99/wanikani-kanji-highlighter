// send message to background, requesting some variables
// 	functionDelay: delay of the setTimout function
// 	value: value that is going to be highlighted
chrome.runtime.sendMessage({highlighting: "values_request"}, response => {
	const className = response.highlightingClass;

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

	const hasDirectChildHighlighted = node => {
		for (const child of node.childNodes) {
			if (child.classList && Array.from(child.classList).includes(className))
				return true;
		}
		return false;
	}

	if (response.functionDelay) {
		setTimeout(() => {
			// filter all tag elements of the document that:
			//		- haven't yet been highlighted;
			//		- have child nodes that are text nodes;
			//		- aren't any of the unwanted tags (html, head, etc...)
			let filteredNodes = Array.from(document.getElementsByTagName("*")).filter(object => !(hasDirectChildHighlighted(object) || Array.from(object.classList).includes(className))).filter(object => textChildNodes(object).length > 0).filter(object => !response.unwantedTags.includes(object.localName));
			for (const value of response.values) {
				const span = document.createElement("span");
				span.className = className;
				span.appendChild(document.createTextNode(value));
				// filter the tag elements again for those that have text content equal to the preset regex value;
				// iterate the filtered tag elements and call replaceWithElem each time
				filteredNodes.filter(object => new RegExp(value).test(object.textContent)).forEach(node => replaceWithElem(node, new RegExp(value, "g"), span));
			}
		},response.functionDelay);
	}
});