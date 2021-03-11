for (const obj of Array.from(document.getElementsByTagName("*"))
							.filter(object => object.children.length === 0 && /\a/.test(object.textContent) && !["html", "head", "title", "style", "link", "meta", "script", "noscript"].includes(object.localName))) {
	// find all wanted chars, and put them within a span with a class
	obj.innerHTML = obj.innerText.replace(/a/g, "<span class='highlighted'>a</span>");
}