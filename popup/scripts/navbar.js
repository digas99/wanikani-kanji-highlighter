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
            window.addEventListener("mouseover", e => {
                if (window.innerWidth < 540)
                    sidebarAnimation(e);
            });
        }
    }

    // set level progress percentage
    const db = new Database("wanikani");
    db.open("subjects")
        .then(async opened => {
            if (opened) {
                const level = userInfo?.level || localStorage.getItem("level");
                if (level) {
                    const data = await db.getAll("subjects", "level", Number(level));
                    if (data) {
                        const subjects = data.filter(subject => subject.subject_type === "kanji" && !subject.hidden);
                        
                        const info = levelUpInfo(subjects);
                        const percentage = info.progress.percentage;
                        document.documentElement.style.setProperty("--level-progress", `${percentage}%`);
                        localStorage.setItem("level-progress", percentage);

                        // update on profile picture
                        const picture = document.querySelector("#profile .progress-container");
                        if (picture) {
                            picture.title = `${userInfo?.username ? userInfo.username+" \x0D" : ""}${percentage.toFixed(2)}% \x0DLevel up on 90%`;
                            picture.style.setProperty("--level-progress", `${percentage}%`);
                        }
                    }
                }
            }
        });
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

    // remove popout option
    if (chrome.extension.getViews().length > 1) {
        const button = document.querySelector("#popout");
        if (button)
            button.parentElement.parentElement.remove();
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
        const buttons = document.querySelectorAll("#blacklist, #run");
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
        else if (value === "Radicals") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-radical");
            randomSubjectType.style.backgroundColor = "var(--radical-tag-color)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--radical-tag-color"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
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
        else if (value === "Learned") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-learned");
            randomSubjectType.style.backgroundColor = "var(--highlight-default-color)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--highlight-default-color"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
        else if (value === "Not Learned") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-not-learned");
            randomSubjectType.style.backgroundColor = "var(--notLearned-color)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--notLearned-color"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
        else if (value === "Lessons") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-lessons");
            randomSubjectType.style.backgroundColor = "var(--wanikani)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--wanikani"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
        else if (value === "Reviews") {
            img.parentElement.parentElement.setAttribute("data-item-id", "rand-reviews");
            randomSubjectType.style.backgroundColor = "var(--wanikani-sec)";
            color = hexToRGB(getComputedStyle(document.documentElement).getPropertyValue("--wanikani-sec"));
            randomSubjectType.style.color = fontColorFromBackground(color.r, color.g, color.b);
        }
    }
}

const setAvatar = async (elem, url, avatar, userInfo) => {
    if (avatar) {
        elem.src = avatar;
    }

    try {
        const result = await fetch(url);
        const content = await result.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const avatarElem = doc.querySelector(".user-avatar");
        const avatarSrc = avatarElem.getAttribute("data-load-gravatar-url-value") || avatarElem.src;
        
        if (avatarElem && avatarSrc) {
            userInfo["data"]["avatar"] = avatarSrc;
            elem.src = avatarSrc;

            if (userInfo) {
                chrome.storage.local.set({"userInfo": userInfo});
            }

            const imageData = await fetchImageData(avatarSrc);
            userInfo["data"]["avatar_data"] = imageData;

            if (imageData) {
                elem.src = imageData;
            }

            chrome.storage.local.set({"userInfo": userInfo});
        } else {
            console.error('Avatar element not found');
        }
    } catch (error) {
        console.error('Failed to fetch avatar:', error);
    }
};

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

        if (clickable.querySelector("#popout")) {
            window.close();

            chrome.windows.create({
                url: `${window.location.pathname}?scroll=${window.scrollY}&${window.location.search.substring(1)}`,
                type: "panel",
                width: window.innerWidth,
                height: window.innerHeight
            });

            // remove popout option to avoid multiple popouts
            const button = document.querySelector("#popout");
            if (button)
                button.parentElement.parentElement.remove();
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
                    icon.getElementsByTagName("p")[0]?.remove();
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

// navbar size
if (window.innerWidth >= 540) {
    const sidebar = document.querySelector(".side-panel");
    if (sidebar) {
        const noTransitionStyle = `
            .side-panel, .side-panel * {
                transition: none !important;
            }
        `
        const style = document.createElement("style");
        style.appendChild(document.createTextNode(noTransitionStyle));
        document.head.appendChild(style);
        setTimeout(() => document.head.removeChild(style), 300);
        expandSideBar(sidebar, true);
    }
}

window.addEventListener("resize", () => {
    const sidebar = document.querySelector(".side-panel");
    if (sidebar) {
        expandSideBar(sidebar, window.innerWidth >= 540);
    }
});