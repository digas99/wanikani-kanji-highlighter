/** Report the current text selection so the background can update the context menu title. */
export function watchSelectionForContextMenu(): void {
	const report = () => {
		const selectedText = window.getSelection()?.toString().trim() ?? '';
		void browser.runtime.sendMessage({
			type: 'wkh:selectedText',
			selectedText,
		}).catch(() => {});
	};

	document.addEventListener('click', report);
	document.addEventListener('contextmenu', report);
}
