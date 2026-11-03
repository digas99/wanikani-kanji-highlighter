<template>
	<div class="container settings-page">
		<!-- more tabs than fit: it scrolls sideways (wheel too), fading where more are hidden -->
		<div
			ref="tabBar"
			class="settings-tabs"
			:class="{ 'fade-start': tabsHiddenStart, 'fade-end': tabsHiddenEnd }"
			@scroll="updateTabFades"
			@wheel="scrollTabsWithWheel"
		>
			<button
				v-for="tab in tabs"
				:key="tab.id"
				type="button"
				class="settings-tab clickable"
				:class="{ active: activeTab === tab.id }"
				:data-tab="tab.id"
				@click="activeTab = tab.id"
			>
				{{ tab.label }}
			</button>
		</div>
		
		<!-- what changes the highlight on pages -->
		<div v-show="activeTab === 'highlighting'" class="settings-panel">
			<div id="settings-highlighting" class="settings-section">
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
					label="Highlight by"
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

			<div id="settings-highlight-style" class="settings-section">
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

			<div id="settings-site-access" class="settings-section">
				<p class="settings-section-title">Site access</p>
				<div class="settings-section-body">
					<SettingSelect
						v-model="highlighter.page_list_mode"
						input-id="highlighter-page-list-mode"
						label="Default behaviour"
						description="Everywhere: on every site but the blacklisted ones. Only listed sites: just on the whitelisted ones."
						:options="pageListModeOptions"
						@update:model-value="set('highlighter', 'page_list_mode', $event)"
					/>

					<!-- both lists live in this card; the one the default behaviour uses is marked -->
					<button
						type="button"
						class="setting-row site-list-toggle"
						:class="{ 'site-list-inactive': settings.pageListMode !== 'blacklist' }"
						:aria-expanded="settings.blacklistExpanded"
						@click="settings.toggleBlacklistExpanded()"
					>
						<span>
							<span class="settings-item-label">
								Blacklisted sites
								<span v-if="settings.pageListMode === 'blacklist'" class="site-list-active">In use</span>
							</span>
							<span class="settings-description">Never highlighted, when highlighting by default.</span>
						</span>
						<span class="site-list-toggle-end">
							<span class="site-list-count">{{ settings.blacklist.length }}</span>
							<svg class="site-list-chevron" :class="{ open: settings.blacklistExpanded }" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</span>
					</button>
				<div v-if="settings.blacklistExpanded" class="blacklist-wrapper">
					<p class="muted site-list-help">Matching includes subdomains.</p>
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

					<button
						type="button"
						class="setting-row site-list-toggle"
						:class="{ 'site-list-inactive': settings.pageListMode !== 'whitelist' }"
						:aria-expanded="settings.whitelistExpanded"
						@click="settings.toggleWhitelistExpanded()"
					>
						<span>
							<span class="settings-item-label">
								Whitelisted sites
								<span v-if="settings.pageListMode === 'whitelist'" class="site-list-active">In use</span>
							</span>
							<span class="settings-description">The only sites highlighted, when blocking by default.</span>
						</span>
						<span class="site-list-toggle-end">
							<span class="site-list-count">{{ settings.whitelist.length }}</span>
							<svg class="site-list-chevron" :class="{ open: settings.whitelistExpanded }" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
						</span>
					</button>
				<div v-if="settings.whitelistExpanded" class="blacklist-wrapper">
					<p class="muted site-list-help">Matching includes subdomains.</p>
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
			</div>
		</div>

		<!-- reading Japanese on the web: the reading level bar, the pages read, sentences from them -->
		<div v-show="activeTab === 'reading'" class="settings-panel">
			<div id="settings-reading-bar" class="settings-section">
				<p class="settings-section-title">
					Reading level bar
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<SettingToggle
					:model-value="pageStats.show_bar === true"
					input-id="page-stats-bar"
					label="Show on pages"
					description="A bar in the corner of pages with Japanese: their JLPT level and how much of their kanji you know"
					@update:model-value="set('page_stats', 'show_bar', $event)"
				/>
				<SettingSelect
					v-if="pageStats.show_bar || pageStats.history"
					:model-value="pageStats.view ?? 'auto'"
					input-id="page-stats-view"
					label="Classification"
					:description="`On the closed bar and in the history. Auto: the same as the highlight's colors (now ${highlightViewLabel})`"
					:options="pageStatsViewOptions"
					@update:model-value="set('page_stats', 'view', $event)"
				/>
				<SettingSelect
					v-if="pageStats.show_bar"
					:model-value="pageStats.focus_memory ?? 'page'"
					input-id="page-stats-focus-memory"
					label="Focus remembers"
					description="Focus (on the bar, with chosen parts) dims everything else. Keep it for the page you're on, or for every page of that site"
					:options="focusMemoryOptions"
					@update:model-value="set('page_stats', 'focus_memory', $event)"
				/>
				<div v-if="pageStatsHiddenSites.length" class="setting-row setting-row-block">
					<div class="settings-item-label">
						Hidden on
						<div class="settings-description">Sites where you chose "Hide on this site"</div>
					</div>
					<div class="page-stats-hidden">
						<button
							v-for="site in pageStatsHiddenSites"
							:key="site"
							type="button"
							:title="`Show the bar on ${site} again`"
							@click="unhidePageStatsSite(site)"
						>{{ site }} ×</button>
					</div>
				</div>
				</div>
			</div>

			<div id="settings-pages-read" class="settings-section">
				<p class="settings-section-title">
					Pages read
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<!-- from Home's "Save this page": turning the history on saves it -->
				<div v-if="saveTarget" class="page-save-banner" :class="saveState" role="status">
					<template v-if="saveState === 'off'">
						Turn on <b>Keep a history</b> to save <b>{{ saveTargetHost }}</b>.
					</template>
					<template v-else-if="saveState === 'saving'">Saving <b>{{ saveTargetHost }}</b>…</template>
					<template v-else-if="saveState === 'saved'">
						<b>{{ saveTargetHost }}</b> is saved ✓
						<RouterLink :to="{ name: 'Page', query: { url: saveTarget } }">Open it ›</RouterLink>
					</template>
					<template v-else>
						Not saved: only pages with at least {{ MIN_PAGE_KANJI }} different kanji or words are kept.
					</template>
				</div>
				<SettingToggle
					:model-value="pageStats.history === true"
					input-id="page-stats-history"
					label="Keep a history"
					description="List the pages you read, with their level and kanji. Stays in this browser, unless you back it up yourself"
					@update:model-value="set('page_stats', 'history', $event)"
				/>
				<div v-if="pageStats.history" class="setting-row setting-row-block">
					<div class="page-stats-privacy" role="note">
						<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
						<span>
							<b>Your history stays in this browser.</b> It's never sent to WaniKani, to us or
							anywhere else. It only leaves if you choose to: <b>in a backup file</b>, or <b>in your own Google
							Drive</b> (Data → Backup, off unless you connect it). Incognito tabs are never recorded,
							and you can remove pages or clear it all from the history at any time.
						</span>
					</div>
				</div>
				<SettingSelect
					v-if="pageStats.history"
					:model-value="pageHistorySize(settings.settings)"
					input-id="page-stats-history-size"
					label="Pages kept"
					:description="`The most recent pages read (default ${DEFAULT_PAGE_HISTORY}). Older ones leave the history; their example sentences are kept`"
					:options="historySizeOptions"
					dropdown
					numeric
					@update:model-value="set('page_stats', 'history_size', $event)"
				/>
				<div v-if="pageStats.history" class="setting-row">
					<span class="settings-item-label">Pages read</span>
					<RouterLink :to="{ name: 'Pages' }" class="settings-button secondary setting-control">Open the history</RouterLink>
				</div>
				</div>
			</div>

			<div id="settings-sentences" class="settings-section">
				<p class="settings-section-title">
					Example sentences
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<!-- kept with the pages: needs the history -->
				<p v-if="!pageStats.history" class="settings-description settings-section-note">
					Sentences are kept with the pages read: turn on <b>Keep a history</b> above first.
				</p>
				<SettingToggle
					v-if="pageStats.history"
					:model-value="pageStats.sentences === true"
					input-id="page-stats-sentences"
					label="Keep example sentences"
					:description="`A few sentences from each page, the ones with what you're learning, shown on each subject's details (“From your reading”). It's the page's actual text: not kept from the sites listed below, never from incognito tabs, and only in backups if you choose (Data → Backup)`"
					@update:model-value="set('page_stats', 'sentences', $event)"
				/>
				<SettingSelect
					v-if="pageStats.history && pageStats.sentences"
					:model-value="sentencesPerPage(settings.settings)"
					input-id="page-stats-sentences-per-page"
					label="Sentences per page"
					description="At most, the most useful ones (pages keep the ones they have: a new count applies to pages read from now on)"
					:options="sentencesPerPageOptions"
					dropdown
					numeric
					@update:model-value="set('page_stats', 'sentences_per_page', $event)"
				/>
				<div v-if="pageStats.history && (pageStats.sentences || sentenceExcludedSites.length)" class="setting-row setting-row-block">
					<div class="settings-item-label">
						No sentences from
						<div class="settings-description">Sites whose sentences aren't kept (e.g. mail, chats, banking). Type a site, or use "Don't keep sentences from this site" on a page of the history</div>
					</div>
					<form class="page-stats-exclude" @submit.prevent="excludeSentenceSite">
						<input v-model.trim="sentenceSiteInput" type="text" placeholder="mail.example.com" aria-label="Site to leave out">
						<button type="submit" class="settings-button secondary" :disabled="!sentenceSiteInput">Add</button>
					</form>
					<div v-if="sentenceExcludedSites.length" class="page-stats-hidden">
						<button
							v-for="site in sentenceExcludedSites"
							:key="site"
							type="button"
							:title="`Keep sentences from ${site} again`"
							@click="includeSentenceSite(site)"
						>{{ site }} ×</button>
					</div>
				</div>
				<div v-if="pageStats.history" class="setting-row">
					<span class="settings-item-label">
						Kept sentences
						<div class="settings-description">Removes them from every page of the history (the pages stay)</div>
					</span>
					<button type="button" class="settings-button secondary setting-control" @click="clearSentences">Remove all</button>
				</div>
				</div>
			</div>
		</div>

		<!-- the subject details (popup on pages, or the side panel), and its lookup buttons -->
		<div v-show="activeTab === 'details'" class="settings-panel">
			<div id="settings-details-popup" class="settings-section">
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
					:model-value="kanjiDetails.location ?? 'page'"
					input-id="kanji-details-location"
					label="Show subject details"
					description="In a popup on the page, or in the browser's side panel next to the page"
					:options="detailsLocationOptions"
					@update:model-value="set('kanji_details_popup', 'location', $event)"
				/>
				<div v-if="(kanjiDetails.location ?? 'page') === 'sidepanel'" class="setting-row setting-row-block side-panel-help">
					<div class="settings-description">
						<template v-if="isFirefox">
							<b>Opening the sidebar:</b> Firefox only lets you open it yourself. Use the sidebar
							button or <i>View → Sidebar</i>, and pick this extension. Once it's open,
							hovering a highlighted word shows it there.
						</template>
						<template v-else>
							<b>Opening the side panel:</b> click any highlighted kanji or word on a page.
							Browsers only allow opening it with a click, so hovering just updates it once it's open.
							You can also use the button below, the browser's side panel menu, or the side panel
							button in the expanded details popup. Its <i>Show on page</i> button switches back.
						</template>
					</div>
					<button
						v-if="sidePanelSupported"
						type="button"
						class="settings-button secondary"
						@click="openSidePanelNow"
					>
						Open side panel now
					</button>
				</div>
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

			<!-- WaniKani's own reviews page: a panel next to the question (reviewInfo.ts) -->
			<div id="settings-wanikani-reviews" class="settings-section">
				<p class="settings-section-title">
					WaniKani reviews
					<span class="settings-badge">Content</span>
				</p>
				<div class="settings-section-body">
				<SettingToggle
					:model-value="reviewInfo.enabled === true"
					input-id="review-info-enabled"
					label="Subject info while reviewing"
					description="Shown in WaniKani's reviews themselves: the subject's SRS stage, level and JLPT / Jōyō above it, how often you got it right under the question, and the last one's SRS change with WaniKani's stats. Never its meaning or reading"
					@update:model-value="set('review_info', 'enabled', $event)"
				/>
				<SettingToggle
					v-if="reviewInfo.enabled"
					:model-value="reviewInfo.examples !== false"
					input-id="review-info-examples"
					label="Examples"
					description="Under a word: one of its example sentences (Japanese only, the word marked). Under a kanji: a few words that use it. Under a radical: a few kanji that use it"
					@update:model-value="set('review_info', 'examples', $event)"
				/>
				<SettingToggle
					v-if="reviewInfo.enabled"
					:model-value="reviewInfo.sentence_replace === true"
					input-id="review-info-sentence-replace"
					label="Replace the word with the sentence"
					description="Show words inside their example sentence, in the word's place, instead of the word with the sentence under it"
					@update:model-value="set('review_info', 'sentence_replace', $event)"
				/>
				<SettingToggle
					:model-value="settings.settings.review_summary?.enabled === true"
					input-id="review-summary-enabled"
					label="Session summary"
					description="When you finish (or leave) your reviews: how many subjects you did, how many were all right, and which went up or down, with their SRS change"
					@update:model-value="set('review_summary', 'enabled', $event)"
				/>
				<SettingToggle
					:model-value="reviewTimer.enabled === true"
					input-id="review-timer-enabled"
					label="Review timer"
					description="A countdown with WaniKani's stats. When it runs out, Wrap Up is turned on (you finish the subjects already started). Click it to pause; it pauses when you leave the window and resumes when you type an answer"
					@update:model-value="set('review_timer', 'enabled', $event)"
				/>
				<SettingSelect
					v-if="reviewTimer.enabled"
					:model-value="reviewTimer.minutes ?? 25"
					input-id="review-timer-minutes"
					label="Timer length"
					description="For each reviews session (starts again when you open the reviews)"
					:options="reviewTimerOptions"
					dropdown
					numeric
					@update:model-value="set('review_timer', 'minutes', $event)"
				/>
				</div>
			</div>

			<SettingsLookupLinks />
		</div>

		<!-- the extension's popup -->
		<div v-show="activeTab === 'popup'" class="settings-panel">
			<!-- same editor as Home → "Customize home" -->
			<div id="settings-home" class="settings-section">
				<p class="settings-section-title">Home page</p>
				<div class="settings-section-body home-layout-settings">
					<p class="settings-description">Drag to reorder the Home sections; use the eye to show or hide one.</p>
					<HomeLayoutEditor :model-value="homeLayout" @update:model-value="saveHomeLayout" />
				</div>
			</div>

			<div id="settings-popup-interface" class="settings-section">
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
				<SettingToggle
					:model-value="settings.settings.miscellaneous?.sidebar_animation !== false"
					input-id="popup-sidebar-animation"
					label="Side Navbar Animation"
					description="Expand the side navigation bar when hovering it with the mouse"
					@update:model-value="set('miscellaneous', 'sidebar_animation', $event)"
				/>
				</div>
			</div>

			<div id="settings-search" class="settings-section">
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
				<SettingSelect
					:model-value="searchSettings.history_size ?? 100"
					input-id="search-history-size"
					label="Recently Viewed"
					description="How many viewed subjects the search page remembers"
					:options="searchHistorySizeOptions"
					dropdown
					numeric
					@update:model-value="setSearchHistorySize"
				/>
				</div>
			</div>
		</div>

		<div v-show="activeTab === 'appearance'" class="settings-panel">
			<div
				v-for="card in appearanceCards"
				:key="card.title"
				class="settings-section"
			>
				<p class="settings-section-title">{{ card.title }}</p>
				<div class="settings-section-body">
					<div
						v-for="group in card.groups"
						:key="group.label"
						class="setting-row color-group"
					>
						<span class="settings-item-label">{{ group.label }}</span>
						<div class="color-swatches setting-control">
							<label
								v-for="field in group.fields"
								:key="field.key"
								class="color-swatch"
								:title="`${group.label}: ${field.label} (${appearance[field.key]})`"
							>
								<input
									type="color"
									:value="appearance[field.key]"
									@input="set('appearance', field.key, $event.target.value)"
								>
								<span>{{ field.label }}</span>
							</label>
						</div>
					</div>
					<!-- the stages in order, as they appear in bars and tiles -->
					<div v-if="card.stagePreview" class="srs-preview" aria-hidden="true">
						<span
							v-for="key in srsPreviewKeys"
							:key="key"
							:style="{ background: appearance[key] }"
						></span>
					</div>
				</div>
			</div>

			<div id="settings-presets" class="settings-section">
				<p class="settings-section-title">Presets</p>
				<div class="settings-section-body appearance-presets">
					<button
						v-for="preset in appearancePresets"
						:key="preset.id"
						type="button"
						class="appearance-preset clickable"
						:title="`Apply the ${preset.label} colors`"
						@click="applyPreset(preset)"
					>
						<span class="appearance-preset-strip">
							<span
								v-for="key in srsPreviewKeys"
								:key="key"
								:style="{ background: preset.colors[key] }"
							></span>
						</span>
						<span class="appearance-preset-name">{{ preset.label }}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- browser notifications, the extension icon -->
		<div v-show="activeTab === 'general'" class="settings-panel">
			<div id="settings-notifications" class="settings-section">
				<p class="settings-section-title">Browser Notifications</p>
				<div class="settings-section-body">
				<SettingToggle
					v-model="browserNotifications.review_alerts"
					input-id="notify-new-reviews"
					label="New reviews"
					description="When the next batch of reviews is available. Click it to start them on WaniKani"
					@update:model-value="set('notifications', 'review_alerts', $event)"
				/>
				<SettingToggle
					v-model="browserNotifications.daily_reminder"
					input-id="notify-daily-reminder"
					label="Daily reminder"
					description="Once a day, if lessons or reviews are waiting"
					@update:model-value="set('notifications', 'daily_reminder', $event)"
				/>
				<div v-if="browserNotifications.daily_reminder" class="setting-row">
					<label for="notify-daily-reminder-hour" class="settings-item-label">Reminder time</label>
					<!-- the time field (the browser's own: 24 h or AM / PM as the system shows times) -->
					<input
						id="notify-daily-reminder-hour"
						type="time"
						class="reminder-time-input setting-control"
						:value="reminderTimeValue"
						@change="onReminderTimeInput($event.target.value)"
					>
				</div>
				<SettingToggle
					v-model="browserNotifications.searching_a_webpage_word"
					input-id="notify-searching-word"
					label="Searching a webpage word"
					description="After &quot;Search&quot; in the right-click menu: a reminder that the search waits in the extension"
					@update:model-value="set('notifications', 'searching_a_webpage_word', $event)"
				/>
				<div class="setting-row setting-row-block">
					<div class="settings-description">
						<b>Not seeing them?</b> Your system's settings might be holding them back: Do not
						disturb or Focus (including the ones that turn on by themselves, e.g. in full screen
						or when sharing your screen), or the browser's notifications being turned off there.
						The system's notification centre may still list them.
					</div>
				</div>
				</div>
			</div>

			<div id="settings-extension-icon" class="settings-section">
				<p class="settings-section-title">Extension Icon</p>
				<div class="settings-section-body">
				<SettingBadgePicker :model-value="badgeMode" @update:model-value="setBadgeMode" />
				</div>
			</div>
		</div>

		<!-- what the extension keeps: backups, the subjects cache, clearing it -->
		<div v-show="activeTab === 'data'" class="settings-panel">
			<SettingsBackup />

			<SettingsLevelCache />

			<div id="settings-storage" class="settings-section">
				<p class="settings-section-title">Storage Management</p>
				<div class="danger-item">
					<button type="button" class="settings-button danger clickable" @click="clearSubjectsData">
						Reset subject data
					</button>
					<p class="danger-description">
						Something not right after updating to 2.0, or highlights that look wrong? This removes
						anything left over from the previous version and downloads your subjects from WaniKani
						again. Your settings, API key and saved history are kept, and your WaniKani account
						isn't affected.
					</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { useSettingsStore } from '@/stores/settings';
import { useWKStore } from '@/stores';
import SettingToggle from '@/components/Settings/SettingToggle.vue';
import { badgeModeOf } from '@/utils/scripts/extensionBadge';
import SettingBadgePicker from '@/components/Settings/SettingBadgePicker.vue';
import SettingSelect from '@/components/Settings/SettingSelect.vue';
import { SEARCH_HISTORY_SIZE_OPTIONS, trimSearchHistory } from '@/utils/scripts/searchHistory';
import SettingSlider from '@/components/Settings/SettingSlider.vue';
import SettingHighlightStyle from '@/components/Settings/SettingHighlightStyle.vue';
import SettingsLevelCache from '@/components/Settings/SettingsLevelCache.vue';
import SettingsLookupLinks from '@/components/Settings/SettingsLookupLinks.vue';
import SettingsBackup from '@/components/Settings/SettingsBackup.vue';
import HomeLayoutEditor from '@/components/Home/HomeLayoutEditor.vue';
import { resolveHomeLayout } from '@/utils/scripts/homeLayout';
import {
	defaultSettings,
	flamingDurtlesPattern,
	graysPattern,
	highlightStyleOptions,
	highlightModeOptions,
	highlightTargetOptions,
	highlightColorByOptions,
	popupWidthOptions,
	randomSubjectOptions,
	detailsLocationOptions,
} from '@/utils/scripts/defaultSettings';
import { isSidePanelSupported, openBrowserSidePanel } from '@/utils/scripts/sidePanel';
import { getActiveBrowserTab } from '@/utils/scripts/activeBrowserTab';
import { pageListModeOptions } from '@/utils/scripts/pageList';
import { HIDDEN_SITES_KEY, highlightView, MIN_PAGE_KANJI, PAGE_STATS_VIEWS } from '@/utils/scripts/pageStats';
import { SENTENCE_EXCLUDED_SITES_KEY, SENTENCES_PER_PAGE_OPTIONS, sentencesPerPage } from '@/utils/scripts/pageSentences';
import {
	DEFAULT_PAGE_HISTORY,
	PAGE_HISTORY_SIZES,
	pageHistorySize,
	readPageHistory,
	removeSentences,
	watchPageHistory,
} from '@/utils/scripts/pageHistory';
import { storage } from '#imports';

export default {
	name: 'Settings',

	components: {
		SettingBadgePicker,
		SettingToggle,
		SettingSelect,
		SettingSlider,
		SettingHighlightStyle,
		SettingsLevelCache,
		SettingsLookupLinks,
		SettingsBackup,
		HomeLayoutEditor,
	},

	data() {
		return {
			activeTab: 'highlighting',
			/** the tab bar has tabs scrolled out of view at its start / end */
			tabsHiddenStart: false,
			tabsHiddenEnd: false,
			/** "Hide on this site" choices of the page reading level bar */
			pageStatsHiddenSites: [],
			sentenceExcludedSites: [],
			sentenceSiteInput: '',
			DEFAULT_PAGE_HISTORY,
			MIN_PAGE_KANJI,
			/** Home's "Save this page" (?save=url): the page saved once the history is on */
			saveTarget: '',
			historyUrls: [],
			/** turned on, but the page didn't come (too little Japanese) */
			saveGaveUp: false,
			newBlacklistSite: '',
			newWhitelistSite: '',
			blacklistAddError: '',
			whitelistAddError: '',
			pageListModeOptions,
			tabs: [
				{ id: 'highlighting', label: 'Highlight' },
				{ id: 'reading', label: 'Reading' },
				{ id: 'details', label: 'Details' },
				{ id: 'popup', label: 'Popup' },
				{ id: 'appearance', label: 'Theme' },
				{ id: 'general', label: 'General' },
				{ id: 'data', label: 'Data' },
			],
			randomSubjectOptions,
			popupWidthOptions,
			detailsLocationOptions,
			isFirefox: import.meta.env.BROWSER === 'firefox',
			sidePanelSupported: isSidePanelSupported(),
			browserWindowId: null,
			browserTabId: null,
			highlightStyleOptions,
			highlightModeOptions,
			highlightTargetOptions,
			highlightColorByOptions,
			popupInterfaceSettings: [
				{ key: 'highlighted_kanji', label: 'Highlighted Kanji', description: 'Show kanji highlighted in the current page in the extension popup home.' },
				{ key: 'trouble_marks', label: 'Trouble subjects', description: 'Mark the Apprentice subjects you keep getting wrong, and list them (a button on Home). They leave the list once you get them right a few times in a row.' },
			],
			appearanceCards: [
				{
					title: 'Highlight',
					groups: [
						{ label: 'Highlight', fields: [{ key: 'highlight_learned', label: 'Learned' }, { key: 'highlight_not_learned', label: 'Not learned' }] },
					],
				},
				{
					title: 'Subjects & SRS stages',
					stagePreview: true,
					groups: [
						{ label: 'Subjects', fields: [{ key: 'radical_color', label: 'Radical' }, { key: 'kanji_color', label: 'Kanji' }, { key: 'vocab_color', label: 'Vocab' }] },
						{ label: 'Apprentice', fields: [{ key: 'ap1_color', label: 'I' }, { key: 'ap2_color', label: 'II' }, { key: 'ap3_color', label: 'III' }, { key: 'ap4_color', label: 'IV' }] },
						{ label: 'Guru', fields: [{ key: 'gr1_color', label: 'I' }, { key: 'gr2_color', label: 'II' }] },
						{ label: 'Master & Enlightened', fields: [{ key: 'mst_color', label: 'Master' }, { key: 'enl_color', label: 'Enl.' }] },
						{ label: 'Initiate & Burned', fields: [{ key: 'int_color', label: 'Initiate' }, { key: 'brn_color', label: 'Burned' }] },
					],
				},
			],
			srsPreviewKeys: ['int_color', 'ap1_color', 'ap2_color', 'ap3_color', 'ap4_color', 'gr1_color', 'gr2_color', 'mst_color', 'enl_color', 'brn_color'],
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
		searchHistorySizeOptions() {
			return SEARCH_HISTORY_SIZE_OPTIONS.map(value => ({ value, label: `${value} subjects` }));
		},
		searchSettings() {
			return this.settings.settings.search;
		},
		extensionIcon() {
			return this.settings.settings.extension_icon;
		},
		badgeMode() {
			return badgeModeOf(this.settings.settings);
		},
		browserNotifications() {
			return this.settings.settings.notifications;
		},
		pageStats() {
			return this.settings.settings.page_stats ?? {};
		},
		reviewInfo() {
			return this.settings.settings.review_info ?? {};
		},
		reviewTimer() {
			return this.settings.settings.review_timer ?? {};
		},
		historySizeOptions() {
			return PAGE_HISTORY_SIZES.map(value => ({ value, label: `${value} pages` }));
		},
		sentencesPerPageOptions() {
			return SENTENCES_PER_PAGE_OPTIONS.map(value => ({ value, label: `${value} sentences` }));
		},
		reviewTimerOptions() {
			return [5, 10, 15, 20, 25, 30, 40, 45, 60, 90].map(value => ({ value, label: `${value} minutes` }));
		},
		focusMemoryOptions() {
			return [
				{ value: 'page', label: 'This page only' },
				{ value: 'site', label: 'The whole site' },
			];
		},
		/** what the highlight's colors are by (Classification's Auto follows it) */
		highlightViewLabel() {
			return PAGE_STATS_VIEWS.find(view => view.id === highlightView(this.settings.settings))?.label ?? '';
		},
		pageStatsViewOptions() {
			return [
				// short, as the others (what it follows: in the description)
				{ value: 'auto', label: 'Auto' },
				...PAGE_STATS_VIEWS.map(view => ({ value: view.id, label: view.label })),
			];
		},
		/** "19:05", for the time field */
		reminderTimeValue() {
			const [hour, minute] = this.reminderTime;
			return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
		},
		/** The daily reminder's [hour, minute]. */
		reminderTime() {
			const match = /^(\d{1,2}):(\d{2})$/.exec(this.browserNotifications.daily_reminder_time ?? '');
			return match ? [Number(match[1]), Number(match[2])] : [19, 0];
		},
		/** Each hour of the day, in the clock format chosen in the settings ("7 PM" / "19"). */
		reminderHourOptions() {
			const hour12 = this.settings.settings.miscellaneous?.time_in_12h_format;
			return Array.from({ length: 24 }, (_, hour) => ({
				value: hour,
				label: hour12
					? new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric', hour12: true })
					: String(hour).padStart(2, '0'),
			}));
		},
		homeLayout() {
			return resolveHomeLayout(this.settings.settings.home);
		},
		appearancePresets() {
			return [
				{ id: 'default', label: 'Default', colors: defaultSettings.appearance, confirm: 'Reset all colors to the defaults?' },
				{ id: 'flaming', label: 'Flaming Durtles', colors: flamingDurtlesPattern, confirm: 'Change colors to the Flaming Durtles pattern?' },
				{ id: 'grays', label: 'Grays', colors: graysPattern, confirm: 'Change colors to a pattern of grays?' },
			];
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
		/** short, to fit a row of buttons (the full names: the first-run choice, highlightColorByOptions) */
		availableColorByOptions() {
			const short = { learned: 'Learned', srs_stage: 'SRS', jlpt: 'JLPT', joyo: 'Jōyō' };
			return highlightColorByOptions.map(option => ({ ...option, label: short[option.value] ?? option.label }));
		},
		/** What the chosen basis does: the colors, and (JLPT / Jōyō) which ones are highlighted. */
		colorByDescription() {
			const words = this.highlighter.target !== 'kanji';
			switch (this.highlighter.color_by) {
				case 'srs_stage':
					return 'Each one in the color of its SRS stage, from Apprentice to Burned.';
				case 'jlpt':
					return `By JLPT level, N5 to N1: only what's in the JLPT lists is highlighted.${words ? ' Words: Jonathan Waller\'s (unofficial) lists.' : ''}`;
				case 'joyo':
					return `By Jōyō school grade: only Jōyō kanji are highlighted.${words ? ' Words: the grade of their hardest kanji.' : ''}`;
				default:
					return 'Two colors: what you\'ve learned, and what you haven\'t yet.';
			}
		},
		saveTargetHost() {
			try {
				return new URL(this.saveTarget).hostname;
			} catch {
				return 'the page';
			}
		},
		/** off → (turned on) saving → saved, or not kept (too little Japanese) */
		saveState() {
			if (this.historyUrls.includes(this.saveTarget)) return 'saved';
			if (this.pageStats.history !== true) return 'off';
			return this.saveGaveUp ? 'skipped' : 'saving';
		},
		usesStageStyleColors() {
			return this.highlighter.color_by === 'srs_stage';
		},
		usesSchoolGradeColors() {
			return this.highlighter.color_by === 'jlpt' || this.highlighter.color_by === 'joyo';
		},
	},

	mounted() {
		if (this.sidePanelSupported) void this.resolveBrowserWindow();
		void storage.getItem(HIDDEN_SITES_KEY).then(sites => { this.pageStatsHiddenSites = sites ?? []; });
		this.unwatchHiddenSites = storage.watch(HIDDEN_SITES_KEY, sites => { this.pageStatsHiddenSites = sites ?? []; });
		void storage.getItem(SENTENCE_EXCLUDED_SITES_KEY).then(sites => { this.sentenceExcludedSites = sites ?? []; });
		this.unwatchSentenceSites = storage.watch(SENTENCE_EXCLUDED_SITES_KEY, sites => { this.sentenceExcludedSites = sites ?? []; });
		this.openFromRoute();
		this.$nextTick(this.revealActiveTab);
		// the popup's width can change (side panel, popped out window)
		this.tabBarObserver = new ResizeObserver(() => this.updateTabFades());
		if (this.$refs.tabBar) this.tabBarObserver.observe(this.$refs.tabBar);
	},

	beforeUnmount() {
		clearTimeout(this.realignTimer);
		clearTimeout(this.flashTimer);
		this.unwatchHiddenSites?.();
		this.unwatchSentenceSites?.();
		this.unwatchSaveHistory?.();
		clearTimeout(this.saveTimer);
		this.tabBarObserver?.disconnect();
	},

	watch: {
		// "Save this page": the history just turned on, the page (open in its tab) records itself;
		// one that doesn't come in a while has too little Japanese to be kept
		'pageStats.history'(on) {
			clearTimeout(this.saveTimer);
			this.saveGaveUp = false;
			if (on && this.saveTarget) this.saveTimer = setTimeout(() => { this.saveGaveUp = true; }, 10_000);
		},
		// a link to a tab / section (e.g. the sidebar's backup cloud) while Settings is open
		'$route.query'() {
			if (this.$route.name === 'Settings') this.openFromRoute();
		},
		// the chosen tab stays in view (e.g. opened by a link, past the visible ones)
		activeTab() {
			this.$nextTick(this.revealActiveTab);
		},
	},

	methods: {
		updateTabFades() {
			const bar = this.$refs.tabBar;
			if (!bar) return;
			// a few pixels short of the end (the bar's padding) isn't a hidden tab
			this.tabsHiddenStart = bar.scrollLeft > 8;
			this.tabsHiddenEnd = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 8;
		},
		/** a mouse wheel (vertical) moves the tab bar sideways */
		scrollTabsWithWheel(event) {
			const bar = this.$refs.tabBar;
			if (!bar || bar.scrollWidth <= bar.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			bar.scrollLeft += event.deltaY;
		},
		/**
		 * The chosen tab to the middle of the bar (as far as it goes): its neighbours come into
		 * view, so the tabs past the edge are seen to be there. Only the bar scrolls, not the page.
		 */
		revealActiveTab() {
			const bar = this.$refs.tabBar;
			const tab = bar?.querySelector(`[data-tab="${this.activeTab}"]`);
			if (!bar || !tab) return;
			const barBox = bar.getBoundingClientRect();
			const tabBox = tab.getBoundingClientRect();
			const left = bar.scrollLeft + (tabBox.left - barBox.left) - (bar.clientWidth - tabBox.width) / 2;
			bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
			this.updateTabFades();
		},
		/** ?save=url (Home's "Save this page"): follows the history until the page is in it */
		async followSaveTarget() {
			const target = typeof this.$route.query.save === 'string' ? this.$route.query.save : '';
			if (!target || target === this.saveTarget) return;
			this.saveTarget = target;
			this.saveGaveUp = false;
			const setUrls = entries => { this.historyUrls = entries.map(entry => entry.url); };
			setUrls(await readPageHistory());
			this.unwatchSaveHistory?.();
			this.unwatchSaveHistory = watchPageHistory(setUrls);
		},
		/** ?tab=data&section=backup: that tab, scrolled to that section */
		openFromRoute() {
			void this.followSaveTarget();
			const { tab, section } = this.$route.query;
			if (this.tabs.some(entry => entry.id === tab)) this.activeTab = tab;
			if (!section) return;
			this.revealSection(String(section));
		},
		/**
		 * Scrolls to a section (#settings-<name>) and flashes it, so a link lands on what it's about.
		 * Waits for it to be laid out (the tab just shown, settings still loading).
		 */
		revealSection(name, tries = 20) {
			const element = document.getElementById(`settings-${name}`);
			if (!element || !element.offsetHeight) {
				if (tries > 0) setTimeout(() => this.revealSection(name, tries - 1), 50);
				return;
			}
			// just below the fixed top bar (as Levels' projections)
			const topbar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 45;
			const offset = () => element.getBoundingClientRect().top - topbar - 10;
			const scroll = behavior => window.scrollTo({ top: Math.max(0, window.scrollY + offset()), behavior });
			// after the router's own scroll to the top of a new page (it would cancel ours); then what
			// loads above it (the Data tab's backups and cache) moves it: put back, a few times
			clearTimeout(this.realignTimer);
			const realign = (left, first) => {
				this.realignTimer = setTimeout(() => {
					if (first) scroll('smooth');
					else if (Math.abs(offset()) > 30 && window.scrollY + innerHeight < document.documentElement.scrollHeight - 2) scroll('auto');
					if (left > 1) realign(left - 1, false);
				}, first ? 120 : 500);
			};
			realign(4, true);
			element.classList.remove('settings-flash');
			// restarts the animation when the same section is linked again
			void element.offsetWidth;
			element.classList.add('settings-flash');
			clearTimeout(this.flashTimer);
			this.flashTimer = setTimeout(() => element.classList.remove('settings-flash'), 1800);
		},
		async unhidePageStatsSite(site) {
			const hidden = (await storage.getItem(HIDDEN_SITES_KEY)) ?? [];
			await storage.setItem(HIDDEN_SITES_KEY, hidden.filter(entry => entry !== site));
		},
		/** "mail.example.com" (or a pasted address): its sentences aren't kept, those kept are removed */
		async excludeSentenceSite() {
			let site = this.sentenceSiteInput.toLowerCase();
			try {
				site = new URL(site.includes('://') ? site : `https://${site}`).hostname;
			} catch {
				return;
			}
			const sites = (await storage.getItem(SENTENCE_EXCLUDED_SITES_KEY)) ?? [];
			if (!sites.includes(site)) await storage.setItem(SENTENCE_EXCLUDED_SITES_KEY, [...sites, site]);
			await removeSentences([site]);
			this.sentenceSiteInput = '';
		},
		async includeSentenceSite(site) {
			const sites = (await storage.getItem(SENTENCE_EXCLUDED_SITES_KEY)) ?? [];
			await storage.setItem(SENTENCE_EXCLUDED_SITES_KEY, sites.filter(entry => entry !== site));
		},
		async clearSentences() {
			if (!window.confirm('Remove every sentence kept from the pages you read? The pages stay in the history.')) return;
			await removeSentences();
		},
		onReminderTimeInput(value) {
			const match = /^(\d{2}):(\d{2})/.exec(value ?? '');
			if (match) this.setReminderTime(Number(match[1]), Number(match[2]));
		},
		setReminderTime(hour, minute) {
			this.set('notifications', 'daily_reminder_time', `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
		},
		pageHistorySize,
		sentencesPerPage,
		set(group, key, value) {
			this.settings.setSetting(group, key, value);
		},
		setUnifiedHighlightStyle(value) {
			const index = highlightStyleOptions.learned.findIndex(option => option.value === value);
			if (index < 0) return;

			this.set('highlight_style', 'learned', value);
			if (!this.usesStageStyleColors) {
				this.set('highlight_style', 'not_learned', highlightStyleOptions.not_learned[index].value);
			}
		},
		async saveHomeLayout(sections) {
			await this.settings.setSetting('home', 'order', sections.map(section => section.id));
			await this.settings.setSetting('home', 'hidden', sections.filter(section => !section.visible).map(section => section.id));
		},
		applyPreset(preset) {
			if (window.confirm(preset.confirm)) {
				this.settings.setAppearancePreset(preset.colors);
			}
		},
		/** Called straight from the click (browsers only open the panel on a user action). */
		openSidePanelNow() {
			// the browser window id is looked up beforehand (mounted): no await allowed here
			openBrowserSidePanel({
				windowId: this.browserWindowId ?? undefined,
				tabId: this.browserTabId ?? undefined,
			});
		},
		async resolveBrowserWindow() {
			const tab = await getActiveBrowserTab();
			this.browserWindowId = tab?.windowId ?? null;
			this.browserTabId = tab?.id ?? null;
		},
		/** the badge's choice (the old counter switch kept in step: on for the subjects' count) */
		setBadgeMode(mode) {
			this.set('extension_icon', 'badge', mode);
			this.set('extension_icon', 'kanji_counter', mode === 'subjects');
		},
		async setSearchHistorySize(size) {
			this.set('search', 'history_size', size);
			// shrinking the limit drops the oldest entries right away
			await trimSearchHistory(size);
		},
		async clearSubjectsData() {
			if (!window.confirm('Reset subject data?\n\nAnything left over from the previous version is removed and your subjects are downloaded from WaniKani again (this takes a minute or two). Your settings, API key and saved history are kept.')) return;
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

.page-stats-privacy {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 10px;
	border: 1px solid rgba(48, 164, 108, 0.35);
	background: rgba(48, 164, 108, 0.1);
	font-size: 12px;
	line-height: 1.45;
	color: var(--font-color);
}

.page-stats-privacy svg {
	flex-shrink: 0;
	width: 18px;
	height: 18px;
	margin-top: 1px;
	fill: none;
	stroke: #30a46c;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.page-stats-hidden {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 6px;
}

.page-stats-hidden button {
	padding: 3px 9px;
	border: 1px solid var(--border-color);
	border-radius: 999px;
	background: var(--surface-muted-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 11.5px;
	cursor: pointer;
}

/* "Save this page" (from Home): where it stands, above the history's switch */
.page-save-banner {
	margin: 10px 12px 2px;
	padding: 9px 12px;
	border-radius: 8px;
	border: 1px solid color-mix(in srgb, var(--wanikani, #f100a1) 35%, transparent);
	background: color-mix(in srgb, var(--wanikani, #f100a1) 8%, var(--fill-color));
	color: var(--font-color);
	font-size: 12.5px;
	line-height: 1.45;
}

.page-save-banner.saved {
	border-color: color-mix(in srgb, #30a46c 45%, transparent);
	background: color-mix(in srgb, #30a46c 10%, var(--fill-color));
}

.page-save-banner.skipped {
	border-color: var(--surface-border-color);
	background: var(--surface-muted-color);
	color: var(--font-sec-color);
}

.page-save-banner a {
	margin-left: 6px;
	font-weight: 700;
	color: var(--wanikani, #f100a1);
}

/* a section that needs another one first: a line saying so, in place of its settings */
.settings-section-note {
	padding: 10px 12px;
}

/* a site to keep sentences out of: typed in, added */
.page-stats-exclude {
	display: flex;
	gap: 6px;
	margin-top: 6px;
}

.page-stats-exclude input {
	flex: 1;
	min-width: 0;
	padding: 5px 8px;
	border: 1px solid var(--border-color);
	border-radius: 6px;
	background: var(--fill-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 12px;
}

/* hour : minutes */
.reminder-time-input {
	padding: 4px 8px;
	border: 1px solid var(--surface-border-color);
	border-radius: 8px;
	background: var(--surface-muted-color);
	color: var(--font-color);
	font-family: inherit;
	font-size: 13px;
	font-weight: 700;
}
</style>
