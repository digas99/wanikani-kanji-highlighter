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

	const hasDirectChildHighlighted = (node, className) => {
		for (const child of node.childNodes) {
			if (child.classList && Array.from(child.classList).includes(className))
				return true;
		}
		return false;
	}

	const highlighter = (delay, values, className, unwantedTags) => {
		setTimeout(() => {
			// filter all tag elements of the document that:
			//		- haven't yet been highlighted;
			//		- have child nodes that are text nodes;
			//		- aren't any of the unwanted tags (html, head, etc...)
			let filteredNodes = Array.from(document.getElementsByTagName("*")).filter(object => !(hasDirectChildHighlighted(object, className) || Array.from(object.classList).includes(className))).filter(object => textChildNodes(object).length > 0).filter(object => !unwantedTags.includes(object.localName));
			for (const value of values) {
				const span = document.createElement("span");
				span.className = className;
				span.appendChild(document.createTextNode(value));
				// filter the tag elements again for those that have text content equal to the preset regex value;
				// iterate the filtered tag elements and call replaceWithElem each time
				filteredNodes.filter(object => new RegExp(value).test(object.textContent)).forEach(node => replaceWithElem(node, new RegExp(value, "g"), span));
			}
		},delay);
	}

	// if has received and answer with the delay time
	if (response.functionDelay) {
		highlighter(response.functionDelay, response.values, response.highlightingClass, response.unwantedTags);
	}

	let lastNmrElements = 0;
	let nmrElements;
	// continuously check for the number of elements in the page
	// if that number updates, then run highlighter again
	setInterval(() => {
		nmrElements = document.getElementsByTagName("*").length;
		if (nmrElements !== lastNmrElements) {
			lastNmrElements = nmrElements;
			highlighter(20, response.values, response.highlightingClass, response.unwantedTags);
		}
	}, 3000);
});