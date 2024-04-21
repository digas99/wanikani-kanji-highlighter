document.write(/*html*/`
<div class="side-panel">
	<a href="profile.html" class="clickable" id="profile">
		<div>
			<img src="/images/wanikani-default.png">
		</div>
		<p title="Level"></p>
	</a>
	<ul>
		<li class="clickable" style="position: relative;">
			<a href="home.html" class="navbar_icon" style="padding: 0px 5px;">
				<img id="home" src="../images/home.png" title="Home" style="width: 20px;">
			</a>
		</li>
		<li class="clickable" style="position: relative;">
			<a href="settings.html" class="navbar_icon" style="padding: 0px 5px;">
				<img id="settings" src="../images/settings.png" title="Settings" style="width: 20px;">
			</a>
		</li>
		<li class="clickable" style="position: relative;">
			<a href="search.html" class="navbar_icon" style="padding: 0px 5px;">
				<img id="search" src="../images/search.png" title="Search" style="width: 20px;">
			</a>
		</li>
		<li class="clickable" style="position: relative; padding-right: 3px;">
			<a href="#" class="navbar_icon" style="padding: 0px 5px;">
				<img id="blacklist" src="../images/blacklist.png" title="Blacklist" style="width: 20px;">
				<span class="side-panel-info-alert" style="background-color: #f100a1; color: white; filter: invert(1);">0</span>
			</a>
		</li>
		<li class="clickable" style="position: relative;">
			<a class="navbar_icon" style="padding: 0px 5px;">
				<img id="dark" src="../images/dark.png" title="Dark" style="width: 20px;">
			</a>
		</li>
		<li class="clickable" style="position: relative;">
			<a href="about.html" class="navbar_icon" style="padding: 0px 5px;">
				<img id="about" src="../images/about.png" title="About" style="width: 20px;">
			</a>
		</li>
		<li data-item-id="rand" class="kanjiDetails clickable" style="position: relative;" title="Random">
			<a href="#" class="navbar_icon" style="padding: 0px 5px; pointer-events: none;">
				<img id="random" src="../images/random.png" style="width: 20px;" title="Random">
				<span id="random-subject-type" class="side-panel-info-alert">A</span>
			</a>
		</li>
		<li class="clickable" style="position: relative; padding-left: 3px;">
			<a href="#" class="navbar_icon" style="padding: 0px 5px;">
				<img id="exit" src="../images/exit.png" title="Exit" style="width: 20px;">
			</a>
		</li>
	</ul>
	<div class="clickable">
		<div id="side-panel-logo" title="Wanikani Kanji Highlighter">
			<img src="../logo/logo.png" style="pointer-events: none;">
			<div class="side-panel-version">v0.0.0</div>
		</div>
	</div>
</div>
`);

// if /popup/home.html remove the home icon
if (window.location.pathname.includes("/popup/home.html")) {
	document.querySelector("#home").closest(".clickable").remove();
}