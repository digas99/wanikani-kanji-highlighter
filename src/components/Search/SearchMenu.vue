<template>
	<!-- the search's filters, always in view: chips (as Pages read / Sentences), a group each -->
	<div class="search-filters" role="group" aria-label="Search filters">
		<template v-for="(group, index) in groups" :key="group.name">
			<span v-if="index" class="search-filters-separator" aria-hidden="true"></span>
			<button
				v-for="item in group.items"
				:key="item.key"
				type="button"
				class="search-filter"
				:class="{ on: searchSettings[item.key], type: item.char }"
				:style="item.char ? { '--type-color': item.color } : null"
				:aria-pressed="Boolean(searchSettings[item.key])"
				:aria-label="item.label"
				:title="item.title"
				@click="toggle(item.key)"
			>
				<!-- a subject type: its character only (as on the subject lists' titles) -->
				<span v-if="item.char" lang="ja">{{ item.char }}</span>
				<template v-else>{{ item.label }}</template>
			</button>
		</template>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';

const GROUPS = [
	{
		name: 'How',
		items: [
			{ key: 'targeted_search', label: 'Precise', title: 'Search exactly for what\'s typed (not words containing it)' },
			{ key: 'disabled_subjects', label: 'Legacy', title: 'Also the subjects WaniKani retired (no longer in lessons or reviews)' },
		],
	},
	{
		name: 'Subjects',
		items: [
			{ key: 'radicals', label: 'Radicals', char: '幺', title: 'Radicals', color: 'var(--radical-tag-color)' },
			{ key: 'kanji', label: 'Kanji', char: '字', title: 'Kanji', color: 'var(--kanji-tag-color)' },
			{ key: 'vocabulary', label: 'Vocabulary', char: '語', title: 'Vocabulary', color: 'var(--vocabulary-tag-color)' },
		],
	},
	{
		name: 'Progress',
		items: [
			{ key: 'passed', label: 'Passed', title: 'Subjects passed (Guru and up)' },
			{ key: 'in_progress', label: 'Learning', title: 'In progress: subjects in lessons or Apprentice' },
			{ key: 'locked', label: 'Locked', title: 'Subjects not unlocked yet' },
		],
	},
];

export default {
	name: 'SearchMenu',
	emits: ['filter-change'],

	data() {
		return { groups: GROUPS };
	},

	computed: {
		settingsStore() {
			return useSettingsStore();
		},
		searchSettings() {
			return this.settingsStore.settings.search;
		},
	},

	methods: {
		async toggle(key) {
			const next = !this.searchSettings[key];
			await this.settingsStore.setSetting('search', key, next);
			this.$emit('filter-change', key);
		},
	},
};
</script>

<style scoped>
/*
 * Always one row: tight chips, small gaps between the groups; a window too narrow for them
 * scrolls the row sideways (no second line).
 */
.search-filters {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: 3px;
	overflow-x: auto;
	scrollbar-width: none;
}

.search-filters::-webkit-scrollbar {
	display: none;
}

/* as the chips of Pages read / Sentences (on the dark header) */
.search-filter {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	gap: 5px;
	padding: 3px 6px;
	border: 1px solid rgba(255, 255, 255, 0.14);
	border-radius: 999px;
	background: transparent;
	color: #c4c6da;
	font-family: inherit;
	font-size: 11px;
	font-weight: 700;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.search-filter:hover {
	background: rgba(255, 255, 255, 0.08);
}

.search-filter.on {
	border-color: #e36f94;
	background: rgba(227, 111, 148, 0.18);
	color: #fff;
}

/* a subject type: its character on a square of its colour (faded when off) */
.search-filter.type {
	justify-content: center;
	width: 23px;
	height: 23px;
	padding: 0;
	border: 1px solid transparent;
	border-radius: 7px;
	background: var(--type-color);
	color: #fff;
	font-size: 13px;
	font-weight: 700;
	line-height: 1;
}

.search-filter.type:not(.on) {
	background: transparent;
	border-color: color-mix(in srgb, var(--type-color) 60%, transparent);
	color: color-mix(in srgb, var(--type-color) 75%, #c4c6da);
	opacity: 0.7;
}

.search-filter.type:hover {
	filter: brightness(1.1);
}

.search-filters-separator {
	flex-shrink: 0;
	width: 1px;
	height: 16px;
	margin: 0 1px;
	background: rgba(255, 255, 255, 0.16);
}
</style>
