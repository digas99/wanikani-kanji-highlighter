(function () {
	// construtctor
	const TilesList = function(parent, sections, options) {
		this.parent = parent;
		this.sections = sections;
		this.options = options;

		this.create();
	}

	TilesList.prototype = {

		// create list
		create: function() {
			// wrapper
			this.wrapper = document.createElement("div");
			this.wrapper.classList.add("tiles-list-wrapper");
			this.parent.appendChild(this.wrapper);
			if (this.options.id) this.wrapper.id = this.options.id;
			if (this.options.classes) this.options.classes.forEach(c => this.wrapper.classList.add(c));
			
			// header
			if (this.options.title) {
				this.header = document.createElement("div");
				this.header.classList.add("tiles-list-header");
				this.wrapper.appendChild(this.header);
				this.header.innerHTML = this.options.title;
			}

			// content
			this.content = document.createElement("div");
			this.content.classList.add("tiles-list-content");
			this.wrapper.appendChild(this.content);

			// list
			this.list = document.createElement("div");
			this.list.classList.add("tiles-list");
			if (this.options.height)
				this.list.style.maxHeight = this.options.height+"px";
			this.content.appendChild(this.list);

			this.update(this.sections);
		},

		// update list
		update: function(sections) {
			this.sections = sections;
			this.list.innerHTML = "";

			// sections creation
			if (this.options.sections.join)
				this.list.appendChild(joined(this.sections));
			else
				this.sections.forEach(s => this.list.appendChild(section(s)));

			// add bars
			if (this.options.bars)
				this.setBar();

			// set not found message
			if (this.list.children.length == 0) {
				this.list.appendChild(notFound(this.options.sections.notFound || "No items found"));
				this.wrapper.style.height = "160px";
			}
			else
				this.wrapper.style.removeProperty("height");
		},

		// update title
		updateTitle: function(title) {
			if (this.header)
				this.header.innerHTML = title;
		},

		// add bar
		setBar: function() {
			if (this.bar)
				this.bar.remove();

			this.bar = listBar(
				this.sections.map(section => ({
					"color": section["color"],
					"value": section["data"].length,
					"anchor": section["title"].toLowerCase().replace(/ /g, "-") 
				}))
				, this.options.bars.labels);

			this.content.insertBefore(this.bar, this.content.firstChild);
		},
	}

	// Auxiliar methods
	
	const listBar = (data, labels) => {
		const bar = document.createElement("div");
		bar.classList.add("tiles-list-bar");
		const barUl = document.createElement("ul");
		bar.appendChild(barUl);
		const dataSize = data.map(info => info["value"])
			.reduce((sum, val) => sum + val, 0);
		
		data.forEach(info => {
			const li = document.createElement("li");
			barUl.appendChild(li);
			const link = document.createElement("a");
			li.appendChild(link);
			link.classList.add("clickable");
			link.setAttribute("data-size", info["value"]);
			link.style.backgroundColor = info["color"];
			li.style.width = (info["value"]/dataSize*100)+"%";
			
			if (labels) {
				link.addEventListener("mouseover", e => {
					const popup = document.createElement("div");
					li.appendChild(popup);
					popup.classList.add("tiles-list-bar-label");
					popup.appendChild(document.createTextNode(e.target.dataset.size));
					const mostRightPos = popup.getBoundingClientRect().x + popup.offsetWidth;
					const bodyWidth = document.body.offsetWidth;
					// if popup overflows body
					if (mostRightPos > bodyWidth) {
						popup.style.setProperty("right", "0px", "important");
						popup.style.setProperty("left", "unset", "important");
					}
				});
	
				link.addEventListener("mouseout", e => {
					const popup = e.target.parentElement.getElementsByClassName("tiles-list-bar-label")[0];
					if (popup)
						popup.remove();	
				});
			}

			// anchor
			if (info["anchor"]) {
				link.addEventListener("click", e => {
					const upperOffset = bar.parentElement.parentElement.parentElement.offsetTop + 55;
					bar.nextElementSibling.scrollTo(0, document.querySelector(`#tiles-list-${info["anchor"]}`)?.offsetTop-upperOffset);
				});
			}
		});
		return bar;
	}

	const tile = (value, color, callback) => {
		const li = document.createElement("li");
		li.classList.add("clickable");
		li.innerHTML = value;
		li.style.backgroundColor = color;
		const backColor = hexToRGB(color);
		li.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);

		if (callback)
			callback(li, value);

		return li;
	}

	const section = (section_data) => {
		const {title, data, color, callbacks, justify} = section_data;
		
		if (data.length == 0)
			return new DocumentFragment();

		const section = document.createElement("div");
		section.classList.add("tiles-list-section");
		const sectionTitle = document.createElement("div");
		section.appendChild(sectionTitle);
		sectionTitle.classList.add("clickable");
		sectionTitle.id = `tiles-list-${title.toLowerCase().replace(/ /g, "-")}`;
		sectionTitle.appendChild(document.createTextNode(title + " (" + data.length + ")"));
		const arrowWrapper = document.createElement("div");
		sectionTitle.appendChild(arrowWrapper);
		const arrow = document.createElement("i");
		arrowWrapper.appendChild(arrow);
		arrow.style.borderColor = color;
		arrow.classList.add("up", "tiles-list-section-arrow");
		const sectionContent = document.createElement("ul");
		section.appendChild(sectionContent);
		if (justify == true)
			sectionContent.classList.add("justify-list");
		else if (data.every(item => item.length == 1 || item.includes("<img")))
			sectionContent.classList.add("fill-width");
		
		data.forEach(item => sectionContent.appendChild(tile(item, color, callbacks?.item)));

		if (!sectionContent.classList.contains("fill-width")) {
			unjustifyLastRow(sectionContent);
		}

		// title click
		sectionTitle.addEventListener("click", e => {
			if (arrow.classList.contains("up")) {
				flipArrow(arrow, "up", "down");
				sectionContent.style.display = "none";
			}
			else {
				flipArrow(arrow, "down", "up");
				sectionContent.style.removeProperty("display");
			}
		});

		if (callbacks?.section)
			callbacks.section(section, sectionTitle, sectionContent);

		return section;			
	}

	const joined = sections => {
		const joinedSection = document.createElement("div");
		joinedSection.classList.add("tiles-list-section");
		const joinedSectionContent = document.createElement("ul");
		joinedSection.appendChild(joinedSectionContent);
		sections.forEach(section =>
			section["data"].forEach(item =>
				joinedSectionContent.appendChild(tile(item, section["color"], section["callbacks"]?.item))));

		return joinedSection;
	}

	window.TilesList = TilesList;
}());

// Public methods

const isLastRow = (list, tile) => {
	const distanceToTop = tile.offsetTop + tile.offsetHeight + Number(getComputedStyle(tile)["margin-bottom"].replace("px", ""));
	return distanceToTop + tile.offsetHeight > list.offsetHeight;
}

const unjustifyLastRow = list => {
	// use timeout to wait for tiles to be rendered
	setTimeout(() => {
		const lastRowTiles = Array.from(list.children).filter(tile => isLastRow(list, tile));
		const newWrapper = document.createElement("div");
		list.appendChild(newWrapper);
		lastRowTiles.forEach(tile => newWrapper.appendChild(tile));
	});
}