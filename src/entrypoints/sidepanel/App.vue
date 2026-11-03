<template>
	<div class="sidepanel">
		<header class="sp-header">
			<!-- names where Back goes (the current subject is already shown large below) -->
			<button
				v-if="previousEntry"
				type="button"
				class="sp-back-btn"
				:title="`Back to ${previousEntry.label}`"
				@click="goBack"
			>
				<span aria-hidden="true">←</span>
				<span class="sp-back-label">{{ previousEntry.label }}</span>
			</button>
			<span class="sp-title">Subject details</span>
			<button
				type="button"
				class="sp-switch-btn"
				title="Show subject details in the page popup instead (closes the side panel)"
				@click="showOnPage"
			>Show on page</button>
		</header>

		<main class="sp-body">
			<SubjectDisplay
				v-if="item && !loading"
				:key="item.id"
				:item="item"
				:related-subjects="related"
				:related-loading="relatedLoading"
				:stats-loading="statsLoading"
				:popup-width="panelWidth"
				:show-strokes="showStrokes"
				:autoplay-audio="autoplayAudio"
				:highlight-style-vars="highlightStyleVars"
				:lookup-links="lookupLinks"
				extended-details
				@open-subject="id => load({ subjectId: id })"
				@highlight-subject="({ value, type }) => load({ characters: value, subjectType: type })"
			/>
			<SubjectDisplaySkeleton
				v-else-if="loading"
				variant="full"
				:characters="pendingCharacters"
			/>
			<div v-else class="sp-empty">
				<div class="sp-empty-kanji">字</div>
				<p v-if="notFound">That subject isn't in your WaniKani cache yet.</p>
				<template v-else>
					<p><b>Hover</b> a highlighted kanji or word on a page to see it here.</p>
					<p class="sp-muted">Clicking a highlighted word also opens this panel.</p>
				</template>
			</div>
		</main>
	</div>
</template>

<script>
import { storage } from '#imports';
import SubjectDisplay from '@/components/Subjects/SubjectDisplay/SubjectDisplay.vue';
import SubjectDisplaySkeleton from '@/components/Subjects/SubjectDisplay/SubjectDisplaySkeleton.vue';
import { highlightStyleVarsFromSettings, srsAppearanceVarsFromSettings } from '@/utils/highlight/highlightStyleVars';
import { hasCachedReviewStats } from '@/utils/scripts/subjectDetailsPopup';
import { resolveLookupLinks } from '@/utils/scripts/lookupLinks';
import { defaultSettings } from '@/utils/scripts/defaultSettings';
import { showSubjectInPage } from '@/utils/scripts/showSubjectInPage';
import { SIDEPANEL_SUBJECT_KEY } from '@/utils/scripts/sidePanel';

const HISTORY_LIMIT = 30;

export default {
	name: 'SidePanelApp',

	components: {
		SubjectDisplay,
		SubjectDisplaySkeleton,
	},

	data() {
		return {
			item: null,
			related: {},
			loading: false,
			notFound: false,
			relatedLoading: false,
			statsLoading: false,
			pendingCharacters: '',
			history: [],
			settings: null,
			panelWidth: window.innerWidth,
			requestSeq: 0,
			lastRequestAt: 0,
			unwatchers: [],
		};
	},

	computed: {
		popupSettings() {
			return this.settings?.kanji_details_popup ?? {};
		},
		showStrokes() {
			return this.popupSettings.subject_drawing !== false;
		},
		autoplayAudio() {
			return this.popupSettings.audio_autoplay === true;
		},
		highlightStyleVars() {
			return {
				...highlightStyleVarsFromSettings(this.settings),
				...srsAppearanceVarsFromSettings(this.settings),
			};
		},
		lookupLinks() {
			return resolveLookupLinks(this.settings?.lookup, defaultSettings.lookup.links);
		},
		/** The subject Back returns to. */
		previousEntry() {
			return this.history.length >= 2 ? this.history[this.history.length - 2] : null;
		},
	},

	async mounted() {
		window.addEventListener('resize', this.onResize);

		this.settings = await storage.getItem('local:settings');
		this.unwatchers.push(storage.watch('local:settings', value => { this.settings = value; }));

		// the subject the page asked for (click / hover), also the one that opened the panel
		const pending = await storage.getItem(SIDEPANEL_SUBJECT_KEY);
		if (pending) this.onRequest(pending);
		this.unwatchers.push(storage.watch(SIDEPANEL_SUBJECT_KEY, request => {
			if (request) this.onRequest(request);
		}));
	},

	beforeUnmount() {
		window.removeEventListener('resize', this.onResize);
		this.unwatchers.forEach(unwatch => unwatch?.());
	},

	methods: {
		onResize() {
			this.panelWidth = window.innerWidth;
		},
		onRequest(request) {
			if (!request?.at || request.at <= this.lastRequestAt) return;
			this.lastRequestAt = request.at;
			void this.load(request);
		},
		async fetchBundle(request, ensureReviews) {
			const payload = {
				type: 'wkh:getSubject',
				includeRelated: true,
				ensureReviews,
			};
			if (Number.isFinite(Number(request.subjectId))) payload.subjectId = Number(request.subjectId);
			else {
				payload.characters = request.characters;
				if (request.subjectType) payload.subjectType = request.subjectType;
			}
			try {
				return await browser.runtime.sendMessage(payload);
			} catch {
				return null;
			}
		},
		async load(request, { pushHistory = true } = {}) {
			const seq = ++this.requestSeq;
			this.notFound = false;
			this.pendingCharacters = request.characters ?? '';
			// keep showing the current subject for fast lookups; skeleton only if it's slow
			const skeletonTimer = setTimeout(() => {
				if (seq === this.requestSeq) this.loading = true;
			}, 120);

			const bundle = await this.fetchBundle(request, false);
			clearTimeout(skeletonTimer);
			if (seq !== this.requestSeq) return;
			this.loading = false;

			if (!bundle?.subject) {
				if (!this.item) this.notFound = true;
				return;
			}

			this.item = bundle.subject;
			this.related = bundle.related ?? {};
			window.scrollTo({ top: 0 });

			if (pushHistory && this.history[this.history.length - 1]?.id !== bundle.subject.id) {
				const subject = bundle.subject;
				// image-only radicals have no characters: use the meaning
				const label = subject.characters
					|| subject.meanings?.find(meaning => meaning.primary)?.meaning
					|| subject.meanings?.[0]?.meaning
					|| '';
				this.history = [...this.history, { id: subject.id, label }].slice(-HISTORY_LIMIT);
			}

			// review stats may need an API call: fill them in without blocking
			if (!hasCachedReviewStats(bundle.subject.reviews)) {
				this.statsLoading = true;
				const withReviews = await this.fetchBundle({ subjectId: bundle.subject.id }, true);
				if (seq !== this.requestSeq) return;
				this.statsLoading = false;
				if (withReviews?.subject) {
					this.item = withReviews.subject;
					this.related = withReviews.related ?? this.related;
				}
			}
		},
		goBack() {
			if (this.history.length < 2) return;
			const history = this.history.slice(0, -1);
			this.history = history;
			void this.load({ subjectId: history[history.length - 1].id }, { pushHistory: false });
		},
		/** Switch back to the in-page popup: save the setting, show the subject there, close. */
		async showOnPage() {
			try {
				await browser.runtime.sendMessage({ type: 'wkh:setDetailsLocation', location: 'page' });
			} catch {
				// the setting is also applied when the page reads it
			}
			if (this.item?.id != null) {
				await showSubjectInPage(this.item.id, { switchToPage: true });
			}
			window.close();
		},
	},
};
</script>

<style scoped>
.sidepanel {
	min-height: 100vh;
	background: var(--default-color);
}

.sp-header {
	position: sticky;
	top: 0;
	z-index: 5;
	display: flex;
	align-items: center;
	gap: 8px;
	height: var(--topbar-height);
	padding: 0 10px;
	box-sizing: border-box;
	background: var(--default-color);
	border-top: 4px solid var(--wanikani);
	border-bottom: 1px solid rgba(255, 255, 255, 0.09);
}

.sp-title {
	flex: 1;
	min-width: 0;
	font-size: 13px;
	font-weight: 700;
	color: rgba(255, 255, 255, 0.7);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sp-back-btn {
	display: flex;
	align-items: center;
	gap: 6px;
	max-width: 45%;
	height: 30px;
	padding: 0 10px;
	font-size: 15px;
}

.sp-back-label {
	min-width: 0;
	font-size: 14px;
	font-weight: 700;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sp-back-btn,
.sp-switch-btn {
	border: none;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.1);
	color: #fff;
	font-family: inherit;
	cursor: pointer;
	transition: background-color 0.15s ease;
}

.sp-switch-btn {
	padding: 7px 10px;
	font-size: 11.5px;
	font-weight: 700;
	white-space: nowrap;
}

.sp-back-btn:hover,
.sp-switch-btn:hover {
	background: var(--pill-color);
}

.sp-empty {
	padding: 60px 24px;
	text-align: center;
	color: #d7d8e6;
	font-size: 14px;
	line-height: 1.5;
}

.sp-empty-kanji {
	font-size: 64px;
	opacity: 0.25;
	margin-bottom: 8px;
}

.sp-empty p {
	margin: 6px 0;
}

.sp-muted {
	color: #a6a9c2;
	font-size: 12.5px;
}
</style>

<style>
/* The details component, laid out for a full-height page that scrolls (like the popup's Subject page). */
.sidepanel .sd-detailsPopup {
	position: relative !important;
	width: 100% !important;
	height: auto;
	opacity: 1 !important;
	box-shadow: none !important;
	z-index: unset !important;
}

.sidepanel .sd-focusPopup_kanji {
	width: 100% !important;
	min-height: 140px !important;
	transition: unset;
}

.sidepanel .sd-popupDetails_detailedInfoWrapper {
	height: auto;
	overflow: visible;
}

.sidepanel .sd-popupDetails_navbar {
	top: var(--topbar-height);
}

/* the quick-stats bar is fixed to the bottom of the panel */
.sidepanel .sd-detailsPopup .sd-popupDetails_details {
	margin-bottom: 44px !important;
}

.sidepanel .sd-skeleton-full {
	min-height: calc(100vh - var(--topbar-height));
}
</style>
