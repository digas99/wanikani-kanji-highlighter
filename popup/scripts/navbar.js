chrome.storage.local.get(["apiKey", "userInfo", "userInfo_updated"], result => {
    const date = result["userInfo_updated"];
    const userInfo = result["userInfo"]["data"];

    // if user info has been updated in wanikani, then update cache
    if (!userInfo)
        fetchUserInfo(result["apiKey"]);
    
    if (userInfo) {
        const avatar = document.querySelector("#profile img");
        setAvatar(avatar, "https://www.wanikani.com/users/"+userInfo["username"], userInfo["avatar"], result["userInfo"]);

        const level = document.querySelector("#profile p");
        if (level && userInfo["level"])
            level.appendChild(document.createTextNode(userInfo["level"]));
    }
});

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

window.addEventListener("click", e => {
    const target = e.target;

    if (target.id === "exit")
        chrome.storage.local.remove("apiKey", () => window.location.href = "auth.html");

    if (target.id === "side-panel-logo")
        expandSideBar(document.querySelector(".side-panel"));
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