<template>
	<!-- Compact: one slim row per subject, to see more results at once -->
	<li
		v-if="compact"
		class="sr-row"
		:class="{ legacy }"
		:style="{ '--srs-color': srsColor, '--type-color': typeColor }"
		:data-item-id="item.id"
		:title="`${meanings} · Level ${item.level}`"
		@click="goToSubjectPage(item.id)"
		@contextmenu.prevent="showInPage(item.id)"
	>
		<span class="sr-row-chars"><SubjectCharacters :item="item" :width="20" :height="20" /></span>
		<span class="sr-row-meaning">{{ primaryMeaning }}</span>
		<span class="sr-row-reading">{{ primaryReading }}</span>
		<span v-if="srsShort" class="sr-row-srs" :title="srsName">{{ srsShort }}</span>
		<span class="sr-row-level">{{ item.level }}</span>
	</li>

	<!-- Detailed (default) -->
	<!-- Detailed (default): dark header with the characters, light panel with meanings
	     and readings, action column on the right (the v1 layout) -->
	<li
		v-else
		class="sr-card"
		:class="{ legacy }"
		:style="{ '--srs-color': srsColor, '--type-color': typeColor }"
	>
		<div
			:data-item-id="item.id"
			class="sr-main"
			@click="goToSubjectPage(item.id)"
			@contextmenu.prevent="showInPage(item.id)"
		>
			<div class="sr-head">
				<div class="sr-chars"><SubjectCharacters :item="item" :width="35" :height="35" /></div>
				<div class="sr-type">{{ typeLabel }}</div>
			</div>
			<div class="sr-info">
				<span class="sr-meaning">{{ meanings }}</span>
				<template v-if="item.readings">
					<span v-if="isVocab" class="sr-reading">{{ subjectDisplay.readings(item) }}</span>
					<span v-if="subjectDisplay.onyomiReadings(item)" class="sr-reading">
						<b>ON:</b>{{ subjectDisplay.onyomiReadings(item) }}
					</span>
					<span v-if="subjectDisplay.kunyomiReadings(item)" class="sr-reading">
						<b>KUN:</b>{{ subjectDisplay.kunyomiReadings(item) }}
					</span>
				</template>
			</div>
		</div>
		<div class="sr-actions">
			<button
				v-if="item.pronunciation_audios?.length"
				type="button"
				class="sr-action"
				title="Play audio"
				@click="playAudio(item.pronunciation_audios[0].url)"
			>
				<img src="@/assets/icons/search/volume.png" alt="Play audio">
			</button>
			<button
				v-if="item.characters"
				type="button"
				class="sr-action"
				:title="`Search for ${item.characters}`"
				@click="$emit('search', item.characters)"
			>
				<img src="@/assets/icons/search/search.png" alt="Search">
			</button>
			<button
				v-if="item.characters"
				type="button"
				class="sr-action"
				title="Copy"
				@click="copyToClipboard(item.characters)"
			>
				<img src="@/assets/icons/search/copy.png" alt="Copy">
			</button>
			<span v-if="srsShort" class="sr-srs" :title="srsName">{{ srsShort }}</span>
			<span class="sr-level" title="Level">{{ item.level }}</span>
		</div>
	</li>
</template>

<script>
import { srsStages, typeColors, subjectDisplay } from '@/utils/scripts/wanikani';

import SubjectCharacters from '@/components/Subjects/SubjectCharacters.vue';
import { showSubjectInPage } from '@/utils/scripts/showSubjectInPage';

/** legacy subjects' edge (the details' "Legacy" chip is yellow too) */
const LEGACY_COLOR = '#f5d000';

export default {
	name: 'SearchResultItem',
	components: {
		SubjectCharacters
	},
	props: {
		item: {
			type: Object,
			required: true
		},
		/** Slim one-line row instead of the detailed card. */
		compact: {
			type: Boolean,
			default: false
		}
	},

	emits: ['search'],

	computed: {
		subjectDisplay() {
			return subjectDisplay;
		},
		isVocab() {
			return this.item.type === 'vocabulary' || this.item.type === 'kana_vocabulary';
		},
		typeColor() {
			return typeColors[this.item.type] ?? 'var(--default-color)';
		},
		typeLabel() {
			const label = String(this.item.type ?? '').split('_').join(' ');
			return label.charAt(0).toUpperCase() + label.slice(1);
		},
		/** WaniKani took it out of lessons and reviews: faded, a yellow edge (as in tile lists and the details) */
		legacy() {
			return Boolean(this.item.hidden_at || this.item.assignment?.hidden);
		},
		srsColor() {
			if (this.legacy) return LEGACY_COLOR;
			return subjectDisplay.srsStageColor(this.item, srsStages);
		},
		srsShort() {
			if (this.legacy) return 'Legacy';
			const stage = this.item.assignment?.srs_stage;
			return stage != null ? srsStages[stage]?.short ?? '' : '';
		},
		srsName() {
			if (this.legacy) {
				const since = String(this.item.hidden_at ?? '').split('T')[0];
				return `Legacy: no longer in lessons or reviews${since ? `, since ${since}` : ''}`;
			}
			return subjectDisplay.srsStageName(this.item, srsStages);
		},
		meanings() {
			return this.item.meanings?.length ? subjectDisplay.joinMeanings(this.item) : '';
		},
		primaryMeaning() {
			const meanings = this.item.meanings ?? [];
			return (meanings.find(meaning => meaning.primary) ?? meanings[0])?.meaning ?? '';
		},
		primaryReading() {
			const readings = this.item.readings ?? [];
			return (readings.find(reading => reading.primary) ?? readings[0])?.reading ?? '';
		}
	},

	methods: {
		goToSubjectPage(id) {
			this.$router.push({ name: 'Subject', params: { id } });
		},
		/** Right-click: show in the web page's details popup, or open it here if the page can't. */
		async showInPage(id) {
			if (await showSubjectInPage(id)) return;
			this.goToSubjectPage(id);
		},
		playAudio(url) {
			const audio = new Audio(url);
			audio.play();
		},
		copyToClipboard(text) {
			navigator.clipboard.writeText(text).then(() => {
				console.log('Copied to clipboard:', text);
			}).catch(err => {
				console.error('Error copying to clipboard:', err);
			});
		}
	}
};
</script>

<style scoped>
/* ---------- detailed card (v1 layout, theme-aware) ---------- */

.sr-card {
	display: flex;
	margin: 0 6px 6px;
	text-align: left;
	color: #fff;
	background-color: var(--default-color);
	/* a thin edge keeps the card apart from the page in dark mode */
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid var(--srs-color);
	border-radius: 14px;
	box-shadow: 0 2px 8px var(--shadow-soft-color);
	overflow: hidden;
}

.sr-main {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	cursor: pointer;
}

.sr-head {
	padding: 6px 12px 7px;
	transition: background-color 0.15s;
}

.sr-main:hover .sr-head {
	background-color: rgba(255, 255, 255, 0.05);
}

.sr-chars {
	font-size: 35px;
	line-height: 1.25;
}

.sr-type {
	font-size: 13px;
	color: var(--type-color);
	filter: brightness(1.15);
}

.sr-info {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
	padding: 4px 12px 8px;
	/* a touch lighter than the card, so it stands apart from the dark header in dark
	   mode (white stays white in light mode) */
	background-color: color-mix(in srgb, var(--fill-color) 90%, #fff);
	color: var(--font-color);
}

.sr-meaning {
	padding: 4px 0 6px;
	border-bottom: 1px solid var(--surface-border-color);
	font-size: 16px;
	font-weight: 800;
	color: var(--heading-color, #2a2d48);
	line-height: 1.3;
}

.sr-reading {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 14px;
	line-height: 1.45;
}

.sr-reading b {
	font-size: 13px;
	color: var(--heading-color, #2a2d48);
}

/* right column, on the dark header color like before */
.sr-actions {
	flex-shrink: 0;
	width: 44px;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	text-align: center;
	border-left: 1px solid rgba(255, 255, 255, 0.12);
	background-color: var(--default-color);
}

.sr-actions > * {
	border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.sr-actions > :last-child {
	border-bottom: none;
}

.sr-action {
	padding: 8px 0;
	border-top: none;
	border-left: none;
	border-right: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	justify-content: center;
}

.sr-action img {
	width: 15px;
	height: 15px;
	filter: invert(1);
	opacity: 0.8;
}

.sr-action:hover img {
	opacity: 1;
}

/* legacy (no longer in lessons or reviews): faded, as in tile lists; clearer under the pointer */
.sr-card.legacy,
.sr-row.legacy {
	opacity: 0.5;
	transition: opacity 0.15s;
}

.sr-card.legacy:hover,
.sr-row.legacy:hover {
	opacity: 0.9;
}

.sr-card.legacy .sr-srs {
	font-size: 11px;
}

.sr-srs {
	padding: 7px 0;
	font-size: 13px;
	font-weight: 700;
	color: var(--srs-color);
	filter: brightness(1.2);
}

.sr-level {
	padding: 7px 0;
	font-size: 13px;
	color: #fff;
}

/* ---------- compact row: light row, dark tile behind the characters only ---------- */

.sr-row {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 38px;
	margin: 0 6px 3px;
	padding: 0 10px 0 0;
	text-align: left;
	color: var(--font-color);
	background-color: var(--fill-color);
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid var(--srs-color);
	border-radius: 8px;
	cursor: pointer;
	overflow: hidden;
	transition: background-color 0.15s;
}

.sr-row:hover {
	background-color: var(--surface-muted-color);
}

/* the subject type is only a thin underline on the dark tile */
.sr-row-chars {
	flex-shrink: 0;
	min-width: 44px;
	max-width: 42%;
	height: 100%;
	padding: 0 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--default-color);
	box-shadow: inset 0 -3px 0 var(--type-color);
	color: #fff;
	font-size: 18px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sr-row-meaning {
	flex: 1 1 auto;
	min-width: 60px;
	font-size: 13px;
	font-weight: 700;
	color: var(--heading-color, #2a2d48);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sr-row-reading {
	flex: 0 1 auto;
	min-width: 0;
	max-width: 32%;
	font-size: 12.5px;
	color: var(--font-sec-color);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sr-row-srs {
	flex-shrink: 0;
	font-size: 11px;
	font-weight: 700;
	color: var(--srs-color);
}

.sr-row-level {
	flex-shrink: 0;
	min-width: 22px;
	padding: 2px 5px;
	border-radius: 6px;
	background-color: var(--surface-muted-color);
	font-size: 11px;
	font-weight: 700;
	text-align: center;
	color: var(--font-sec-color);
}</style>
