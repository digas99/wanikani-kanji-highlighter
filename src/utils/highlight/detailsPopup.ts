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
import { openHighlightedSubject, openHighlightedSubjectById } from './detailsPopupSubject';
import {
	handleDetailsPopupKeydown,
	handleDetailsPopupKeyup,
} from './detailsPopupKeybindings';
import { highlightAt, isPaintingHighlights } from './highlightHits';
import { resolveLookupLinks } from '@/utils/scripts/lookupLinks';
import { defaultSettings } from '@/utils/scripts/defaultSettings';
import {
	isPageHighlightBlocked,
	type PageListMode,
} from '@/utils/scripts/pageList';

let enabled = true;
let pageBlocked = false;
let popupHost: Element | null = null;
/** the highlighted text the popup was last opened for (a span, or a painted match) */
let lastHoverKey: object | null = null;
/** Settings → Details: show details in the page, or in the browser side panel. */
let detailsLocation: 'page' | 'sidepanel' = 'page';
let lastSidePanelKey = '';

function isInsidePopupHost(event: Event): boolean {
	if (!popupHost) return false;
	const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
	return path.includes(popupHost);
}

export async function mountDetailsPopup(ctx: ContentScriptContext): Promise<void> {
	await applyPageAccess(await storage.getItem<any>('local:settings'));
	await refreshPageAccess();

	// spans get mouseover; painted highlights aren't elements, so the pointer is followed
	document.addEventListener('mouseover', onMouseOver, true);
	document.addEventListener('mousemove', onMouseMove, true);
	document.addEventListener('click', onDocumentClick, true);
	document.addEventListener('keydown', handleDetailsPopupKeydown, true);
	document.addEventListener('keyup', handleDetailsPopupKeyup, true);
	storage.watch('local:settings', async () => {
		await applyPageAccess(await storage.getItem<any>('local:settings'));
		await refreshPageAccess();
	});
	storage.watch('local:blacklist', refreshPageAccess);
	storage.watch('local:whitelist', refreshPageAccess);

	// Right-click on a subject in the extension popup: show it here.
	browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
		if (message?.type !== 'wkh:showSubject') return;
		const subjectId = Number(message.subjectId);
		if (!enabled || pageBlocked || !Number.isFinite(subjectId)) {
			sendResponse({ shown: false });
			return;
		}
		// the side panel's "show on page" switches back to the in-page popup
		if (message.switchToPage) detailsLocation = 'page';
		// an explicit request beats a locked popup
		popupState.locked = false;
		void openHighlightedSubjectById(subjectId);
		sendResponse({ shown: true });
	});

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
	// settings saved before lookup links existed get the defaults; older lists get WaniKani once
	popupState.lookupLinks = resolveLookupLinks(settings?.lookup, defaultSettings.lookup.links);
	detailsLocation = cfg.location === 'sidepanel' ? 'sidepanel' : 'page';

	if (!enabled) hidePopup();
	// side panel mode: the in-page popup isn't used
	if (detailsLocation === 'sidepanel') forceHidePopup();
}

function forceHidePopup(): void {
	popupState.fixed = false;
	popupState.locked = false;
	hidePopup();
}

function sendToBackground(message: Record<string, unknown>): void {
	try {
		void browser.runtime.sendMessage(message).catch(() => {});
	} catch {
		/* extension context may be gone (reloaded extension) */
	}
}

/**
 * Popup → side panel button: open the panel on the shown subject and switch modes.
 * Runs inside the click, so the browser lets the background open the panel.
 */
export function moveDetailsToSidePanel(): void {
	const item = popupState.item;
	sendToBackground({
		type: 'wkh:sidepanel:open',
		switchMode: true,
		...(item?.id != null ? { subjectId: item.id } : {}),
		...(item?.characters ? { characters: item.characters } : {}),
	});
	detailsLocation = 'sidepanel';
	forceHidePopup();
}

async function applyPageAccess(settings: any): Promise<void> {
	applySettings(settings);
	await refreshPageAccess();
}

function onMouseOver(event: MouseEvent): void {
	onPointerAt(event);
}

/** Painted highlights: checked at most once per frame. */
let pendingMove: MouseEvent | null = null;
function onMouseMove(event: MouseEvent): void {
	if (!isPaintingHighlights()) return;
	if (!pendingMove) {
		requestAnimationFrame(() => {
			const move = pendingMove;
			pendingMove = null;
			if (move) onPointerAt(move);
		});
	}
	pendingMove = event;
}

function onPointerAt(event: MouseEvent): void {
	if (!enabled || pageBlocked || popupState.locked || isInsidePopupHost(event)) return;
	const hit = highlightAt(event);
	if (!hit) return;
	const { value, type } = hit;

	// Side panel mode: hovering updates the panel (if it's open); nothing shows in the page.
	if (detailsLocation === 'sidepanel') {
		const key = `${type ?? ''}:${value}`;
		if (key === lastSidePanelKey) return;
		lastSidePanelKey = key;
		sendToBackground({ type: 'wkh:sidepanel:show', characters: value, subjectType: type });
		return;
	}

	if (hit.key === lastHoverKey && popupState.visible) return;

	lastHoverKey = hit.key;
	void openHighlightedSubject(value, type);
}

/** Dismiss the popup when the user clicks anywhere outside of it. */
function onDocumentClick(event: MouseEvent): void {
	// Side panel mode: clicking a highlighted word opens the panel on it.
	if (detailsLocation === 'sidepanel' && enabled && !pageBlocked && !isInsidePopupHost(event)) {
		const hit = highlightAt(event);
		if (hit) {
			lastSidePanelKey = `${hit.type ?? ''}:${hit.value}`;
			sendToBackground({
				type: 'wkh:sidepanel:open',
				characters: hit.value,
				subjectType: hit.type,
			});
		}
		return;
	}

	if (!popupState.visible) return;
	const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
	if (popupHost && path.includes(popupHost)) return;
	lastHoverKey = null;
	hidePopup();
}
