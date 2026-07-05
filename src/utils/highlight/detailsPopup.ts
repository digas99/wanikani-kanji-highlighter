/**
 * In-page kanji/word details popup.
 *
 * Hovering a highlighted span asks the background for the full subject (the
 * content script can't read the extension-origin cache itself) and shows a
 * small collapsed preview at the bottom-right of the page. Hovering that
 * preview expands it into the full ported SubjectDisplay panel. The popup
 * persists once shown and is only dismissed by a click elsewhere on the page.
 */

import { createApp, type App } from 'vue';
import { storage } from '#imports';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import HighlightDetailsPopup from '@/components/highlight/HighlightDetailsPopup.vue';
import { popupState, hidePopup } from './detailsPopupState';
import { highlightStyleVarsFromSettings, srsAppearanceVarsFromSettings } from './highlightStyleVars';
import { openHighlightedSubject } from './detailsPopupSubject';
import {
	handleDetailsPopupKeydown,
	handleDetailsPopupKeyup,
} from './detailsPopupKeybindings';
import { HIGHLIGHT_MARK_CLASS } from './highlighter';
import {
	isPageHighlightBlocked,
	type PageListMode,
} from '@/utils/scripts/pageList';

const SELECTOR = `.${HIGHLIGHT_MARK_CLASS}`;

let enabled = true;
let pageBlocked = false;
let popupHost: Element | null = null;
let lastHoverSpan: HTMLElement | null = null;

function isInsidePopupHost(event: Event): boolean {
	if (!popupHost) return false;
	const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
	return path.includes(popupHost);
}

export async function mountDetailsPopup(ctx: ContentScriptContext): Promise<void> {
	await applyPageAccess(await storage.getItem<any>('local:settings'));
	await refreshPageAccess();

	document.addEventListener('mouseover', onMouseOver, true);
	document.addEventListener('click', onDocumentClick, true);
	document.addEventListener('keydown', handleDetailsPopupKeydown, true);
	document.addEventListener('keyup', handleDetailsPopupKeyup, true);
	storage.watch('local:settings', async () => {
		await applyPageAccess(await storage.getItem<any>('local:settings'));
		await refreshPageAccess();
	});
	storage.watch('local:blacklist', refreshPageAccess);
	storage.watch('local:whitelist', refreshPageAccess);

	const ui = await createShadowRootUi<App>(ctx, {
		name: 'wkh-details-popup',
		position: 'overlay',
		zIndex: 2147483647,
		anchor: 'body',
		append: 'last',
		onMount(container) {
			const app = createApp(HighlightDetailsPopup);
			app.mount(container);
			return app;
		},
		onRemove(app) {
			app?.unmount();
		},
	});
	ui.mount();
	popupHost = (ui as any).shadowHost ?? null;
}

async function refreshPageAccess(): Promise<void> {
	const [settings, blacklist, whitelist] = await Promise.all([
		storage.getItem<any>('local:settings'),
		storage.getItem<string[]>('local:blacklist'),
		storage.getItem<string[]>('local:whitelist'),
	]);
	const pageListMode: PageListMode = settings?.highlighter?.page_list_mode === 'whitelist'
		? 'whitelist'
		: 'blacklist';
	pageBlocked = isPageHighlightBlocked(location.hostname, pageListMode, blacklist, whitelist);
	if (pageBlocked) hidePopup();
}

function applySettings(settings: any): void {
	const cfg = settings?.kanji_details_popup ?? {};
	enabled = cfg.activated !== false;

	const opacity = typeof cfg.popup_opacity === 'number' ? cfg.popup_opacity : 8;
	popupState.opacity = Math.min(Math.max(opacity / 10, 0.1), 1);
	popupState.width = typeof cfg.popup_width === 'number' ? cfg.popup_width : 300;
	popupState.showStrokes = cfg.subject_drawing !== false;
	popupState.autoplayAudio = cfg.audio_autoplay === true;
	popupState.keyBindings = cfg.key_bindings !== false;
	popupState.highlightStyleVars = highlightStyleVarsFromSettings(settings);
	popupState.srsAppearanceVars = srsAppearanceVarsFromSettings(settings);

	if (!enabled) hidePopup();
}

async function applyPageAccess(settings: any): Promise<void> {
	applySettings(settings);
	await refreshPageAccess();
}

function onMouseOver(event: MouseEvent): void {
	if (!enabled || pageBlocked || popupState.locked || isInsidePopupHost(event)) return;
	const target = event.target as Element | null;
	const span = target?.closest?.(SELECTOR) as HTMLElement | null;
	if (!span) return;

	const value = span.textContent?.trim();
	if (!value) return;

	if (span === lastHoverSpan && popupState.visible) return;

	lastHoverSpan = span;
	const type = span.getAttribute('data-wkh-type') ?? undefined;
	void openHighlightedSubject(value, type);
}

/** Dismiss the popup when the user clicks anywhere outside of it. */
function onDocumentClick(event: MouseEvent): void {
	if (!popupState.visible) return;
	const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
	if (popupHost && path.includes(popupHost)) return;
	lastHoverSpan = null;
	hidePopup();
}
