<template>
	<!-- from the page history (Page reading level → Keep a history): where you've met it reading -->
	<div v-if="sightings.count" class="sd-seenOnPages">
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
		<span>
			Seen on
			<a
				v-if="pagesRoute"
				class="sd-seenOnPages_link"
				href="#"
				:title="`The pages read with ${item.characters}`"
				@click.prevent="$router.push(pagesRoute)"
			><b>{{ sightings.count }}</b> {{ sightings.count === 1 ? 'page' : 'pages' }}</a>
			<template v-else><b>{{ sightings.count }}</b> {{ sightings.count === 1 ? 'page' : 'pages' }}</template>
			<template v-if="sightings.last">
				· last on
				<a
					class="sd-seenOnPages_link"
					:href="sightings.last.url"
					target="_blank"
					rel="noopener noreferrer"
					:title="sightings.last.title || sightings.last.url"
				>{{ sightings.last.host }}</a>, {{ lastWhen }}
			</template>
		</span>
	</div>
</template>

<script>
import { readPageHistory, subjectSightings, watchPageHistory } from '@/utils/scripts/pageHistory';

const DAY_MS = 24 * 60 * 60 * 1000;

export default {
	name: 'SubjectDisplaySeenOnPages',

	props: {
		item: { type: Object, required: true },
		/** the extension popup: the count opens the history, those pages only */
		linkPages: Boolean,
	},

	data() {
		return { entries: [] };
	},

	computed: {
		sightings() {
			return subjectSightings(this.entries, this.item);
		},
		pagesRoute() {
			return this.linkPages && this.$router ? { name: 'Pages', query: { has: this.item.characters, type: this.item.type } } : null;
		},
		lastWhen() {
			const at = this.sightings.last?.at;
			if (!at) return '';
			const days = Math.floor((Date.now() - at) / DAY_MS);
			if (days <= 0) return 'today';
			if (days === 1) return 'yesterday';
			if (days < 30) return `${days} days ago`;
			return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
		},
	},

	async created() {
		try {
			this.entries = await readPageHistory();
			this.unwatch = watchPageHistory(entries => { this.entries = entries; });
		} catch {
			// no history here: nothing shown
		}
	},

	beforeUnmount() {
		this.unwatch?.();
	},
};
</script>

<style scoped>
.sd-seenOnPages {
	display: flex;
	align-items: center;
	gap: 6px;
	/* under the links, set apart as they are from the chips */
	margin-top: 10px;
	padding-top: 8px;
	border-top: 1px solid var(--sd-border, rgba(127, 127, 127, 0.25));
	font-size: 12px;
	line-height: 1.35;
	color: var(--sd-muted, #777);
}

.sd-seenOnPages svg {
	flex-shrink: 0;
	width: 14px;
	height: 14px;
	fill: none;
	stroke: currentColor;
	stroke-width: 2;
}

.sd-seenOnPages b {
	color: var(--sd-text, #333);
}

.sd-seenOnPages_link {
	color: inherit !important;
	text-decoration: underline;
	text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
	text-underline-offset: 2px;
}

.sd-seenOnPages_link:hover {
	text-decoration-color: currentColor;
}
</style>
