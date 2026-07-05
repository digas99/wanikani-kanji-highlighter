<template>
	<div class="search-menu">
		<div class="search-menu-section">Miscellaneous</div>
		<div
			v-for="item in miscItems"
			:key="item.key"
			class="search-menu-item clickable"
			:title="item.title"
			@click="toggle(item.key)"
		>
			<div class="search-menu-item-label">
				<img class="icon" :src="item.icon" alt="">
				<label>{{ item.label }}</label>
			</div>
			<div
				class="checkbox_wrapper clickable setting-control"
				:class="{ 'checkbox-enabled': searchSettings[item.key] }"
			>
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-section">Subjects</div>
		<div
			v-for="item in subjectItems"
			:key="item.key"
			class="search-menu-item clickable"
			:title="item.title"
			@click="toggle(item.key)"
		>
			<div class="search-menu-item-label">
				<div class="subject-type-icon" :style="{ color: item.color }">{{ item.icon }}</div>
				<label>{{ item.label }}</label>
			</div>
			<div
				class="checkbox_wrapper clickable setting-control"
				:class="{ 'checkbox-enabled': searchSettings[item.key] }"
			>
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
		<div class="search-menu-section">Progress</div>
		<div
			v-for="item in progressItems"
			:key="item.key"
			class="search-menu-item clickable"
			:title="item.title"
			@click="toggle(item.key)"
		>
			<div class="search-menu-item-label">
				<img class="icon" :src="item.icon" alt="">
				<label>{{ item.label }}</label>
			</div>
			<div
				class="checkbox_wrapper clickable setting-control"
				:class="{ 'checkbox-enabled': searchSettings[item.key] }"
			>
				<input type="checkbox" style="display: none;">
				<div class="custom-checkbox-ball"></div>
				<div class="custom-checkbox-back"></div>
			</div>
		</div>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';

const miscItems = [
	{
		key: 'targeted_search',
		label: 'Precise Search',
		title: 'Search exactly for the given prompt.',
		icon: '/icons/search/target.png',
	},
	{
		key: 'disabled_subjects',
		label: 'Disabled Subjects',
		title: 'Show Wanikani disabled subjects.',
		icon: '/icons/search/no-stopping.png',
	},
];

const subjectItems = [
	{
		key: 'radicals',
		label: 'Radicals',
		title: 'Search for radicals.',
		icon: '部首',
		color: 'var(--radical-tag-color)',
	},
	{
		key: 'kanji',
		label: 'Kanji',
		title: 'Search for kanji.',
		icon: '漢字',
		color: 'var(--kanji-tag-color)',
	},
	{
		key: 'vocabulary',
		label: 'Vocabulary',
		title: 'Search for vocabulary.',
		icon: '単語',
		color: 'var(--vocabulary-tag-color)',
	},
];

const progressItems = [
	{
		key: 'passed',
		label: 'Passed',
		title: 'Show passed subjects.',
		icon: '/icons/search/check.png',
	},
	{
		key: 'in_progress',
		label: 'In Progress',
		title: 'Show subjects in progress.',
		icon: '/icons/search/time.png',
	},
	{
		key: 'locked',
		label: 'Locked',
		title: 'Show locked subjects.',
		icon: '/icons/search/padlock.png',
	},
];

export default {
	name: 'SearchMenu',
	emits: ['filter-change'],

	data() {
		return {
			miscItems,
			subjectItems,
			progressItems,
		};
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
.search-menu {
	background-color: var(--fill-color);
	position: absolute;
	top: 40px;
	right: 10px;
	transition: 0.2s;
	z-index: 10;
}

.search-menu-section {
	padding: 8px 10px;
	background-color: var(--default-color);
	color: white;
}

.search-menu-item {
	display: flex;
	align-items: center;
	white-space: nowrap;
	padding: 8px 10px;
	justify-content: space-between;
	column-gap: 20px;
}

.search-menu-item img {
	width: 20px;
	padding: 0 3px;
}

.search-menu-item-label {
	display: flex;
	align-items: center;
}

.search-menu-item-label label {
	padding: 0 10px;
	font-size: 15px;
	line-height: 0px;
	opacity: unset;
}

.search-menu-slide-in {
	right: 0px !important;
}
</style>
