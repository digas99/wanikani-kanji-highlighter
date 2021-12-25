const itemsListBar = data => {
	const bar = document.createElement("div");
	bar.classList.add("items-list-bar");
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
		link.href = "#"+info["link"];
		link.style.backgroundColor = info["color"];
		li.style.width = (info["value"]/dataSize*100)+"%";
		link.addEventListener("mouseover", e => {
			const popup = document.createElement("div");
			li.appendChild(popup);
			popup.classList.add("srsStageBarInfoPopup");
			popup.appendChild(document.createTextNode(info["value"]));
			const mostRightPos = popup.getBoundingClientRect().x + popup.offsetWidth;
			const bodyWidth = document.body.offsetWidth;
			// if popup overflows body
			if (mostRightPos > bodyWidth) {
				popup.style.setProperty("right", "0px", "important");
				popup.style.setProperty("left", "unset", "important");
			}
		});
		link.addEventListener("mouseout", e => {
			const popup = e.target.parentElement.getElementsByClassName("srsStageBarInfoPopup")[0];
			if (popup)
				popup.remove();	
		});
	});
	return bar;
}