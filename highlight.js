// send message to background, requesting some variables
// 	functionDelay: delay of the setTimout function
// 	value: value that is going to be highlighted
chrome.runtime.sendMessage({highlighting: "values_request"}, response => {
	const hasTextChildNodes = obj => Array.from(obj.childNodes).filter(node => node.nodeName === "#text").length > 0;

	if (response.functionDelay) {
		setTimeout(() => {
			for (const value of response.values) {
				for (const obj of Array.from(document.getElementsByTagName("*")).filter(object => hasTextChildNodes(object)).filter(object => new RegExp(value).test(object.textContent)).filter(object => !["html", "body", "head", "title", "style", "link", "meta", "script", "noscript", "img", "svg"].includes(object.localName))) {
					let newInnerHTML = "";
					for (const node of obj.childNodes) {
						if (node.nodeName === "#text")
							newInnerHTML += node.nodeValue.replace(new RegExp(value, "g"), `<span class="highlighted">${value}</span>`);
						else 
							newInnerHTML += node.outerHTML;
					}
					console.log(obj);
					obj.innerHTML = newInnerHTML;
				}
			}
		},response.functionDelay);
	}
});