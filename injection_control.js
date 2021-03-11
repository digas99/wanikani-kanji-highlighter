// warn background that scripts need to be injected again
window.onbeforeunload = () => {
	chrome.runtime.sendMessage({exiting: "true"});
}