/**
 * WaniKani's reviews page (Settings → Details → WaniKani reviews, off by default): the subject's
 * info, placed in WaniKani's own review layout. Nothing that gives the answer away: never a
 * meaning, reading or translation.
 *
 *  - the header's top bar (`.character-header__menu-title`): SRS stage, level, JLPT / Jōyō
 *  - the header's characters: words shown in one of their context sentences (Japanese only),
 *    the word marked
 *  - under the question label (`.quiz-input`): how often the meaning / reading were answered right
 *  - WaniKani's stats at the top right (`.quiz-statistics`): the last subject's SRS change
 *
 * The subject on screen and the question come from the page itself; the answers from the quiz's
 * events (forwarded by the injected wk-review-bridge.js). The stage at the session's start is
 * WaniKani's own (`#quiz-queue`'s subjectIdsWithSRS); the wrong answers are WaniKani's own count
 * (the events' subject stats), else the 'fail' answers added up; the change is worked out as
 * WaniKani does: up one when all answers were right, else down ceil(wrong / 2), doubled from
 * Guru, at least 1.
 */

import { storage } from '#imports';
import { injectScript } from 'wxt/utils/inject-script';
import { srsStages } from '@/utils/scripts/wanikani';
import { isReviewSummaryEnabled, recordSessionResult, type SessionResult } from './reviewSummary';
import { bindSubjectHoverCard } from './subjectHoverCard';
import { troubleOf, troubleText } from '@/utils/scripts/troubleSubjects';

const REVIEW_PAGE = /^\/subjects\/review\/?$/;
const STYLE_ID = 'wkh-review-style';
/** SRS stage → its colour in Settings → Appearance */
const STAGE_COLOR_KEYS = ['int_color', 'ap1_color', 'ap2_color', 'ap3_color', 'ap4_color', 'gr1_color', 'gr2_color', 'mst_color', 'enl_color', 'brn_color'];

let enabled = false;
/** words shown in their sentence, in the word's place (else the sentence goes under the word) */
let replaceWord = false;
let showExamples = true;
/** examples shown under a kanji / radical */
const EXAMPLE_COUNT = 4;
let appearance: Record<string, string> = {};
let active = false;
let bridgeInjected = false;
let observer: MutationObserver | null = null;
let renderQueued = false;

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

const subjects = new Map<string, Promise<any | null>>();

function fetchSubject(query: { subjectId?: number; characters?: string; subjectType?: string }): Promise<any | null> {
	const key = query.subjectId != null ? `id:${query.subjectId}` : `${query.subjectType}:${query.characters}`;
	if (!subjects.has(key)) {
		subjects.set(key, browser.runtime.sendMessage({ type: 'wkh:getSubject', includeRelated: false, ...query })
			.then((result: any) => result?.subject ?? null)
			.catch(() => null));
	}
	return subjects.get(key)!;
}

const typeOf = (subject: any): string => String(subject?.object ?? subject?.type ?? subject?.subject_type ?? '').toLowerCase();

/** Which questions a subject has (radicals and kana-only words: meaning only). */
const partsOf = (type: string) => (type === 'radical' || type === 'kana_vocabulary' ? ['meaning'] : ['meaning', 'reading']);

/** WaniKani's own: each subject's SRS stage when this session started. */
function sessionStages(): Map<number, number> {
	const stages = new Map<number, number>();
	try {
		const text = document.querySelector('[data-quiz-queue-target="subjectIdsWithSRS"]')?.textContent ?? '';
		for (const [id, stage] of JSON.parse(text)?.subject_ids_with_srs_info ?? []) stages.set(Number(id), Number(stage));
	} catch {
		// the cached stage is used instead
	}
	return stages;
}

/** The subject on screen: its id from the queue's subjects (by characters and type), else the cache. */
function idFromQueue(characters: string, type: string): number | null {
	try {
		const list = JSON.parse(document.querySelector('[data-quiz-queue-target="subjects"]')?.textContent ?? '[]');
		const found = list.find((entry: any) => entry?.characters === characters && String(entry?.type ?? '').toLowerCase().replace(/ /g, '_') === type);
		return found ? Number(found.id) : null;
	} catch {
		return null;
	}
}

/* ------------------------------------------------------------------ */
/* The session                                                         */
/* ------------------------------------------------------------------ */

const startStage = new Map<number, number>();
/** 'fail' answers added up (only used when WaniKani's own count isn't in the events) */
const wrongAnswers = new Map<number, number>();
/** WaniKani's own count of each subject's wrong answers, from the events' stats */
const wkIncorrect = new Map<number, number>();
/** the same, per part (WaniKani's count; else the 'fail' answers per part) */
const wkIncorrectParts = new Map<number, Record<string, number>>();
const wrongParts = new Map<number, Record<string, number>>();
/** each subject's last answer per part (an undo takes it back) */
const lastAction = new Map<number, Map<string, string>>();
/** what was recorded for a subject, so a later, better count can correct it */
const recorded = new Map<number, number>();
const recordedParts = new Map<number, string>();
/** when this session began: a subject passed before it was passed already (not just now) */
let sessionStartedAt = Date.now();
const partsKey = (id: number) => `${wrongInPart(id, 'meaning')}/${wrongInPart(id, 'reading')}`;
const passedParts = new Map<number, Set<string>>();
const completed = new Set<number>();
/** the subject on screen (from the quiz's question event, or the page) */
let currentId: number | null = null;
/** the subject on screen as last rendered (the last subject's card hides its meaning) */
let screenId: number | null = null;
/** the last subject finished (`characters`: none for a radical drawn as an image) */
let last: SessionResult | null = null;
/** a sentence per subject, picked once */
const sentences = new Map<number, { before: string; word: string; after: string } | null>();

/** WaniKani's SRS: up one when all right; else down ceil(wrong / 2), doubled from Guru, at least 1. */
export function nextSrsStage(stage: number, wrong: number): number {
	if (wrong === 0) return Math.min(9, stage + 1);
	const penalty = stage >= 5 ? 2 : 1;
	return Math.max(1, stage - Math.ceil(wrong / 2) * penalty);
}

function stageAtStart(id: number, subject: any): number | null {
	if (!startStage.has(id)) {
		const stage = sessionStages().get(id) ?? subject?.assignment?.srs_stage;
		if (stage != null) startStage.set(id, Number(stage));
	}
	return startStage.get(id) ?? null;
}

const wrongCount = (id: number) => wkIncorrect.get(id) ?? wrongAnswers.get(id) ?? 0;

const setIncorrect = (id: number, incorrect: unknown, parts: unknown) => {
	const count = Number(incorrect);
	if (incorrect != null && Number.isFinite(count) && count >= 0) wkIncorrect.set(id, count);
	if (parts && typeof parts === 'object') wkIncorrectParts.set(id, parts as Record<string, number>);
};

const wrongInPart = (id: number, part: string) => wkIncorrectParts.get(id)?.[part] ?? wrongParts.get(id)?.[part] ?? 0;

/**
 * Each part's record after this session: the subject's statistics from before it, plus this
 * session's answers (right once in the end, and the wrong ones).
 */
function partRecords(id: number, subject: any) {
	const reviews = subject?.reviews ?? {};
	const records: Record<string, { right: number; wrong: number; now: number }> = {};
	for (const part of partsOf(typeOf(subject))) {
		const now = wrongInPart(id, part);
		records[part] = {
			right: (Number(reviews[`${part}_correct`]) || 0) + 1,
			wrong: (Number(reviews[`${part}_incorrect`]) || 0) + now,
			now,
		};
	}
	return records;
}

/** Guru I: a subject reaching it for the first time is passed (WaniKani's passed_at) */
const GURU_STAGE = 5;

/**
 * Passed before this session ('before'), in it ('now': it reached Guru for the first time), or
 * not yet ('not-yet'). WaniKani keeps passed_at once set, even when a subject falls back.
 */
function passedState(subject: any, from: number, to: number): 'now' | 'not-yet' | 'before' {
	const passedAt = Date.parse(subject?.assignment?.passed_at ?? subject?.passed_at ?? '');
	// passed before (a later sync may already have this session's pass: only an earlier one counts)
	if (Number.isFinite(passedAt) && passedAt < sessionStartedAt) return 'before';
	// at Guru or above without a date: the data is older than the pass, still passed before
	if (!Number.isFinite(passedAt) && from >= GURU_STAGE) return 'before';
	return to >= GURU_STAGE ? 'now' : 'not-yet';
}

/**
 * Still a trouble subject after this session (troubleSubjects.ts): its review statistics from
 * before, with this session's answers added (right once in the end, the wrong ones, the streak).
 */
function troubleAfter(id: number, subject: any, to: number): { serious: boolean; text: string } | undefined {
	const before = subject?.reviews;
	if (!before) return undefined;
	const reviews = { ...before, subject_id: id };
	for (const part of partsOf(typeOf(subject))) {
		const wrong = wrongInPart(id, part);
		reviews[`${part}_correct`] = (Number(before[`${part}_correct`]) || 0) + 1;
		reviews[`${part}_incorrect`] = (Number(before[`${part}_incorrect`]) || 0) + wrong;
		// a mistake starts the streak over (WaniKani counts from 1)
		reviews[`${part}_current_streak`] = wrong ? 1 : (Number(before[`${part}_current_streak`]) || 0) + 1;
	}
	const info = troubleOf(reviews, to);
	return info ? { serious: info.serious, text: troubleText(info) } : undefined;
}

async function completeSubject(id: number) {
	// already recorded with the same count: nothing new (a later event may bring a better one)
	if (completed.has(id) && recorded.get(id) === wrongCount(id) && recordedParts.get(id) === partsKey(id)) return;
	completed.add(id);
	const subject = await fetchSubject({ subjectId: id });
	const from = stageAtStart(id, subject);
	if (from == null || from < 1) return;
	const wrong = wrongCount(id);
	const correction = recorded.has(id);
	recorded.set(id, wrong);
	recordedParts.set(id, partsKey(id));
	const type = typeOf(subject);
	const to = nextSrsStage(from, wrong);
	const result: SessionResult = {
		id,
		characters: subject?.characters ?? subject?.slug ?? '',
		type: type === 'kana_vocabulary' ? 'vocabulary' : type,
		from,
		to,
		wrong,
		parts: partRecords(id, subject),
		passed: passedState(subject, from, to),
		trouble: troubleAfter(id, subject, to),
		url: subject?.document_url ?? null,
	};
	// a correction of an earlier subject: the last one shown stays the last one finished
	if (!correction || last?.id === id) last = { ...result, characters: subject?.characters ?? '' };
	// for the summary at the session's end (reviewSummary.ts)
	recordSessionResult(result);
	queueRender();
}

async function onBridgeMessage(event: MessageEvent) {
	if (event.source !== window || event.data?.source !== 'wkh-review-bridge' || !active) return;
	const { type, subjectId, questionType, action } = event.data;
	const id = Number(subjectId);
	if (!Number.isFinite(id) || id <= 0) return;
	if (type === 'question') {
		currentId = id;
		queueRender();
		return;
	}
	setIncorrect(id, event.data.incorrect, event.data.incorrectParts);
	if (type === 'unanswer') {
		const actions = lastAction.get(id);
		if (questionType && actions?.get(questionType) === 'fail') {
			wrongAnswers.set(id, Math.max(0, (wrongAnswers.get(id) ?? 0) - 1));
			const parts = wrongParts.get(id);
			if (parts?.[questionType]) parts[questionType] -= 1;
		}
		if (questionType && actions?.get(questionType) === 'pass') passedParts.get(id)?.delete(questionType);
		actions?.delete(questionType);
		return;
	}
	if (type === 'answer') {
		if (questionType && (action === 'pass' || action === 'fail')) {
			const actions = lastAction.get(id) ?? new Map<string, string>();
			actions.set(questionType, action);
			lastAction.set(id, actions);
		}
		if (action === 'fail') {
			wrongAnswers.set(id, (wrongAnswers.get(id) ?? 0) + 1);
			if (questionType) {
				const parts = wrongParts.get(id) ?? {};
				parts[questionType] = (parts[questionType] ?? 0) + 1;
				wrongParts.set(id, parts);
			}
		}
		if (action === 'pass' && questionType) {
			const parts = passedParts.get(id) ?? new Set<string>();
			parts.add(questionType);
			passedParts.set(id, parts);
			const subject = await fetchSubject({ subjectId: id });
			if (partsOf(typeOf(subject)).every(part => parts.has(part))) await completeSubject(id);
		}
		return;
	}
	if (type === 'complete') await completeSubject(id);
}

/* ------------------------------------------------------------------ */
/* Rendering into WaniKani's layout                                    */
/* ------------------------------------------------------------------ */

const STYLE = `
.wkh-rv-hidden { display: none !important; }
.wkh-rv-info { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; }
/* wide windows: centred on the page (the stats on the right are wider than the home icon on the left) */
@media (min-width: 900px) {
  .wkh-rv-menu { position: relative; }
  .wkh-rv-menu .wkh-rv-info { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); white-space: nowrap; flex-wrap: nowrap; }
}
/* something under the characters: the header's space below it, smaller */
.wkh-rv-compact { padding-bottom: 12px !important; }
.wkh-rv-pill { padding: 2px 10px; border-radius: 999px; color: #fff; font-size: 13px; font-weight: 700; line-height: 1.5; white-space: nowrap; box-shadow: 0 0 0 1.5px rgba(255,255,255,.85), 0 1px 3px rgba(0,0,0,.25); }
.wkh-rv-chip { padding: 1px 8px; border-radius: 6px; background: rgba(0,0,0,.18); color: #fff; font-size: 12px; font-weight: 700; line-height: 1.6; white-space: nowrap; }
.wkh-rv-sentence { max-width: min(92%, 900px); margin: 0 auto; padding: 0.35em 0 0.5em; color: #fff; font-weight: 400; line-height: 1.45; text-align: center; text-shadow: 0 1px 0 rgba(0,0,0,.2); }
/* under the word: a smaller line, as a kanji's examples */
.wkh-rv-sentence.under { flex: 0 0 100%; width: 100%; max-width: none; box-sizing: border-box; margin: -8px auto 0; padding: 0 16px; font-size: clamp(16px, 2.4vw, 24px); }
.wkh-rv-sentence.under span.wkh-rv-line { display: inline-block; padding: 3px 14px; border-radius: 8px; background: rgba(255,255,255,.16); }
.wkh-rv-sentence mark { padding: 0 0.15em; border-radius: 0.18em; background: #fff; color: inherit; color: var(--wkh-rv-word, #a100f1); font-weight: 700; text-shadow: none; }
.wkh-rv-examples { flex: 0 0 100%; width: 100%; box-sizing: border-box; display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: -8px auto 0; padding: 0 12px; }
.wkh-rv-example { padding: 3px 12px; border-radius: 8px; background: rgba(255,255,255,.16); color: #fff; font-size: clamp(16px, 2.4vw, 22px); font-weight: 400; line-height: 1.4; text-shadow: none; }
.wkh-rv-example mark { padding: 0 2px; border-radius: 4px; background: #fff; color: var(--wkh-rv-kanji, #f100a1); font-weight: 700; }
.wkh-rv-stats-host { position: relative; }
.wkh-rv-stats { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; gap: 7px; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.75); font-size: 12px; font-weight: 400; line-height: 1.4; letter-spacing: 0; text-shadow: none; white-space: nowrap; pointer-events: auto; }
.wkh-rv-stats b { color: #fff; font-weight: 700; }
.wkh-rv-bar { width: 38px; height: 5px; border-radius: 999px; background: rgba(255,255,255,.18); overflow: hidden; }
.wkh-rv-bar span { display: block; height: 100%; border-radius: 999px; }
/* meaning questions: WaniKani's bar is light, so dark text on it */
.quiz-input__question-type-container[data-question-type="meaning"] .wkh-rv-stats { background: rgba(0,0,0,.07); color: rgba(0,0,0,.55); }
.quiz-input__question-type-container[data-question-type="meaning"] .wkh-rv-stats b { color: #333; }
.quiz-input__question-type-container[data-question-type="meaning"] .wkh-rv-bar { background: rgba(0,0,0,.12); }
@media (max-width: 640px) { .wkh-rv-stats .wkh-rv-streak { display: none; } .wkh-rv-stats { right: 8px; padding: 2px 8px; } }
@media (max-width: 420px) { .wkh-rv-stats { display: none; } }
.wkh-rv-last, .wkh-rv-last .quiz-statistics__item-count-text { white-space: nowrap; }
/* hovered: its card (subjectHoverCard.ts) */
.wkh-rv-last { cursor: default; border-radius: 4px; transition: background-color .12s, box-shadow .12s; }
/* a lighter patch around it (the shadow widens it without moving WaniKani's stats) */
.wkh-rv-last:hover { background-color: rgba(255,255,255,.14); box-shadow: 0 0 0 5px rgba(255,255,255,.14); }
.wkh-rv-last .wk-icon { width: 1em; height: 1em; }
.wkh-rv-last-subject { max-width: 7em; margin-right: 6px; overflow: hidden; text-overflow: ellipsis; font-weight: 700; }
.wkh-rv-last.went-up { color: #c6f6d5; }
.wkh-rv-last.went-down { color: #ffd2d2; }
`;

function ensureStyle() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = STYLE;
	document.head.append(style);
}

const stageName = (stage: number) => srsStages[stage as keyof typeof srsStages]?.name ?? 'Locked';
const stageShort = (stage: number) => srsStages[stage as keyof typeof srsStages]?.short ?? '–';
const stageColor = (stage: number) => appearance[STAGE_COLOR_KEYS[stage]] || srsStages[stage as keyof typeof srsStages]?.color || '#8a8fa3';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	node.className = className;
	if (text != null) node.textContent = text;
	return node;
}

/** One of the word's sentences, Japanese only, split around the word (conjugated: its stem). */
function sentenceFor(subject: any) {
	if (sentences.has(subject.id)) return sentences.get(subject.id)!;
	const list = (subject.context_sentences ?? []).filter((sentence: any) => typeof sentence?.ja === 'string' && sentence.ja);
	let result: { before: string; word: string; after: string } | null = null;
	if (list.length) {
		const ja: string = list[Math.floor(Math.random() * list.length)].ja;
		const characters = String(subject.characters ?? '');
		// 食べる → 食べ → 食 (as long as something of the word is left)
		for (let length = characters.length; length >= 1 && !result; length--) {
			const word = characters.slice(0, length);
			const at = ja.indexOf(word);
			if (at >= 0) result = { before: ja.slice(0, at), word, after: ja.slice(at + word.length) };
		}
	}
	sentences.set(subject.id, result);
	return result;
}

function removeInjected() {
	document.querySelectorAll('.wkh-rv-info, .wkh-rv-sentence, .wkh-rv-examples, .wkh-rv-stats, .wkh-rv-last').forEach(node => node.remove());
	document.querySelectorAll('.wkh-rv-hidden').forEach(node => node.classList.remove('wkh-rv-hidden'));
	document.querySelectorAll('.wkh-rv-stats-host').forEach(node => node.classList.remove('wkh-rv-stats-host'));
	document.querySelectorAll('.wkh-rv-compact').forEach(node => node.classList.remove('wkh-rv-compact'));
	document.querySelectorAll('.wkh-rv-menu').forEach(node => node.classList.remove('wkh-rv-menu'));
}

/** What's on screen: from the quiz's event, else the page's characters and category. */
async function screenSubject(): Promise<any | null> {
	const characters = document.querySelector('.character-header__characters')?.textContent?.trim() ?? '';
	const header = document.querySelector('.character-header');
	const typeClass = [...(header?.classList ?? [])].find(name => name.startsWith('character-header--'));
	const type = typeClass?.replace('character-header--', '').replace(/-/g, '_') ?? '';
	const id = currentId ?? (characters ? idFromQueue(characters, type) : null);
	let subject = id ? await fetchSubject({ subjectId: id }) : null;
	// the event's subject and the page disagree (it changed since): the page wins
	if (subject && characters && subject.characters && subject.characters !== characters) subject = null;
	if (!subject && characters) {
		subject = await fetchSubject({ characters, subjectType: type === 'kana_vocabulary' ? 'vocabulary' : type || undefined });
	}
	return subject;
}

function renderHeader(subject: any, stage: number | null) {
	const slot = document.querySelector('.character-header__menu-title');
	if (!slot) return;
	const info = el('div', 'wkh-rv-info');
	if (stage != null) {
		const pill = el('span', 'wkh-rv-pill', stageName(stage));
		pill.style.background = stageColor(stage);
		pill.title = 'SRS stage (before this review)';
		info.append(pill);
	}
	if (subject.level) info.append(el('span', 'wkh-rv-chip', `Level ${subject.level}`));
	if (subject.jlpt) info.append(el('span', 'wkh-rv-chip', `JLPT ${subject.jlpt}`));
	if (subject.joyo) info.append(el('span', 'wkh-rv-chip', `Jōyō ${String(subject.joyo).replace('Grade ', 'Gr ')}`));
	slot.closest('.character-header__menu')?.classList.add('wkh-rv-menu');
	slot.append(info);
}

/**
 * Words: one of their sentences, the word marked. In the word's place (Settings: "Replace the word
 * with the sentence"), else under the word, as a kanji's examples are.
 */
function renderSentence(subject: any) {
	const characters = document.querySelector('.character-header__characters');
	const type = typeOf(subject);
	if (!characters || (type !== 'vocabulary' && type !== 'kana_vocabulary')) return;
	if (!replaceWord && !showExamples) return;
	const sentence = sentenceFor(subject);
	if (!sentence?.word) return;
	const box = el('div', replaceWord ? 'wkh-rv-sentence' : 'wkh-rv-sentence under');
	box.lang = 'ja';
	if (replaceWord) {
		// long sentences get smaller (the header's word is huge)
		const length = sentence.before.length + sentence.word.length + sentence.after.length;
		box.style.fontSize = length <= 14 ? 'clamp(28px, 6vw, 56px)' : length <= 24 ? 'clamp(24px, 4.6vw, 44px)' : 'clamp(20px, 3.4vw, 34px)';
	}
	box.style.setProperty('--wkh-rv-word', appearance.vocab_color || '#a100f1');
	// under the word: in a chip, as a kanji's example words
	const target = replaceWord ? box : box.appendChild(el('span', 'wkh-rv-line'));
	target.append(document.createTextNode(sentence.before), el('mark', '', sentence.word), document.createTextNode(sentence.after));
	if (replaceWord) characters.classList.add('wkh-rv-hidden');
	else characters.parentElement?.classList.add('wkh-rv-compact');
	characters.after(box);
}

/** a kanji's words / a radical's kanji, picked once per subject */
const examples = new Map<number, Promise<string[]>>();

/**
 * A few subjects built from this one (WaniKani's amalgamations): learned ones first, then the
 * lowest levels, in a random order among those. Only their characters: no reading, no meaning.
 */
function examplesFor(subject: any): Promise<string[]> {
	if (!examples.has(subject.id)) {
		examples.set(subject.id, browser.runtime.sendMessage({ type: 'wkh:getSubject', subjectId: subject.id, includeRelated: true, ensureReviews: false })
			.then((result: any) => {
				const related = result?.related ?? {};
				const candidates = (subject.amalgamation_subject_ids ?? [])
					.map((id: number) => related[id])
					.filter((entry: any) => entry?.characters && entry.characters !== subject.characters && !entry.hidden_at)
					.map((entry: any) => ({ characters: String(entry.characters), learned: Number(entry.assignment?.srs_stage) >= 1, level: Number(entry.level) || 99, random: Math.random() }));
				candidates.sort((a: any, b: any) => Number(b.learned) - Number(a.learned) || a.level - b.level || a.random - b.random);
				// a little variety among the easiest: from the first few, at random
				const pool = candidates.slice(0, EXAMPLE_COUNT * 2).sort((a: any, b: any) => a.random - b.random);
				return pool.slice(0, EXAMPLE_COUNT).map((entry: any) => entry.characters);
			})
			.catch(() => []));
	}
	return examples.get(subject.id)!;
}

/** Under a kanji: words using it (the kanji marked); under a radical: kanji using it. */
async function renderExamples(subject: any, renderNumber: number) {
	const type = typeOf(subject);
	if (!showExamples || (type !== 'kanji' && type !== 'radical')) return;
	const list = await examplesFor(subject);
	const characters = document.querySelector('.character-header__characters');
	if (renderNumber !== renderId || !list.length || !characters) return;
	const row = el('div', 'wkh-rv-examples');
	row.lang = 'ja';
	row.title = type === 'kanji' ? 'Words using this kanji' : 'Kanji using this radical';
	row.style.setProperty('--wkh-rv-kanji', appearance.kanji_color || '#f100a1');
	for (const example of list) {
		const chip = el('span', 'wkh-rv-example');
		const at = type === 'kanji' && subject.characters ? example.indexOf(subject.characters) : -1;
		if (at >= 0) {
			chip.append(
				document.createTextNode(example.slice(0, at)),
				el('mark', '', subject.characters),
				document.createTextNode(example.slice(at + subject.characters.length)),
			);
		} else {
			chip.textContent = example;
		}
		row.append(chip);
	}
	characters.parentElement?.classList.add('wkh-rv-compact');
	characters.after(row);
}

/** The asked part's record, as a small badge on the right of WaniKani's question bar. */
function renderStats(subject: any) {
	const label = document.querySelector('.quiz-input__question-type-container');
	if (!label) return;
	const reviews = subject.reviews ?? {};
	const partStats = (part: string) => {
		const right = Number(reviews[`${part}_correct`]) || 0;
		const wrong = Number(reviews[`${part}_incorrect`]) || 0;
		if (right + wrong === 0) return null;
		return {
			part,
			right,
			wrong,
			percent: Math.round((right / (right + wrong)) * 100),
			streak: Number(reviews[`${part}_current_streak`]) || 0,
			best: Number(reviews[`${part}_max_streak`]) || 0,
		};
	};
	const all = partsOf(typeOf(subject)).map(partStats).filter(Boolean) as NonNullable<ReturnType<typeof partStats>>[];
	const asked = all.find(entry => entry.part === label.getAttribute('data-question-type')) ?? all[0];
	if (!asked) return;

	const badge = el('span', 'wkh-rv-stats');
	// both parts in the tooltip
	badge.title = all.map(entry => `${entry.part === 'meaning' ? 'Meaning' : 'Reading'}: ${entry.percent}% right (${entry.right} right, ${entry.wrong} wrong) · ${entry.streak} in a row, best ${entry.best}`).join('\n');
	const bar = el('span', 'wkh-rv-bar');
	const fill = el('span', '');
	fill.style.width = `${asked.percent}%`;
	fill.style.background = asked.percent >= 90 ? '#30a46c' : asked.percent >= 75 ? '#f5a400' : '#e5484d';
	bar.append(fill);
	badge.append(bar, el('b', '', `${asked.percent}%`), el('span', 'wkh-rv-streak', `· ${asked.streak} in a row`));
	label.classList.add('wkh-rv-stats-host');
	label.append(badge);
}

/** The last subject's SRS change, as one of WaniKani's own stats at the top right. */
function renderLast() {
	const bar = document.querySelector('.quiz-statistics');
	if (!bar || !last) return;
	const up = last.to > last.from;
	const down = last.to < last.from;
	const item = el('div', `quiz-statistics__item wkh-rv-last${up ? ' went-up' : down ? ' went-down' : ''}`);
	// hovered: the subject's details (its meanings and readings: it's answered already) and what
	// the review changed; the question on screen stays hidden in its lists
	const result = last;
	bindSubjectHoverCard(item, {
		subjectId: result.id,
		session: () => result,
		hidden: () => [screenId, currentId],
		appearance: () => appearance,
	});
	const count = el('div', 'quiz-statistics__item-count');
	const icon = el('div', 'quiz-statistics__item-count-icon');
	if (up || down) {
		const svgNs = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNs, 'svg');
		svg.setAttribute('class', `wk-icon wk-icon--srs_${up ? 'up' : 'down'}`);
		svg.setAttribute('viewBox', '0 0 512 512');
		const use = document.createElementNS(svgNs, 'use');
		use.setAttribute('href', `#wk-icon__srs-${up ? 'up' : 'down'}`);
		svg.append(use);
		icon.append(svg);
	}
	// which subject it was: its characters first (radicals drawn as images have none)
	const subjectName = el('span', 'wkh-rv-last-subject', last.characters || 'Last');
	subjectName.lang = 'ja';
	count.append(subjectName, icon, el('div', 'quiz-statistics__item-count-text', `${stageShort(last.from)} → ${stageShort(last.to)}`));
	item.append(count);
	bar.prepend(item);
}

let renderId = 0;

async function render() {
	renderQueued = false;
	const id = ++renderId;
	if (!active) return;
	const subject = await screenSubject();
	// a newer render started meanwhile (the next question)
	if (id !== renderId || !active) return;
	observer?.disconnect();
	removeInjected();
	screenId = subject?.id ?? null;
	// only following the session (for its summary): nothing shown
	if (!enabled) return;
	if (subject) {
		ensureStyle();
		const stage = stageAtStart(subject.id, subject);
		renderHeader(subject, stage);
		renderSentence(subject);
		renderStats(subject);
	}
	renderLast();
	observe();
	// the related subjects may take a moment (read from the cache): added when they arrive
	if (subject) {
		observer?.disconnect();
		await renderExamples(subject, id);
		if (id === renderId && active) observe();
	}
}

function queueRender() {
	if (renderQueued) return;
	renderQueued = true;
	queueMicrotask(() => void render());
}

/** WaniKani changing the question (characters, question type): render again. */
function observe() {
	observer?.disconnect();
	const targets = [
		document.querySelector('.character-header__characters'),
		document.querySelector('.quiz-input__question-type-container'),
	].filter(Boolean) as Element[];
	if (!targets.length) return;
	observer = new MutationObserver(() => {
		// the question changed: the event's subject may be the old one until its event arrives
		currentId = null;
		queueRender();
	});
	for (const target of targets) observer.observe(target, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-question-type'] });
}

/* ------------------------------------------------------------------ */
/* Turning it on / off                                                 */
/* ------------------------------------------------------------------ */

function resetSession() {
	sessionStartedAt = Date.now();
	startStage.clear();
	wrongAnswers.clear();
	wkIncorrect.clear();
	wkIncorrectParts.clear();
	wrongParts.clear();
	recordedParts.clear();
	lastAction.clear();
	recorded.clear();
	passedParts.clear();
	completed.clear();
	subjects.clear();
	sentences.clear();
	examples.clear();
	currentId = null;
	screenId = null;
	last = null;
}

async function update() {
	const onReviews = location.hostname === 'www.wanikani.com' && REVIEW_PAGE.test(location.pathname);
	// the session is followed for the info, or for the summary at its end
	const show = (enabled || isReviewSummaryEnabled()) && onReviews;
	if (!show) {
		if (active) {
			active = false;
			observer?.disconnect();
			observer = null;
			removeInjected();
		}
		return;
	}
	if (!active) {
		active = true;
		resetSession();
		if (!bridgeInjected) {
			bridgeInjected = true;
			await injectScript('/wk-review-bridge.js', { keepInDom: true }).catch(() => { bridgeInjected = false; });
		}
	}
	queueRender();
}

function applySettings(settings: any) {
	enabled = settings?.review_info?.enabled === true;
	showExamples = settings?.review_info?.examples !== false;
	replaceWord = settings?.review_info?.sentence_replace === true;
	appearance = settings?.appearance ?? {};
	if (active) queueRender();
	void update();
}

export async function mountReviewInfo(): Promise<void> {
	if (location.hostname !== 'www.wanikani.com') return;
	window.addEventListener('message', event => void onBridgeMessage(event));
	applySettings(await storage.getItem<any>('local:settings'));
	storage.watch<any>('local:settings', applySettings);
	// WaniKani moves between its pages without reloading (Turbo)
	document.addEventListener('turbo:load', () => {
		active = false;
		void update();
	});
	window.addEventListener('popstate', () => void update());
}
