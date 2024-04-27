(function () {
	// construtctor
	const MessagePopup = function(parent, style="default") {
		this.parent = parent;
		this.style = style;
	}

	MessagePopup.prototype = {

		// create popup
		create: function(text, subtext, note, style) {
			this.wrapper = document.createElement("div");
			this.parent.appendChild(this.wrapper);
			this.updateStyle(style || this.style);
		
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

			if (this.style === 'bottom')
				setTimeout(() => this.textWrapper.style.bottom = "0", 200);
			else {
				if (note) {
					this.note = document.createElement("div");
					this.textWrapper.appendChild(this.note);
					this.note.classList.add("note");
					this.note.innerText = note;
				}
			}
		},

		// update text
		update: function(text, subtext, note) {
			if (text && this.textNode) this.textNode.innerText = text;
			if (subtext && this.subtextNode) this.subtextNode.innerText = subtext;
			if (note) {
				if (this.note)
					this.note.innerText = note;
				else {
					this.note = document.createElement("div");
					this.textWrapper.appendChild(this.note);
					this.note.classList.add("note");
					this.note.innerText = note;
				}
			}
		},

		// remove popup
		remove: async function() {
			if (this.style === 'bottom') {
				this.textWrapper.style.bottom = "-60px";
				await new Promise(resolve => setTimeout(() => {
					this.wrapper.remove();
					resolve();
				}, 400));
			}
			else
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
		},

		updateStyle: function(style) {
			this.style = style;
			this.wrapper.className = "";

			switch(this.style) {
				case "default":
					this.wrapper.classList.add("message-popup");
					break;
				case "bottom":
					this.wrapper.classList.add("bottom-popup");
					break;
			}
		}
	}

	// Auxiliar methods

	window.MessagePopup = MessagePopup;
}());
