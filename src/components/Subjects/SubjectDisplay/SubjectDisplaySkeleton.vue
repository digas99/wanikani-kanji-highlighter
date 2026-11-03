<template>
	<!-- Compact preview (in-page popup, bottom-right) -->
	<div
		v-if="variant === 'compact'"
		class="sd-detailsPopup sd-skeleton sd-skeleton-compact"
		:style="{ width: `${width}px`, height: 'auto', borderTop: '4px solid #8a8a99', paddingBottom: '12px' }"
		aria-busy="true"
		aria-label="Loading subject"
	>
		<div class="sd-skeleton-title"><span class="sd-shimmer sd-shimmer-dark"></span></div>
		<div class="sd-skeleton-chars" :style="charsStyle">
			<template v-if="characters">{{ characters }}</template>
			<span v-else class="sd-shimmer sd-skeleton-charBlock"></span>
		</div>
		<span class="sd-shimmer sd-skeleton-line short"></span>
	</div>

	<!-- Expanded panel / extension popup Subject page -->
	<div v-else class="sd-detailsPopup sd-focusPopup sd-skeleton sd-skeleton-full" aria-busy="true" aria-label="Loading subject">
		<div class="sd-skeleton-header">
			<div class="sd-skeleton-chars" :style="charsStyle">
				<template v-if="characters">{{ characters }}</template>
				<span v-else class="sd-shimmer sd-skeleton-charBlock"></span>
			</div>
			<span class="sd-shimmer sd-skeleton-line short"></span>
		</div>
		<div class="sd-skeleton-nav"></div>
		<div class="sd-skeleton-body">
			<span class="sd-shimmer sd-skeleton-line" style="width: 45%"></span>
			<span class="sd-shimmer sd-skeleton-line" style="width: 30%"></span>
			<span class="sd-shimmer sd-skeleton-line" style="width: 70%; height: 16px"></span>
			<div class="sd-skeleton-block">
				<span v-for="n in 4" :key="n" class="sd-shimmer sd-skeleton-line" :style="{ width: `${95 - n * 9}%` }"></span>
			</div>
			<div class="sd-skeleton-cards">
				<span v-for="n in 6" :key="n" class="sd-shimmer sd-skeleton-card"></span>
			</div>
		</div>
	</div>
</template>

<script>
import '@/utils/styles/subject-display.css';
import { getPopupKanjiFontSizePx } from '@/utils/scripts/subjectDetailsPopup';

export default {
	name: 'SubjectDisplaySkeleton',

	props: {
		variant: {
			type: String,
			default: 'compact',
			validator: value => ['compact', 'full'].includes(value),
		},
		/** Already-known characters (e.g. the hovered word) are shown for real. */
		characters: {
			type: String,
			default: '',
		},
		width: {
			type: Number,
			default: 150,
		},
	},

	computed: {
		charsStyle() {
			const size = getPopupKanjiFontSizePx(this.characters, { compact: this.variant === 'compact' });
			return { fontSize: `${size}px` };
		},
	},
};
</script>

<style>
/* .sd-shimmer lives in subject-display.css (also used by cards / stats placeholders) */

.sd-skeleton {
	color: #fff;
	display: flex !important;
	flex-direction: column;
	align-items: center;
}

.sd-skeleton .sd-skeleton-title {
	width: 100%;
	height: 26px;
	background: #fff;
	margin-bottom: 8px;
	display: flex !important;
	align-items: center;
	justify-content: center;
}

.sd-skeleton-title .sd-shimmer {
	width: 55%;
	height: 12px;
}

.sd-skeleton-chars {
	line-height: 1.1;
	white-space: nowrap;
	text-align: center;
	opacity: 0.85;
	min-height: 60px;
	display: flex !important;
	align-items: center;
	justify-content: center;
}

.sd-skeleton-charBlock {
	width: 64px;
	height: 56px;
}

.sd-skeleton .sd-skeleton-line {
	height: 11px;
	width: 100%;
	margin: 6px 0;
}

.sd-skeleton .sd-skeleton-line.short {
	width: 45%;
	margin: 8px auto 0;
}

.sd-skeleton-full {
	width: 100%;
	height: 100%;
	align-items: stretch;
}

.sd-skeleton .sd-skeleton-header {
	display: flex !important;
	flex-direction: column;
	align-items: center;
	padding: 34px 0 22px;
}

.sd-skeleton .sd-skeleton-nav {
	height: 34px;
	margin: 8px 12px !important;
	border-radius: 9px;
	background: var(--sd-surface-strong);
}

.sd-skeleton .sd-skeleton-body {
	padding: 15px;
}

.sd-skeleton .sd-skeleton-block {
	margin: 18px 0;
}

.sd-skeleton-cards {
	display: grid !important;
	grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
	gap: 6px;
}

.sd-skeleton-card {
	height: 64px;
	border-radius: 7px;
}
</style>
