// Runs before the popup's app bundle (a plain, render-blocking script in <head>):
// marks the saved theme on <html> so the startup placeholder is drawn in the right
// colors from the first frame. The app then applies the full theme (utils/scripts/theme.ts).
try {
	if (localStorage.getItem('theme') === 'dark') {
		document.documentElement.setAttribute('data-boot-theme', 'dark');
	}
} catch {
	// no storage: light placeholder
}
