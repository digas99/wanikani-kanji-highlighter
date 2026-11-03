<template>
    <div
        class="side-panel"
        ref="sidePanel"
        @pointerdown.capture="lastPointerType = $event.pointerType"
        @mouseover="expandSidePanel"
        @mouseleave="retractSidePanel"
    >
        <!-- PROFILE -->
        <RouterLink :to="{ name: 'Profile' }" id="profile">
            <div class="progress-container" ref="levelProgress" style="--level-progress: 0%;">
                <img :src="userAvatar" alt="Avatar" />
            </div>
            <p title="Level">{{ userInfo?.level || "" }}</p>
        </RouterLink>
        <ul>
            <div class="side-panel-top">
                <!-- HOME -->
                <NavbarLink :to="{ name: 'Home' }" icon="home" />
                <!-- NOTIFICATIONS: the latest in a popover (near the top of the window), "Show all" opens the page -->
                <NavbarLink
                    ref="notificationsLink"
                    to="#"
                    icon="notifications"
                    icon-src="/icons/sidebar/notifications.svg"
                    title="Notifications"
                    :info="unreadNotifications ? String(Math.min(unreadNotifications, 99)) : ''"
                    @click="toggleNotifications"
                />
                <!-- SETTINGS -->
                <NavbarLink :to="{ name: 'Settings' }" icon="settings" />
                <!-- SEARCH -->
                <NavbarLink :to="{ name: 'Search' }" icon="search" />
                <!-- ABOUT -->
                <NavbarLink :to="{ name: 'About' }" icon="about" />
            </div>
            <div class="side-panel-bottom">
                <!-- RANDOM SUBJECT -->
                <NavbarLink
                    to="#"
                    icon="random"
                    :info="randomBadge.label"
                    :info-style="randomBadgeStyle"
                    @click="openRandomSubject"
                    @contextmenu.prevent="openRandomSubjectInPage"
                />
                <!-- PAGE LIST -->
                <NavbarLink
                    v-if="showPageListButton"
                    to="#"
                    :icon="pageListIcon"
                    :title="pageListTitle"
                    :label="pageListLabel"
                    :info="pageListBadge"
                    @click="togglePageListForActiveTab"
                />
                <!-- THEME -->
                <NavbarLink
                    to="#"
                    :icon="themeToggleIcon"
                    :title="themeToggleLabel"
                    :label="themeToggleLabel"
                    @click="handleThemeToggle"
                />
                <!-- POPOUT -->
                <NavbarLink to="#" icon="popout" @click="handlePopout" />

                <div class="separator"></div>

                <!-- EXIT -->
                <NavbarLink to="#" icon="exit" @click="handleExit" />

                <div style="height: 15px;"></div>

                <!-- LOGO -->
                <div class="side-panel-tab" style="background-color: unset !important;">
                    <div id="side-panel-logo" title="Wanikani Kanji Highlighter">
                        <span class="side-panel-logo-mark">
                            <img src="@/assets/logo.png" style="pointer-events: none;">
                            <!-- Google Drive backup is on (Settings → Data → Backup) -->
                            <RouterLink
                                v-if="driveBackup.connected"
                                :to="{ name: 'Settings', query: { tab: 'data', section: 'backup' } }"
                                class="side-panel-backup"
                                :class="`backup-${backupStatus.kind}`"
                                :title="backupStatus.title"
                                :aria-label="backupStatus.title"
                                @click.stop
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path class="cloud" d="M7 18.5h10.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.3 9.2 4.7 4.7 0 0 0 7 18.5z" />
                                    <path v-if="backupStatus.kind === 'on'" class="mark" d="M9 13.8l2.2 2.2 4-4.3" />
                                    <path v-else-if="backupStatus.kind === 'error'" class="mark" d="M12 10.5v3.2M12 16.2v.1" />
                                </svg>
                            </RouterLink>
                        </span>
                        <div class="side-panel-version">v{{ version }}</div>
                    </div>
                </div>
            </div>
        </ul>
        <!-- outside the sidebar (it clips its content) -->
        <Teleport to="body">
            <NotificationsPopover :open="notificationsOpen" :top="notificationsTop" @close="notificationsOpen = false" />
        </Teleport>
    </div>
</template>

<script>
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';
import { useSettingsStore } from '@/stores/settings';

import NavbarLink from '@/components/Navbar/NavbarLink.vue';
import NotificationsPopover from '@/components/Notifications/NotificationsPopover.vue';
import { useNotifications } from '@/utils/scripts/useNotifications';

import WanikaniDefaultAvatar from '@/assets/wanikani-default.png';
import {
	getRandomSubjectBadge,
	pickRandomSubjectId,
} from '@/utils/scripts/randomSubject';
import {
	getMainDomain,
	hostMatchesSiteEntry,
} from '@/utils/scripts/pageList';
import { getActiveBrowserTab, parseBrowserTabSite } from '@/utils/scripts/activeBrowserTab';
import { showSubjectInPage } from '@/utils/scripts/showSubjectInPage';
import {
	getTheme,
	toggleTheme,
} from '@/utils/scripts/theme';
import { storage } from '#imports';
import { readDriveBackupState, saveBackupAvatar, watchDriveBackupState } from '@/utils/scripts/driveBackup';

export default {
    name: 'Sidebar',

    components: {
        NavbarLink,
        NotificationsPopover,
    },

    data() {
        return {
            notificationsOpen: false,
            notificationsTop: 60,
            // a computed ref: unwrapped here, it stays up to date
            unreadNotifications: useNotifications().unreadCount,
            version: ref(chrome.runtime.getManifest().version),
            animationTimeout: null,
            /** 'mouse' | 'touch' | 'pen': hover-to-expand is for mice only. */
            lastPointerType: null,
            activeTabSite: null,
            validSite: false,
            atWanikani: false,
            tabResolved: false,
            theme: getTheme(),
            /** Settings → Data → Backup → Google Drive (the logo's cloud) */
            driveBackup: { connected: false },
        };
    },

    computed: {
        backupStatus() {
            const { auto, lastBackupAt, lastError } = this.driveBackup;
            const last = lastBackupAt
                ? `Last backup: ${new Date(lastBackupAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
                : 'No backup yet';
            if (lastError) return { kind: 'error', title: `Google Drive backup: ${lastError}\n${last}` };
            if (!auto) return { kind: 'off', title: `Google Drive connected, daily backup off\n${last}` };
            return { kind: 'on', title: `Backing up to Google Drive every day\n${last}` };
        },
        themeToggleIcon() {
            return this.theme === 'light' ? 'dark' : 'light';
        },
        themeToggleLabel() {
            return this.theme === 'light' ? 'Dark' : 'Light';
        },
        wk() {
            return useWKStore();
        },
        settingsStore() {
            return useSettingsStore();
        },
        randomSubjectMode() {
            return this.settingsStore.settings.kanji_details_popup.random_subject;
        },
        randomBadge() {
            return getRandomSubjectBadge(
                this.randomSubjectMode,
                this.settingsStore.settings.appearance,
            );
        },
        randomBadgeStyle() {
            return {
                backgroundColor: this.randomBadge.backgroundColor,
                color: this.randomBadge.color,
            };
        },
        userInfo() {
            return this.wk.userInfo;
        },
        userAvatar() {
            return this.wk.userAvatar || WanikaniDefaultAvatar;
        },
        /** whose picture it is (both can arrive in any order) */
        backupAvatar() {
            return { username: this.userInfo?.username ?? null, avatar: this.wk.userAvatar || null };
        },
        pageListMode() {
            return this.settingsStore.pageListMode;
        },
        showPageListButton() {
            if (this.atWanikani) return false;
            if (this.tabResolved && !this.validSite) return false;
            return true;
        },
        currentSiteListed() {
            if (!this.activeTabSite) return false;
            const list = this.pageListMode === 'whitelist'
                ? this.settingsStore.whitelist
                : this.settingsStore.blacklist;
            return list.some(entry => hostMatchesSiteEntry(this.activeTabSite, entry));
        },
        pageListIcon() {
            if (this.currentSiteListed) return 'run';
            return this.pageListMode === 'whitelist' ? 'whitelist' : 'blacklist';
        },
        pageListTitle() {
            if (this.pageListIcon === 'run') {
                return this.pageListMode === 'whitelist' ? 'Stop highlighting here' : 'Enable highlighting here';
            }
            return this.pageListMode === 'whitelist' ? 'Whitelist site' : 'Blacklist site';
        },
        pageListLabel() {
            if (this.pageListIcon === 'run') return 'Run';
            return this.pageListMode === 'whitelist' ? 'Whitelist' : 'Blacklist';
        },
        pageListBadge() {
            if (this.pageListIcon === 'run') return '';
            const count = this.settingsStore.activePageListCount;
            return count > 0 ? String(count) : '';
        },
    },

    // watch url
    watch: {
        '$route'(to) {
            this.selectTab(to.name?.toLowerCase());
            // a tap on a touch screen never "leaves" the sidebar: close it on navigation
            this.retractSidePanel();
        },
        // the profile picture, small, for Drive backups (the lists show whose account each one is)
        backupAvatar: {
            handler({ username, avatar }) {
                if (username && avatar) void saveBackupAvatar(username, avatar);
                // whose account this is: a picture chosen on WaniKani's settings page is only taken
                // when it's the same account (utils/highlight/avatarHandoff.ts)
                if (username) void storage.setItem('local:accountUsername', username);
            },
            immediate: true,
        },
        'wk.levelProgressionInfo': {
            handler(newVal) {
                const percentage = Number(newVal?.progress?.percentage);
                if (!Number.isFinite(percentage)) return;
                this.$nextTick(() => {
                    const el = this.$refs.levelProgress;
                    if (!el) return;
                    // subjects can be empty (level not synced yet): fall back to the user's level
                    const level = newVal.subjects?.[0]?.level ?? this.userInfo?.level ?? '';
                    el.style.setProperty('--level-progress', `${percentage}%`);
                    el.title = `${this.userInfo?.username ?? ''}\nLevel ${level}\n${newVal.progress.passed} / ${newVal.progress.size} (${percentage.toFixed(1)}%)`;
                });
            },
            deep: true
        }
    },

    mounted() {
        this.selectTab(this.$route.name?.toLowerCase());
        void this.refreshActiveTabSite();
        void readDriveBackupState().then(state => { this.driveBackup = state; });
        this.unwatchDriveBackup = watchDriveBackupState(state => { this.driveBackup = state; });
    },

    beforeUnmount() {
        this.unwatchDriveBackup?.();
    },

    methods: {
        /** The bell: the latest notifications in a popover next to it. */
        toggleNotifications() {
            if (this.notificationsOpen) {
                this.notificationsOpen = false;
                return;
            }
            // the popover sits beside the collapsed sidebar: don't expand under it
            this.retractSidePanel();
            const bell = this.$refs.notificationsLink?.$el;
            const rect = bell?.getBoundingClientRect();
            // level with the bell, kept on screen
            this.notificationsTop = rect ? Math.max(8, Math.min(rect.top - 8, window.innerHeight - 340)) : 60;
            this.notificationsOpen = true;
        },
        handleThemeToggle() {
            this.theme = toggleTheme();
        },
        async pickRandomSubject() {
            const context = await this.wk.getRandomSubjectContext();
            const subjectId = pickRandomSubjectId(this.randomSubjectMode, context);
            if (!subjectId) {
                window.alert(`No subjects available for "${this.randomSubjectMode}".`);
                return null;
            }
            return subjectId;
        },
        async openRandomSubject() {
            const subjectId = await this.pickRandomSubject();
            if (subjectId) this.$router.push({ name: 'Subject', params: { id: subjectId } });
        },
        /** Right-click: show the random subject in the web page's details popup (else open it here). */
        async openRandomSubjectInPage() {
            const subjectId = await this.pickRandomSubject();
            if (!subjectId) return;
            if (await showSubjectInPage(subjectId)) return;
            this.$router.push({ name: 'Subject', params: { id: subjectId } });
        },
        async refreshActiveTabSite() {
            try {
                const tab = await getActiveBrowserTab();
                const parsed = parseBrowserTabSite(tab);
                this.validSite = parsed.validSite;
                this.activeTabSite = parsed.activeTabSite;
                this.atWanikani = parsed.atWanikani;
            } catch {
                this.validSite = false;
                this.activeTabSite = null;
                this.atWanikani = false;
            } finally {
                this.tabResolved = true;
            }
        },
        async togglePageListForActiveTab() {
            await this.refreshActiveTabSite();
            if (!this.activeTabSite || !this.validSite || this.atWanikani) return;

            const site = this.activeTabSite;
            const mode = this.pageListMode;

            if (this.currentSiteListed) {
                if (mode === 'whitelist') {
                    await this.settingsStore.removeWhitelistedSite(
                        this.settingsStore.whitelist.find(entry => hostMatchesSiteEntry(site, entry)) ?? site,
                    );
                } else {
                    await this.settingsStore.removeBlacklistedSite(
                        this.settingsStore.blacklist.find(entry => hostMatchesSiteEntry(site, entry)) ?? site,
                    );
                }
            } else if (mode === 'whitelist') {
                await this.settingsStore.addSiteToList('whitelist', getMainDomain(site));
            } else {
                await this.settingsStore.addSiteToList('blacklist', getMainDomain(site));
            }

            try {
                const tab = await getActiveBrowserTab();
                const tabId = tab?.id;
                if (tabId != null) {
                    await browser.tabs.reload(tabId);
                }
            } catch {
                // Ignore reload failures on restricted pages.
            }

            setTimeout(() => window.location.reload(), 500);
        },
        handlePopout() {
            window.close();

            chrome.windows.create({
                url: `${window.location.pathname}?scroll=${window.scrollY}&${window.location.search.substring(1)}`,
                type: "panel",
                width: window.innerWidth,
                height: window.innerHeight
            });
        },
		handleExit() {
			if (!window.confirm('Log out and clear your local session data?')) return;
			this.wk.logout().then(() => location.reload());
		},
        selectTab(label) {
            document.querySelectorAll('.side-panel-tab').forEach(tab => tab.classList.remove('side-panel-tab-selected'));
            const sidePanelTab = document.querySelector(`.side-panel-tab[data-label="${label}"]`);
            if (sidePanelTab) {
                sidePanelTab.classList.add('side-panel-tab-selected');
            }
        },
        expandSidePanel() {
            // touch: the tap's emulated hover shouldn't open it (mobile browsers like Kiwi)
            if (this.lastPointerType === 'touch') return;
            if (this.animationTimeout || this.notificationsOpen) return;
            // turned off in Settings → Popup → Side Navbar Animation
            if (this.settingsStore.settings.miscellaneous?.sidebar_animation === false) return;

            this.animationTimeout = setTimeout(() => {
                this.$refs.sidePanel.classList.add('side-panel-focus');
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }, 300);
        },
        retractSidePanel() {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;

            this.$refs.sidePanel?.classList.remove('side-panel-focus');
        }
    }
}
</script>

<style scoped>
.side-panel {
    height: 100%;
    width: var(--sidebar-width);
    position: fixed;
    right: var(--frame-right, 0px);
    top: 0;
    background-color: var(--default-color);
    border-top: 5px solid var(--wanikani);
    text-align: center;
    z-index: 11;
    /* labels are clipped while collapsed (see NavbarLink) */
    overflow: hidden;
    transition: width 0.22s ease, box-shadow 0.22s ease;
    -webkit-user-select: none;
    /* Safari */
    -ms-user-select: none;
    /* IE 10 and IE 11 */
    user-select: none;
    /* Standard syntax */
}

.side-panel>ul {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
}

.side-panel>ul li {
    height: 36px;
    display: flex;
    align-items: center;
    font-weight: bold;
    padding: 1px 0
}

/* entries without a label (logo, avatar, separator) stay centered in the whole sidebar,
   gliding to the middle as it widens */
#side-panel-logo {
    width: 100%;
    flex-shrink: 0;
}

#side-panel-logo .side-panel-logo-mark>img {
    display: block;
    width: 34px;
}

.side-panel-bottom {
    margin-bottom: 100px;
}

.side-panel-logo-mark {
    position: relative;
    display: inline-block;
}

/* a small cloud on the logo's corner: green (daily backup on), grey (off), amber (failed) */
.side-panel-backup {
    position: absolute;
    right: -5px;
    bottom: -1px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: var(--default-color);
    opacity: 1 !important;
}

.side-panel-backup svg {
    width: 17px;
    height: 17px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.side-panel-backup .cloud {
    fill: currentColor;
    stroke: none;
}

.side-panel-backup .mark {
    stroke: var(--default-color);
    stroke-width: 2.2;
}

.side-panel-backup.backup-on {
    color: #5bd68f;
}

.side-panel-backup.backup-off {
    color: #9a9db3;
}

.side-panel-backup.backup-error {
    color: #f5c451;
}

.side-panel-backup:hover {
    filter: brightness(1.15);
}

.side-panel-version {
    color: white;
    font-size: 9px;
    font-weight: bold;
}

.side-panel-focus {
    /* fits the longest label ("Notifications") */
    width: 140px;
    box-shadow: 0px 0px 4px 0px black;
    /* expanded: above the bottom notices (highlighted list 99, toasts 100) */
    z-index: 110;
}

#side-panel-logo:hover .side-panel-version {
    color: var(--wanikani);
}

.side-panel-tab-selected {
    background-color: var(--wanikani);
}

#random-subject-type {
    background-color: #668b8b;
    color: black;
}

#profile {
    opacity: unset !important;
    display: block;
    width: 100%;
    padding: 10px 0;
}

#profile>div {
    width: 25px;
    height: 25px;
}

#profile img {
    width: 100%;
    height: 100%;
    position: relative;
    border: 3px solid var(--default-color);
    margin-left: -3px;
    margin-top: -3px;
}

.progress-container {
    position: relative;
    display: inline-block;
    border-radius: 50%;
    transition: 0.5s ease-in-out;
    background: conic-gradient(var(--wanikani) 0% var(--level-progress),
            var(--fade) var(--level-progress) 100%);
    padding: 7px;
}

.progress-container img {
    border: 0;
    display: block;
    border-radius: 50%;
}

.progress-level-up-marker {
    width: 17px;
    height: 3px;
    background-color: var(--default-color);
    position: absolute;
    rotate: 45deg;
    margin-left: -2px;
}

#profile:hover .progress-container {
    --level-progress: 100% !important;

}

#profile:hover .progress-level-up-marker {
    display: none;
}

#profile:hover p {
    color: var(--wanikani);
}

#profile p {
    font-weight: bold;
    color: white;
}

.separator {
    height: 1px;
    background-color: white;
    margin: 20px auto;
    width: calc(var(--sidebar-width) - 20px);
}
</style>