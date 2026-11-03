<template>
	<div id="progression-stats">
		<ul>
			<li
				v-for="entry in sorted(values)"
				:key="entry.id"
				:data-id="entry.id"
				:class="{ 'tile-still': moves && !moves[entry.id] }"
				:style="{ backgroundColor: colors ? colors[entry.id] : '' }"
			>
				<RouterLink :to="{ name: 'Subjects', query: { id: entry.id, type } }">
					{{ entry.items.length }}
				</RouterLink>
				<Transition name="tile-delta">
					<span
						v-if="deltas && deltas[entry.id]"
						class="tile-delta"
						:class="deltas[entry.id] > 0 ? 'tile-delta-gain' : 'tile-delta-loss'"
						:title="`${deltas[entry.id] > 0 ? '+' : '−'}${Math.abs(deltas[entry.id])} since your last visit`"
					>
						{{ deltas[entry.id] > 0 ? '+' : '−' }}{{ Math.abs(deltas[entry.id]) }}
					</span>
				</Transition>
				<!-- today's moves: in (+) and out (−) of this stage -->
				<Transition name="tile-delta">
					<span v-if="moves && moves[entry.id]" class="tile-moves" :title="movesTitle(moves[entry.id])">
						<span v-if="moves[entry.id].in" class="tile-delta tile-delta-gain">+{{ moves[entry.id].in }}</span>
						<span v-if="moves[entry.id].out" class="tile-delta tile-delta-loss">−{{ moves[entry.id].out }}</span>
					</span>
				</Transition>
			</li>
		</ul>
	</div>
</template>

<script>
import { RouterLink } from 'vue-router';

export default {
	name: 'ProgressionTiles',

	components: {
		RouterLink,
	},

	props: {
		values: {
			type: Object,
		},
		colors: {
			type: Object,
		},
		sorting: {
			type: Object,
		},
		type: {
			type: String,
		},
		/** Change per stage since the user's last visit: { [stageId]: number } */
		deltas: {
			type: Object,
			default: null,
		},
		/** Today's SRS moves per stage: { [stageId]: { in, out } } (the others fade) */
		moves: {
			type: Object,
			default: null,
		},
	},

	methods: {
		movesTitle(move) {
			const parts = [move.in && `${move.in} moved in`, move.out && `${move.out} moved out`].filter(Boolean);
			return `Today's reviews: ${parts.join(', ')}`;
		},
		sorted(values) {
			if (this.sorting) {
				return Object.keys(this.sorting).map(key => values[key]);
			}
			return values.sort((a, b) => a.id - b.id);
		},
	},
};
</script>

<style scoped>
#progression-stats {
	padding: 7px;
}

#progression-stats>ul {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 7px;
}

#progression-stats>ul>li {
	position: relative;
	width: 100%;
	border-radius: 8px;
	overflow: hidden;
}

/* "+12" / "−3" since the last visit */
.tile-delta {
	position: absolute;
	top: 3px;
	right: 3px;
	padding: 0 4px;
	border-radius: 999px;
	font-size: 9.5px;
	font-weight: 700;
	line-height: 1.45;
	pointer-events: none;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* (not .up / .down: the popup's global CSS rotates those for arrow icons) */
.tile-delta-gain {
	background: #ffffff;
	color: #1d7a3a;
}

.tile-delta-loss {
	background: rgba(0, 0, 0, 0.45);
	color: #ffffff;
}

/* today's moves: in and out, side by side along the top */
.tile-moves {
	position: absolute;
	top: 3px;
	right: 3px;
	display: flex;
	gap: 2px;
	/* hover for the counts in words */
	pointer-events: auto;
}

.tile-moves .tile-delta {
	position: static;
}

/* stages today's reviews didn't touch step back */
#progression-stats>ul>li {
	transition: opacity 0.2s ease;
}

#progression-stats>ul>li.tile-still {
	opacity: 0.4;
}

.tile-delta-enter-active {
	transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.tile-delta-enter-from {
	opacity: 0;
	transform: translateY(-4px) scale(0.8);
}

.tile-delta-leave-active {
	transition: opacity 0.6s ease;
}

.tile-delta-leave-to {
	opacity: 0;
}

#progression-stats a {
	color: white !important;
	display: flex;
	width: 100%;
	height: 70px;
	align-items: center;
	justify-content: center;
	font-size: 25px;
	transition: 0.2s;
}
</style>
