<template>
	<div class="container settings-page">
		<div class="settings-tabs">
			<button
				v-for="tab in tabs"
				:key="tab.id"
				type="button"
				class="settings-tab clickable"
				:class="{ active: activeTab === tab.id }"
				@click="activeTab = tab.id"
			>
				{{ tab.label }}
			</button>
		</div>
		
		<div v-show="activeTab === 'highlighting'" class="settings-panel">
			<div class="settings-section">
				<p class="settings-section-title">Site access</p>
				<div class="settings-section-body">
					<SettingSelect
						v-model="highlighter.page_list_mode"
						input-id="highlighter-page-list-mode"
						label="Default behaviour"
						description="Choose whether highlighting runs everywhere except listed sites, or only on listed sites."
						:options="pageListModeOptions"
						@update:model-value="set('highlighter', 'page_list_mode', $event)"
					/>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title clickable" @click="settings.toggleBlacklistExpanded()">
					Blacklisted sites ({{ settings.blacklist.length }})
					<i class="arrow" :class="settings.blacklistExpanded ? 'up' : 'down'"></i>
				</p>
				<div v-if="settings.blacklistExpanded" class="blacklist-wrapper">
					<p class="muted site-list-help">
						Used when highlighting by default. Matching includes subdomains.
					</p>
					<div class="site-list-add">
						<input
							v-model="newBlacklistSite"
							type="text"
							class="site-list-input"
							placeholder="example.com"
							@keyup.enter="addBlacklistSite"
						>
						<button type="button" class="settings-button clickable" @click="addBlacklistSite">Add</button>
					</div>
					<p v-if="blacklistAddError" class="site-list-error">{{ blacklistAddError }}</p>
					<p v-if="!settings.blacklist.length" class="muted">There are no sites blacklisted!</p>
					<div
						v-for="site in settings.blacklist"
						:key="site"
						class="blacklisted-site"
					>
						<a :href="`https://${site}`" target="_blank" rel="noopener">{{ site }}</a>
						<button type="button" class="clickable" title="Remove" @click="settings.removeBlacklistedSite(site)">
							×
						</button>
					</div>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title clickable" @click="settings.toggleWhitelistExpanded()">
					Whitelisted sites ({{ settings.whitelist.length }})
					<i class="arrow" :class="settings.whitelistExpanded ? 'up' : 'down'"></i>
				</p>
				<div v-if="settings.whitelistExpanded" class="blacklist-wrapper">
					<p class="muted site-list-help">
						Used when blocking by default. Matching includes subdomains.
					</p>
					<div class="site-list-add">
						<input
							v-model="newWhitelistSite"
							type="text"
							class="site-list-input"
							placeholder="example.com"
							@keyup.enter="addWhitelistSite"
						>
						<button type="button" class="settings-button clickable" @click="addWhitelistSite">Add</button>
					</div>
					<p v-if="whitelistAddError" class="site-list-error">{{ whitelistAddError }}</p>
					<p v-if="!settings.whitelist.length" class="muted">There are no sites whitelisted!</p>
					<div
						v-for="site in settings.whitelist"
						:key="site"
						class="blacklisted-site"
					>
						<a :href="`https://${site}`" target="_blank" rel="noopener">{{ site }}</a>
						<button type="button" class="clickable" title="Remove" @click="settings.removeWhitelistedSite(site)">
							×
						</button>
					</div>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title">
					Kanji Details Popup
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<SettingToggle
					v-model="kanjiDetails.activated"
					input-id="kanji-activated"
					label="Activated"
					description="Activate Details Popup script (side panel with subject information)"
					@update:model-value="set('kanji_details_popup', 'activated', $event)"
				/>
				<SettingSelect
					v-model="kanjiDetails.random_subject"
					input-id="kanji-random-subject"
					label="Random Subject"
					description="Type of subject shown by the Random button on the sidebar"
					:options="randomSubjectOptions"
					@update:model-value="set('kanji_details_popup', 'random_subject', $event)"
				/>
				<SettingSlider
					v-model="kanjiDetails.popup_opacity"
					input-id="kanji-popup-opacity"
					label="Popup Opacity"
					description="Opacity of the small Details Popup when hovering a kanji"
					:min="0"
					:max="10"
					@update:model-value="set('kanji_details_popup', 'popup_opacity', $event)"
				/>
				<SettingSelect
					v-model="kanjiDetails.popup_width"
					input-id="kanji-popup-width"
					label="Popup Width"
					description="Width of the small Details Popup when hovering a kanji"
					:options="popupWidthOptions"
					numeric
					@update:model-value="set('kanji_details_popup', 'popup_width', $event)"
				/>
				<SettingToggle
					v-model="kanjiDetails.subject_drawing"
					input-id="kanji-subject-drawing"
					label="Subject Drawing"
					description="Show subject strokes drawing animation in the Details Popup"
					@update:model-value="set('kanji_details_popup', 'subject_drawing', $event)"
				/>
				<SettingToggle
					v-model="kanjiDetails.audio_autoplay"
					input-id="kanji-audio-autoplay"
					label="Audio Autoplay"
					description="Play subject audio automatically when popup opens"
					@update:model-value="set('kanji_details_popup', 'audio_autoplay', $event)"
				/>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title">
					Page Highlighting
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<SettingToggle
					v-model="highlighter.enabled"
					input-id="highlighter-enabled"
					label="Highlight on web pages"
					description="Highlight the WaniKani kanji or words you have and haven't learned on any website you visit."
					@update:model-value="set('highlighter', 'enabled', $event)"
				/>
				<SettingSelect
					v-model="highlighter.target"
					input-id="highlighter-target"
					label="Highlight"
					description="Highlight individual kanji, or whole words that match WaniKani vocabulary."
					:options="highlightTargetOptions"
					@update:model-value="set('highlighter', 'target', $event)"
				/>
				<SettingSelect
					v-model="highlighter.color_by"
					input-id="highlighter-color-by"
					label="Color by"
					:description="colorByDescription"
					:options="availableColorByOptions"
					@update:model-value="set('highlighter', 'color_by', $event)"
				/>
				<SettingSelect
					v-model="highlighter.mode"
					input-id="highlighter-mode"
					label="Highlighting mode"
					description="Whole page highlights everything at once. As you scroll only highlights what is visible and picks up new kanji as they appear."
					:options="highlightModeOptions"
					@update:model-value="set('highlighter', 'mode', $event)"
				/>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title">
					Highlight Style
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<SettingHighlightStyle
					:model-value="highlightStyle.learned"
					:color="styleSampleColor"
					:options="highlightStyleOptions.learned"
					@update:model-value="setUnifiedHighlightStyle"
				/>
				<p v-if="usesStageStyleColors" class="muted">
					SRS stage colors are configured in the Theme tab.
				</p>
				<p v-else-if="usesSchoolGradeColors" class="muted">
					JLPT and Jōyō grade colors use a fixed palette on the page.
				</p>
				</div>
			</div>
		</div>

		<div v-show="activeTab === 'popup'" class="settings-panel">
			<div class="settings-section">
				<p class="settings-section-title">Extension Popup Interface</p>
				<div class="settings-section-body">
				<SettingToggle
					v-for="item in popupInterfaceSettings"
					:key="item.key"
					v-model="popupInterface[item.key]"
					:input-id="`popup-${item.key}`"
					:label="item.label"
					:description="item.description"
					@update:model-value="set('extension_popup_interface', item.key, $event)"
				/>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title">Search</p>
				<div class="settings-section-body">
				<SettingToggle
					v-model="searchSettings.targeted_search"
					input-id="search-targeted"
					label="Targeted Search"
					description="Search only within selected subject types and states"
					@update:model-value="set('search', 'targeted_search', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.disabled_subjects"
					input-id="search-disabled"
					label="Disabled Subjects"
					description="Include disabled subjects in search results"
					@update:model-value="set('search', 'disabled_subjects', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.radicals"
					input-id="search-radicals"
					label="Radicals"
					description="Include radicals in search results"
					@update:model-value="set('search', 'radicals', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.kanji"
					input-id="search-kanji"
					label="Kanji"
					description="Include kanji in search results"
					@update:model-value="set('search', 'kanji', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.vocabulary"
					input-id="search-vocabulary"
					label="Vocabulary"
					description="Include vocabulary in search results"
					@update:model-value="set('search', 'vocabulary', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.passed"
					input-id="search-passed"
					label="Passed"
					description="Include passed subjects in targeted search"
					@update:model-value="set('search', 'passed', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.locked"
					input-id="search-locked"
					label="Locked"
					description="Include locked subjects in targeted search"
					@update:model-value="set('search', 'locked', $event)"
				/>
				<SettingToggle
					v-model="searchSettings.in_progress"
					input-id="search-in-progress"
					label="In Progress"
					description="Include in-progress subjects in targeted search"
					@update:model-value="set('search', 'in_progress', $event)"
				/>
				</div>
			</div>
		</div>

		<div v-show="activeTab === 'appearance'" class="settings-panel">
			<div class="settings-section">
				<p class="settings-section-title">Appearance</p>
				<div class="settings-section-body">
				<div
					v-for="group in appearanceGroups"
					:key="group.label"
					class="setting-row color-group"
				>
					<label class="settings-item-label">{{ group.label }}</label>
					<div class="color-inputs setting-control">
						<input
							v-for="field in group.fields"
							:key="field.key"
							type="color"
							class="settings-item-input clickable"
							:value="appearance[field.key]"
							:title="field.key"
							@input="set('appearance', field.key, $event.target.value)"
						>
					</div>
				</div>
				<div class="appearance-buttons">
					<button type="button" class="settings-button clickable" @click="resetAppearance">Reset</button>
					<button type="button" class="settings-button flaming clickable" @click="applyFlamingDurtles">Flaming Durtles</button>
					<button type="button" class="settings-button gray clickable" @click="applyGrays">Grays</button>
				</div>
				</div>
			</div>
		</div>

		<div v-show="activeTab === 'general'" class="settings-panel">
			<div class="settings-section">
				<p class="settings-section-title">Extension Icon</p>
				<div class="settings-section-body">
				<SettingToggle
					v-model="extensionIcon.kanji_counter"
					input-id="icon-kanji-counter"
					label="Kanji counter"
					description="Show the number of highlighted kanji on the extension icon"
					@update:model-value="set('extension_icon', 'kanji_counter', $event)"
				/>
				</div>
			</div>

			<div class="settings-section">
				<p class="settings-section-title">Storage Management</p>
				<div class="danger-item">
					<button type="button" class="settings-button danger clickable" @click="clearSubjectsData">
						Clear Subjects Data
					</button>
					<p class="danger-description">
						Clears only the data related to subjects from WaniKani. This will NOT affect your WaniKani account!
					</p>
				</div>
			</div>
		</div>

		<div v-show="activeTab === 'cache'" class="settings-panel">
			<SettingsLevelCache />
		</div>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';
import { useWKStore } from '@/stores';
import SettingToggle from '@/components/Settings/SettingToggle.vue';
import SettingSelect from '@/components/Settings/SettingSelect.vue';
import SettingSlider from '@/components/Settings/SettingSlider.vue';
import SettingHighlightStyle from '@/components/Settings/SettingHighlightStyle.vue';
import SettingsLevelCache from '@/components/Settings/SettingsLevelCache.vue';
import {
	defaultSettings,
	flamingDurtlesPattern,
	graysPattern,
	highlightStyleOptions,
	highlightModeOptions,
	highlightTargetOptions,
	highlightColorByOptions,
	highlightColorByKanjiOptions,
	popupWidthOptions,
	randomSubjectOptions,
} from '@/utils/scripts/defaultSettings';
import { pageListModeOptions } from '@/utils/scripts/pageList';

export default {
	name: 'Settings',

	components: {
		SettingToggle,
		SettingSelect,
		SettingSlider,
		SettingHighlightStyle,
		SettingsLevelCache,
	},

	data() {
		return {
			activeTab: 'highlighting',
			newBlacklistSite: '',
			newWhitelistSite: '',
			blacklistAddError: '',
			whitelistAddError: '',
			pageListModeOptions,
			tabs: [
				{ id: 'highlighting', label: 'Highlight' },
				{ id: 'popup', label: 'Popup' },
				{ id: 'appearance', label: 'Theme' },
				{ id: 'general', label: 'General' },
				{ id: 'cache', label: 'Subject Cache' },
			],
			randomSubjectOptions,
			popupWidthOptions,
			highlightStyleOptions,
			highlightModeOptions,
			highlightTargetOptions,
			highlightColorByOptions,
			popupInterfaceSettings: [
				{ key: 'highlighted_kanji', label: 'Highlighted Kanji', description: 'Show kanji highlighted in the current page in the extension popup home.' },
			],
			appearanceGroups: [
				{ label: 'Highlight', fields: [{ key: 'highlight_learned' }, { key: 'highlight_not_learned' }] },
				{ label: 'Details Popup', fields: [{ key: 'details_popup' }] },
				{ label: 'Subjects (R/K/V)', fields: [{ key: 'radical_color' }, { key: 'kanji_color' }, { key: 'vocab_color' }] },
				{ label: 'Apprentice (1/2/3/4)', fields: [{ key: 'ap1_color' }, { key: 'ap2_color' }, { key: 'ap3_color' }, { key: 'ap4_color' }] },
				{ label: 'Guru (1/2)', fields: [{ key: 'gr1_color' }, { key: 'gr2_color' }] },
				{ label: 'Master/Enlightened', fields: [{ key: 'mst_color' }, { key: 'enl_color' }] },
				{ label: 'Burned/Initiate', fields: [{ key: 'brn_color' }, { key: 'int_color' }] },
			],
		};
	},

	computed: {
		settings() {
			return useSettingsStore();
		},
		wk() {
			return useWKStore();
		},
		kanjiDetails() {
			return this.settings.settings.kanji_details_popup;
		},
		highlightStyle() {
			return this.settings.settings.highlight_style;
		},
		highlighter() {
			return this.settings.settings.highlighter;
		},
		popupInterface() {
			return this.settings.settings.extension_popup_interface;
		},
		searchSettings() {
			return this.settings.settings.search;
		},
		extensionIcon() {
			return this.settings.settings.extension_icon;
		},
		appearance() {
			return this.settings.settings.appearance;
		},
		styleSampleColor() {
			if (this.highlighter.color_by === 'srs_stage') {
				return this.appearance.ap1_color;
			}
			if (this.highlighter.color_by === 'jlpt' || this.highlighter.color_by === 'joyo') {
				return '#43a047';
			}
			return this.appearance.highlight_learned;
		},
		availableColorByOptions() {
			if (this.highlighter.target === 'kanji') {
				return [...highlightColorByOptions, ...highlightColorByKanjiOptions];
			}
			return highlightColorByOptions;
		},
		colorByDescription() {
			if (this.highlighter.target === 'kanji') {
				return 'Color highlights by learned status, SRS stage, JLPT level, or Jōyō school grade.';
			}
			return 'Color highlights by learned status, or by each subject\'s SRS stage.';
		},
		usesStageStyleColors() {
			return this.highlighter.color_by === 'srs_stage';
		},
		usesSchoolGradeColors() {
			return this.highlighter.color_by === 'jlpt' || this.highlighter.color_by === 'joyo';
		},
	},

	methods: {
		set(group, key, value) {
			this.settings.setSetting(group, key, value);
			if (group === 'highlighter' && key === 'target' && value !== 'kanji') {
				const colorBy = this.settings.settings.highlighter.color_by;
				if (colorBy === 'jlpt' || colorBy === 'joyo') {
					this.settings.setSetting('highlighter', 'color_by', 'learned');
				}
			}
		},
		setUnifiedHighlightStyle(value) {
			const index = highlightStyleOptions.learned.findIndex(option => option.value === value);
			if (index < 0) return;

			this.set('highlight_style', 'learned', value);
			if (!this.usesStageStyleColors) {
				this.set('highlight_style', 'not_learned', highlightStyleOptions.not_learned[index].value);
			}
		},
		resetAppearance() {
			if (window.confirm('Reset all colors?')) {
				this.settings.setAppearancePreset(defaultSettings.appearance);
			}
		},
		applyFlamingDurtles() {
			if (window.confirm('Change colors to Flaming Durtles pattern?')) {
				this.settings.setAppearancePreset(flamingDurtlesPattern);
			}
		},
		applyGrays() {
			if (window.confirm('Change colors to a pattern of grays?')) {
				this.settings.setAppearancePreset(graysPattern);
			}
		},
		async clearSubjectsData() {
			if (!window.confirm('Clear all subject data?')) return;
			await this.wk.clearSubjectsData();
			this.$router.push({ name: 'Home' });
		},
		async addBlacklistSite() {
			this.blacklistAddError = '';
			const site = await this.settings.addSiteToList('blacklist', this.newBlacklistSite);
			if (!site) {
				this.blacklistAddError = 'Enter a valid domain, e.g. example.com';
				return;
			}
			this.newBlacklistSite = '';
		},
		async addWhitelistSite() {
			this.whitelistAddError = '';
			const site = await this.settings.addSiteToList('whitelist', this.newWhitelistSite);
			if (!site) {
				this.whitelistAddError = 'Enter a valid domain, e.g. example.com';
				return;
			}
			this.newWhitelistSite = '';
		},
	},
};
</script>

<style scoped>
.settings-page {
	padding-bottom: 16px;
}

.muted {
	color: var(--muted-color);
	font-size: 12px;
}

.settings-badge.inline {
  display: inline-block;
  vertical-align: middle;
  font-size: 8px;
  padding: 1px 5px;
  color: var(--accent-badge-color);
}
</style>
