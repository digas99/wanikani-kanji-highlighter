chrome.storage.local.get(["apiKey", "userInfo", "settings"], result => {
    const apiKey = result["apiKey"];
    const userInfo = result["userInfo"]["data"];
    const settings = result["settings"];

    // if user info has been updated in wanikani, then update cache
    if (!userInfo)
        fetchUserInfo(apiKey);
    
    if (userInfo) {
        const avatar = document.querySelector("#profile img");
        setAvatar(avatar, "https://www.wanikani.com/users/"+userInfo["username"], userInfo["avatar"], result["userInfo"]);

        const level = document.querySelector("#profile p");
        if (level && userInfo["level"])
            level.appendChild(document.createTextNode(userInfo["level"]));
    }

    // random subject type
    if (settings)
        setRandomSubjectType(settings["kanji_details_popup"]["random_subject"]);
});

// when scripts.js has loaded
document.addEventListener("scriptsLoaded", () => {
    console.log(blacklistedSite, atWanikani);
    
    // if site is blacklisted
    if (blacklistedSite) {
        const blacklistButton = document.querySelector("#blacklist");
        if (blacklistButton) {
            // remove blacklist button and change it for run button
            const wrapper = blacklistButton.parentElement;
            blacklistButton.nextElementSibling.remove();
            blacklistButton.remove();
            wrapper.style.removeProperty("padding-right");
            const runButton = document.createElement("img");
            wrapper.appendChild(runButton);
            runButton.id = "run";
            runButton.src = "/images/run.png";
            runButton.title = "Run";
            runButton.style = "width: 20px;";            
        }

        // remove highlighted kanji container
        const highlightedKanjiCounter = document.querySelector(".highlightedKanjiContainer");
        if (highlightedKanjiCounter)
            highlightedKanjiCounter.remove();
    }

    // if site is wanikani
    if (atWanikani) {
        // remove some buttons
        const buttons = document.querySelectorAll("#search, #blacklist, #run, #random");
        buttons.forEach(button => button?.parentElement.remove());

        // remove search area
        const searchArea = document.querySelector(".searchArea");
        if (searchArea)
            searchArea.remove();

        // remove highlighted kanji container
        const highlightedKanjiCounter = document.querySelector(".highlightedKanjiContainer");
        if (highlightedKanjiCounter)
            highlightedKanjiCounter.remove();

    }

    // if not valid site
    if (!validSite) {
        // remove some buttons
        const buttons = document.querySelectorAll("#blacklist, #run, #random");
        buttons.forEach(button => button?.parentElement.remove());

        // remove highlighted kanji container
        const highlightedKanjiCounter = document.querySelector(".highlightedKanjiContainer");
        if (highlightedKanjiCounter)
            highlightedKanjiCounter.remove();
    }
    
    if (!blacklistedSite && !atWanikani) {
        chrome.storage.local.get(["blacklist"], result => {
            const blacklist_data = result["blacklist"];
    
            // blacklist button
            if (blacklist_data) {
                const blacklistNumber = document.querySelector("#blacklist").parentElement.querySelector(".side-panel-info-alert");
                if (blacklistNumber)
                    blacklistNumber.innerText = blacklist_data.length;
            }
        });
    }
});

const setRandomSubjectType = (value) => {
    const randomSubjectType = document.querySelector("#random-subject-type");
    if (randomSubjectType) {
        randomSubjectType.innerText = value.charAt(0);

        const img = randomSubjectType.parentElement.getElementsByTagName("img")[0];
        if (value === "Any") {
            img.setAttribute("data-item-id", "rand");
            randomSubjectType.style.removeProperty("background-color");
            randomSubjectType.style.removeProperty("filter");
        }
        else if (value === "Kanji") {
            img.setAttribute("data-item-id", "rand-kanji");
            randomSubjectType.style.backgroundColor = "var(--kanji-tag-color)";
            randomSubjectType.style.filter = "invert(1)";
        }
        else if (value === "Vocabulary") {
            img.setAttribute("data-item-id", "rand-vocabulary");
            randomSubjectType.style.backgroundColor = "var(--vocabulary-tag-color)";
            randomSubjectType.style.filter = "invert(1)";
        }
    }
}

const setAvatar = (elem, url, avatar, userInfo) => {
    if (!avatar) {
        fetch(url)
            .then(result => result.text())
            .then(content => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const avatarElem = doc.getElementsByClassName("avatar user-avatar-default")[0];
                const avatarSrc = "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0];
                userInfo["data"]["avatar"] = avatarSrc;
                elem.src = avatarSrc;

                if (userInfo)
                    chrome.storage.local.set({"userInfo": userInfo});
            });
    }
    else
        elem.src = avatar;
}

window.addEventListener("click", async e => {
    const target = e.target;

    const clickable = target.closest(".clickable");
    if (clickable) {
        if (clickable.querySelector("#exit")) {
            const loading = new MessagePopup(document.body);
            loading.create("Logging out...");
            loading.setLoading();
    
            await clearSubjects();
            chrome.storage.local.remove(["apiKey", "userInfo", "userInfo_updated"], () => window.location.href = "auth.html");
        }

        if (clickable.querySelector("#side-panel-logo"))
            expandSideBar(document.querySelector(".side-panel"));

        if (clickable.querySelector("#blacklist")) {
            await blacklist();
            
            const tab = await getTab();
            chrome.tabs.sendMessage(tab.id, {reloadPage: true});
            setTimeout(() => window.location.reload(), 500);
        }

        if (clickable.querySelector("#run")) {
            const tab = await getTab();
            chrome.tabs.sendMessage(tab.id, {windowLocation: "host"}, async url => {
                if (url) {
                    await blacklistRemove(url["windowLocation"]);

                    chrome.tabs.sendMessage(tab.id, {reloadPage: true});
                    setTimeout(() => window.location.reload(), 500);
                }
            }); 
        }
    }
});

const expandSideBar = sidebar => {
    if (sidebar) {
        if (!sidebar.classList.contains("side-panel-focus")) {
            sidebar.classList.add("side-panel-focus");
            
            Array.from(document.getElementsByClassName("navbar_icon"))
                .filter(icon => icon.style.display !== "none")
                .forEach(icon => {
                    const label = document.createElement("p");
                    icon.appendChild(label);
                    label.style.pointerEvents = "none";
                    label.appendChild(document.createTextNode(icon.getElementsByTagName("img")[0].title));
                });
            
            Array.from(document.getElementsByClassName("side-panel-info-alert"))
                .forEach(div => div.style.left = "19px");
        }
        else {
            sidebar.classList.remove("side-panel-focus");
            Array.from(document.getElementsByClassName("navbar_icon"))
                .filter(icon => icon.style.display !== "none")
                .forEach(icon => {
                    icon.getElementsByTagName("p")[0].remove();
                });

            Array.from(document.getElementsByClassName("side-panel-info-alert"))
                .forEach(div => {
                    div.style.removeProperty("left");
                    div.style.display = "none";
                    setTimeout(() => div.style.removeProperty("display"), 300);
                });
            
        }
    }
}