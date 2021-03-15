window.onload = () => {
	console.log("loaded");
	
	Node.prototype.removeChild = child => child.remove();
}