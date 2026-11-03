<template>
	<!-- a search field on the dark pages, with romaji → hiragana typing (A / あ) -->
	<div class="kana-search" :class="{ focused }">
		<svg class="kana-search-icon" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" />
		</svg>
		<input
			ref="input"
			v-bind="$attrs"
			type="search"
			class="kana-search-input"
			:value="modelValue"
			:placeholder="kana ? kanaPlaceholder || placeholder : placeholder"
			:lang="kana ? 'ja' : undefined"
			@input="onInput"
			@focus="focused = true"
			@blur="focused = false"
		>
		<!-- A: as typed · あ: romaji turns into hiragana while typing -->
		<div class="kana-search-mode" role="radiogroup" aria-label="Typing">
			<button
				type="button"
				role="radio"
				:aria-checked="!kana"
				:class="{ active: !kana }"
				title="Type as is (romaji, English…)"
				@click="setKana(false)"
			>A</button>
			<button
				type="button"
				role="radio"
				:aria-checked="kana"
				:class="{ active: kana }"
				title="Romaji turns into kana as you type: hiragana (kana → かな), katakana in ALL CAPS (KANA → カナ)"
				@click="setKana(true)"
			>あ</button>
		</div>
	</div>
</template>

<script>
import { toRomaji } from 'wanakana';
import { typeKana } from '@/utils/scripts/kanaTyping';

export default {
	name: 'KanaSearchInput',

	// the input gets the rest (aria-label, id, @keydown…), not the wrapper
	inheritAttrs: false,

	props: {
		modelValue: { type: String, default: '' },
		/** hiragana typing on */
		kana: { type: Boolean, default: false },
		placeholder: { type: String, default: '' },
		kanaPlaceholder: { type: String, default: '' },
	},

	emits: ['update:modelValue', 'update:kana'],

	data() {
		return { focused: false };
	},

	methods: {
		/**
		 * In kana mode, romaji is converted as typed, the way an IME does: a lone "n" stays
		 * until the next key decides between ん and な / に / …; ALL CAPS gives katakana, any
		 * other case hiragana (kanaTyping.ts).
		 */
		onInput(event) {
			const raw = event.target.value;
			const value = this.kana ? typeKana(raw) : raw;
			if (value !== raw) event.target.value = value;
			this.$emit('update:modelValue', value);
		},
		/** The mode switched: what's typed follows (romaji ↔ hiragana). */
		setKana(kana) {
			if (kana === this.kana) return;
			this.$emit('update:kana', kana);
			const value = kana ? typeKana(this.modelValue) : toRomaji(this.modelValue);
			if (value !== this.modelValue) this.$emit('update:modelValue', value);
			this.focus();
		},
		focus() {
			this.$refs.input?.focus();
		},
	},
};
</script>

<style scoped>
/* on the dark pages: a translucent field, a light edge, brighter when focused */
.kana-search {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 6px;
	height: 32px;
	padding: 0 3px 0 10px;
	box-sizing: border-box;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 8px;
	background: rgba(255, 255, 255, 0.06);
	transition: border-color 0.15s, background-color 0.15s;
}

.kana-search.focused {
	border-color: rgba(255, 255, 255, 0.32);
	background: rgba(255, 255, 255, 0.09);
}

.kana-search-icon {
	flex-shrink: 0;
	width: 14px;
	height: 14px;
	fill: none;
	stroke: #9a9db4;
	stroke-width: 2.2;
	stroke-linecap: round;
}

/* inside the wrapper: over the app's own input[type="search"](:focus) look (a white field) */
.kana-search .kana-search-input,
.kana-search .kana-search-input:focus {
	flex: 1;
	min-width: 0;
	height: 100%;
	padding: 0;
	border: none;
	border-radius: 0;
	outline: none;
	background: transparent;
	box-shadow: none;
	color: #fff;
	font-family: inherit;
	font-size: 12.5px;
}

.kana-search .kana-search-input::placeholder {
	color: #9a9db4;
}

/* the browser's clear button (×): light, as the rest of the field */
.kana-search .kana-search-input::-webkit-search-cancel-button {
	filter: invert(1);
	opacity: 0.6;
	cursor: pointer;
}

/* A / あ: a small switch inside the field */
.kana-search-mode {
	flex-shrink: 0;
	display: flex;
	gap: 1px;
	padding: 2px;
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.08);
}

.kana-search-mode button {
	width: 24px;
	height: 22px;
	padding: 0;
	border: none;
	border-radius: 5px;
	background: transparent;
	color: #9a9db4;
	font-family: inherit;
	font-size: 12px;
	font-weight: 800;
	line-height: 1;
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}

.kana-search-mode button:hover {
	color: #fff;
}

.kana-search-mode button.active {
	background: var(--pill-color, #e36f94);
	color: #fff;
}
</style>
