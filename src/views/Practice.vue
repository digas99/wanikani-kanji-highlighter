<template>
	<div class="container practice">
		<div class="practice-stack">
			<header class="practice-head">
				<div class="practice-title">
					<span class="practice-pill">Practice</span>
					<span class="practice-section" :title="title">{{ title }}</span>
				</div>
				<span class="practice-head-end">
					<span class="practice-counter">{{ finished || !ids.length ? ids.length : index + 1 }} / {{ ids.length }}</span>
					<InfoTip v-if="ids.length" label="About practice">
						<p>Just for practice: nothing here changes your reviews or progress on WaniKani.</p>
						<p v-if="knownCount">The {{ knownCount === 1 ? 'subject' : `${knownCount} subjects` }} you marked as known {{ knownCount === 1 ? 'goes' : 'go' }} first, already done: practice starts after {{ knownCount === 1 ? 'it' : 'them' }}. Go back to see {{ knownCount === 1 ? 'it' : 'them' }}.</p>
					</InfoTip>
				</span>
			</header>
			<div class="practice-progress" :title="knownCount ? `${knownCount} known (skipped), ${doneCount} of ${ids.length - knownCount} gone through` : null">
				<!-- the subjects marked as known: done before starting (knownSubjects.ts) -->
				<div v-if="knownCount" class="practice-progress-known" :style="{ width: `${knownPercent}%`, background: known.color }"></div>
				<div :style="{ width: `${progressPercent}%` }"></div>
			</div>

			<!-- the whole deck, in order: characters only (no answers), this card highlighted, the
			     ones seen faded; one click goes to any. Scrolls sideways (the mouse wheel too), kept
			     on this card, faded at an edge with more beyond it -->
			<div
				v-if="ids.length"
				ref="strip"
				class="practice-upcoming"
				:class="{ 'fade-start': stripFade.start, 'fade-end': stripFade.end }"
				role="list"
				aria-label="The deck"
				@scroll="updateStripFade"
				@wheel="onStripWheel"
			>
				<button
					v-for="entry in stripTiles"
					:key="entry.id"
					type="button"
					role="listitem"
					class="practice-upcoming-tile"
					:class="{ loading: !entry.subject, current: entry.current, seen: entry.seen, known: entry.known }"
					:style="{ '--tile-color': entry.color, '--known-color': known.color }"
					:title="`Card ${entry.at + 1}${entry.known ? ' (known)' : ''}: ${entry.current ? 'this one' : 'go to it'}`"
					:aria-current="entry.current ? 'true' : null"
					tabindex="-1"
					@mousedown.prevent
					@click="go(entry.at)"
				>
					<SubjectCharacters v-if="entry.subject" :item="entry.subject" :width="16" :height="16" />
				</button>
			</div>

			<p v-if="!ids.length" class="practice-empty">There are no subjects to practice in this section.</p>

			<!-- end of the deck -->
			<section v-else-if="finished" class="practice-card practice-done">
				<div class="practice-done-title">All done!</div>
				<p>You went through {{ ids.length }} subject{{ ids.length === 1 ? '' : 's' }}.</p>
				<div class="practice-done-actions">
					<button type="button" class="practice-btn primary" @click="restart(false)">Practice again</button>
					<button type="button" class="practice-btn" @click="restart(true)">Shuffle and restart</button>
					<button type="button" class="practice-btn" @click="backToList">Back to the list</button>
				</div>
			</section>

			<section v-else class="practice-card" :style="{ '--type-color': typeColor }">
				<div class="practice-characters" :class="{ loading: !subject }">
					<SubjectCharacters v-if="subject" :item="subject" :width="90" :height="90" />
				</div>

				<div v-if="subject" class="practice-chips">
					<span class="practice-chip" :style="{ '--chip-color': typeColor }">
						Level {{ subject.level }} · {{ typeLabel }}
					</span>
					<span class="practice-chip" :style="{ '--chip-color': srs.color }">{{ srs.name }}</span>
					<KnownToggle :subject="subject" variant="practice" />
					<!-- JLPT level, Jōyō grade (as the subject details show them) -->
					<span v-if="schoolGrades" class="practice-chip plain" :title="schoolGradesTitle">{{ schoolGrades }}</span>
				</div>

				<div v-if="subject" class="practice-stats">
					<template v-if="stats">
						<div class="practice-stat">
							<span>Meaning</span>
							<b>{{ meaningPercent }}%</b>
							<small>{{ stats.meaning_correct }} / {{ stats.meaning_correct + stats.meaning_incorrect }}</small>
							<span class="practice-stat-bar"><span :style="statBarStyle(meaningPercent)"></span></span>
						</div>
						<div v-if="hasReading" class="practice-stat">
							<span>Reading</span>
							<b>{{ readingPercent }}%</b>
							<small>{{ stats.reading_correct }} / {{ stats.reading_correct + stats.reading_incorrect }}</small>
							<span class="practice-stat-bar"><span :style="statBarStyle(readingPercent)"></span></span>
						</div>
						<!-- radicals only have meanings: "overall" would just repeat (or contradict) it -->
						<div v-if="hasReading" class="practice-stat">
							<span>Overall</span>
							<b>{{ stats.percentage_correct }}%</b>
							<small>correct</small>
							<span class="practice-stat-bar"><span :style="statBarStyle(stats.percentage_correct)"></span></span>
						</div>
					</template>
					<div v-else class="practice-stat practice-stat-empty">{{ noStatsLabel }}</div>
				</div>

				<div v-if="subject" class="practice-answers">
					<button
						type="button"
						class="practice-answer"
						:class="{ revealed: revealed.meaning }"
						:aria-label="revealed.meaning ? 'Meaning' : 'Reveal meaning'"
						@click="revealed.meaning = true"
					>
						<span class="practice-answer-label">Meaning</span>
						<span class="practice-answer-value">
							<template v-for="(meaning, i) in meanings" :key="meaning.text">
								<b v-if="meaning.primary">{{ meaning.text }}</b><span v-else>{{ meaning.text }}</span><span v-if="i < meanings.length - 1">, </span>
							</template>
						</span>
						<span v-if="!revealed.meaning" class="practice-answer-hint">Click to reveal (M)</span>
					</button>

					<button
						v-if="hasReading"
						type="button"
						class="practice-answer"
						:class="{ revealed: revealed.reading }"
						:aria-label="revealed.reading ? 'Reading' : 'Reveal reading'"
						@click="revealed.reading = true"
					>
						<span class="practice-answer-label">Reading</span>
						<span class="practice-answer-value">
							<span v-for="group in readingGroups" :key="group.label" class="practice-reading-group">
								<small v-if="group.label">{{ group.label }}</small>
								<template v-for="(reading, i) in group.readings" :key="reading.text">
									<b v-if="reading.primary">{{ reading.text }}</b><span v-else>{{ reading.text }}</span><span v-if="i < group.readings.length - 1">, </span>
								</template>
							</span>
						</span>
						<span v-if="!revealed.reading" class="practice-answer-hint">Click to reveal (R)</span>
					</button>
				</div>

				<div v-if="subject" class="practice-card-foot">
					<button v-if="!allRevealed" type="button" class="practice-link" @click="revealAll">Reveal all (Space)</button>
					<span v-else></span>
					<RouterLink class="practice-link" :to="{ name: 'Subject', params: { id: subject.id } }">
						Subject details ›
					</RouterLink>
				</div>
			</section>

			<!-- pinned to the bottom of the popup, so the buttons don't move with the card's height -->
			<footer v-if="ids.length && !finished" class="practice-footer">
				<nav class="practice-nav">
					<button type="button" class="practice-btn" :disabled="index === 0" @click="go(index - 1)">‹ Previous</button>
					<button
						type="button"
						class="practice-btn"
						:class="{ active: shuffled }"
						:title="shuffled ? 'Back to the list order' : 'Shuffle the remaining subjects'"
						@click="toggleShuffle"
					>Shuffle</button>
					<button type="button" class="practice-btn primary" @click="next">
						{{ index === ids.length - 1 ? 'Finish' : 'Next ›' }}
					</button>
				</nav>
				<p class="practice-keys">← → to move · Space to reveal, then next</p>
			</footer>
		</div>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';
import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';
import InfoTip from '@/components/InfoTip.vue';
import KnownToggle from '@/components/Subjects/KnownToggle.vue';
import { isKnownSubject, isNotStartedSubject, readKnownSubjectIds, useKnownSubjects } from '@/utils/scripts/knownSubjects';
import { isLegacySubject, srsStages, typeColors } from '@/utils/scripts/wanikani';
import { correctnessColor } from '@/utils/scripts/common';
import { formatSubjectSchoolGrades, getReviewStats, reviewPercentage, getSubjectType } from '@/utils/scripts/subjectDetailsPopup';

const READING_LABELS = { onyomi: 'ON', kunyomi: 'KUN', nanori: 'Nanori' };

function parseIds(value) {
	return String(value ?? '')
		.split(',')
		.map(id => parseInt(id, 10))
		.filter(Number.isFinite);
}

/**
 * What was revealed on each card, per practice session (keyed by the session's
 * subjects), so going back to a card, or to a subject's page and back, keeps it.
 */
const revealSessions = new Map();

function shuffle(list) {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

export default {
	name: 'Practice',

	components: {
		InfoTip,
		KnownToggle,
		RouterLink,
		SubjectCharacters,
	},

	data() {
		const query = this.$route.query;
		const ids = parseIds(query.ids);
		const index = Math.min(Math.max(parseInt(query.i, 10) || 0, 0), ids.length);
		const knownCount = Math.min(Math.max(parseInt(query.known, 10) || 0, 0), ids.length);
		return {
			originalIds: ids,
			ids: query.order ? parseIds(query.order) : ids,
			// (an order without a known prefix: from before there were known subjects, shuffled)
			shuffled: query.shuffled === '1' || (Boolean(query.order) && !query.known),
			/** the subjects marked as known, at the deck's start (done before starting) */
			knownCount,
			known: useKnownSubjects(),
			index,
			finished: ids.length > 0 && index >= ids.length,
			subject: null,
			revealed: { meaning: false, reading: false },
			cache: new Map(),
			/** the deck's subjects (characters, type) for the strip of what's next */
			stripSubjects: {},
			stripFade: { start: false, end: false },
		};
	},

	watch: {
		// a new card: the strip follows it (gliding there); a new order: straight there
		index() {
			this.revealCurrentTile(true);
		},
		ids() {
			this.revealCurrentTile(false);
		},
		revealed: {
			handler(value) {
				const id = this.ids[this.index];
				if (id == null || this.finished) return;
				if (value.meaning || value.reading) this.revealStore().set(id, { ...value });
			},
			deep: true,
		},
	},

	computed: {
		wk() {
			return useWKStore();
		},
		title() {
			return String(this.$route.query.title || 'Subjects');
		},
		/** every card, in the deck's order: this one, and the ones already seen */
		stripTiles() {
			return this.ids.map((id, at) => {
				const subject = this.stripSubjects[id] ?? null;
				return {
					id,
					at,
					subject,
					color: typeColors[getSubjectType(subject)] ?? 'var(--fade)',
					current: !this.finished && at === this.index,
					seen: this.finished || at < this.index,
					known: isKnownSubject(subject, this.known.ids),
				};
			});
		},
		/** gone through, after the known ones */
		doneCount() {
			return Math.max(0, (this.finished ? this.ids.length : this.index) - this.knownCount);
		},
		knownPercent() {
			return this.ids.length ? (this.knownCount / this.ids.length) * 100 : 0;
		},
		progressPercent() {
			if (!this.ids.length) return 0;
			return (this.doneCount / this.ids.length) * 100;
		},
		type() {
			return getSubjectType(this.subject);
		},
		typeColor() {
			return typeColors[this.type] ?? 'var(--default-color)';
		},
		typeLabel() {
			const label = this.type.split('_').join(' ');
			return label.charAt(0).toUpperCase() + label.slice(1);
		},
		/** "N5, Grade 1" (the store's labels, for kanji and words) */
		schoolGrades() {
			return formatSubjectSchoolGrades(this.subject);
		},
		schoolGradesTitle() {
			return this.type === 'kanji' || this.type === 'radical'
				? 'JLPT, Jōyō'
				: 'JLPT: Jonathan Waller\'s lists (unofficial). Jōyō: the grade of the word\'s hardest kanji';
		},
		srs() {
			const stage = this.subject?.assignment?.srs_stage;
			if (stage == null) return { name: 'Locked', color: '#888' };
			return { name: srsStages[stage]?.name ?? 'Locked', color: srsStages[stage]?.color ?? '#888' };
		},
		stats() {
			return getReviewStats(this.subject?.reviews);
		},
		meaningPercent() {
			return this.stats ? reviewPercentage(this.stats, 'meaning') : 0;
		},
		readingPercent() {
			return this.stats ? reviewPercentage(this.stats, 'reading') : 0;
		},
		noStatsLabel() {
			const assignment = this.subject?.assignment;
			if (assignment?.srs_stage == null) return 'Locked: no reviews yet';
			if (!(assignment.srs_stage > 0) && !assignment.passed_at) return 'Lesson not done yet';
			return 'No reviews yet';
		},
		meanings() {
			return (this.subject?.meanings ?? []).map(meaning => ({ text: meaning.meaning, primary: meaning.primary }));
		},
		hasReading() {
			return Boolean(this.subject?.readings?.length);
		},
		/** Kanji readings grouped as ON / KUN / Nanori; vocabulary as one list. */
		readingGroups() {
			const readings = this.subject?.readings ?? [];
			if (this.type !== 'kanji') {
				return [{ label: '', readings: readings.map(r => ({ text: r.reading, primary: r.primary })) }];
			}
			return Object.entries(READING_LABELS)
				.map(([key, label]) => ({
					label,
					readings: readings.filter(r => r.type === key).map(r => ({ text: r.reading, primary: r.primary })),
				}))
				.filter(group => group.readings.length);
		},
		allRevealed() {
			return this.revealed.meaning && (!this.hasReading || this.revealed.reading);
		},
	},

	async created() {
		// a deck just opened (not one come back to): without legacy subjects, its known ones first, skipped
		const query = this.$route.query;
		if (this.ids.length && query.i == null && query.order == null) {
			await this.loadStrip();
			const dropped = this.dropLegacy();
			this.planKnown(await readKnownSubjectIds().catch(() => new Set()), false);
			if (this.knownCount || dropped) this.syncRoute();
		} else {
			void this.loadStrip();
		}
		this.load();
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown);
		window.addEventListener('resize', this.updateStripFade);
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown);
		window.removeEventListener('resize', this.updateStripFade);
	},

	methods: {
		/** The whole deck's characters at once (one read), for the strip. */
		async loadStrip() {
			const subjects = await this.wk.resolveSubjects(this.originalIds).catch(() => []);
			const byId = {};
			for (const subject of subjects ?? []) byId[subject.id] = subject;
			this.stripSubjects = byId;
			// the tiles have their widths now: onto this card (coming back to a deck: mid-way)
			this.revealCurrentTile(false);
		},
		/**
		 * Legacy subjects (retired by WaniKani: no longer in lessons or reviews) aren't practiced,
		 * whatever list the deck came from. True if some were left out.
		 */
		dropLegacy() {
			const kept = this.originalIds.filter(id => !isLegacySubject(this.stripSubjects[id]));
			if (kept.length === this.originalIds.length) return false;
			this.originalIds = kept;
			this.ids = [...kept];
			this.index = 0;
			return true;
		},
		/**
		 * The known subjects (knownSubjects.ts) first, already done, and the deck starting after
		 * them. Only in a deck of subjects not started yet (locked, or waiting for their lesson):
		 * with one already in reviews, it's practiced whole, as listed.
		 */
		planKnown(knownIds, shuffleRest) {
			const subjects = this.originalIds.map(id => this.stripSubjects[id]);
			const usable = subjects.every(Boolean) && subjects.every(isNotStartedSubject);
			const known = usable ? this.originalIds.filter((id, at) => isKnownSubject(subjects[at], knownIds)) : [];
			const prefix = new Set(known);
			const rest = this.originalIds.filter(id => !prefix.has(id));
			this.knownCount = known.length;
			this.ids = [...known, ...(shuffleRest ? shuffle(rest) : rest)];
			this.shuffled = shuffleRest;
			// all of them known: from the start anyway
			this.index = known.length < this.ids.length ? known.length : 0;
			this.finished = false;
		},
		/** The list's order, the known subjects (if any) first. */
		listOrder() {
			const prefix = this.ids.slice(0, this.knownCount);
			const inPrefix = new Set(prefix);
			return [...prefix, ...this.originalIds.filter(id => !inPrefix.has(id))];
		},
		/** this card's tile in the middle of the strip (as far as its ends allow) */
		revealCurrentTile(smooth) {
			this.$nextTick(() => {
				const strip = this.$refs.strip;
				const tile = strip?.querySelector('.practice-upcoming-tile.current');
				if (strip && tile) {
					const max = strip.scrollWidth - strip.clientWidth;
					const left = Math.max(0, Math.min(max, tile.offsetLeft - (strip.clientWidth - tile.offsetWidth) / 2));
					strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
				}
				this.updateStripFade();
			});
		},
		/** a fade at each end with more beyond it */
		updateStripFade() {
			const strip = this.$refs.strip;
			if (!strip) return;
			const max = strip.scrollWidth - strip.clientWidth;
			this.stripFade = { start: strip.scrollLeft > 1, end: max - strip.scrollLeft > 1 };
		},
		/** the mouse wheel scrolls the strip sideways (until an end: then the page) */
		onStripWheel(event) {
			const strip = event.currentTarget;
			// a sideways swipe (trackpad) scrolls it on its own
			if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
			const max = strip.scrollWidth - strip.clientWidth;
			if (max <= 0) return;
			const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
			const next = Math.max(0, Math.min(max, strip.scrollLeft + delta));
			if (next === strip.scrollLeft) return;
			strip.scrollLeft = next;
			event.preventDefault();
		},
		/** The red → green scale reads well as a fill; as text it vanished on light cards. */
		statBarStyle(percentage) {
			return { width: `${percentage}%`, background: correctnessColor(percentage) };
		},
		async fetchSubject(id) {
			if (!this.cache.has(id)) {
				// a failed load is retried next time the card comes up
				const request = this.wk.getSubjectById(id).catch(() => {
					this.cache.delete(id);
					return null;
				});
				this.cache.set(id, request);
			}
			return this.cache.get(id);
		},
		/** Reveal state saved for this session's cards. */
		revealStore() {
			const key = this.originalIds.join(',');
			if (!revealSessions.has(key)) revealSessions.set(key, new Map());
			return revealSessions.get(key);
		},
		async load() {
			const id = this.ids[this.index];
			this.revealed = { meaning: false, reading: false, ...(this.revealStore().get(id) ?? {}) };
			if (this.finished || !this.ids.length) return;

			const cached = this.cache.get(id);
			// keep the previous card up for a moment instead of flashing an empty one
			if (!cached) this.subject = null;
			const subject = await this.fetchSubject(id);
			if (this.ids[this.index] !== id) return;
			this.subject = subject;

			// warm up the next card
			const nextId = this.ids[this.index + 1];
			if (nextId != null) void this.fetchSubject(nextId);
		},
		/** Remember the position, so coming back from a subject's page resumes here. */
		syncRoute() {
			const query = { ...this.$route.query, ids: this.originalIds.join(','), i: String(this.index) };
			if (this.shuffled || this.knownCount) query.order = this.ids.join(',');
			else delete query.order;
			if (this.knownCount) query.known = String(this.knownCount);
			else delete query.known;
			if (this.shuffled) query.shuffled = '1';
			else delete query.shuffled;
			this.$router.replace({ query });
		},
		go(index) {
			if (index < 0) return;
			if (index >= this.ids.length) {
				this.finished = true;
				this.index = this.ids.length;
			} else {
				this.finished = false;
				this.index = index;
			}
			this.syncRoute();
			this.load();
		},
		next() {
			this.go(this.index + 1);
		},
		revealAll() {
			this.revealed = { meaning: true, reading: true };
		},
		toggleShuffle() {
			// the known ones stay first
			const done = this.ids.slice(0, Math.max(this.index + 1, this.knownCount));
			if (this.shuffled) {
				// back to the list order, staying on the current subject
				const current = this.ids[this.index];
				this.ids = this.listOrder();
				this.index = Math.max(0, this.ids.indexOf(current));
				this.shuffled = false;
			} else {
				// shuffle only what's still ahead
				this.ids = [...done, ...shuffle(this.ids.slice(done.length))];
				this.shuffled = true;
			}
			this.syncRoute();
			this.load();
		},
		/**
		 * Straight back to the list practice started from. Only step back in history
		 * when the previous entry really is that list; otherwise (anything else left
		 * in between) a plain "back" would land elsewhere and seem to do nothing.
		 */
		backToList() {
			const router = this.$router;
			const from = typeof this.$route.query.from === 'string' ? this.$route.query.from : '';
			if (!from) {
				router.back();
				return;
			}
			if (window.history.state?.back !== from) {
				router.replace(from);
				return;
			}
			router.back();
			// the router's idea of the previous entry can be stale (an extra entry left in
			// the browser history): if stepping back didn't leave Practice, go there directly
			const stillHere = () => router.currentRoute.value.name === 'Practice';
			window.addEventListener('popstate', () => {
				setTimeout(() => {
					if (stillHere()) router.replace(from);
				}, 0);
			}, { once: true });
		},
		async restart(shuffleAll) {
			// a fresh round: everything hidden again, the known ones (as marked now) first
			this.revealStore().clear();
			this.planKnown(await readKnownSubjectIds().catch(() => new Set()), shuffleAll);
			this.go(this.index);
		},
		onKeydown(event) {
			if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return;
			if (this.finished || !this.ids.length) return;

			switch (event.key) {
				case 'ArrowRight':
					this.next();
					break;
				case 'ArrowLeft':
					this.go(this.index - 1);
					break;
				case ' ':
				case 'Enter':
					if (this.allRevealed) this.next();
					else this.revealAll();
					break;
				case 'm':
				case 'M':
					this.revealed.meaning = true;
					break;
				case 'r':
				case 'R':
					this.revealed.reading = true;
					break;
				default:
					return;
			}
			event.preventDefault();
		},
	},
};
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
}

.practice-stack {
	display: flex;
	flex-direction: column;
	gap: 10px;
	/* room for the fixed footer */
	padding: 12px 0 96px;
}

.practice-footer {
	position: fixed;
	left: var(--frame-left, 0px);
	bottom: 0;
	z-index: 5;
	width: var(--content-width, 100%);
	box-sizing: border-box;
	padding: 10px var(--content-padding-x, 10px) 8px;
	background: var(--body-color);
	border-top: 1px solid var(--surface-border-color);
	box-shadow: 0 -4px 12px var(--shadow-soft-color);
}

.practice-footer .practice-keys {
	margin-top: 6px;
}

.practice-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.practice-title {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.practice-pill {
	flex-shrink: 0;
	padding: 3px 10px;
	border-radius: 999px;
	background: var(--pill-color, #e36f94);
	color: #fff;
	font-weight: 700;
	font-size: 11.5px;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.practice-section {
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.practice-counter {
	flex-shrink: 0;
	font-size: 12px;
	font-weight: 700;
	color: var(--font-sec-color);
}

.practice-progress {
	display: flex;
	height: 5px;
	border-radius: 999px;
	/* a visible track, empty as it is (the page's own grey vanished into the page) */
	background: color-mix(in srgb, var(--font-sec-color) 22%, transparent);
	overflow: hidden;
}

.practice-progress > div {
	height: 100%;
	background: var(--wanikani-sec);
	border-radius: inherit;
	transition: width 0.25s ease;
}

/* the known ones, then what's gone through: one bar */
.practice-progress > .practice-progress-known {
	border-radius: 999px 0 0 999px;
}

.practice-progress > .practice-progress-known + div {
	border-radius: 0 999px 999px 0;
}

/* what's next: one row, scrolled sideways (no scrollbar: the fades say there's more) */
.practice-upcoming {
	/* the tiles' offsets are from here (keeping this card's tile in view) */
	position: relative;
	display: flex;
	gap: 5px;
	/* room for this card's ring, the tiles still lined up with the card below */
	margin: -5px -4px -3px;
	padding: 5px 4px;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;
}

.practice-upcoming::-webkit-scrollbar {
	display: none;
}

.practice-upcoming.fade-end {
	mask-image: linear-gradient(to right, #000 calc(100% - 48px), transparent);
}

.practice-upcoming.fade-start {
	mask-image: linear-gradient(to right, transparent, #000 28px);
}

.practice-upcoming.fade-start.fade-end {
	mask-image: linear-gradient(to right, transparent, #000 28px, #000 calc(100% - 48px), transparent);
}

.practice-upcoming-tile {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 32px;
	height: 32px;
	padding: 0 7px;
	box-sizing: border-box;
	border: none;
	border-radius: 8px;
	background: var(--tile-color);
	color: #fff;
	font-family: inherit;
	font-size: 16px;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
	box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18);
	transition: transform 0.12s, filter 0.12s;
}

.practice-upcoming-tile:hover {
	filter: brightness(1.1);
	transform: translateY(-1px);
}

/* its characters still loading */
.practice-upcoming-tile.loading {
	opacity: 0.5;
}

/* the ones gone through: faded (still a click away) */
.practice-upcoming-tile.seen {
	opacity: 0.45;
}

.practice-upcoming-tile.seen:hover {
	opacity: 0.8;
}

/* marked as known (knownSubjects.ts): a line in its color under it */
.practice-upcoming-tile.known {
	box-shadow: inset 0 -3px 0 var(--known-color);
}

/* this card: a ring around it */
.practice-upcoming-tile.current {
	box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.18), 0 0 0 2px var(--body-color), 0 0 0 4px var(--tile-color);
}

.practice-upcoming-tile.current.known {
	box-shadow: inset 0 -3px 0 var(--known-color), 0 0 0 2px var(--body-color), 0 0 0 4px var(--tile-color);
}

.practice-card {
	background: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-radius: var(--card-radius, 12px);
	box-shadow: 0 2px 10px var(--shadow-soft-color);
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.practice-characters {
	min-height: 150px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 18px 12px;
	background: var(--type-color);
	color: #fff;
	font-size: 64px;
	line-height: 1.1;
	text-align: center;
	word-break: break-all;
	text-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
}

.practice-characters.loading {
	background: var(--surface-muted-color);
	animation: practice-pulse 1.2s ease-in-out infinite;
}

@keyframes practice-pulse {
	50% {
		opacity: 0.6;
	}
}

.practice-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 12px 12px 0;
}

.practice-chip {
	padding: 3px 9px;
	border-radius: 999px;
	font-size: 11.5px;
	font-weight: 700;
	color: #fff;
	background: var(--chip-color);
}

.practice-chip.plain {
	background: var(--surface-muted-color);
	color: var(--font-color);
}

.practice-stats {
	display: flex;
	gap: 8px;
	padding: 10px 12px 0;
}

.practice-stat {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6px 4px;
	border-radius: 8px;
	background: var(--surface-muted-color);
	font-size: 11px;
	color: var(--font-sec-color);
}

.practice-stat b {
	font-size: 17px;
	color: var(--heading-color, #2a2d48);
}

.practice-stat-bar {
	display: block;
	width: 70%;
	height: 4px;
	margin-top: 4px;
	border-radius: 999px;
	background: var(--surface-border-color);
	overflow: hidden;
}

.practice-stat-bar > span {
	display: block;
	height: 100%;
	border-radius: inherit;
}

.practice-stat small {
	font-size: 10.5px;
}

.practice-stat-empty {
	padding: 10px;
	font-size: 12px;
}

.practice-answers {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
}

.practice-answer {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 3px;
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--surface-muted-color);
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	text-align: left;
	cursor: pointer;
}

.practice-answer.revealed {
	cursor: default;
}

.practice-answer-label {
	font-size: 10.5px;
	font-weight: 700;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--font-sec-color);
}

.practice-answer-value {
	font-size: 15px;
	line-height: 1.5;
}

/* animate only the reveal: hiding is instant, so the next card's answer never
   shows through a fading blur */
.practice-answer.revealed .practice-answer-value {
	transition: filter 0.25s ease, opacity 0.25s ease;
}

.practice-answer:not(.revealed) .practice-answer-value {
	filter: blur(7px);
	opacity: 0.7;
	user-select: none;
}

.practice-answer-hint {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.practice-reading-group {
	display: block;
}

.practice-reading-group small {
	display: inline-block;
	min-width: 30px;
	margin-right: 6px;
	font-size: 10.5px;
	font-weight: 700;
	color: var(--font-sec-color);
}

.practice-card-foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 0 12px 12px;
}

.practice-link {
	border: none;
	background: none;
	padding: 0;
	font-family: inherit;
	font-size: 12px;
	font-weight: 700;
	color: var(--wanikani-sec);
	text-decoration: none;
	cursor: pointer;
}

.practice-link:hover {
	text-decoration: underline;
}

.practice-nav {
	display: flex;
	gap: 8px;
}

.practice-nav .practice-btn {
	flex: 1;
}

.practice-btn {
	padding: 8px 10px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	color: var(--heading-color, #2a2d48);
	font-family: inherit;
	font-size: 13px;
	font-weight: 700;
	cursor: pointer;
	transition: background-color 0.15s, opacity 0.15s;
}

.practice-btn:hover:not(:disabled) {
	background: var(--surface-muted-color);
}

.practice-btn:disabled {
	opacity: 0.4;
	cursor: default;
}

.practice-btn.primary {
	border-color: transparent;
	background: var(--pill-color, #e36f94);
	color: #fff;
}

.practice-btn.primary:hover {
	background: var(--pill-color, #e36f94);
	opacity: 0.9;
}

.practice-btn.active {
	border-color: var(--pill-color, #e36f94);
	color: var(--pill-color, #e36f94);
}

.practice-head-end {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.practice-keys {
	text-align: center;
	font-size: 11px;
	color: var(--font-sec-color);
}

.practice-done {
	align-items: center;
	gap: 8px;
	padding: 28px 16px;
	text-align: center;
	color: var(--font-sec-color);
}

.practice-done-title {
	font-size: 22px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
}

.practice-done-actions {
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
	max-width: 240px;
	margin-top: 8px;
}

.practice-empty {
	text-align: center;
	color: var(--font-sec-color);
	padding: 40px 16px;
}

@media (prefers-reduced-motion: reduce) {
	.practice-answer-value,
	.practice-progress > div {
		transition: none;
	}

	.practice-characters.loading {
		animation: none;
	}
}
</style>
