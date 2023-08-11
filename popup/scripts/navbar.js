chrome.storage.local.get(["apiKey", "userInfo", "settings", "blacklist"], result => {
    const apiKey = result["apiKey"];
    const userInfo = result["userInfo"]["data"];
    const settings = result["settings"];
    const blacklist = result["blacklist"];

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
    setRandomSubjectType(settings["kanji_details_popup"]["random_subject"]);

    // blacklist button
    setTimeout(() => console.log(blacklisted_site, atWanikani), 1000);
    if (blacklist) {
        const blacklistNumber = document.querySelector("#blacklist").parentElement.querySelector(".side-panel-info-alert");
        if (blacklistNumber)
            blacklistNumber.innerText = blacklist.length;
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
            img.setAttribute("data-item-id", "rand-vocab");
            randomSubjectType.style.backgroundColor = "var(--vocab-tag-color)";
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

    if (target.id === "exit")
        chrome.storage.local.remove("apiKey", () => window.location.href = "auth.html");

    if (target.id === "side-panel-logo")
        expandSideBar(document.querySelector(".side-panel"));

    if (target.id === "blacklist") {
        await blacklist();
        window.location.reload();
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