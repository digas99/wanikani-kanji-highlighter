(() => {

document.write(/*html*/`
<div class="topNav" ${document.title == "Home" ? "style='display: none;'" : ""}>
    <a href="#" title="Go back" id="goBackButton" class="clickable">
        <div>
            <i class="left"></i>
            <div id="secPageTitle"></div>
        </div>
    </a>
    <div id="secPageButtons"></div>

    <div class="topNav-lessons">
        <a title="Lessons" href="/popup/lessons.html">
            <div class="lessons-icon"><div></div></div>
            <div class="lessons-count">${localStorage.getItem('lessons') || 0}</div>
        </a>
        <a title="Reviews" href="/popup/reviews.html">
            <div class="reviews-icon"><div></div></div>
            <div class="lessons-count">${localStorage.getItem('reviews') || 0}</div>
        </a>
    </div>
</div>

<div class="side-panel">
    <!-- PROFILE -->
    <a href="profile.html" id="profile">
        <div class="progress-container" style="--level-progress: ${localStorage.getItem('level-progress') || 0}%">
            <img src="/images/wanikani-default.png">
        </div>
        <p title="Level">${localStorage.getItem("level") || ""}</p>
    </a>
    <ul>
        <!-- HOME -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="home.html" class="navbar_icon" style="padding: 0px 5px;">
                <img id="home" src="/images/home.png" title="Home" style="width: 20px;">
            </a>
        </li>
        <!-- SETTINGS -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="settings.html" class="navbar_icon" style="padding: 0px 5px;">
                <img id="settings" src="/images/settings.png" title="Settings" style="width: 20px;">
            </a>
        </li>
        <!-- SEARCH -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="search.html" class="navbar_icon" style="padding: 0px 5px;">
                <img id="search" src="/images/search.png" title="Search" style="width: 20px;">
            </a>
        </li>
        <!-- BLACKLIST -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="#" class="navbar_icon" style="padding: 0px 5px;">
                <img id="blacklist" src="/images/blacklist.png" title="Blacklist" style="width: 20px; margin-left: -3px; margin-right: 3px;">
                <span class="side-panel-info-alert" style="background-color: #f100a1; color: white;">${localStorage.getItem("blacklist") || "0"}</span>
            </a>
        </li>
        <!-- THEME -->
        <li class="side-panel-tab" style="position: relative;">
            <a class="navbar_icon" style="padding: 0px 5px;">
                <img id="dark" src="/images/dark.png" title="Dark" style="width: 20px;">
            </a>
        </li>
        <!-- ABOUT -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="about.html" class="navbar_icon" style="padding: 0px 5px;">
                <img id="about" src="/images/about.png" title="About" style="width: 20px;">
            </a>
        </li>
        <!-- RANDOM SUBJECT -->
        <li class="side-panel-tab kanjiDetails" data-item-id="rand" style="position: relative;" title="Random">
            <a href="#" class="navbar_icon" style="padding: 0px 5px; pointer-events: none;">
                <img id="random" src="/images/random.png" style="width: 20px;" title="Random">
                <span id="random-subject-type" class="side-panel-info-alert">A</span>
            </a>
        </li>
        <!-- EXIT -->
        <li class="side-panel-tab" style="position: relative;">
            <a href="#" class="navbar_icon" style="padding: 0px 5px;">
                <img id="exit" src="/images/exit.png" title="Exit" style="width: 20px; margin-left: 3px; margin-right: -3px;">
            </a>
        </li>
    </ul>
    <!-- LOGO -->
    <div class="side-panel-tab">
        <div id="side-panel-logo" title="Wanikani Kanji Highlighter">
            <img src="/logo/logo.png" style="pointer-events: none;">
            <div class="side-panel-version">v${localStorage.getItem("version") || "0.0.0"}</div>
        </div>
    </div>
</div>
`);

document.querySelector("#secPageTitle").innerText = document.title;

const updatesLoading = /*html*/`
	<div class="separator"></div>
	
	<!-- UPDATES -->
	<li style="position: relative;">
		<a class="navbar_icon" style="padding: 0px 5px; opacity: 1 !important;">
			<img src="/images/download.png" title="Updates" style="width: 20px;">
			<span id="updates-loading" class="side-panel-info-alert" style="background-color: #f100a1; color: white;">0</span>
		</a>
	</li>
`;

const path = window.location.pathname;
if (path.includes("/popup/home.html")) {
	const sidePanelUl = document.querySelector(".side-panel ul");
	sidePanelUl.insertAdjacentHTML("beforeend", updatesLoading);
}
else if (path.includes("/popup/lessons.html") || path.includes("/popup/reviews.html")) {
    const count = document.querySelector(`[title="${document.title}"] .lessons-count`);
    if (count) {
        count.style.backgroundColor = "white";
        count.style.color = "var(--default-color)";
    }
}

// HIGHLIGHT TAB FROM PAGE
const title = document.title;
const sidePanel = document.querySelector(".side-panel");
const tab = sidePanel.querySelector(`[title="${title}"]`);
if (tab) {
	tab.parentElement.parentElement.style.backgroundColor = "var(--wanikani)";
	tab.parentElement.parentElement.style.pointerEvents = "none";
}

})();