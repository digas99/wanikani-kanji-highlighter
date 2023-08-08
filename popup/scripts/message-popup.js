(function () {
	// construtctor
	const MessagePopup = function(parent) {
		this.parent = parent;
	}

	MessagePopup.prototype = {

		// create popup
		create: function(text, subtext) {
			this.wrapper = document.createElement("div");
			this.parent.appendChild(this.wrapper);
			this.wrapper.classList.add("message-popup");
		
			// add gray back
			this.wrapper.appendChild(document.createElement("div"));
		
			// add popup
			this.textWrapper = document.createElement("div");
			this.wrapper.appendChild(this.textWrapper);
			this.textWrapper.classList.add("content");
			// text
			this.textNode = document.createElement("div");
			this.textWrapper.appendChild(this.textNode);
			if (text)
				this.textNode.innerText = text;
			// subtext
			this.subtextNode = document.createElement("div");
			this.textWrapper.appendChild(this.subtextNode);
			this.subtextNode.classList.add("subtext");
			if (subtext)
				this.subtextNode.innerText = subtext;
		},

		// update text
		update: function(text, subtext) {
			if (text) this.textNode.innerText = text;
			if (subtext) this.subtextNode.innerText = subtext;
		},

		// remove popup
		remove: function() {
			this.wrapper.remove();
			this.wrapper = null;
			this.textWrapper = null;
			this.textNode = null;
			this.loadingBarProgress = null;
		},

		// check if popup exists
		exists: function() {
			return this.wrapper ? true : false;
		},

		// add loading bar
		setLoading: function() {
			if (this.wrapper) {
				// add loading bar
				const loadingBarWrapper = document.createElement("div");
				this.textWrapper.appendChild(loadingBarWrapper);
				loadingBarWrapper.classList.add("message-popup-bar");
				const loadingBar = document.createElement("div");
				loadingBarWrapper.appendChild(loadingBar);
				this.loadingBarProgress = document.createElement("div");
				loadingBar.appendChild(this.loadingBarProgress);
				this.loading(0); // set progress to 0

				// add loading icon
				this.textWrapper.appendChild(this.loadingIcon());
			}
		},

		// update loading bar
		loading: function(progress) {
 			if (this.loadingBarProgress)
				this.loadingBarProgress.style.width = `${progress*100}%`;
		},

		// loading icon
		loadingIcon: function() {
			const loadingIcon = document.createElement("div");
			loadingIcon.classList.add("loading-icon");
			const icon = document.createElement("img");
			loadingIcon.appendChild(icon);
			icon.src = "../images/refreshing.png";
			return loadingIcon;
		}
	}

	// Auxiliar methods

	window.MessagePopup = MessagePopup;
}());
