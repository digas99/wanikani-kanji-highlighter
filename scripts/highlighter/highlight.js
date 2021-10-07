(function () {
	// constructor
	const Highlight = function(characters, highlightClass, otherClasses, unwantedTags, tagFilter) {
		console.log(characters);
		this.characters = characters;
		this.highlightClass = highlightClass;
		this.otherClasses = otherClasses;
		this.unwantedTags = unwantedTags;
		this.tagFilter = tagFilter;
		this.highlighted = [];
	}

	Highlight.prototype = {
		highlighter: function (tags) {
			const regex = new RegExp(`[${this.characters.join('')}]`, "g");

			const span = document.createElement("span");
			span.classList.add(this.highlightClass);
			this.otherClasses.forEach(className => span.classList.add(className));

			Array.from(tags).filter(tag => tag.textContent.match(regex)?.length > 0 && this.tagValidation(tag))
				.forEach(node => this.highlighted = this.highlighted.concat(replaceMatchesWithElem(node, regex, span)));
			
			console.log(this.highlighted);
		},

		// check if given tag is of interest
		tagValidation: function (tag) { return !this.unwantedTags.includes(tag.localName) && textChildNodes(tag).length > 0 && !(this.hasDirectChildHighlighted(tag) || tag.classList.contains(this.highlightClass)) && this.tagFilter(tag) },

		// check if a tag has already highlighted nodes
		hasDirectChildHighlighted: function (tag) {
			for (let child of tag.children) {
				if (Array.from(child.classList).includes(this.highlightClass))
					return true;
			}
			return false;
		},

		highlightedSet: function () { return [...new Set(this.highlighted)] },

		size: function () { return this.highlightedSet().length; }
	}

	// Aux functions

	// check if node has children with text
	const textChildNodes = obj => Array.from(obj.childNodes).filter(node => node.nodeName === "#text");

	// replace a matching regex in a text node with a document element, preserving everything else, even other 
	// none text node siblings from that text node (the parent node must have atleast one text node as a childNode)
	const replaceMatchesWithElem = (parentNode, regex, elem) => {
		let allMatches = [];
		
		textChildNodes(parentNode).forEach(node => {
			const fragment = document.createDocumentFragment();
			const matches = node.textContent.match(regex);
			if (matches) {
				const split = node.textContent.split(regex);
				split.forEach((content, i) => {
					fragment.appendChild(document.createTextNode(content));
					if (i !== split.length-1) {
						const clone = elem.cloneNode(true);
						clone.appendChild(document.createTextNode(matches[i]));
						fragment.appendChild(clone);
					}
				});
				node.parentElement.replaceChild(fragment, node);
				allMatches = allMatches.concat(matches);
			}
		});

		return allMatches;
	}

	window.Highlight = Highlight;
}());