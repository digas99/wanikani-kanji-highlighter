let sidePanelTimeout;
let mouseOut = false;

// VERSION
const sideBarVersion = document.querySelector(".side-panel-version");
if (sideBarVersion) {
    fetch("../manifest.json")
        .then(response => response.json())
        .then(manifest => {
            const version = manifest["version"];
            sideBarVersion.innerText = `v${version}`;
            localStorage.setItem("version", version);
        });
}

chrome.storage.local.get(["apiKey", "settings", "lessons", "reviews", "userInfo"], result => {
    const apiKey = result["apiKey"];
    const settings = result["settings"];

    const avatar = document.querySelector("#profile img");
    let userInfo = result["userInfo"];
    if (userInfo) {
        userInfo = userInfo["data"];
        // fill avatar
        if (userInfo["avatar_data"])
            avatar.src = userInfo["avatar_data"];

        // fill level
        const level = document.querySelector("#profile p");
        if (level && userInfo["level"]) {
            level.innerText = userInfo["level"];
            localStorage.setItem("level", userInfo["level"]);
        }
        
    }

    fetchUserInfo(apiKey, info => {
        userInfo = info["data"] || info;
        setAvatar(avatar, "https://www.wanikani.com/users/"+userInfo["username"], userInfo["avatar_data"] || userInfo["avatar"], info);

        const level = document.querySelector("#profile p");
        if (level && userInfo["level"])
            level.innerText = userInfo["level"];
    });

    // top navbar lessons and reviews
    const nLesson = result["lessons"]?.count;
    const nReview = result["reviews"]?.count;
    const topNavbar = document.querySelector(".topNav");
    if (topNavbar) {
        document.querySelector(".lessons-icon").nextElementSibling.innerText = nLesson;
        document.querySelector(".reviews-icon").nextElementSibling.innerText = nReview;
    }

    const theme = localStorage.getItem("theme") || "light";
    if (theme == "dark")
        setTheme("dark");

    if (settings) {
        // random subject type
        setRandomSubjectType(settings["kanji_details_popup"]["random_subject"]);

        if (settings["miscellaneous"]["sidebar_animation"]) {
            window.addEventListener("mouseover", sidebarAnimation);
        }
    }
});

const sidebarAnimation = e => {
    const sidebar = e.target.closest(".side-panel");
    if (sidebar) {
        if (!sidebar.classList.contains("side-panel-focus") && mouseOut)
            sidePanelTimeout = setTimeout(() => expandSideBar(sidebar, true), 300);
    }
    else {
        mouseOut = true;
        clearTimeout(sidePanelTimeout);
        if (document.querySelector(".side-panel").classList.contains("side-panel-focus"))
            expandSideBar(document.querySelector(".side-panel"), false);
    }
}

// when scripts.js has loaded
document.addEventListener("scriptsLoaded", () => {
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
            wrapper.style.paddingLeft = "4px";         
        }
    }

    // if site is wanikani
    if (atWanikani) {
        // remove some buttons
        const buttons = document.querySelectorAll("#search, #blacklist, #run, #random");
        buttons.forEach(button => button?.parentElement.parentElement.remove());

        // remove search area
        const searchArea = document.querySelector(".searchArea");
        if (searchArea)
            searchArea.remove();
    }

    // if not valid site
    if (!validSite) {
        // remove some buttons
        const buttons = document.querySelectorAll("#blacklist, #run, #random");
        buttons.forEach(button => button?.parentElement.parentElement.remove());
    }
    
    if (!blacklistedSite && !atWanikani) {
        chrome.storage.local.get(["blacklist"], result => {
            const blacklist_data = result["blacklist"];
    
            // blacklist button
            if (blacklist_data) {
                const blacklistNumber = document.querySelector("#blacklist")?.parentElement.querySelector(".side-panel-info-alert");
                if (blacklistNumber) {
                    blacklistNumber.innerText = blacklist_data.length;
                    localStorage.setItem("blacklist", blacklist_data.length);
                }
            }
        });
    }
});

const setRandomSubjectType = (value) => {
    const randomSubjectType = document.querySelector("#random-subject-type");
    if (randomSubjectType) {
        randomSubjectType.innerText = value.charAt(0);

        const img = randomSubjectType.parentElement.getElementsByTagName("img")[0];
        let color;
        if (value === "Any") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand");
            randomSubjectType.style.removeProperty("background-color");
            color = getComputedStyle(randomSubjectType).backgroundColor.match(/\d+/g).map(Number);
            randomSubjectType.style.color = fontColorFromBackground(color[0], color[1], color[2]);
        }
        else if (value === "Kanji") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-kanji");
            randomSubjectType.style.backgroundColor = "var(--kanji-tag-color)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--kanji-tag-color"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
        else if (value === "Vocabulary") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-vocabulary");
            randomSubjectType.style.backgroundColor = "var(--vocabulary-tag-color)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--vocabulary-tag-color"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
    }
}

const setAvatar = (elem, url, avatar, userInfo) => {
    if (avatar)
        elem.src = avatar;

    fetch(url)
        .then(result => result.text())
        .then(async content => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            const avatarElem = doc.getElementsByClassName("avatar user-avatar-default")[0];
            const avatarSrc = "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0];
            userInfo["data"]["avatar"] = avatarSrc;
            elem.src = avatarSrc;

            if (userInfo)
                chrome.storage.local.set({"userInfo": userInfo});

            const imageData = await fetchImageData(avatarSrc);
            userInfo["data"]["avatar_data"] = imageData;
            if (imageData)
                elem.src = imageData;
            chrome.storage.local.set({"userInfo": userInfo});
        });
}

const fetchImageData = async url => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
          const imageData = event.target.result; // Base64-encoded image data
          resolve(imageData);
        };
        reader.onerror = function(error) {
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw error;
    }
}

window.addEventListener("click", async e => {
    const target = e.target;

    const clickable = target.closest(".side-panel-tab");
    if (clickable) {
        if (clickable.querySelector("#exit")) {
            const loading = new MessagePopup(document.body);
            loading.create("Logging out...");
            loading.setLoading();
    
            await clearSubjects();
            chrome.storage.local.remove(["apiKey", "userInfo", "userInfo_updated"], () => window.location.href = "auth.html");
        }

        if (clickable.querySelector("#side-panel-logo")) {
            const sidebar = document.querySelector(".side-panel");
            if (sidebar)
                expandSideBar(sidebar, !sidebar.classList.contains("side-panel-focus"));
        }

        if (clickable.querySelector("#dark"))
            setTheme("dark");
        else if (clickable.querySelector("#light"))
            setTheme("light");

        if (clickable.querySelector("#blacklist")) {
            await blacklist();
            
            const tab = await getTab();
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {reloadPage: true});
                setTimeout(() => window.location.reload(), 500);
            }
        }

        if (clickable.querySelector("#run")) {
            const tab = await getTab();
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {windowLocation: "host"}, async url => {
                    if (url) {
                        await blacklistRemove(url["windowLocation"]);
    
                        chrome.tabs.sendMessage(tab.id, {reloadPage: true});
                        setTimeout(() => window.location.reload(), 500);
                    }
                }); 
            }
        }
    }

    if (target.id == "random-subject-type")
        target.previousElementSibling.click();
});

const expandSideBar = (sidebar, open=true) => {
    if (sidebar) {
        if (open) {
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
                    .forEach(div => div.style.left = "27px");
            }
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