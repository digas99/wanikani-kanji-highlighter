const popupLoading = text => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("popup-loading");

    // add gray back
    wrapper.appendChild(document.createElement("div"));

    // add popup
    const textWrapper = document.createElement("div");
    wrapper.appendChild(textWrapper);
    const textNode = document.createElement("div");
    textWrapper.appendChild(textNode);
    textNode.appendChild(document.createTextNode(text));
    
    return wrapper;
}

window.onscroll = () => {
	let goTop = document.querySelector(".goTop");
	if (document.documentElement.scrollTop > 500) {
		if (!goTop) {
			goTop = document.createElement("div");
			document.body.appendChild(goTop);
			goTop.classList.add("goTop", "clickable");
			const arrow = document.createElement("i");
			goTop.appendChild(arrow);
			arrow.classList.add("up");
			goTop.style.top = "0";
			setTimeout(() => goTop.style.top = "56px", 200);
			goTop.addEventListener("click", () => window.scrollTo(0,0));
		}
	}
	else {
		if (goTop) {
			goTop.style.top = "0px";
			setTimeout(() => goTop.remove(), 200);
		}
	}
}