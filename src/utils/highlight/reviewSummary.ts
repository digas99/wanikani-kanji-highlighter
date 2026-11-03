/**
 * WaniKani's reviews: when a session ends (WaniKani goes back to the dashboard, or you leave),
 * a summary of it on the next WaniKani page: how many subjects, how many all right, and which
 * went up or down (with their SRS change). Settings → Details → WaniKani reviews.
 *
 * The results come from reviewInfo.ts (which follows the quiz); they're kept in the tab's
 * sessionStorage, so a full page load between the reviews and the dashboard keeps them.
 */

import { storage } from '#imports';
import { levelUpInfo, srsStages } from '@/utils/scripts/wanikani';
import { bindSubjectHoverCard, hideSubjectHoverCard, type HoverCardSession } from './subjectHoverCard';

const LOG_KEY = 'wkh-review-session';
/** a session left longer ago than this isn't shown anymore */
const MAX_AGE_MS = 3 * 60 * 60 * 1000;
const QUIZ_PAGE = /^\/subjects\/(review|lesson|extra_study)/;
const STYLE_ID = 'wkh-review-summary-style';
const OVERLAY_ID = 'wkh-review-summary';

export type SessionResult = {
	id: number;
	characters: string;
	type: string;
	from: number;
	to: number;
	wrong: number;
	/** each part's record after the session (right / wrong answers overall; `now`: wrong this session) */
	parts?: Record<string, { right: number; wrong: number; now: number }>;
	/** not passed before this session: passed in it ('now'), or still not ('not-yet') */
	passed?: 'now' | 'not-yet' | 'before';
	/** still a trouble subject after the session (troubleSubjects.ts) */
	trouble?: { serious: boolean; text: string };
	url: string | null;
};

type SessionLog = { updatedAt: number; results: SessionResult[] };

let enabled = false;
let appearance: Record<string, string> = {};

function readLog(): SessionLog | null {
	try {
		const log = JSON.parse(sessionStorage.getItem(LOG_KEY) ?? 'null');
		return log && Array.isArray(log.results) ? log : null;
	} catch {
		return null;
	}
}

function clearLog() {
	try {
		sessionStorage.removeItem(LOG_KEY);
	} catch {
		// nothing kept
	}
}

export function isReviewSummaryEnabled() {
	return enabled;
}

/** A subject finished in the reviews (both parts answered). */
export function recordSessionResult(result: SessionResult) {
	if (!enabled) return;
	try {
		const log = readLog();
		const results = log && Date.now() - log.updatedAt < MAX_AGE_MS ? log.results : [];
		const at = results.findIndex(entry => entry.id === result.id);
		if (at >= 0) results[at] = result;
		else results.push(result);
		sessionStorage.setItem(LOG_KEY, JSON.stringify({ updatedAt: Date.now(), results }));
	} catch {
		// no summary then
	}
}

const STYLE = `
#${OVERLAY_ID} { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(20, 22, 38, .55); font-family: inherit; animation: wkh-rs-in .15s ease-out; }
@keyframes wkh-rs-in { from { opacity: 0; } }
.wkh-rs-card { position: relative; width: min(720px, 100%); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 18px 20px 14px; border-radius: 16px; background: #fff; color: #333; box-shadow: 0 16px 48px rgba(0,0,0,.3); }
.wkh-rs-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.wkh-rs-head img { width: 26px; height: 26px; border-radius: 6px; }
.wkh-rs-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.wkh-rs-title { font-size: 18px; font-weight: 700; color: #2a2d48; }
.wkh-rs-subtitle { font-size: 12px; color: #888; }
.wkh-rs-close { width: 30px; height: 30px; border: none; border-radius: 8px; background: #f1f1f5; color: #555; font-size: 18px; line-height: 1; cursor: pointer; }
.wkh-rs-close:hover { background: #e4e4ec; }
.wkh-rs-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.wkh-rs-stat { display: flex; flex-direction: column; align-items: center; padding: 9px 4px 8px; border-radius: 12px; background: #f5f5f9; }
.wkh-rs-stat b { font-size: 22px; line-height: 1.15; color: #2a2d48; font-variant-numeric: tabular-nums; }
.wkh-rs-stat small { font-size: 11px; color: #777; white-space: nowrap; }
.wkh-rs-stat.up { background: #eaf7ef; }
.wkh-rs-stat.up b { color: #2f9e5f; }
.wkh-rs-stat.down { background: #fdeced; }
.wkh-rs-stat.down b { color: #e5484d; }
.wkh-rs-stat.same b { color: #8a8fa3; }
/* went down and stayed: one tile (one group, as below), each its number */
.wkh-rs-stat-pair { grid-column: span 2; display: flex; align-items: stretch; border-radius: 12px; background: linear-gradient(90deg, #fdeced 50%, #f3f3f7); }
.wkh-rs-stat-pair .wkh-rs-stat { flex: 1; background: none; }
.wkh-rs-stat-pair i { width: 1px; margin: 10px 0; background: rgba(0,0,0,.08); }
.wkh-rs-bar { display: flex; height: 6px; margin: 10px 0 12px; border-radius: 999px; overflow: hidden; background: #eee; }
.wkh-rs-bar span { height: 100%; }
.wkh-rs-milestones { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.wkh-rs-milestone { padding: 2px 10px; border-radius: 999px; color: #fff; font-size: 12px; font-weight: 700; }
.wkh-rs-section { margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee; }
.wkh-rs-section-title { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; font-size: 12px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .04em; }
.wkh-rs-section-title i { width: 8px; height: 8px; border-radius: 50%; }
.wkh-rs-section-title em { margin-left: 2px; font-style: normal; font-weight: 400; color: #999; text-transform: none; letter-spacing: 0; }
.wkh-rs-chips { display: flex; flex-wrap: wrap; gap: 10px 8px; padding-top: 4px; }
/* justified, as text: each full row stretches its chips to the edge; the last row keeps their size */
.wkh-rs-chips::after { content: ''; flex: 999 1 0; }
.wkh-rs-chip { position: relative; flex: 1 0 auto; display: flex; flex-direction: column; min-width: 64px; border-radius: 10px; background: #f5f5f9; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,.08); transition: transform .12s, box-shadow .12s; }
.wkh-rs-chip:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,.15); }
.wkh-rs-chip-chars { padding: 3px 12px 2px; border-radius: 10px 10px 0 0; color: #fff; font-size: 20px; line-height: 1.3; text-align: center; white-space: nowrap; box-shadow: inset 0 -2px 0 rgba(0,0,0,.15); }
.wkh-rs-chip-stages { display: flex; align-items: center; justify-content: center; gap: 3px; padding: 4px 5px; }
.wkh-rs-chip-stages b { padding: 0 5px; border-radius: 999px; color: #fff; font-size: 10px; font-weight: 700; line-height: 1.6; }
.wkh-rs-chip-stages span { font-size: 10px; font-weight: 800; color: #aaa; }
.wkh-rs-chip-stages span.up { color: #2f9e5f; }
.wkh-rs-chip-stages span.down { color: #e5484d; }
.wkh-rs-chip-bars { display: flex; flex-direction: column; gap: 3px; padding: 0 7px 6px; }
.wkh-rs-part { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; line-height: 1; color: #999; }
.wkh-rs-part.missed { color: #e5484d; }
.wkh-rs-part-track { flex: 1; height: 4px; border-radius: 999px; background: #e2e3ea; overflow: hidden; }
.wkh-rs-part-track span { display: block; height: 100%; border-radius: 999px; }
.wkh-rs-chip-chars.has-trouble { position: relative; padding-left: 22px; padding-right: 22px; }
.wkh-rs-trouble { position: absolute; top: 50%; left: 4px; margin-top: -7px; width: 14px; height: 14px; border-radius: 50%; background: #fff; color: #e0a020; font-size: 10px; font-weight: 900; line-height: 14px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.wkh-rs-trouble.serious { color: #e5484d; }
.wkh-rs-status { position: absolute; top: -6px; right: -6px; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; box-sizing: border-box; border: 2px solid #fff; border-radius: 50%; background: #fff; font-size: 10px; font-weight: 900; line-height: 1; box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.wkh-rs-status.now { background: #30a46c; color: #fff; }
.wkh-rs-status.not-yet { border-color: #c4c6d2; box-shadow: inset 0 0 0 2px #fff; }
.wkh-rs-status.before { border-color: #9fd8b8; color: #30a46c; }
.wkh-rs-level { display: flex; align-items: center; gap: 10px; margin: -2px 0 12px; font-size: 12px; color: #666; }
.wkh-rs-level b { color: #2a2d48; white-space: nowrap; }
.wkh-rs-level-track { position: relative; flex: 1; height: 8px; border-radius: 999px; background: #ececf2; overflow: hidden; }
.wkh-rs-level-track span { position: absolute; top: 0; bottom: 0; box-sizing: border-box; }
/* the segments join flat; only the bar's end is round (the track rounds its start) */
.wkh-rs-level-track span:last-child { border-radius: 0 999px 999px 0; }
.wkh-rs-level-track .kept { left: 0; background: linear-gradient(90deg, #f100a1, #a100f1); }
.wkh-rs-level-track .gain { background: #30a46c; }
/* lost in the session (a kanji not passed yet dropping): what it was, see-through, dotted */
.wkh-rs-level-track .loss { background: rgba(229, 72, 77, .08); border: 1.5px dotted #e5484d; }
.wkh-rs-level-value { white-space: nowrap; font-variant-numeric: tabular-nums; }
.wkh-rs-level-value .up { color: #2f9e5f; font-weight: 700; }
.wkh-rs-level-value .down { color: #e5484d; font-weight: 700; }
.wkh-rs-level-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: -6px 0 12px; font-size: 11px; color: #888; }
.wkh-rs-level-legend i { display: inline-block; width: 10px; height: 6px; margin-right: 4px; border-radius: 3px; vertical-align: 1px; }
/* a chip whose stage moved the level's progress: outlined */
.wkh-rs-chip.level-up { border: 3px dashed #30a46c; }
.wkh-rs-chip.level-down { box-shadow: 0 0 0 2px #e5484d; }
.wkh-rs-foot { margin-top: 14px; font-size: 11px; color: #999; text-align: right; }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text != null) node.textContent = text;
	return node;
}

const stage = (value: number) => srsStages[value as keyof typeof srsStages];
const typeColor = (type: string) => (type === 'radical'
	? appearance.radical_color || '#00a1f1'
	: type === 'kanji'
		? appearance.kanji_color || '#f100a1'
		: appearance.vocab_color || '#a100f1');
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** the level's progress a chip's kanji moved (its card says so) */
const levelNotes = new Map<number, NonNullable<HoverCardSession['notes']>[number]>();

function close() {
	hideSubjectHoverCard();
	document.getElementById(OVERLAY_ID)?.remove();
	document.removeEventListener('keydown', onKey, true);
}

function onKey(event: KeyboardEvent) {
	if (event.key === 'Escape') close();
}

function stagePill(value: number) {
	const pill = el('b', '', stage(value)?.short ?? '–');
	pill.style.background = stage(value)?.color ?? '#8a8fa3';
	return pill;
}

const accuracyColor = (percent: number) => (percent >= 90 ? '#30a46c' : percent >= 75 ? '#f5a400' : '#e5484d');

/** A bar per part (meaning, reading): its accuracy overall, this session included. */
function partBars(result: SessionResult) {
	const entries = Object.entries(result.parts ?? {}).filter(([, record]) => record.right + record.wrong > 0);
	if (!entries.length) return null;
	const bars = el('span', 'wkh-rs-chip-bars');
	for (const [part, record] of entries) {
		const percent = Math.round((record.right / (record.right + record.wrong)) * 100);
		// the numbers: in the chip's card (subjectHoverCard.ts)
		const row = el('span', `wkh-rs-part${record.now ? ' missed' : ''}`, part === 'meaning' ? 'M' : 'R');
		const track = el('span', 'wkh-rs-part-track');
		const fill = el('span', '');
		fill.style.width = `${percent}%`;
		fill.style.background = accuracyColor(percent);
		track.append(fill);
		row.append(track);
		bars.append(row);
	}
	return bars;
}

function chips(results: SessionResult[]) {
	const row = el('div', 'wkh-rs-chips');
	for (const result of results) {
		const chip = el('a', 'wkh-rs-chip');
		chip.dataset.id = String(result.id);
		if (result.url) {
			chip.href = result.url;
			chip.target = '_blank';
		}
		// hovered: a card with the subject's details and what the session changed (no tooltips
		// inside the chip, they'd cover it)
		bindSubjectHoverCard(chip, {
			subjectId: result.id,
			session: () => ({ ...result, notes: levelNotes.has(result.id) ? [levelNotes.get(result.id)!] : [] }),
			appearance: () => appearance,
		});
		const characters = el('span', 'wkh-rs-chip-chars', result.characters || '?');
		characters.lang = 'ja';
		characters.style.background = typeColor(result.type);
		const direction = result.to > result.from ? 'up' : result.to < result.from ? 'down' : '';
		const stages = el('span', 'wkh-rs-chip-stages');
		stages.append(stagePill(result.from), el('span', direction, '→'), stagePill(result.to));
		chip.append(characters, stages);
		const bars = partBars(result);
		if (bars) chip.append(bars);
		// in the corner of every chip: passed in this session (green ✓), before it (outlined ✓), or
		// not yet (○). The wrong answers are in the chip's card.
		if (result.passed) {
			const status = el('span', `wkh-rs-status ${result.passed}`, result.passed === 'not-yet' ? '' : '✓');
			status.setAttribute('aria-label', {
				now: 'Passed in this session: reached Guru for the first time',
				before: 'Passed before',
				'not-yet': 'Not passed yet: it hasn\'t reached Guru',
			}[result.passed]);
			chip.append(status);
		}
		// a trouble subject: ! in the corner (red: the worst); the characters stay centred
		if (result.trouble) {
			const mark = el('span', `wkh-rs-trouble${result.trouble.serious ? ' serious' : ''}`, '!');
			mark.setAttribute('aria-label', result.trouble.text);
			characters.classList.add('has-trouble');
			characters.append(mark);
		}
		row.append(chip);
	}
	return row;
}

function section(title: string, color: string, results: SessionResult[], note = '') {
	const box = el('div', 'wkh-rs-section');
	const heading = el('div', 'wkh-rs-section-title');
	const dot = el('i', '');
	dot.style.background = color;
	heading.append(dot, `${title} (${results.length})`);
	if (note) heading.append(el('em', '', note));
	box.append(heading, chips(results));
	return box;
}

/**
 * The current level's progress (its kanji's SRS stages toward passing, as the popup's level bar),
 * before and after the session: the level's kanji from the cache, with the session's changes.
 */
async function levelRow(results: SessionResult[]): Promise<{ nodes: HTMLElement[]; movers: Array<{ id: number; up: boolean; text: string }>; level: number } | null> {
	let data: { level: number; kanji: any[] } | null = null;
	try {
		data = await browser.runtime.sendMessage({ type: 'wkh:getLevelKanji' });
	} catch {
		return null;
	}
	if (!data?.kanji?.length) return null;
	const byId = new Map(results.map(result => [result.id, result]));
	const percentage = (after: boolean) => levelUpInfo(data!.kanji.map(kanji => {
		const result = byId.get(kanji.id);
		if (!result) return kanji;
		// passed in this session: not before it (the cache may already have the new date), yes after
		const passedAt = result.passed === 'now' ? (after ? 'session' : null) : kanji.assignment.passed_at;
		return { ...kanji, assignment: { ...kanji.assignment, srs_stage: after ? result.to : result.from, passed_at: passedAt } };
	})).progress.percentage;
	const before = percentage(false);
	const after = percentage(true);

	const row = el('div', 'wkh-rs-level');
	row.title = 'Level progress: the SRS stages of the kanji needed to level up (90% of the level\'s kanji at Guru)';
	const track = el('div', 'wkh-rs-level-track');
	const part = (className: string, from: number, to: number) => {
		const span = el('span', className);
		span.style.left = `${from}%`;
		span.style.width = `${Math.max(0, to - from)}%`;
		track.append(span);
	};
	part('kept', 0, Math.min(before, after));
	if (after > before) part('gain', before, after);
	if (after < before) part('loss', after, before);
	const value = el('span', 'wkh-rs-level-value');
	const delta = Math.round(after) - Math.round(before);
	value.append(`${Math.round(before)}% → ${Math.round(after)}%`);
	if (delta) value.append(' ', el('span', delta > 0 ? 'up' : 'down', `${delta > 0 ? '+' : ''}${delta}%`));
	row.append(el('b', '', `Level ${data.level}`), track, value);

	// what the colors are: before the session, and what it added (or lost)
	const legend = el('div', 'wkh-rs-level-legend');
	const key = (style: string, label: string) => {
		const item = el('span', '');
		const swatch = el('i', '');
		swatch.style.cssText = style;
		item.append(swatch, label);
		legend.append(item);
	};
	key('background: linear-gradient(90deg, #f100a1, #a100f1)', 'before this session');
	if (after > before) key('background: #30a46c', `+${(after - before).toFixed(1)}% this session`);
	if (after < before) key('background: rgba(229, 72, 77, .08); border: 1px dotted #e5484d; box-sizing: border-box', `${(after - before).toFixed(1)}% this session`);

	// the subjects that moved it: this level's kanji whose stage changed
	// (a kanji's share: 5 once passed, else its stage up to 5, as levelUpInfo counts it)
	const passedBefore = new Map(data.kanji.map(kanji => [kanji.id, Boolean(kanji.assignment.passed_at)]));
	const share = (result: SessionResult, after: boolean) => {
		const passed = result.passed === 'now' ? after : result.passed === 'before' || (result.passed == null && passedBefore.get(result.id));
		return passed ? 5 : Math.min(after ? result.to : result.from, 5);
	};
	const movers = results
		.filter(result => passedBefore.has(result.id) && share(result, true) !== share(result, false))
		.map(result => ({ id: result.id, up: share(result, true) > share(result, false), text: `Level ${data!.level} kanji: ${stage(result.from)?.name} → ${stage(result.to)?.name}, ${result.to > result.from ? 'moved' : 'set back'} the level's progress` }));
	if (movers.length) {
		const count = movers.length;
		const tagged = el('span', '');
		tagged.append(`${count} kanji of this level moved it (outlined)`);
		legend.append(tagged);
	}

	return { nodes: [row, legend], movers, level: data.level };
}

/** Outlines the chips of the level's kanji that moved its progress. */
function outlineMovers(card: HTMLElement, movers: Array<{ id: number; up: boolean; text: string }>) {
	for (const mover of movers) {
		const chip = card.querySelector<HTMLElement>(`.wkh-rs-chip[data-id="${mover.id}"]`);
		if (!chip) continue;
		// outlined (green: moved it forward, red: set it back); why, in its card
		chip.classList.add(mover.up ? 'level-up' : 'level-down');
		levelNotes.set(mover.id, { text: mover.text, tone: mover.up ? 'up' : 'down' });
	}
}

function show(results: SessionResult[]) {
	close();
	levelNotes.clear();
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = STYLE;
		document.head.append(style);
	}
	// the biggest moves first
	const up = results.filter(result => result.to > result.from).sort((a, b) => b.to - a.to || (b.to - b.from) - (a.to - a.from));
	const down = results.filter(result => result.to < result.from).sort((a, b) => (b.from - b.to) - (a.from - a.to) || b.wrong - a.wrong);
	const same = results.filter(result => result.to === result.from);
	const allRight = results.filter(result => !result.wrong).length;

	const overlay = el('div', '');
	overlay.id = OVERLAY_ID;
	overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
	const card = el('div', 'wkh-rs-card');
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-label', 'Review session summary');

	const head = el('div', 'wkh-rs-head');
	const logo = el('img', '');
	logo.src = browser.runtime.getURL('/icon/32.png');
	logo.alt = '';
	const titles = el('div', 'wkh-rs-titles');
	titles.append(
		el('div', 'wkh-rs-title', 'Review session'),
		el('div', 'wkh-rs-subtitle', `${plural(results.length, 'subject')} · ${allRight} all right`),
	);
	const closeButton = el('button', 'wkh-rs-close', '×');
	closeButton.type = 'button';
	closeButton.title = 'Close';
	closeButton.addEventListener('click', close);
	head.append(logo, titles, closeButton);

	const stats = el('div', 'wkh-rs-stats');
	const stat = (value: string, label: string, kind = '') => {
		const box = el('div', `wkh-rs-stat ${kind}`);
		box.append(el('b', '', value), el('small', '', label));
		return box;
	};
	stats.append(
		stat(`${Math.round((allRight / results.length) * 100)}%`, 'all right'),
		stat(String(up.length), 'went up', 'up'),
	);
	const pair = el('div', 'wkh-rs-stat-pair');
	pair.append(stat(String(down.length), 'went down', 'down'), el('i', ''), stat(String(same.length), 'stayed', 'same'));
	stats.append(pair);
	// the session at a glance: up / down / stayed
	const bar = el('div', 'wkh-rs-bar');
	// went up, and went down or stayed (one red part: one group, as below)
	const parts: Array<[number, string]> = [[up.length, '#30a46c'], [down.length + same.length, '#e5484d']];
	for (const [count, color] of parts) {
		if (!count) continue;
		const part = el('span', '');
		part.style.width = `${(count / results.length) * 100}%`;
		part.style.background = color;
		bar.append(part);
	}
	card.append(head, stats, bar);
	// the level's progress, once the background answers (after the bar)
	void levelRow(results).then(found => {
		if (!found || !bar.isConnected) return;
		bar.after(...found.nodes);
		outlineMovers(card, found.movers);
	});

	// stages reached this session
	const milestones = el('div', 'wkh-rs-milestones');
	const reached = (value: number, label: string) => {
		const count = up.filter(result => result.to === value).length;
		if (!count) return;
		const pill = el('span', 'wkh-rs-milestone', `${count} ${label}`);
		pill.style.background = stage(value).color;
		milestones.append(pill);
	};
	reached(5, 'reached Guru');
	reached(7, 'reached Master');
	reached(8, 'reached Enlightened');
	reached(9, 'burned');
	const pill = (count: number, label: string, color: string, title: string) => {
		if (!count) return;
		const element = el('span', 'wkh-rs-milestone', `${count} ${label}`);
		element.style.background = color;
		element.title = title;
		milestones.append(element);
	};
	pill(results.filter(result => result.passed === 'now').length, 'passed for the first time', '#30a46c', 'Reached Guru for the first time');
	const trouble = results.filter(result => result.trouble);
	pill(trouble.length, trouble.length === 1 ? 'trouble subject' : 'trouble subjects', trouble.some(result => result.trouble?.serious) ? '#e5484d' : '#e0a020', 'Subjects you keep getting wrong (marked with !)');
	if (milestones.childElementCount) card.append(milestones);

	// with mistakes: the ones that went down, then the ones that stayed (Apprentice I can't go lower)
	const missed = [...down, ...same];
	if (missed.length) {
		// always one group: staying (at Apprentice I) is a miss too
		card.append(section('Went down or stayed', '#e5484d', missed, `${down.length} down · ${same.length} stayed`));
	}
	if (up.length) card.append(section('Went up', '#30a46c', up));
	card.append(el('div', 'wkh-rs-foot', 'WaniKani Kanji Highlighter · Esc to close'));

	overlay.append(card);
	document.body.append(overlay);
	document.addEventListener('keydown', onKey, true);
}

/** On any WaniKani page but the quizzes: a session just finished? Show it (once). */
function check() {
	if (!enabled || QUIZ_PAGE.test(location.pathname)) return;
	const log = readLog();
	if (!log) return;
	clearLog();
	if (!log.results.length || Date.now() - log.updatedAt > MAX_AGE_MS) return;
	show(log.results);
}

function applySettings(settings: any) {
	enabled = settings?.review_summary?.enabled === true;
	appearance = settings?.appearance ?? {};
	if (!enabled) clearLog();
}

export async function mountReviewSummary(): Promise<void> {
	if (location.hostname !== 'www.wanikani.com') return;
	applySettings(await storage.getItem<any>('local:settings'));
	storage.watch<any>('local:settings', applySettings);
	check();
	// WaniKani moves between its pages without reloading (Turbo)
	document.addEventListener('turbo:load', check);
}
