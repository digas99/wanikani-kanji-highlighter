/**
 * For development (the extension decides when: e.g. loaded unpacked): a panel at the bottom of
 * pages with how their text was classified (textLanguage.ts): the page's language and why, its
 * paragraphs by class, the rules in effect. "Outline" marks each paragraph in its class's color.
 */

import type { LanguageGate, LanguageSummary, TextLanguage } from './textLanguage';

const REFRESH_MS = 1000;

/** the panel's element, the outlines' style and attribute: by the extension's namespace */
let ids = names('cjkh');

function names(namespace: string) {
	return {
		host: `${namespace}-language-debug`,
		outlineStyle: `${namespace}-language-debug-outlines`,
		outlineAttribute: `data-${namespace}-lang`,
	};
}

const COLORS: Record<TextLanguage, string> = {
	japanese: '#2fbf5b',
	chinese: '#e5484d',
	mixed: '#f5a623',
	unclear: '#8a8fa3',
};

let timer: number | null = null;
let outlined = false;
let closed = false;

/** `namespace`: the extension's prefix (two extensions on a page each have their own panel). */
export function mountLanguageDebug(gate: LanguageGate, options: { namespace?: string } = {}): void {
	unmountLanguageDebug();
	ids = names(options.namespace ?? 'cjkh');
	if (closed) return;
	const host = document.createElement('div');
	host.id = ids.host;
	const root = host.attachShadow({ mode: 'open' });
	root.innerHTML = `
<style>
	:host { all: initial; }
	.panel {
		/* bottom right: the reading level bar has the bottom left */
		position: fixed; right: 8px; bottom: 8px; z-index: 2147483647;
		max-width: min(720px, calc(100vw - 16px)); box-sizing: border-box;
		padding: 6px 10px; border-radius: 8px;
		background: rgba(20, 22, 38, 0.92); color: #ececf3;
		font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
		display: flex; gap: 10px; align-items: flex-start;
	}
	.lines { min-width: 0; }
	.line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.tag { color: #9aa0b8; }
	b { color: #fff; }
	.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin: 0 3px 0 6px; }
	.actions { display: flex; gap: 4px; flex-shrink: 0; }
	button {
		font: inherit; color: #ececf3; background: rgba(255, 255, 255, 0.1); border: 0;
		border-radius: 5px; padding: 2px 7px; cursor: pointer;
	}
	button:hover { background: rgba(255, 255, 255, 0.2); }
	button[aria-pressed="true"] { background: #4f6bed; }
</style>
<div class="panel" role="status">
	<div class="lines"><div class="line page"></div><div class="line paragraphs"></div><div class="line rules"></div></div>
	<div class="actions">
		<button type="button" class="outline" aria-pressed="false" title="Outline each paragraph in its class's color">Outline</button>
		<button type="button" class="close" title="Hide (until the page is loaded again)">×</button>
	</div>
</div>`;
	const outlineButton = root.querySelector<HTMLButtonElement>('.outline')!;
	outlineButton.addEventListener('click', () => {
		outlined = !outlined;
		outlineButton.setAttribute('aria-pressed', String(outlined));
		if (!outlined) clearOutlines();
		render(root, gate);
	});
	outlineButton.setAttribute('aria-pressed', String(outlined));
	root.querySelector('.close')!.addEventListener('click', () => {
		closed = true;
		unmountLanguageDebug();
	});
	// outside <body>: its text isn't the page's (not classified, not highlighted)
	document.documentElement.appendChild(host);
	render(root, gate);
	timer = window.setInterval(() => render(root, gate), REFRESH_MS);
}

export function unmountLanguageDebug(): void {
	if (timer !== null) clearInterval(timer);
	timer = null;
	document.getElementById(ids.host)?.remove();
	clearOutlines();
}

const NAMES: Record<string, string> = { japanese: 'Japanese', chinese: 'Chinese', mixed: 'mixed', unclear: 'unclear' };

function pageLine(summary: LanguageSummary): string {
	const { declared, page, tally } = summary;
	const amounts = `<span class="tag">(${tally.japanese} Japanese / ${tally.chinese} Chinese chars)</span>`;
	if (declared) return `Page <b>says ${NAMES[declared]}</b> (its lang) ${amounts}`;
	if (page) return `Page <b>considered ${NAMES[page]}</b>: twice the other's text or more ${amounts}`;
	return `Page language <b>unclear</b>: neither leads by 2× ${amounts}`;
}

function contentLine(summary: LanguageSummary): string {
	const { japanese, chinese, mixed, unclear } = summary.paragraphs;
	const has = japanese && chinese ? 'both Japanese and Chinese'
		: mixed ? 'mixed paragraphs'
			: japanese ? 'only Japanese'
				: chinese ? 'only Chinese'
					: unclear ? 'only text that could be either' : 'nothing classified yet';
	const counts = (Object.keys(COLORS) as TextLanguage[])
		.map(language => `<span class="dot" style="background:${COLORS[language]}"></span>${summary.paragraphs[language]} ${NAMES[language]}`)
		.join('');
	const byChoice = summary.byChoice ? ` <span class="tag">(${summary.byChoice} unclear by the setting)</span>` : '';
	return `Has <b>${has}</b>:${counts}${byChoice}`;
}

function rulesLine(summary: LanguageSummary): string {
	const word = (choice: string) => (choice === 'skip' ? 'not highlighted' : 'highlighted');
	return `<span class="tag">Rules here:</span> Chinese ${word(summary.chinese)} · could be either ${word(summary.unclear)} <span class="tag">(site list applied)</span>`;
}

function render(root: ShadowRoot, gate: LanguageGate): void {
	const summary = gate.summary();
	root.querySelector('.page')!.innerHTML = pageLine(summary);
	root.querySelector('.paragraphs')!.innerHTML = contentLine(summary);
	root.querySelector('.rules')!.innerHTML = rulesLine(summary);
	if (outlined) outline(gate);
}

/** Each classified paragraph outlined in its class's color (an attribute and a stylesheet: dev only). */
function outline(gate: LanguageGate): void {
	if (!document.getElementById(ids.outlineStyle)) {
		const style = document.createElement('style');
		style.id = ids.outlineStyle;
		style.textContent = (Object.keys(COLORS) as TextLanguage[])
			.map(language => `[${ids.outlineAttribute}="${language}"] { outline: 2px dashed ${COLORS[language]} !important; outline-offset: 1px; }`)
			.join('\n');
		(document.head || document.documentElement).appendChild(style);
	}
	for (const [paragraph, language] of gate.trackedParagraphs()) {
		if (language && paragraph.getAttribute(ids.outlineAttribute) !== language) paragraph.setAttribute(ids.outlineAttribute, language);
	}
}

function clearOutlines(): void {
	document.getElementById(ids.outlineStyle)?.remove();
	for (const element of document.querySelectorAll(`[${ids.outlineAttribute}]`)) element.removeAttribute(ids.outlineAttribute);
}
