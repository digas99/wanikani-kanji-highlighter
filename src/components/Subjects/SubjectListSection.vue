<template>
	<div
		class="subject-list-section"
		:data-section-id="sectionId"
		:class="{
			'section-collapsed': collapsible && !opened,
			'header-profile': headerVariant === 'profile',
			'header-compact': headerVariant === 'compact',
		}"
	>
		<div
			class="section-header"
			:style="headerStyle"
			@click="onHeaderClick"
		>
			<div class="section-header-left">
				<span v-if="headerVariant === 'compact' && accentColor" class="section-accent-marker">
					<b></b>
				</span>
				<span class="section-label">{{ label }}</span>
				<span v-if="countLabel" class="section-count">{{ countLabel }}</span>
				<span v-if="headerVariant === 'compact' && accentColor" class="section-accent-arrow">
					<i class="up" :style="{ borderColor: accentColor }"></i>
				</span>
			</div>

			<div
				v-if="showControls"
				class="section-controls"
				@click.stop
			>
				<button
					type="button"
					class="section-control-btn clickable"
					title="Sort"
					@click="toggleMenu('Sort')"
				>
					<img :src="sortIcon" alt="Sort">
				</button>
				<button
					type="button"
					class="section-control-btn clickable"
					title="Filter"
					@click="toggleMenu('Filter')"
				>
					<img :src="filterIcon" alt="Filter">
				</button>
				<button
					type="button"
					class="section-control-btn clickable"
					title="Display"
					@click="toggleMenu('Menu')"
				>
					<img :src="menuIcon" alt="Menu">
				</button>
				<button
					v-if="collapsible && headerVariant === 'profile'"
					type="button"
					class="section-control-btn section-collapse-btn clickable"
					:title="opened ? 'Collapse' : 'Expand'"
					@click="$emit('toggle-collapse')"
				>
					<i class="arrow" :class="opened ? 'up' : 'down'"></i>
				</button>
			</div>

			<div
				v-if="showProgress && progressTotal > 0"
				class="section-progress"
				:style="{ width: `${progressPercent}%` }"
			></div>
		</div>

		<ProfileSectionMenu
			v-if="showControls && activeMenu"
			:active-menu="activeMenu"
			:menu="menuSettings"
			@click.stop
			@update-sort="updateSort"
			@update-filter="updateFilter"
			@update-menu="updateMenu"
		/>

		<div
			v-if="progressSegments.length && (!collapsible || opened)"
			class="section-segment-bar"
		>
			<SchoolProgressBar
				v-if="progressBarSchool && progressBarGrade"
				:school="progressBarSchool"
				:grade="progressBarGrade"
				:total="subjects.length"
				:segments="progressSegments"
			/>
		</div>

		<div v-if="!controlsOnly && (!collapsible || opened)" class="section-body subjects-list">
			<TilesList
				:values="processedSubjects"
				:colors="tilesListColors"
				:tile-styles="tilesListTileStyles"
				:show-reviews-info="resolvedShowReviewsInfo"
			/>
			<p v-if="!processedSubjects.length" class="empty-message">
				No subjects match the current filters.
			</p>
		</div>
	</div>
</template>

<script>
import ProfileSectionMenu from '@/components/Profile/ProfileSectionMenu.vue';
import TilesList from '@/components/Subjects/TilesList.vue';
import SchoolProgressBar from '@/components/Home/SchoolProgressBar.vue';
import { useSettingsStore } from '@/stores/settings';
import {
	buildTileStyles,
	createDefaultProfileMenuEntry,
	normalizeProfileSubjects,
	processProfileSubjects,
} from '@/utils/scripts/profileSubjects';

export default {
	name: 'SubjectListSection',

	components: {
		ProfileSectionMenu,
		TilesList,
		SchoolProgressBar,
	},

	inject: {
		getActiveListMenu: {
			default: null,
		},
		setActiveListMenu: {
			default: null,
		},
		clearActiveListMenu: {
			default: null,
		},
	},

	props: {
		sectionId: {
			type: String,
			required: true,
		},
		label: {
			type: String,
			required: true,
		},
		subjects: {
			type: Array,
			default: () => [],
		},
		menuScope: {
			type: String,
			default: 'list',
			validator: value => ['profile', 'list'].includes(value),
		},
		menuKey: {
			type: String,
			required: true,
		},
		layout: {
			type: String,
			default: 'auto',
		},
		showControls: {
			type: Boolean,
			default: true,
		},
		showProgress: {
			type: Boolean,
			default: false,
		},
		showReviewsInfo: {
			type: Boolean,
			default: null,
		},
		collapsible: {
			type: Boolean,
			default: false,
		},
		opened: {
			type: Boolean,
			default: true,
		},
		controlsOnly: {
			type: Boolean,
			default: false,
		},
		headerVariant: {
			type: String,
			default: 'compact',
		},
		accentColor: {
			type: String,
			default: '',
		},
		countLabel: {
			type: String,
			default: '',
		},
		sectionColors: {
			type: Object,
			default: null,
		},
		progressSegments: {
			type: Array,
			default: () => [],
		},
		progressBarSchool: {
			type: String,
			default: '',
		},
		progressBarGrade: {
			type: String,
			default: '',
		},
	},

	emits: ['toggle-collapse'],

	data() {
		return {
			settingsStore: useSettingsStore(),
			sortIcon: '/icons/profile/sort.png',
			filterIcon: '/icons/profile/filter.png',
			menuIcon: '/icons/search/menu.png',
		};
	},

	computed: {
		activeMenu() {
			if (!this.getActiveListMenu) return null;
			const active = this.getActiveListMenu();
			if (!active || active.sectionId !== this.sectionId) return null;
			return active.menu;
		},

		menuSettings() {
			if (this.menuScope === 'profile') {
				return this.settingsStore.settings.profile_menus[this.menuKey]
					?? createDefaultProfileMenuEntry();
			}
			return this.settingsStore.settings.list_menus[this.menuKey]
				?? createDefaultProfileMenuEntry();
		},

		normalizedSubjects() {
			return normalizeProfileSubjects(this.subjects);
		},

		processedSubjects() {
			return processProfileSubjects(this.normalizedSubjects, this.menuSettings);
		},

		tileStyles() {
			return buildTileStyles(
				this.processedSubjects,
				this.menuSettings,
				this.settingsStore.settings.appearance,
			);
		},

		tilesListColors() {
			if (this.sectionColors) return this.sectionColors;

			const appearance = this.settingsStore.settings.appearance;
			return {
				radical: appearance.radical_color,
				kanji: appearance.kanji_color,
				vocabulary: appearance.vocab_color,
				kana_vocabulary: appearance.vocab_color,
			};
		},

		tilesListTileStyles() {
			if (this.menuSettings.menu.color_by === 'Subject Type' && this.sectionColors) {
				return null;
			}
			if (this.menuSettings.menu.color_by === 'Subject Type') {
				return null;
			}
			return this.tileStyles;
		},

		progressTotal() {
			return this.normalizedSubjects.filter(subject => !subject.isHidden).length;
		},

		progressPercent() {
			if (this.progressTotal === 0) return 0;
			const passed = this.normalizedSubjects.filter(
				subject => !subject.isHidden && subject.assignment.passed_at,
			).length;
			return (passed / this.progressTotal) * 100;
		},

		headerStyle() {
			if (this.headerVariant !== 'compact' || !this.accentColor) return {};
			return { '--section-accent': this.accentColor };
		},

		resolvedShowReviewsInfo() {
			if (this.showReviewsInfo !== null) return this.showReviewsInfo;
			return this.menuSettings.menu.reviews_info;
		},
	},

	methods: {
		onHeaderClick() {
			if (!this.collapsible || this.headerVariant === 'profile') return;
			this.$emit('toggle-collapse');
		},

		toggleMenu(menu) {
			if (!this.setActiveListMenu) return;
			if (this.activeMenu === menu) {
				this.clearActiveListMenu?.();
				return;
			}
			this.setActiveListMenu(this.sectionId, menu);
		},

		updateSort(key, value) {
			this.persistMenuChange('sort', key, value);
		},

		updateFilter(key, value) {
			this.persistMenuChange('filter', key, value);
		},

		updateMenu(key, value) {
			this.persistMenuChange('menu', key, value);
		},

		persistMenuChange(group, key, value) {
			if (this.menuScope === 'profile') {
				if (this.menuKey === 'all') {
					this.settingsStore.updateProfileMenuForAll(group, key, value);
					return;
				}
				this.settingsStore.updateProfileMenuSection(this.menuKey, group, key, value);
				return;
			}
			this.settingsStore.updateListMenu(this.menuKey, group, key, value);
		},
	},
};
</script>

<style scoped>
.subject-list-section {
	position: relative;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 7px 10px;
	background: var(--default-color);
	color: #fff;
	user-select: none;
}

.header-profile .section-header {
	font-size: 20px;
	border-top: 2px solid white;
	position: relative;
}

.header-compact .section-header {
	font-size: 18px;
	border-left: 4px solid var(--section-accent, var(--default-color));
	background: var(--default-color);
}

.section-header-left {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	flex: 1;
}

.section-label {
	font-weight: 700;
}

.header-profile .section-count {
	font-size: 12px;
	color: silver;
	font-weight: 400;
}

.header-compact .section-count {
	font-size: inherit;
	font-weight: 400;
}

.section-accent-marker > b {
	display: inline-block;
	width: 0;
}

.section-accent-arrow .up {
	padding: 4px;
	margin-bottom: -7px;
}

.section-controls {
	display: flex;
	align-items: center;
	margin-left: auto;
	flex-shrink: 0;
}

.section-control-btn {
	border: none;
	background: transparent;
	color: #fff;
	padding: 6px 8px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.section-control-btn img {
	width: 16px;
	height: 16px;
	filter: invert(1);
	opacity: 0.85;
}

.section-collapse-btn {
	padding: 0 10px;
}

.section-collapse-btn .arrow {
	border-color: white;
	padding: 4px !important;
	margin-bottom: -4px;
}

.section-progress {
	height: 4px;
	background-color: var(--wanikani-sec);
	position: absolute;
	bottom: -4px;
	left: 0;
	transition: width 0.3s;
}

.section-segment-bar {
	padding: 6px 8px 4px;
	background: var(--fill-color);
}

.section-body {
	background: var(--fill-color);
}

.empty-message {
	text-align: center;
	color: var(--muted-color);
	font-size: 12px;
	padding: 16px 8px;
	margin: 0;
}

.section-collapsed .section-header {
	cursor: pointer;
}
</style>
