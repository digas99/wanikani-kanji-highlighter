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
				<!-- what the group is: an SRS stage's egg, or a subject type's kanji (sectionIcons.ts) -->
				<span v-if="icon?.kind === 'svg'" class="section-icon srs" aria-hidden="true">
					<svg :viewBox="icon.viewBox" :style="icon.color ? { fill: icon.color } : null"><path :d="icon.d" :fill-rule="icon.evenodd ? 'evenodd' : null" /></svg>
				</span>
				<span
					v-else-if="icon?.kind === 'char'"
					class="section-icon type"
					:class="{ wide: icon.char.length > 1 }"
					:style="icon.color ? { background: icon.color } : null"
					lang="ja"
					aria-hidden="true"
				>{{ icon.char }}</span>
				<span class="section-label">{{ label }}</span>
				<span v-if="countLabel" class="section-count">{{ countLabel }}</span>
			</div>

			<div
				v-if="showControls || canPractice"
				class="section-controls"
				@click.stop
			>
				<button
					v-if="canPractice"
					type="button"
					class="section-control-btn clickable"
					title="Practice these subjects as flashcards"
					@click="startPractice"
				>
					<!-- a card with a "play" mark: start a practice round (not two sheets, which reads as copy) -->
					<svg class="section-practice-icon" viewBox="0 0 24 24" aria-hidden="true">
						<rect x="3" y="4" width="18" height="16" rx="3" />
						<path class="play" d="M10 8.5v7l5.5-3.5z" />
					</svg>
				</button>
				<template v-if="showControls">
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
				</template>
				<button
					v-if="collapsible && headerVariant === 'profile'"
					type="button"
					class="section-control-btn section-collapse-btn clickable"
					:title="opened ? 'Collapse' : 'Expand'"
					@click="$emit('toggle-collapse')"
				>
					<svg class="section-collapse-icon" :class="{ collapsed: !opened }" viewBox="0 0 24 24" aria-hidden="true">
						<path d="M6 15l6-6 6 6" />
					</svg>
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
				:show-meaning="Boolean(menuSettings.menu.show_meaning)"
				:show-trouble="menuSettings.menu.show_trouble !== false"
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
import { useWKStore } from '@/stores';
import { sectionIconFor } from '@/utils/scripts/sectionIcons';
import { isLegacySubject } from '@/utils/scripts/wanikani';

function hasDisplayData(subject) {
	return Boolean(subject?.characters || subject?.character_images?.length);
}
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

	watch: {
		subjects: {
			handler() {
				this.resolveMissingSubjects();
			},
			immediate: true,
		},
	},

	data() {
		return {
			resolved: {},
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
			// fill in subjects that arrived without their data (see resolveMissingSubjects)
			const subjects = this.subjects.map(subject => {
				const resolved = this.resolved[subject.id];
				if (!resolved || hasDisplayData(subject)) return subject;
				return {
					...subject,
					type: subject.type || resolved.type,
					level: subject.level ?? resolved.level,
					characters: resolved.characters,
					character_images: resolved.character_images,
					meaning: resolved.meaning,
					reading: resolved.reading,
				};
			});
			return normalizeProfileSubjects(subjects);
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

		/** By the title: an SRS stage's egg, or a subject type's kanji (none for other groups). */
		icon() {
			return sectionIconFor(this.label);
		},

		/** Practice goes through what the section shows (its sort and filters applied), legacy ones left out. */
		practiceIds() {
			return this.processedSubjects
				.filter(subject => !isLegacySubject(subject) && !isLegacySubject(this.resolved?.[subject.id]))
				.map(subject => subject.id);
		},
		canPractice() {
			return !this.controlsOnly && this.practiceIds.length > 0;
		},

		resolvedShowReviewsInfo() {
			if (this.showReviewsInfo !== null) return this.showReviewsInfo;
			return this.menuSettings.menu.reviews_info;
		},
	},

	methods: {
		/** Tiles without characters or images (subject data not cached): fetch them once. */
		async resolveMissingSubjects() {
			if (!this._requested) this._requested = new Set();
			const ids = this.subjects
				.filter(subject => !hasDisplayData(subject)
					&& !this.resolved[subject.id]
					&& !this._requested.has(subject.id))
				.map(subject => subject.id);
			if (!ids.length) return;

			ids.forEach(id => this._requested.add(id));
			const subjects = await useWKStore().resolveSubjects(ids);
			if (!subjects?.length) return;

			const next = { ...this.resolved };
			for (const subject of subjects) next[subject.id] = subject;
			this.resolved = next;
		},

		startPractice() {
			this.clearActiveListMenu?.();
			this.$router.push({
				name: 'Practice',
				query: {
					title: this.label,
					// where "Back to the list" returns to
					from: this.$route.fullPath,
					ids: this.practiceIds.join(','),
				},
			});
		},

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
	/* the group as a small card: its title on top, the tiles in its body */
	border-radius: 10px 10px 0 0;
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

/* the group's icon, by its title */
.section-icon {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-right: -2px;
}

/* an SRS stage: WaniKani's egg in the stage's colour, on a white tile (as the type marks) */
.section-icon.srs {
	width: 1.3em;
	height: 1.3em;
	border-radius: 5px;
	background: #fff;
	box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}

.section-icon.srs svg {
	height: 0.95em;
	width: auto;
	fill: var(--section-accent, #2a2d48);
}

/* a subject type: its kanji on its colour, as WaniKani's type marks */
.section-icon.type {
	width: 1.3em;
	height: 1.3em;
	border-radius: 5px;
	/* no colour of its own: the section's accent */
	background: var(--section-accent, #8a8fa3);
	color: #fff;
	font-size: 0.8em;
	font-weight: 700;
	line-height: 1;
	box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.2);
}

/* two marks ("!!"): a little tighter */
.section-icon.type.wide {
	font-size: 0.68em;
	letter-spacing: -0.08em;
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

.section-practice-icon {
	width: 17px;
	height: 17px;
	fill: none;
	stroke: #fff;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.85;
}

.section-practice-icon .play {
	fill: #fff;
	stroke-width: 1.5;
}

.section-collapse-btn {
	padding: 6px 8px;
}

/* same size and centering as the other header icons; points down when collapsed */
.section-collapse-icon {
	width: 18px;
	height: 18px;
	fill: none;
	stroke: #fff;
	stroke-width: 2.5;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.85;
	transition: transform 0.2s ease;
}

.section-collapse-icon.collapsed {
	transform: rotate(180deg);
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

/* the tiles inside a bounded, slightly tinted panel under the title (they don't float loose) */
.header-compact .section-body {
	padding: 4px;
	border: 1px solid var(--surface-border-color);
	border-top: none;
	border-radius: 0 0 10px 10px;
	background: color-mix(in srgb, var(--default-color) 5%, var(--fill-color));
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
