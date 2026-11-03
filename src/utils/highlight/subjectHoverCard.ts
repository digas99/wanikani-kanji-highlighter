/**
 * A small card about a subject, next to what's hovered (WaniKani's reviews: the last subject
 * reviewed; the session summary's subjects): its meanings, readings, level, SRS stage, JLPT /
 * Jōyō, how often it's answered right, and the subjects it's part of (a radical's kanji, a
 * kanji's words) or made of (a word's kanji). Plain DOM on WaniKani's page, one card at a time.
 */

import { srsStages } from '@/utils/scripts/wanikani';

/** a subject's results in the review session: the card says what changed */
export type HoverCardSession = {
	from: number;
	to: number;
	wrong: number;
	/** each part's record after the session (`now`: wrong this session) */
	parts?: Record<string, { right: number; wrong: number; now: number }>;
	passed?: 'now' | 'not-yet' | 'before';
	trouble?: { serious: boolean; text: string };
	/** more lines (the level's progress it moved) */
	notes?: Array<{ text: string; tone?: 'up' | 'down' }>;
};

export type HoverCardOptions = {
	subjectId: number;
	session?: () => HoverCardSession | null | undefined;
	/** subjects whose meanings and readings stay hidden (the question on screen) */
	hidden?: () => Iterable<number | null | undefined>;
	appearance?: () => Record<string, string>;
};

type Loaded = { subject: any; related: Record<number, any> } | null;

const STYLE_ID = 'wkh-hover-card-style';
const SHOW_DELAY_MS = 140;
const HIDE_DELAY_MS = 180;
/** a lookup kept this long (the stages of the related subjects move during a session) */
const CACHE_MS = 5 * 60 * 1000;
/** related subjects shown; the rest: "+N" (to the subject's page) */
const RELATED_LIMIT = 8;

const STYLE = `
.wkh-hc { position: fixed; z-index: 2147483100; width: 300px; max-width: calc(100vw - 16px); box-sizing: border-box; border-radius: 12px; background: #fff; color: #333; box-shadow: 0 10px 32px rgba(0,0,0,.28), 0 0 0 1px rgba(0,0,0,.06); font-family: inherit; font-size: 13px; font-weight: 400; line-height: 1.4; letter-spacing: normal; text-align: left; text-transform: none; text-shadow: none; white-space: normal; animation: wkh-hc-in .12s ease-out; }
@keyframes wkh-hc-in { from { opacity: 0; } }
/* the arrow, towards what's hovered (the card under it, above it, or beside it) */
.wkh-hc::before { content: ''; position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; background: #fff; transform: rotate(45deg); }
.wkh-hc.below::before { top: 0; left: var(--wkh-hc-arrow, 50%); box-shadow: -1px -1px 0 rgba(0,0,0,.06); }
.wkh-hc.above::before { top: 100%; left: var(--wkh-hc-arrow, 50%); box-shadow: 1px 1px 0 rgba(0,0,0,.06); }
.wkh-hc.right::before { top: var(--wkh-hc-arrow, 50%); left: 0; box-shadow: -1px 1px 0 rgba(0,0,0,.06); }
.wkh-hc.left::before { top: var(--wkh-hc-arrow, 50%); left: 100%; box-shadow: 1px -1px 0 rgba(0,0,0,.06); }
.wkh-hc-body { position: relative; max-height: min(70vh, 480px); overflow: auto; padding: 12px; border-radius: 12px; }
.wkh-hc-loading { color: #999; text-align: center; padding: 6px 0; }
.wkh-hc-head { display: flex; align-items: center; gap: 10px; }
.wkh-hc-chars { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; min-width: 52px; height: 52px; padding: 0 8px; box-sizing: border-box; border-radius: 10px; color: #fff; font-size: 30px; line-height: 1; text-decoration: none; white-space: nowrap; box-shadow: inset 0 -3px 0 rgba(0,0,0,.15); }
.wkh-hc-chars.long { font-size: 22px; }
.wkh-hc-chars img { width: 30px; height: 30px; filter: brightness(0) invert(1); }
.wkh-hc-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wkh-hc-meaning { font-size: 16px; font-weight: 700; color: #2a2d48; overflow-wrap: anywhere; }
.wkh-hc-alt { font-size: 12px; color: #777; overflow-wrap: anywhere; }
.wkh-hc-kind { font-size: 11px; color: #999; }
.wkh-hc-readings { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin-top: 10px; font-size: 14px; }
.wkh-hc-readings dt { margin: 0; padding-top: 2px; font-size: 11px; font-weight: 700; color: #999; }
.wkh-hc-readings dd { margin: 0; color: #555; overflow-wrap: anywhere; }
.wkh-hc-readings dd b { color: #2a2d48; }
.wkh-hc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.wkh-hc-tag { padding: 1px 8px; border-radius: 999px; background: #f1f1f5; color: #555; font-size: 11px; font-weight: 700; line-height: 1.6; white-space: nowrap; }
.wkh-hc-tag.stage { color: #fff; }
.wkh-hc-accuracy { display: flex; gap: 12px; margin-top: 9px; }
.wkh-hc-part { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 11px; color: #888; white-space: nowrap; }
.wkh-hc-part b { color: #444; font-variant-numeric: tabular-nums; }
.wkh-hc-track { flex: 1; min-width: 24px; height: 5px; border-radius: 999px; background: #e7e8ee; overflow: hidden; }
.wkh-hc-track span { display: block; height: 100%; border-radius: 999px; }
.wkh-hc-session { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; padding: 8px 10px; border-radius: 9px; background: #f6f6fa; font-size: 12px; color: #555; }
.wkh-hc-session-head { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.wkh-hc-session-head small { margin-right: 2px; font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: .04em; }
.wkh-hc-session-head b { padding: 0 6px; border-radius: 999px; color: #fff; font-size: 10px; line-height: 1.6; }
.wkh-hc-session-head i { font-style: normal; font-weight: 800; color: #aaa; }
.wkh-hc-session-head i.up { color: #2f9e5f; }
.wkh-hc-session-head i.down { color: #e5484d; }
.wkh-hc-line.up { color: #2f9e5f; font-weight: 700; }
.wkh-hc-line.down { color: #e5484d; }
.wkh-hc-line.muted { color: #888; }
.wkh-hc-line.warn { color: #c98a00; font-weight: 700; }
.wkh-hc-line.serious { color: #e5484d; font-weight: 700; }
.wkh-hc-related { margin-top: 10px; padding-top: 9px; border-top: 1px solid #eee; }
.wkh-hc-related-title { margin-bottom: 6px; font-size: 10px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .04em; }
.wkh-hc-related-title em { font-style: normal; font-weight: 400; color: #aaa; }
.wkh-hc-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.wkh-hc-chip { display: inline-flex; align-items: baseline; gap: 5px; max-width: 100%; padding: 2px 8px 2px 6px; box-sizing: border-box; border-radius: 7px; background: #f3f3f7; color: #555; font-size: 11px; text-decoration: none; }
.wkh-hc-chip:hover { background: #e9e9f0; }
.wkh-hc-chip .c { font-size: 16px; font-weight: 700; line-height: 1.35; white-space: nowrap; }
.wkh-hc-chip .c img { width: 15px; height: 15px; vertical-align: -2px; }
.wkh-hc-chip .m { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wkh-hc-chip.locked { opacity: .55; }
.wkh-hc-chip.masked .m { letter-spacing: .1em; color: #aaa; }
.wkh-hc-more { align-self: center; padding: 2px 6px; font-size: 11px; font-weight: 700; color: #888; text-decoration: none; }
.wkh-hc-more:hover { color: #555; }
`;

/* ------------------------------------------------------------------ */
/* The subjects                                                        */
/* ------------------------------------------------------------------ */

const cache = new Map<number, { at: number; promise: Promise<Loaded>; value?: Loaded }>();

function load(id: number) {
	const cached = cache.get(id);
	if (cached && Date.now() - cached.at < CACHE_MS) return cached;
	const entry: { at: number; promise: Promise<Loaded>; value?: Loaded } = { at: Date.now(), promise: Promise.resolve(null) };
	entry.promise = browser.runtime.sendMessage({ type: 'wkh:getSubject', subjectId: id, includeRelated: true, ensureReviews: false })
		.then((result: any) => (result?.subject ? { subject: result.subject, related: result.related ?? {} } : null))
		.catch(() => null)
		.then((value: Loaded) => {
			entry.value = value;
			// nothing found: asked again next time
			if (!value) cache.delete(id);
			return value;
		});
	cache.set(id, entry);
	return entry;
}

const typeOf = (subject: any): string => String(subject?.type ?? subject?.object ?? subject?.subject_type ?? '').toLowerCase();
const isVocabulary = (type: string) => type === 'vocabulary' || type === 'kana_vocabulary';
const stageOf = (subject: any): number | null => {
	const stage = subject?.assignment?.srs_stage;
	return stage == null ? null : Number(stage);
};
const stageInfo = (stage: number | null) => (stage == null ? null : srsStages[stage as keyof typeof srsStages] ?? null);

function typeColor(type: string, appearance: Record<string, string>) {
	if (type === 'radical') return appearance.radical_color || '#00a1f1';
	if (type === 'kanji') return appearance.kanji_color || '#f100a1';
	return appearance.vocab_color || '#a100f1';
}

function primaryMeaning(subject: any): string {
	const meanings = (subject?.meanings ?? []) as Array<{ meaning: string; primary?: boolean }>;
	return (meanings.find(entry => entry.primary) ?? meanings[0])?.meaning ?? '';
}

function primaryReading(subject: any): string {
	const readings = (subject?.readings ?? []) as Array<{ reading: string; primary?: boolean }>;
	return (readings.find(entry => entry.primary) ?? readings[0])?.reading ?? '';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text != null) node.textContent = text;
	return node;
}

/** the characters, or a radical's image (radicals without characters) */
function characters(subject: any, node: HTMLElement) {
	if (subject?.characters) {
		node.textContent = subject.characters;
		return;
	}
	const images = (subject?.character_images ?? []) as Array<{ url: string; content_type: string }>;
	const image = images.find(entry => entry.content_type === 'image/svg+xml') ?? images.find(entry => entry.content_type === 'image/png');
	if (image?.url) {
		const img = el('img', '');
		img.src = image.url;
		img.alt = primaryMeaning(subject);
		node.append(img);
	} else {
		node.textContent = '?';
	}
}

function link(node: HTMLAnchorElement, url: unknown) {
	if (typeof url !== 'string' || !/^https:\/\/www\.wanikani\.com\//.test(url)) return;
	node.href = url;
	node.target = '_blank';
	node.rel = 'noopener';
}

const accuracyColor = (percent: number) => (percent >= 90 ? '#30a46c' : percent >= 75 ? '#f5a400' : '#e5484d');
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/* ------------------------------------------------------------------ */
/* The card's parts                                                    */
/* ------------------------------------------------------------------ */

function head(subject: any, type: string, appearance: Record<string, string>) {
	const box = el('div', 'wkh-hc-head');
	const chars = el('a', 'wkh-hc-chars');
	chars.lang = 'ja';
	chars.style.background = typeColor(type, appearance);
	if (String(subject.characters ?? '').length > 2) chars.classList.add('long');
	characters(subject, chars);
	link(chars, subject.document_url);
	const titles = el('div', 'wkh-hc-titles');
	titles.append(el('div', 'wkh-hc-meaning', primaryMeaning(subject) || '–'));
	const others = (subject.meanings ?? [])
		.filter((entry: any) => !entry.primary && entry.accepted_answer !== false)
		.map((entry: any) => entry.meaning);
	if (others.length) titles.append(el('div', 'wkh-hc-alt', others.join(', ')));
	const kind = type === 'radical' ? 'Radical' : type === 'kanji' ? 'Kanji' : type === 'kana_vocabulary' ? 'Kana word' : 'Vocabulary';
	const pieces = [kind, subject.level ? `Level ${subject.level}` : ''];
	if (isVocabulary(type) && subject.parts_of_speech?.length) {
		pieces.push(subject.parts_of_speech.slice(0, 3).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(', '));
	}
	titles.append(el('div', 'wkh-hc-kind', pieces.filter(Boolean).join(' · ')));
	box.append(chars, titles);
	return box;
}

/** a kanji's on'yomi / kun'yomi / nanori, a word's readings (the primary one in bold) */
function readings(subject: any, type: string) {
	const list = (subject.readings ?? []) as Array<{ reading: string; primary?: boolean; type?: string; accepted_answer?: boolean }>;
	if (!list.length || type === 'radical' || type === 'kana_vocabulary') return null;
	const rows: Array<[string, typeof list]> = type === 'kanji'
		? [
			['On\'yomi', list.filter(entry => entry.type === 'onyomi')],
			['Kun\'yomi', list.filter(entry => entry.type === 'kunyomi')],
			['Nanori', list.filter(entry => entry.type === 'nanori')],
		]
		: [['Reading', list]];
	const box = el('dl', 'wkh-hc-readings');
	for (const [label, entries] of rows) {
		if (!entries.length) continue;
		const value = el('dd', '');
		value.lang = 'ja';
		entries.forEach((entry, index) => {
			if (index) value.append('、');
			value.append(entry.primary ? el('b', '', entry.reading) : entry.reading);
		});
		box.append(el('dt', '', label), value);
	}
	return box.childElementCount ? box : null;
}

function tags(subject: any, stage: number | null) {
	const box = el('div', 'wkh-hc-tags');
	const info = stageInfo(stage);
	if (info) {
		const pill = el('span', 'wkh-hc-tag stage', info.name);
		pill.style.background = info.color;
		box.append(pill);
	} else {
		box.append(el('span', 'wkh-hc-tag', stage === 0 ? 'Lesson' : 'Locked'));
	}
	if (subject.jlpt) box.append(el('span', 'wkh-hc-tag', `JLPT ${subject.jlpt}`));
	if (subject.joyo) box.append(el('span', 'wkh-hc-tag', `Jōyō ${String(subject.joyo).replace('Grade ', 'Gr ')}`));
	return box;
}

/** how often each part is answered right (after the session, when it's from one) */
function accuracy(subject: any, type: string, session: HoverCardSession | null) {
	const parts = type === 'radical' || type === 'kana_vocabulary' ? ['meaning'] : ['meaning', 'reading'];
	const box = el('div', 'wkh-hc-accuracy');
	for (const part of parts) {
		const record = session?.parts?.[part];
		const right = record ? record.right : Number(subject.reviews?.[`${part}_correct`]) || 0;
		const wrong = record ? record.wrong : Number(subject.reviews?.[`${part}_incorrect`]) || 0;
		if (right + wrong === 0) continue;
		const percent = Math.round((right / (right + wrong)) * 100);
		const row = el('span', 'wkh-hc-part');
		row.title = `${part === 'meaning' ? 'Meaning' : 'Reading'}: ${percent}% right (${right} right, ${wrong} wrong)`;
		const track = el('span', 'wkh-hc-track');
		const fill = el('span', '');
		fill.style.width = `${percent}%`;
		fill.style.background = accuracyColor(percent);
		track.append(fill);
		row.append(part === 'meaning' ? 'Meaning' : 'Reading', track, el('b', '', `${percent}%`));
		box.append(row);
	}
	return box.childElementCount ? box : null;
}

function stagePill(stage: number) {
	const pill = el('b', '', stageInfo(stage)?.short ?? '–');
	pill.style.background = stageInfo(stage)?.color ?? '#8a8fa3';
	pill.title = stageInfo(stage)?.name ?? '';
	return pill;
}

/** what the review session changed: its SRS stage, the wrong answers, passing, trouble */
function sessionBox(session: HoverCardSession) {
	const box = el('div', 'wkh-hc-session');
	const first = el('div', 'wkh-hc-session-head');
	const direction = session.to > session.from ? 'up' : session.to < session.from ? 'down' : '';
	first.append(el('small', '', 'This session'), stagePill(session.from), el('i', direction, '→'), stagePill(session.to));
	box.append(first);
	const line = (text: string, tone = '') => box.append(el('div', `wkh-hc-line ${tone}`, text));
	const wrongParts = Object.entries(session.parts ?? {}).filter(([, record]) => record.now > 0);
	if (!session.wrong) line('All answers right', 'up');
	else {
		const detail = wrongParts.length > 1 || (wrongParts.length === 1 && Object.keys(session.parts ?? {}).length > 1)
			? ` (${wrongParts.map(([part, record]) => `${part} ${record.now}`).join(', ')})`
			: '';
		line(`${plural(session.wrong, 'wrong answer')}${detail}`, 'down');
	}
	if (session.passed === 'now') line('✓ Passed for the first time (reached Guru)', 'up');
	if (session.passed === 'not-yet') line('Not passed yet: it hasn\'t reached Guru', 'muted');
	if (session.trouble) line(`! ${session.trouble.text}`, session.trouble.serious ? 'serious' : 'warn');
	for (const note of session.notes ?? []) line(note.text, note.tone ?? '');
	return box;
}

/** a radical's kanji, a kanji's words (learned first, the lowest levels first), a word's kanji (in order) */
function related(subject: any, type: string, relatedById: Record<number, any>, hidden: Set<number>, appearance: Record<string, string>) {
	const ids: number[] = (type === 'radical' || type === 'kanji' ? subject.amalgamation_subject_ids : subject.component_subject_ids) ?? [];
	if (!ids.length || type === 'kana_vocabulary') return null;
	const title = type === 'radical' ? 'Used in kanji' : type === 'kanji' ? 'Used in vocabulary' : 'Kanji used';
	let entries = ids.map(id => relatedById[id]).filter(entry => entry && !entry.hidden_at);
	if (type !== 'vocabulary') {
		entries = entries
			.map((entry, index) => ({ entry, index, learned: (stageOf(entry) ?? 0) >= 1 }))
			.sort((a, b) => Number(b.learned) - Number(a.learned) || (Number(a.entry.level) || 99) - (Number(b.entry.level) || 99) || a.index - b.index)
			.map(item => item.entry);
	}
	if (!entries.length) return null;
	const box = el('div', 'wkh-hc-related');
	const heading = el('div', 'wkh-hc-related-title', `${title} `);
	heading.append(el('em', '', `(${entries.length})`));
	const chips = el('div', 'wkh-hc-chips');
	for (const entry of entries.slice(0, RELATED_LIMIT)) {
		const chip = el('a', 'wkh-hc-chip');
		link(chip, entry.document_url);
		// not learned yet: faded (its stage is in the chip's tooltip)
		const stage = stageOf(entry);
		const info = stage != null && stage >= 1 ? stageInfo(stage) : null;
		if (!info) chip.classList.add('locked');
		const chars = el('span', 'c');
		chars.lang = 'ja';
		chars.style.color = typeColor(typeOf(entry), appearance);
		characters(entry, chars);
		// the question on screen: its meaning and reading stay hidden
		const masked = hidden.has(Number(entry.id));
		chip.append(chars, el('span', 'm', masked ? '•••' : primaryMeaning(entry)));
		if (masked) {
			chip.classList.add('masked');
			chip.title = 'On screen now: hidden until it\'s answered';
		} else {
			chip.title = [primaryMeaning(entry), primaryReading(entry), info?.name ?? (stage === 0 ? 'Lesson not done yet' : 'Locked')].filter(Boolean).join(' · ');
		}
		chips.append(chip);
	}
	if (entries.length > RELATED_LIMIT) {
		const more = el('a', 'wkh-hc-more', `+${entries.length - RELATED_LIMIT}`);
		link(more, subject.document_url);
		chips.append(more);
	}
	box.append(heading, chips);
	return box;
}

function content(data: NonNullable<Loaded>, options: HoverCardOptions): Node[] {
	const { subject } = data;
	const type = typeOf(subject);
	const appearance = options.appearance?.() ?? {};
	const session = options.session?.() ?? null;
	const hidden = new Set<number>();
	for (const id of options.hidden?.() ?? []) if (id != null) hidden.add(Number(id));
	// after the session: its new stage (the cache may still have the old one)
	const stage = session ? session.to : stageOf(subject);
	const nodes: Array<HTMLElement | null> = [
		head(subject, type, appearance),
		readings(subject, type),
		tags(subject, stage),
		accuracy(subject, type, session),
		session ? sessionBox(session) : null,
		related(subject, type, data.related, hidden, appearance),
	];
	return nodes.filter((node): node is HTMLElement => node != null);
}

/* ------------------------------------------------------------------ */
/* Showing it                                                          */
/* ------------------------------------------------------------------ */

let card: HTMLElement | null = null;
let body: HTMLElement | null = null;
let current: { target: HTMLElement; options: HoverCardOptions } | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let watchTimer: ReturnType<typeof setInterval> | undefined;
let showId = 0;

function ensureStyle() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = STYLE;
	document.head.append(style);
}

function ensureCard() {
	if (card?.isConnected && body) return { card, body };
	card = el('div', 'wkh-hc');
	card.setAttribute('role', 'tooltip');
	body = el('div', 'wkh-hc-body');
	card.append(body);
	// the pointer moving onto the card keeps it (its links can be clicked)
	card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
	card.addEventListener('mouseleave', scheduleHide);
	document.body.append(card);
	return { card, body };
}

/**
 * Next to what's hovered, never over it: under it, else above it, else beside it (right, then
 * left); its arrow pointing at it. No room anywhere: the side with the most, kept on screen.
 */
function place(box: HTMLElement, target: HTMLElement) {
	const rect = target.getBoundingClientRect();
	const margin = 8;
	const gap = 10;
	box.style.visibility = 'hidden';
	box.style.left = '0px';
	box.style.top = '0px';
	const width = box.offsetWidth;
	const height = box.offsetHeight;
	const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
	const viewportHeight = window.innerHeight;
	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	const side = rect.bottom + gap + height <= viewportHeight - margin ? 'below'
		: rect.top - gap - height >= margin ? 'above'
			: rect.right + gap + width <= viewportWidth - margin ? 'right'
				: rect.left - gap - width >= margin ? 'left'
					: rect.top > viewportHeight - rect.bottom ? 'above' : 'below';
	let left: number;
	let top: number;
	if (side === 'below' || side === 'above') {
		left = clamp(centerX - width / 2, margin, viewportWidth - width - margin);
		top = side === 'below'
			? clamp(rect.bottom + gap, margin, viewportHeight - height - margin)
			: clamp(rect.top - gap - height, margin, viewportHeight - height - margin);
		box.style.setProperty('--wkh-hc-arrow', `${Math.round(clamp(centerX - left, 16, width - 16))}px`);
	} else {
		left = side === 'right' ? rect.right + gap : rect.left - gap - width;
		top = clamp(centerY - height / 2, margin, viewportHeight - height - margin);
		box.style.setProperty('--wkh-hc-arrow', `${Math.round(clamp(centerY - top, 16, height - 16))}px`);
	}
	box.classList.remove('below', 'above', 'right', 'left');
	box.classList.add(side);
	box.style.left = `${Math.round(left)}px`;
	box.style.top = `${Math.round(top)}px`;
	box.style.visibility = '';
}

async function show(target: HTMLElement, options: HoverCardOptions) {
	if (!target.isConnected) return;
	const token = ++showId;
	ensureStyle();
	current = { target, options };
	const entry = load(options.subjectId);
	const parts = ensureCard();
	if (entry.value === undefined) {
		parts.body.replaceChildren(el('div', 'wkh-hc-loading', 'Loading…'));
		place(parts.card, target);
	}
	const data = entry.value !== undefined ? entry.value : await entry.promise;
	if (token !== showId || current?.target !== target) return;
	if (!data) {
		hideSubjectHoverCard();
		return;
	}
	parts.body.replaceChildren(...content(data, options));
	parts.body.scrollTop = 0;
	place(parts.card, target);
	// what it's about went away (WaniKani's next question, the summary closed): the card too
	clearInterval(watchTimer);
	watchTimer = setInterval(() => {
		if (!current?.target.isConnected) hideSubjectHoverCard();
	}, 300);
}

function scheduleHide() {
	clearTimeout(hideTimer);
	hideTimer = setTimeout(hideSubjectHoverCard, HIDE_DELAY_MS);
}

function onScroll(event: Event) {
	// the card's own list scrolling: it stays
	if (card && event.target instanceof Node && card.contains(event.target)) return;
	if (current) hideSubjectHoverCard();
}

export function hideSubjectHoverCard() {
	showId++;
	clearTimeout(showTimer);
	clearTimeout(hideTimer);
	clearInterval(watchTimer);
	current = null;
	card?.remove();
	card = null;
	body = null;
}

let listening = false;

/** Hovering (or focusing) `target` shows the card about a subject, next to it. */
export function bindSubjectHoverCard(target: HTMLElement, options: HoverCardOptions) {
	if (!listening) {
		listening = true;
		window.addEventListener('scroll', onScroll, true);
		window.addEventListener('resize', () => hideSubjectHoverCard());
	}
	const enter = () => {
		clearTimeout(hideTimer);
		if (current?.target === target && card?.isConnected) return;
		clearTimeout(showTimer);
		// asked already: often there by the time the card shows
		load(options.subjectId);
		showTimer = setTimeout(() => void show(target, options), SHOW_DELAY_MS);
	};
	const leave = () => {
		clearTimeout(showTimer);
		if (current?.target === target) scheduleHide();
	};
	target.addEventListener('mouseenter', enter);
	target.addEventListener('mouseleave', leave);
	target.addEventListener('focus', enter);
	target.addEventListener('blur', leave);
}
