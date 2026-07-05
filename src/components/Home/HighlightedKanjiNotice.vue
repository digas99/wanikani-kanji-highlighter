<template>
	<Transition name="highlight-notice">
		<button
			v-if="count > 0"
			type="button"
			class="highlight-notice clickable"
			@click="$emit('click')"
		>
			<div class="highlight-notice-copy">
				<strong>{{ label }}</strong>
				<span v-if="modeLabel" class="highlight-notice-mode">{{ modeLabel }}</span>
				<span class="highlight-notice-action">View highlighted list</span>
			</div>

			<div
				v-if="showProgressBar && barValues.length"
				class="highlight-notice-bar"
				aria-hidden="true"
			>
				<ProgressionBar
					:values="barValues"
					:colors="barColors"
					:sorting="barSorting"
				/>
			</div>
		</button>
	</Transition>
</template>

<script>
import ProgressionBar from '@/components/Home/ProgressionBar.vue';

export default {
	name: 'HighlightedKanjiNotice',

	components: {
		ProgressionBar,
	},

	props: {
		count: {
			type: Number,
			default: 0,
		},
		modeLabel: {
			type: String,
			default: '',
		},
		showProgressBar: {
			type: Boolean,
			default: false,
		},
		barValues: {
			type: Array,
			default: () => [],
		},
		barColors: {
			type: Object,
			default: () => ({}),
		},
		barSorting: {
			type: Object,
			default: () => ({}),
		},
	},

	emits: ['click'],

	computed: {
		label() {
			const noun = this.count === 1 ? 'subject' : 'subjects';
			return `${this.count} highlighted ${noun} on this page`;
		},
	},
};
</script>

<style scoped>
.highlight-notice {
	position: fixed;
	left: 10px;
	right: 10px;
	bottom: 10px;
	z-index: 99;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
	width: calc(100% - 60px);
	padding: 12px 14px;
	border: 1px solid var(--surface-border-color);
	border-radius: 10px;
	background: var(--fill-color);
	box-shadow: 0 4px 18px var(--shadow-soft-color);
	color: var(--default-color);
	text-align: left;
	cursor: pointer;
}

.highlight-notice-copy {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 2px;
}

.highlight-notice strong {
	font-size: 13px;
}

.highlight-notice-mode {
	font-size: 11px;
	color: var(--font-sec-color);
}

.highlight-notice-action {
	font-size: 11px;
	color: var(--wanikani);
}

.highlight-notice-bar {
	pointer-events: none;
}

.highlight-notice-bar :deep(#progression-bar) {
	height: 20px;
	padding-bottom: 0;
}

.highlight-notice-bar :deep(#progression-bar > li > a),
.highlight-notice-bar :deep(#progression-bar > li > .progression-bar-action) {
	font-size: 10px;
}

.highlight-notice-enter-active,
.highlight-notice-leave-active {
	transition: opacity 0.2s ease, transform 0.2s ease;
}

.highlight-notice-enter-from,
.highlight-notice-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
</style>

<style>
.highlight-notice-bar #progression-bar > li:first-child,
.highlight-notice-bar #progression-bar > li:first-child > a {
	border-radius: 5px 0 0 5px;
}

.highlight-notice-bar #progression-bar > li:last-child,
.highlight-notice-bar #progression-bar > li:last-child > a {
	border-radius: 0 5px 5px 0;
}
</style>
