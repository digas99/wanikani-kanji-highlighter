document.addEventListener("mousedown", e => {
	let elem;
	if (e.target.classList.contains("resizable-e")) {
		elem = document.querySelector(".resizable");

		const mouseMoveHorizontal = e => {
			elem.style.width = e.clientX+"px";
		}

		window.addEventListener("mousemove", mouseMoveHorizontal);

		window.addEventListener("mouseup", () => window.removeEventListener("mousemove", mouseMoveHorizontal));
	}

	if (e.target.classList.contains("resizable-s")) {
		elem = document.querySelector(".resizable");

		const mouseMoveVertical = e => {
			elem.style.height = e.clientY+"px";		
		}

		window.addEventListener("mousemove", mouseMoveVertical);

		window.addEventListener("mouseup", () => window.removeEventListener("mousemove", mouseMoveVertical));
	}
});