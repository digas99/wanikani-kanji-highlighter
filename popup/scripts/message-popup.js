(function () {
	// construtctor
	const MessagePopup = function(parent) {
		this.parent = parent;
	}

	MessagePopup.prototype = {

		// create popup
		create: function(text) {
			this.wrapper = document.createElement("div");
			this.parent.appendChild(this.wrapper);
			this.wrapper.classList.add("popup-loading");
		
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
		},

		// update text
		update: function(text) {
			this.textNode.innerText = text;
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
		loadingBar: function() {
			if (this.wrapper) {
				const loadingBarWrapper = document.createElement("div");
				this.textWrapper.appendChild(loadingBarWrapper);
				loadingBarWrapper.classList.add("popup-loading-bar");
				const loadingBar = document.createElement("div");
				loadingBarWrapper.appendChild(loadingBar);
				this.loadingBarProgress = document.createElement("div");
				loadingBar.appendChild(this.loadingBarProgress);
				this.loading(0);
			}
		},

		// update loading bar
		loading: function(progress) {
 			if (this.loadingBarProgress)
				this.loadingBarProgress.style.width = `${progress*100}%`;
		},
	}

	// Auxiliar methods

	window.MessagePopup = MessagePopup;
}());
