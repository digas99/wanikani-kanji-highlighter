<template>
	<!-- the first visit of the day: how yesterday went (a toast at the top, like the friends' level-ups) -->
	<div class="yesterday-recap" :class="{ quiet: !parts.length }" role="status">
		<component
			:is="target.href ? 'a' : 'button'"
			v-bind="target.href ? { href: target.href, target: '_blank', rel: 'noopener' } : { type: 'button' }"
			class="yesterday-main"
			:title="target.title"
			@click="onMainClick"
		>
			<span class="yesterday-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24">
					<rect x="3.5" y="5" width="17" height="15" rx="2.5" />
					<path d="M3.5 10h17M8 3v4M16 3v4" />
				</svg>
			</span>
			<span class="yesterday-text">
				<b>Yesterday</b>
				<span v-if="parts.length">{{ parts.join(' · ') }}</span>
				<template v-else>
					<span>No reviews or lessons.</span>
					<span v-if="reviewsAvailable">
						{{ reviewsAvailable }} {{ reviewsAvailable === 1 ? 'review is' : 'reviews are' }} waiting ↗
					</span>
				</template>
			</span>
		</component>
		<button type="button" class="yesterday-close" aria-label="Dismiss" @click="$emit('dismiss')">×</button>
	</div>
</template>

<script>
export default {
	name: 'YesterdayRecap',

	props: {
		/** DaySummary (utils/scripts/dailyActivity) */
		summary: {
			type: Object,
			required: true,
		},
		/** reviews available right now, for the nudge after a day without any */
		reviewsAvailable: {
			type: Number,
			default: 0,
		},
	},

	emits: ['dismiss'],

	computed: {
		parts() {
			const { reviews, unscored = 0, correct, incorrect, lessons, passed, burned } = this.summary;
			const answered = correct + incorrect;
			const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
			return [
				// subjects reviewed before tracking started count once each
				reviews + unscored && plural(reviews + unscored, 'review'),
				answered && `${Math.round((correct / answered) * 100)}% correct`,
				lessons && plural(lessons, 'lesson'),
				passed && `${passed} passed`,
				burned && `${burned} burned`,
			].filter(Boolean);
		},
		/** a click opens yesterday's reviewed subjects, or WaniKani's reviews after a quiet day */
		target() {
			if (this.summary.items) return { title: 'See the subjects reviewed yesterday' };
			if (this.reviewsAvailable) return { href: 'https://www.wanikani.com/subjects/review', title: 'Do your reviews on WaniKani' };
			return { title: '' };
		},
	},

	methods: {
		onMainClick() {
			if (this.summary.items) void this.$router.push({ name: 'Reviewed', query: { date: this.summary.date } });
			this.$emit('dismiss');
		},
	},
};
</script>

<style scoped>
.yesterday-recap {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 6px 6px 6px 8px;
	border-radius: 12px;
	border: 1px solid var(--surface-border-color);
	border-left: 4px solid var(--pill-color, #e36f94);
	background: var(--fill-color);
	box-shadow: 0 6px 20px var(--shadow-soft-color), 0 1px 4px rgba(0, 0, 0, 0.15);
}

/* a day without reviews: a warmer accent, same toast */
.yesterday-recap.quiet {
	border-left-color: #f5a623;
}

.yesterday-main {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 2px;
	border: none;
	background: transparent;
	color: var(--font-sec-color);
	font-family: inherit;
	font-size: 12px;
	text-align: left;
	text-decoration: none;
	cursor: pointer;
}

.yesterday-icon {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	border-radius: 8px;
	background: var(--surface-muted-color);
}

.yesterday-icon svg {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: var(--pill-color, #e36f94);
	stroke-width: 2;
	stroke-linecap: round;
}

.yesterday-recap.quiet .yesterday-icon svg {
	stroke: #f5a623;
}

.yesterday-text {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 1px;
	line-height: 1.35;
}

.yesterday-text b {
	font-size: 12.5px;
	color: var(--heading-color, #2a2d48);
}

.yesterday-close {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	border: none;
	border-radius: 6px;
	background: transparent;
	color: var(--font-sec-color);
	font-size: 18px;
	line-height: 1;
	cursor: pointer;
}

.yesterday-close:hover {
	background: var(--surface-muted-color);
}
</style>
