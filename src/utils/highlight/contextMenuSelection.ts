/** Report the current text selection so the background can update the context menu title. */
export function watchSelectionForContextMenu(): void {
	let lastSent: string | null = null;
	const report = () => {
		const selectedText = window.getSelection()?.toString().trim() ?? '';
		// Every click used to message (and wake) the background worker; only send changes.
		if (selectedText === lastSent) return;
		lastSent = selectedText;
		void browser.runtime.sendMessage({
			type: 'wkh:selectedText',
			selectedText,
		}).catch(() => {});
	};

	document.addEventListener('click', report);
	document.addEventListener('contextmenu', report);
}
