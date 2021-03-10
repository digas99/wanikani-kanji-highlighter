for (const tag of ["p", "h1", "h2", "h3", "h4", "h5", "a", "div", "span"]) {
	const objectsWithText = Array.from(document.getElementsByTagName(tag))
									.filter(object => /\a/.test(object.textContent))
										.filter(object => object.children.length === 0);
	for (const obj of objectsWithText) {
		objHTML = obj.innerHTML;
		newInnerHTML = "";
		let isTag = false;
		for (let i=0; i<objHTML.length; i++) {
			const currentChar = objHTML.charAt(i);

			if (currentChar === '<') isTag = true;
			if (currentChar === '>') isTag = false;

			if (!isTag && currentChar === "a")
				newInnerHTML+="<span class='highlighted'>"+currentChar+"</span>";
			else
				newInnerHTML+=currentChar;
		}
		obj.innerHTML = newInnerHTML;
	}
}