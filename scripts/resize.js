document.addEventListener("mousedown", e => {
	let elem;
	if (e.target.classList.contains("resizable-e")) {
		elem = e.target.parentElement;

		const mouseMoveHorizontal = e => {
			elem.style.width = e.clientX+"px";
		}

		window.addEventListener("mousemove", mouseMoveHorizontal);

		window.addEventListener("mouseup", () => window.removeEventListener("mousemove", mouseMoveHorizontal));
	}

	if (e.target.classList.contains("resizable-s")) {
		elem = e.target.parentElement;
		let run = false;
		const hasMaxHeight = elem.style.maxHeight != '';

		if (hasMaxHeight) {
			elem.style.height = elem.style.maxHeight;
			elem.style.removeProperty("max-height");
		}

		const mouseMoveVertical = e => {
			elem.style.height = (e.clientY-50)+"px";		
		}

		window.addEventListener("mousemove", mouseMoveVertical);

		window.addEventListener("mouseup", () => {
			if (hasMaxHeight && !run) {
				elem.style.maxHeight = elem.style.height;
				elem.style.removeProperty("height");
			}

			window.removeEventListener("mousemove", mouseMoveVertical);
			run = true;
		});
	}
});