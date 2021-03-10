const TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "div", "span"];

for (const tag of TAGS) {
	const objectsWithText = Array.from(document.getElementsByTagName(tag))
									.filter(object => object.textContent !== "")
										.filter(object => /u\w/.test(object.textContent));
	for (const obj of objectsWithText) {
		objHTML = obj.innerHTML;
		newInnerHTML = "";
		let isTag = false;
		for (let i=0; i<objHTML.length; i++) {
			const currentChar = objHTML.charAt(i);

			if (currentChar === '<') isTag = true;
			if (currentChar === '>') isTag = false;

			if (!isTag && currentChar === "u") {
				newInnerHTML+="<span class='highlighted'>"+currentChar+"</span>";
				continue;
			}
			
			newInnerHTML+=currentChar;
		}
		obj.innerHTML = newInnerHTML;
	}
}