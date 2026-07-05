<template>
	<div class="hl-choice-page">
		<div class="hl-choice-hero">
			<img src="@/assets/logo.png" alt="" class="hl-choice-logo">
			<h1>Set up highlighting</h1>
			<p class="hl-choice-lead">
				The extension highlights the WaniKani content it finds on the pages you browse.
				Pick how you'd like it to work — you can change all of this later in Settings.
			</p>
		</div>

		<div class="hl-choice-section">
			<span class="hl-choice-section-title">What to highlight</span>
			<div class="hl-choice-cards hl-choice-cards--three">
				<button
					v-for="option in targetOptions"
					:key="option.value"
					type="button"
					class="hl-choice-card clickable"
					:class="{ picked: target === option.value }"
					@click="target = option.value"
				>
					<span class="hl-choice-card-sample">{{ option.sample }}</span>
					<span class="hl-choice-card-title">{{ option.title }}</span>
					<span class="hl-choice-card-desc">{{ option.description }}</span>
				</button>
			</div>
		</div>

		<div class="hl-choice-section">
			<span class="hl-choice-section-title">Color by</span>
			<div class="hl-choice-cards">
				<button
					v-for="option in colorByOptions"
					:key="option.value"
					type="button"
					class="hl-choice-card compact clickable"
					:class="{ picked: colorBy === option.value }"
					@click="colorBy = option.value"
				>
					<span class="hl-choice-card-title">{{ option.title }}</span>
					<span class="hl-choice-card-desc">{{ option.description }}</span>
				</button>
			</div>
		</div>

		<div class="hl-choice-section">
			<span class="hl-choice-section-title">Highlight style</span>
			<div class="hl-style-preview">
				<span class="hl-preview-text">
					ブラウザで<span :style="previewStyle(styleLearned, previewColorA)">日本語</span>の<span :style="previewStyle(previewStyleB, previewColorB)">単語</span>を見つけます
				</span>
				<div v-if="colorBy === 'learned'" class="hl-preview-legend">
					<span><i class="hl-preview-dot" :style="{ background: learnedColor }"></i>Learned</span>
					<span><i class="hl-preview-dot" :style="{ background: notLearnedColor }"></i>Not learned</span>
				</div>
				<div v-else-if="colorBy === 'srs_stage'" class="hl-preview-legend hl-preview-legend-srs">
					<span v-for="sample in srsPreviewSamples" :key="sample.label">
						<i class="hl-preview-dot" :style="{ background: sample.color }"></i>{{ sample.label }}
					</span>
				</div>
				<div v-else-if="colorBy === 'jlpt' || colorBy === 'joyo'" class="hl-preview-legend hl-preview-legend-srs hl-preview-legend-grades">
					<span v-for="sample in gradePreviewSamples" :key="sample.label">
						<i class="hl-preview-dot" :style="{ background: sample.color }"></i>{{ sample.label }}
					</span>
				</div>
			</div>
			<div class="hl-choice-styles">
				<div
					class="highlight-options hl-style-options"
					:style="{ '--sample-color': styleSampleColor }"
				>
					<button
						v-for="(option, index) in styleOptions"
						:key="option.value"
						type="button"
						class="settings-highlight-style-option clickable"
						:class="[option.sampleClass, { picked: selectedStyleIndex === index }]"
						:title="option.title"
						@click="selectStyle(index)"
					>
						A
					</button>
				</div>
			</div>
		</div>

		<div class="hl-choice-section">
			<span class="hl-choice-section-title">When to highlight</span>
			<div class="hl-choice-cards">
				<button
					v-for="option in modeOptions"
					:key="option.value"
					type="button"
					class="hl-choice-card compact clickable"
					:class="{ picked: mode === option.value, recommended: option.recommended }"
					@click="mode = option.value"
				>
					<span v-if="option.recommended" class="hl-choice-recommended">Recommended</span>
					<span class="hl-choice-card-title">{{ option.label }}</span>
					<span class="hl-choice-card-desc">{{ option.description }}</span>
				</button>
			</div>
		</div>

		<button type="button" class="hl-choice-confirm clickable" :disabled="submitting" @click="confirm">
			{{ submitting ? 'Saving…' : 'Start highlighting' }}
		</button>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';
import { useWKStore } from '@/stores';
import {
	highlightStyleOptions,
	highlightModeOptions,
	highlightColorByOptions,
	highlightColorByKanjiOptions,
} from '@/utils/scripts/defaultSettings';
import {
	JLPT_GRADE_SECTIONS,
	JOYO_GRADE_SECTIONS,
} from '@/utils/highlight/schoolGradeHighlight';

export default {
	name: 'HighlightChoice',

	components: {},

	data() {
		const settings = useSettingsStore().settings;
		return {
			highlightStyleOptions,
			submitting: false,
			target: settings.highlighter.target || 'kanji',
			colorBy: settings.highlighter.color_by || 'learned',
			mode: settings.highlighter.mode || 'viewport',
			styleLearned: settings.highlight_style.learned,
			styleNotLearned: settings.highlight_style.not_learned,
			targetOptions: [
				{
					value: 'kanji',
					title: 'Kanji',
					sample: '漢字',
					description: 'Highlight each individual kanji you have or haven\'t learned.',
				},
				{
					value: 'vocabulary',
					title: 'Words',
					sample: '言葉',
					description: 'Highlight whole words that match the vocabulary taught in WaniKani.',
				},
				{
					value: 'mixed',
					title: 'Mixed',
					sample: '混在',
					description: 'Highlight known words, and fall back to single kanji for words WaniKani doesn\'t teach.',
				},
			],
			modeOptions: highlightModeOptions.map(option => ({
				...option,
				recommended: option.value === 'viewport',
				description: option.value === 'full'
					? 'Highlight everything on the page at once.'
					: 'Only highlight what is visible, and pick up new content as you scroll.',
			})),
		};
	},

	computed: {
		settings() {
			return useSettingsStore();
		},
		wk() {
			return useWKStore();
		},
		learnedColor() {
			return this.settings.settings.appearance.highlight_learned;
		},
		notLearnedColor() {
			return this.settings.settings.appearance.highlight_not_learned;
		},
		appearance() {
			return this.settings.settings.appearance;
		},
		colorByOptions() {
			const base = highlightColorByOptions.map(option => ({
				...option,
				title: option.label,
				description: this.colorByDescription(option.value),
			}));
			if (this.target !== 'kanji') return base;
			return base.concat(highlightColorByKanjiOptions.map(option => ({
				...option,
				title: option.label,
				description: this.colorByDescription(option.value),
			})));
		},
		previewColorA() {
			if (this.colorBy === 'srs_stage') return this.appearance.ap1_color;
			if (this.colorBy === 'jlpt') return JLPT_GRADE_SECTIONS[0].fallbackColor;
			if (this.colorBy === 'joyo') return JOYO_GRADE_SECTIONS[0].fallbackColor;
			return this.learnedColor;
		},
		previewColorB() {
			if (this.colorBy === 'srs_stage') return this.appearance.gr1_color;
			if (this.colorBy === 'jlpt') return JLPT_GRADE_SECTIONS.at(-1)?.fallbackColor ?? '#e53935';
			if (this.colorBy === 'joyo') return JOYO_GRADE_SECTIONS.at(-1)?.fallbackColor ?? '#6d4c41';
			return this.notLearnedColor;
		},
		previewStyleB() {
			if (this.colorBy === 'learned') return this.styleNotLearned;
			return this.styleLearned;
		},
		styleOptions() {
			return this.highlightStyleOptions.learned;
		},
		selectedStyleIndex() {
			const idx = this.highlightStyleOptions.learned.findIndex(
				option => option.value === this.styleLearned,
			);
			return idx >= 0 ? idx : 0;
		},
		styleSampleColor() {
			if (this.colorBy === 'srs_stage') return this.appearance.ap1_color;
			if (this.colorBy === 'jlpt') return JLPT_GRADE_SECTIONS[2].fallbackColor;
			if (this.colorBy === 'joyo') return JOYO_GRADE_SECTIONS[2].fallbackColor;
			return this.learnedColor;
		},
		srsPreviewSamples() {
			const { appearance } = this;
			return [
				{ label: 'Apprentice', color: appearance.ap1_color },
				{ label: 'Guru', color: appearance.gr1_color },
				{ label: 'Master', color: appearance.mst_color },
				{ label: 'Burned', color: appearance.brn_color },
			];
		},
		gradePreviewSamples() {
			if (this.colorBy === 'joyo') {
				return JOYO_GRADE_SECTIONS.map(section => ({
					label: section.label,
					color: section.fallbackColor,
				}));
			}
			if (this.colorBy === 'jlpt') {
				return JLPT_GRADE_SECTIONS.map(section => ({
					label: section.label,
					color: section.fallbackColor,
				}));
			}
			return [];
		},
	},

	watch: {
		target(nextTarget) {
			if (nextTarget !== 'kanji' && (this.colorBy === 'jlpt' || this.colorBy === 'joyo')) {
				this.colorBy = 'learned';
			}
		},
	},

	mounted() {
		document.body.style.marginTop = '0';
	},

	beforeUnmount() {
		document.body.style.marginTop = null;
	},

	methods: {
		colorByDescription(value) {
			switch (value) {
				case 'srs_stage':
					return 'Each item uses the color of its WaniKani SRS stage (Apprentice, Guru, etc.).';
				case 'jlpt':
					return 'Each kanji is colored by its JLPT level (N5 through N1). Kanji-only mode.';
				case 'joyo':
					return 'Each kanji is colored by its Jōyō school grade. Kanji-only mode.';
				default:
					return 'Two colors — one for content you\'ve started, one for what you haven\'t.';
			}
		},
		selectStyle(index) {
			const learned = this.highlightStyleOptions.learned[index];
			const notLearned = this.highlightStyleOptions.not_learned[index];
			if (!learned) return;
			this.styleLearned = learned.value;
			if (notLearned) this.styleNotLearned = notLearned.value;
		},
		previewStyle(value, color) {
			if (value.endsWith('_underlined')) return { borderBottom: `3px solid ${color}` };
			if (value.endsWith('_bold')) return { color, fontWeight: '700' };
			if (value.endsWith('_nostyle')) return {};
			return { backgroundColor: color, color: '#fff', borderRadius: '3px', padding: '0 3px' };
		},
		async confirm() {
			if (this.submitting) return;
			this.submitting = true;
			try {
				await this.settings.setSetting('highlight_style', 'learned', this.styleLearned);
				await this.settings.setSetting('highlight_style', 'not_learned', this.styleNotLearned);
				await this.settings.setSetting('highlighter', 'target', this.target);
				const colorBy = this.target !== 'kanji' && (this.colorBy === 'jlpt' || this.colorBy === 'joyo')
					? 'learned'
					: this.colorBy;
				await this.settings.setSetting('highlighter', 'color_by', colorBy);
				await this.settings.setSetting('highlighter', 'mode', this.mode);
				await this.settings.setSetting('highlighter', 'enabled', true);
				await this.settings.setSetting('highlighter', 'initial_choice_made', true);
				this.wk.awaitingHighlightChoice = false;
				await this.wk.beginStartupSync();
			} finally {
				this.submitting = false;
			}
		},
	},
};
</script>

<style scoped>
.hl-choice-page {
	min-height: 100vh;
	padding: 28px var(--content-padding-x) 32px;
	box-sizing: border-box;
	background: linear-gradient(180deg, var(--fill-color) 0%, var(--surface-muted-color) 100%);
}

.hl-choice-hero {
	text-align: center;
	margin-bottom: 20px;
}

.hl-choice-logo {
	width: 52px;
	height: 52px;
	margin-bottom: 12px;
}

.hl-choice-hero h1 {
	font-size: 20px;
	color: var(--default-color);
	margin-bottom: 8px;
}

.hl-choice-lead {
	color: var(--font-sec-color);
	line-height: 1.5;
	font-size: 13px;
	max-width: 380px;
	margin: 0 auto;
}

.hl-choice-section {
	max-width: 420px;
	margin: 0 auto 18px;
}

.hl-choice-section-title {
	display: block;
	font-size: 11px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--muted-color);
	margin-bottom: 8px;
}

.hl-choice-cards {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.hl-choice-cards--three {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.hl-choice-card {
	position: relative;
	min-width: 0;
}

.hl-choice-recommended {
	position: absolute;
	top: -9px;
	right: 10px;
	padding: 2px 8px;
	border-radius: 999px;
	background: var(--wanikani-sec);
	color: white;
	font-size: 9px;
	font-weight: 700;
	letter-spacing: 0.03em;
	text-transform: uppercase;
}

.hl-choice-card {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 14px;
	border: 2px solid var(--surface-border-color);
	border-radius: 12px;
	background: var(--fill-color);
	text-align: left;
	box-shadow: 0 2px 8px var(--shadow-soft-color);
	transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}

.hl-choice-card:hover {
	border-color: var(--wanikani);
	transform: translateY(-1px);
}

.hl-choice-card.picked {
	border-color: var(--wanikani);
	background: linear-gradient(180deg, var(--fill-color) 0%, var(--surface-muted-color) 100%);
	box-shadow: 0 4px 14px var(--shadow-soft-color);
}

.hl-choice-card-sample {
	font-size: 22px;
	font-weight: 700;
	color: var(--wanikani);
}

.hl-choice-card-title {
	font-size: 14px;
	font-weight: 700;
	color: var(--default-color);
}

.hl-choice-card-desc {
	font-size: 11px;
	color: var(--font-sec-color);
	line-height: 1.4;
}

.hl-style-preview {
	padding: 14px;
	margin-bottom: 8px;
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	background: var(--fill-color);
	text-align: center;
}

.hl-preview-text {
	font-size: 18px;
	line-height: 1.9;
	color: var(--default-color);
}

.hl-preview-legend {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 16px;
	margin-top: 10px;
	font-size: 11px;
	color: var(--muted-color);
}

.hl-preview-legend-srs {
	gap: 10px 14px;
}

.hl-preview-legend-grades {
	gap: 8px 12px;
}

.hl-preview-legend span {
	display: inline-flex;
	align-items: center;
	gap: 5px;
}

.hl-preview-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	display: inline-block;
	border: none;
}

.hl-choice-styles {
	padding: 12px 14px;
	border: 1px solid var(--surface-border-color);
	border-radius: 12px;
	background: var(--fill-color);
}

.hl-style-options {
	justify-content: center;
}

.hl-choice-confirm {
	display: block;
	width: 100%;
	max-width: 420px;
	margin: 8px auto 0;
	padding: 12px;
	border: none;
	border-radius: 12px;
	background: var(--wanikani);
	color: white;
	font-size: 14px;
	font-weight: 700;
	transition: opacity 0.15s ease;
}

.hl-choice-confirm:hover:not(:disabled) {
	opacity: 0.9;
}

.hl-choice-confirm:disabled {
	opacity: 0.6;
	cursor: wait;
}
</style>
