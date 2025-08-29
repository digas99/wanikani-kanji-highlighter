<template>
    <div class="side-panel">
        <!-- PROFILE -->
        <RouterLink :to="{ name: 'Profile' }" id="profile">
            <div class="progress-container" style="--level-progress: 0%;">
                <img :src="userAvatar" alt="Avatar" />
            </div>
            <p title="Level">{{ userInfo?.level || "" }}</p>
        </RouterLink>
        <ul>
            <div class="side-panel-top">
                <!-- HOME -->
                <NavbarLink :to="{ name: 'Home' }" icon="home" />
                <!-- SETTINGS -->
                <NavbarLink :to="{ name: 'Settings' }" icon="settings" />
                <!-- SEARCH -->
                <NavbarLink :to="{ name: 'Search' }" icon="search" />
                <!-- ABOUT -->
                <NavbarLink :to="{ name: 'About' }" icon="about" />
            </div>
            <div class="side-panel-bottom">
                <!-- RANDOM SUBJECT -->
                <NavbarLink to="#" icon="random" info="A" />
                <!-- BLACKLIST -->
                <NavbarLink to="#" icon="blacklist" info="0" />
                <!-- THEME -->
                <NavbarLink to="#" icon="dark" />
                <!-- POPOUT -->
                <NavbarLink to="#" icon="popout" />

                <div class="separator"></div>

                <!-- EXIT -->
                <NavbarLink to="#" icon="exit" @click="handleExit" />

                <div style="height: 15px;"></div>

                <!-- LOGO -->
                <div class="side-panel-tab" style="background-color: unset !important;">
                    <div id="side-panel-logo" title="Wanikani Kanji Highlighter">
                        <img src="@/assets/logo.png" style="pointer-events: none;">
                        <div class="side-panel-version">v{{ version }}</div>
                    </div>
                </div>
            </div>
        </ul>
    </div>
</template>

<script>
import { getWKManager } from '@/lib/apiClient';
import { RouterLink } from 'vue-router';
import { useWKStore } from '@/stores';

import NavbarLink from '@/components/Navbar/NavbarLink.vue';

import WanikaniDefaultAvatar from '@/assets/wanikani-default.png';

export default {
    name: 'Sidebar',

    components: {
        NavbarLink
    },

    data() {
        return {
            wkManager: null,
            userAvatar: WanikaniDefaultAvatar,
            userInfo: null,
            version: ref(chrome.runtime.getManifest().version),
        };
    },

    computed: {
        wk() {
            return useWKStore();
        }
    },

    mounted() {
        this.wkManager = getWKManager();
        console.log(this.wkManager);

        this.wkManager.events.on("update:avatar", avatar => {
            if (avatar) {
                this.userAvatar = avatar;
                this.wk.userAvatar = avatar;
            }
        });

        this.wkManager.events.on("update:user", user => {
            console.log(user);
            if (user) {
                this.userInfo = user;
                this.wk.userInfo = user;
                if (user.avatar) {
                    this.userAvatar = user.avatar;
                    this.wk.userAvatar = user.avatar;
                }
            }
        });
    },

    methods: {
        handleExit() {
            this.wkManager?.clearUserInfo();
            this.wk.reset();
            location.reload();
        }
    }
};
</script>

<style scoped>
.side-panel {
    height: 100%;
    width: 45px;
    position: fixed;
    right: 0;
    top: 0;
    background-color: var(--default-color);
    border-top: 5px solid var(--wanikani);
    text-align: center;
    z-index: 11;
    transition: 0.3s;
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
    justify-content: center;
    font-weight: bold;
    padding: 1px 0
}

#side-panel-logo>img {
    width: 34px;
}

.side-panel-bottom {
    margin-bottom: 100px;
}

.side-panel-version {
    color: white;
    font-size: 9px;
    font-weight: bold;
}

.side-panel-focus {
    width: 110px;
    box-shadow: 0px 0px 4px 0px black;
}

.side-panel-focus>ul {
    text-align: left;
}

.side-panel-focus>ul li {
    align-items: unset;
    justify-content: unset;
}

.side-panel-focus>ul li>a {
    display: inline-flex;
    align-items: center;
    width: 100%;
    padding-left: 15px !important;
}

.side-panel-focus>ul li>a:hover {
    opacity: unset !important;
}

.side-panel-focus>ul li>a>p {
    color: white;
    padding-left: 12px;
    width: 100%;
}

.side-panel-focus>div>a>img {
    width: 45px;
    border-radius: 30px;
}

.side-panel-focus #side-panel-logo {
    text-align: center;
}

#side-panel-logo:hover .side-panel-version {
    color: var(--wanikani);
}

#random-subject-type {
    background-color: #668b8b;
    color: black;
}

#profile {
    opacity: unset !important;
    display: block;
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
            #ddd var(--level-progress) 100%);
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
    margin: 20px 10px;
}
</style>