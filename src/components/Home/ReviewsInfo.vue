<template>
	<div class="reviews-info">
		<div class="reviews-numbers">
			<div data-type="lessons">
				<div class="label">Lessons</div>
				<RouterLink :to="{ name: 'Lessons' }" class="number">{{ lessons.length }}</RouterLink>
			</div>
			<div data-type="reviews">
				<div class="label">Reviews</div>
				<RouterLink :to="{ name: 'Reviews' }" class="number">{{ reviews.length }}</RouterLink>
			</div>
		</div>
		<div class="next-reviews">
			<span><span>{{ next.reviews?.length }}</span> more <span style="color: var(--wanikani-sec)">Reviews</span>
				in
				<span>{{ next.time }}</span></span>
			<span>{{ next.date }}, {{ next.hours }}</span>
		</div>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';

import { getWKManager } from '@/lib/apiClient';

export default {
	name: 'ReviewsInfo',

	data() {
		return {
			wkManager: null,
		};
	},

	mounted() {
		this.wkManager = getWKManager();
	},

	props: {
		next: {
			type: Object,
			default: () => ({})
		},

		lessons: {
			type: Array,
			default: () => []
		},

		reviews: {
			type: Array,
			default: () => []
		}
	},
}
</script>

<style scoped>
.reviews-info {
	background-color: var(--default-color);
	color: white;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 10px 20px;
}

.reviews-numbers {
	display: flex;
	align-items: center;
	width: 100%;
}

.reviews-numbers>div {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.reviews-numbers .number {
	padding: 20px 0;
	width: 100%;
	text-align: center;
	font-size: 2rem;
	font-weight: bold;
	color: white;
}

.reviews-numbers>div[data-type="lessons"] .number {
	background-color: var(--wanikani);
	border-top-left-radius: 10px;
	border-bottom-left-radius: 10px;
}

.reviews-numbers>div[data-type="reviews"] .number {
	background-color: var(--wanikani-sec);
	border-top-right-radius: 10px;
	border-bottom-right-radius: 10px;
}

.reviews-numbers .label {
	padding: 10px 0;
	width: 100%;
	text-align: center;
	font-weight: bold;
}

.next-reviews {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10px;
	gap: 5px;
}

.next-reviews>span>span {
	font-weight: bold;
}
</style>
