<template>
	<div class="sd-hw" @click.self="$emit('close')">
		<div class="sd-hw-card" role="dialog" aria-label="Sentence handwriting">
			<header class="sd-hw-head">
				<span class="sd-hw-title">Handwriting</span>
				<button type="button" class="sd-hw-close" title="Close (Esc)" @click="$emit('close')">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
			</header>

			<div class="sd-hw-controls">
				<div class="sd-hw-segmented" role="radiogroup" aria-label="Writing direction">
					<button
						type="button"
						role="radio"
						title="Horizontal"
						aria-label="Horizontal"
						:aria-checked="!prefs.vertical"
						:class="{ active: !prefs.vertical }"
						@click="prefs.vertical = false"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
					</button>
					<button
						type="button"
						role="radio"
						title="Vertical"
						aria-label="Vertical"
						:aria-checked="prefs.vertical"
						:class="{ active: prefs.vertical }"
						@click="prefs.vertical = true"
					>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 4v16M12 4v16M7 4v10" /></svg>
					</button>
				</div>
				<label class="sd-hw-size" title="Character size">
					<span>Size</span>
					<input v-model.number="prefs.size" type="range" min="36" max="140" step="4">
				</label>
				<label class="sd-hw-toggle">
					<input v-model="prefs.strokeOrder" type="checkbox">
					<span>Stroke order</span>
				</label>
				<label class="sd-hw-toggle">
					<input v-model="prefs.guides" type="checkbox">
					<span>Guides</span>
				</label>
			</div>

			<div
				class="sd-hw-sheet"
				:class="{ vertical: prefs.vertical }"
				:style="sheetStyle"
			>
				<svg
					v-for="(glyph, index) in glyphs"
					:key="index"
					class="sd-hw-char"
					:class="{ space: glyph.space }"
					viewBox="0 0 109 109"
					:width="prefs.size"
					:height="prefs.size"
					:aria-label="glyph.char"
				>
					<template v-if="prefs.guides && !glyph.space">
						<rect class="sd-hw-box" x="0.5" y="0.5" width="108" height="108" rx="4" />
						<line class="sd-hw-guide" x1="54.5" y1="2" x2="54.5" y2="107" />
						<line class="sd-hw-guide" x1="2" y1="54.5" x2="107" y2="54.5" />
					</template>
					<!-- KanjiVG strokes, drawn complete (no animation) -->
					<g
						v-if="glyph.strokes?.length"
						:transform="glyph.rotate ? 'rotate(90 54.5 54.5)' : null"
					>
						<path v-for="(stroke, s) in glyph.strokes" :key="s" class="sd-hw-stroke" :d="stroke.path" />
						<template v-if="prefs.strokeOrder">
							<text
								v-for="(stroke, s) in glyph.strokes"
								:key="`n${s}`"
								class="sd-hw-order"
								:x="stroke.text?.x"
								:y="stroke.text?.y"
							>{{ stroke.text?.value ?? '' }}</text>
						</template>
					</g>
					<!-- not in KanjiVG (punctuation, latin, still loading): the font's glyph -->
					<text
						v-else-if="!glyph.space"
						class="sd-hw-fallback"
						:class="{ loading: glyph.loading }"
						x="54.5"
						y="58"
					>{{ glyph.char }}</text>
				</svg>
			</div>

			<!-- the same sentence in print, then its translation -->
			<p ref="printed" :key="text" class="sd-hw-printed" lang="ja">{{ text }}</p>
			<p class="sd-hw-translation" v-if="translation">{{ translation }}</p>
			<p class="sd-hw-credit">Strokes: KanjiVG</p>
		</div>
	</div>
</template>

<script>
import { reactive } from 'vue';
import '@/lib/dmakLoader.js';
import { highlightElement } from '@/utils/highlight/subjectDetailsHighlight';

const KANJI_SOURCE = 'https://kanji.wkhighlighter.com/';

/** Choices kept while the page is open (shared by every sentence). */
const prefs = reactive({ vertical: true, size: 48, strokeOrder: true, guides: false });

/** char → Promise<strokes[]> (empty array: KanjiVG has no file for it). */
const strokeCache = new Map();

/** KanjiVG covers kana, 々 and kanji; anything else is drawn with the font. */
const KANJIVG_CHAR = /[々ぁ-ヿ㐀-鿿豈-﫿]/;

function loadStrokes(char) {
	if (!KANJIVG_CHAR.test(char)) return Promise.resolve([]);
	if (!strokeCache.has(char)) {
		strokeCache.set(char, new Promise(resolve => {
			try {
				new window.DmakLoader(KANJI_SOURCE).load(char, data => resolve(Array.isArray(data?.[0]) ? data[0] : []));
			} catch {
				resolve([]);
			}
		}));
	}
	return strokeCache.get(char);
}

/** Space between characters on the sheet (px, matches the CSS gap). */
const GAP = 4;

/** Characters that turn sideways in vertical writing. */
const ROTATE_IN_VERTICAL = new Set(['ー', '～', '〜', '…', '‥', '-', '—']);

export default {
	name: 'SentenceHandwriting',

	props: {
		/** The Japanese sentence (may contain highlight markup). */
		sentence: { type: String, required: true },
		translation: { type: String, default: '' },
	},

	emits: ['close'],

	data() {
		return {
			prefs,
			strokesByChar: {},
			viewportHeight: window.innerHeight,
		};
	},

	computed: {
		/**
		 * Vertical: as many characters per column as fit in the height, so the sheet
		 * is exactly as wide as its columns (no empty area next to them).
		 */
		verticalRows() {
			const available = this.viewportHeight * 0.6 - 20; // sheet max height minus padding
			const perColumn = Math.max(1, Math.floor((available + GAP) / (this.prefs.size + GAP)));
			return Math.min(perColumn, Math.max(1, this.glyphs.length));
		},
		sheetStyle() {
			const style = { '--hw-size': `${this.prefs.size}px` };
			if (this.prefs.vertical) style.gridTemplateRows = `repeat(${this.verticalRows}, ${this.prefs.size}px)`;
			return style;
		},
		text() {
			// WaniKani marks the subject in the sentence with HTML: keep only the text
			const container = document.createElement('div');
			container.innerHTML = this.sentence;
			return (container.textContent ?? '').trim();
		},
		glyphs() {
			return Array.from(this.text).map(char => {
				const space = /\s/.test(char);
				const loaded = Object.prototype.hasOwnProperty.call(this.strokesByChar, char);
				return {
					char,
					space,
					loading: !space && !loaded,
					strokes: this.strokesByChar[char] ?? null,
					rotate: this.prefs.vertical && ROTATE_IN_VERTICAL.has(char),
				};
			});
		},
	},

	watch: {
		text: {
			handler() {
				this.load();
				// the printed line gets the same highlighting as the rest of the details
				this.$nextTick(() => void highlightElement(this.$refs.printed));
			},
			immediate: true,
		},
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown, true);
		window.addEventListener('resize', this.onResize);
		void highlightElement(this.$refs.printed);
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown, true);
		window.removeEventListener('resize', this.onResize);
	},

	methods: {
		load() {
			for (const char of new Set(Array.from(this.text))) {
				if (/\s/.test(char)) continue;
				void loadStrokes(char).then(strokes => {
					this.strokesByChar = { ...this.strokesByChar, [char]: strokes };
				});
			}
		},
		onResize() {
			this.viewportHeight = window.innerHeight;
		},
		onKeydown(event) {
			if (event.key !== 'Escape') return;
			// don't let the details popup also react to it
			event.stopPropagation();
			this.$emit('close');
		},
	},
};
</script>

<style scoped>
.sd-hw {
	position: fixed;
	inset: 0;
	z-index: 2147483000;
	display: flex !important;
	align-items: center;
	justify-content: center;
	padding: 16px !important;
	box-sizing: border-box;
	background: rgba(10, 11, 22, 0.65);
	font-family: inherit;
	cursor: default;
}

.sd-hw-card {
	display: flex !important;
	flex-direction: column;
	gap: 10px;
	width: min(720px, 100%);
	max-height: 100%;
	padding: 14px !important;
	box-sizing: border-box;
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: #1f2134;
	color: #fff;
	box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}

.sd-hw-head {
	display: flex !important;
	align-items: center;
	justify-content: space-between;
}

.sd-hw-title {
	padding: 3px 10px !important;
	border-radius: 999px;
	background: #e36f94;
	font-size: 11.5px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.sd-hw-close {
	display: flex !important;
	padding: 4px !important;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
}

.sd-hw-close:hover {
	background: rgba(255, 255, 255, 0.1);
}

.sd-hw-close svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: #c9cbe0;
	stroke-width: 2.5;
	stroke-linecap: round;
}

/* everything on one line in the extension popup's width */
.sd-hw-controls {
	display: flex !important;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px 12px;
	font-size: 12px;
	color: #c9cbe0;
	white-space: nowrap;
}

.sd-hw-segmented {
	display: flex !important;
	gap: 2px;
	padding: 2px !important;
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.08);
}

.sd-hw-segmented button {
	display: flex !important;
	padding: 4px 8px !important;
	border: none;
	border-radius: 6px;
	background: transparent;
	cursor: pointer;
}

.sd-hw-segmented button svg {
	width: 16px;
	height: 16px;
	fill: none;
	stroke: #c9cbe0;
	stroke-width: 2.4;
	stroke-linecap: round;
}

.sd-hw-segmented button.active {
	background: #e36f94;
}

.sd-hw-segmented button.active svg {
	stroke: #fff;
}

.sd-hw-size,
.sd-hw-toggle {
	display: flex !important;
	align-items: center;
	gap: 6px;
	cursor: pointer;
}

.sd-hw-size input {
	width: 80px;
	accent-color: #e36f94;
}

.sd-hw-toggle input {
	margin: 0 !important;
	accent-color: #e36f94;
}

/* the writing sheet: rows (horizontal) or right-to-left columns (vertical) */
.sd-hw-sheet {
	display: flex !important;
	flex-wrap: wrap;
	align-content: flex-start;
	gap: 4px;
	min-height: 120px;
	max-height: 60vh;
	overflow: auto;
	padding: 10px !important;
	border-radius: 10px;
	background: #f7f5ef;
}

/* columns top to bottom, right to left (rtl: the first column, and the scroll, start on
   the right). A grid sized to its columns: as wide as the writing, centered. */
.sd-hw-sheet.vertical {
	display: grid !important;
	grid-auto-flow: column;
	grid-auto-columns: var(--hw-size);
	direction: rtl;
	align-self: center;
	width: fit-content;
	max-width: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.sd-hw-char {
	display: block !important;
	flex-shrink: 0;
}

.sd-hw-char.space {
	visibility: hidden;
}

.sd-hw-box {
	fill: #fff;
	stroke: #d9d4c7;
	stroke-width: 1;
}

.sd-hw-guide {
	stroke: #e2ddd0;
	stroke-width: 1;
	stroke-dasharray: 4 4;
}

.sd-hw-stroke {
	fill: none;
	stroke: #1d1f33;
	stroke-width: 3.4;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.sd-hw-order {
	font-size: 8px;
	font-family: sans-serif;
	fill: #e0457b;
}

.sd-hw-fallback {
	font-size: 64px;
	fill: #1d1f33;
	text-anchor: middle;
	dominant-baseline: middle;
	font-family: sans-serif;
}

.sd-hw-fallback.loading {
	fill: #c9c3b4;
}

.sd-hw-printed {
	margin: 0 !important;
	font-size: 17px;
	line-height: 1.5;
	color: #fff;
}

.sd-hw-translation {
	margin: -4px 0 0 !important;
	font-size: 13px;
	color: #c9cbe0;
}

.sd-hw-credit {
	margin: 0 !important;
	align-self: flex-end;
	font-size: 10px;
	color: #7f829c;
}
</style>
