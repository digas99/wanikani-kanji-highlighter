/**
 * WaniKani's reviews page (Settings → Details → WaniKani reviews → Review timer, off by default):
 * a countdown next to WaniKani's stats. When it runs out, WaniKani's Wrap Up is turned on (the
 * subjects already started are finished, no new ones). It pauses on a click on it and while the
 * window isn't focused; typing an answer resumes it. A new reviews session starts it again.
 */

import { storage } from '#imports';

const REVIEW_PAGE = /^\/subjects\/review\/?$/;
const TIMER_ID = 'wkh-review-timer';
const TICK_MS = 250;

let enabled = false;
let minutes = 25;
let remainingMs = 0;
let paused = false;
let lastTick = 0;
let interval: number | null = null;
/** ran out: stays at 0:00 until a new session */
let finished = false;

const PAUSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';

function format(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const timerElement = () => document.getElementById(TIMER_ID);

function paint() {
	const root = timerElement();
	if (!root) return;
	const label = root.querySelector('.quiz-statistics__item-label');
	const icon = root.querySelector('.quiz-statistics__item-count-icon');
	if (label) label.textContent = format(remainingMs);
	// the icon is what a click does: resume when paused, pause when running
	if (icon) icon.innerHTML = finished ? '' : paused ? PLAY_ICON : PAUSE_ICON;
	root.style.opacity = paused && !finished ? '0.65' : '';
	root.title = finished
		? 'Time\'s up: Wrap Up is on'
		: paused ? 'Review timer (paused): click to resume' : 'Review timer: click to pause';
}

function stopInterval() {
	if (interval != null) clearInterval(interval);
	interval = null;
}

function setPaused(value: boolean) {
	if (finished) return;
	paused = value;
	// time while paused isn't counted
	if (!paused) lastTick = Date.now();
	paint();
}

/** WaniKani's Wrap Up, on (unless it already is: clicking it again would turn it off). */
function wrapUp() {
	const button = document.querySelector<HTMLElement>('.additional-content__item--wrap-up');
	if (!button || button.classList.contains('additional-content__item--active')) return;
	button.click();
}

function tick() {
	if (paused || finished) return;
	const now = Date.now();
	remainingMs -= now - lastTick;
	lastTick = now;
	if (remainingMs <= 0) {
		remainingMs = 0;
		finished = true;
		stopInterval();
		paint();
		wrapUp();
		return;
	}
	paint();
}

function onInput(event: Event) {
	if (event.target instanceof Element && event.target.matches('.quiz-input__input') && paused) setPaused(false);
}
const onBlur = () => setPaused(true);
const onFocus = () => setPaused(false);

function remove() {
	stopInterval();
	timerElement()?.remove();
	document.removeEventListener('input', onInput, true);
	window.removeEventListener('blur', onBlur);
	window.removeEventListener('focus', onFocus);
}

/** A new countdown, next to WaniKani's stats (before them, as one of their items). */
function start() {
	remove();
	const stats = document.querySelector('.quiz-statistics');
	if (!stats) return;
	remainingMs = minutes * 60 * 1000;
	finished = false;
	paused = !document.hasFocus();
	lastTick = Date.now();

	const root = document.createElement('div');
	root.className = 'quiz-statistics__item';
	root.id = TIMER_ID;
	root.style.cursor = 'pointer';
	root.innerHTML = '<div class="quiz-statistics__item-count"><div class="quiz-statistics__item-count-icon"></div><div class="quiz-statistics__item-label"></div></div>';
	root.addEventListener('click', event => {
		event.preventDefault();
		event.stopPropagation();
		setPaused(!paused);
	});
	stats.before(root);
	if (!document.getElementById(`${TIMER_ID}-style`)) {
		const style = document.createElement('style');
		style.id = `${TIMER_ID}-style`;
		style.textContent = `#${TIMER_ID} { white-space: nowrap; font-variant-numeric: tabular-nums; } #${TIMER_ID} svg { width: 0.9em; height: 0.9em; }`;
		document.head.append(style);
	}

	document.addEventListener('input', onInput, true);
	window.addEventListener('blur', onBlur);
	window.addEventListener('focus', onFocus);
	paint();
	interval = window.setInterval(tick, TICK_MS);
}

function update() {
	const onReviews = location.hostname === 'www.wanikani.com' && REVIEW_PAGE.test(location.pathname);
	if (!enabled || !onReviews) {
		remove();
		return;
	}
	// a session already timed (this page): keep it
	if (!timerElement()) start();
}

function applySettings(settings: any) {
	const wasEnabled = enabled;
	const wasMinutes = minutes;
	enabled = settings?.review_timer?.enabled === true;
	minutes = Math.max(0.1, Number(settings?.review_timer?.minutes) || 25);
	// another length chosen: a new countdown with it
	if (enabled && wasEnabled && minutes !== wasMinutes) remove();
	update();
}

export async function mountReviewTimer(): Promise<void> {
	if (location.hostname !== 'www.wanikani.com') return;
	applySettings(await storage.getItem<any>('local:settings'));
	storage.watch<any>('local:settings', applySettings);
	// WaniKani moves between its pages without reloading (Turbo): a new session each time
	document.addEventListener('turbo:load', () => {
		remove();
		update();
	});
	window.addEventListener('popstate', () => update());
}
