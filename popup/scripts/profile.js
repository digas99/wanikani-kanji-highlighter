let settings, menuSettings, levelsStats;

let popupLoading;
if (!messagePopup) {
	popupLoading = new MessagePopup(document.body);
	popupLoading.create("Loading data...");
    popupLoading.setLoading();
}

chrome.storage.local.get(["apiKey", "userInfo", "settings", LEVELS_STATS.storage.id], async result => {
    const apiKey = result["apiKey"];
    settings = result["settings"];
    menuSettings = settings && settings["profile_menus"] ? settings["profile_menus"] : defaultSettings["profile_menus"];

    levelsStats = result[LEVELS_STATS.storage.id];

    const db = new Database("wanikani");
    const opened = await db.open("subjects");
    if (opened) {
        if (popupLoading) popupLoading.remove();

        const url = new URL(window.location.href);

        const userInfo = result["userInfo"]?.data;
        
        // if user info has been updated in wanikani, then update cache
        if (!userInfo)
            fetchUserInfo(apiKey);
    
        if (userInfo) {
            let level = userInfo["level"];
            const link = "https://www.wanikani.com/users/"+userInfo["username"];

            const avatar = document.querySelector("#profile-pic img");
            setAvatar(avatar, link, userInfo["avatar_data"] || userInfo["avatar"], result["userInfo"]);

            avatar.parentElement.href = link;
            avatar.parentElement.title = link;

            // username
            const username = document.querySelector("#username");
            username.appendChild(document.createTextNode(userInfo["username"]));

            // started at
            const startedAt = document.querySelector("#started");
            startedAt.appendChild(document.createTextNode("Started at " + new Date(userInfo["started_at"]).toISOString().split("T")[0]));

            // scroll down arrow
            const goDownArrowWrapper = document.querySelector(".scroll-down");
            if (goDownArrowWrapper)
                goDownArrowWrapper.addEventListener("click", () => window.scroll(0, 364));

            const topLevel = document.querySelector(".top-level-list");
            topLevel.children[level-1].classList.add("current-level");
            for (let i = 1; i < level; i++)
                topLevel.children[i-1].classList.add("passed-level");

            level = Number(url.searchParams.get("level") || userInfo["level"]);
            
            topLevel.addEventListener("click", async e => {
                if (e.target.classList.contains("clickable")) {
                    const level = Number(e.target.innerText);
                    const levelChooser = document.querySelector(".levels-chooser");
                    levelChooser.innerHTML = "";
                    levelsChooser(level, levelChooser);
                    levelsChooserAction(levelChooser, db);
                    updateLevelData(level, db, true);
                    updateTopLevelList(level);
                    applyChanges();

                    // update url params
                    const url = new URL(window.location.href);
                    url.searchParams.set("level", level);
                    window.history.replaceState({}, "", url);
                }
            });
            
            updateTopLevelList(level);

            await updateLevelData(level, db);
        }
    } 
});

const updateTopLevelList = level => {
    const topLevel = document.querySelector(".top-level-list");
    // clear selected level
    document.querySelector(".selected-level")?.classList.remove("selected-level");
    topLevel.children[level-1].classList.add("selected-level");
    // scroll top level list until current level stays in the middle
    topLevel.scrollTo(topLevel.children[level-1].offsetLeft - topLevel.children[6].offsetLeft, 0);
}

const updateLevelData = async (level, db, clear) => {
    const data = await db.getAll("subjects", "level", level);

    if (clear) clearData();
    
    if (!clear) levelsChooser(level, document.querySelector(".levels-chooser"));

    const allSubjects = data.filter(subject => subject["level"] === level);
    const allPassedSubjects = allSubjects.filter(subject => subject.passed_at != null);
    const allAvailableSubjects = allSubjects.filter(subject => subject.hidden_at == null);

    // add clicking events and animation to levels
    if (!clear)
        levelsChooserAction(document.querySelector(".levels-chooser"), db);

    // all subjects progress
    const allTab = document.querySelector(".subject-tab");
    allTab.querySelector("span").appendChild(document.createTextNode(`${allPassedSubjects.length} / ${allAvailableSubjects.length}`));
    const allTabProgress = allTab.querySelector(".progress");
    allTabProgress.style.width = (allPassedSubjects.length / allAvailableSubjects.length * 100)+"%";
    
    // subject types containers
    ["radical", "kanji", "vocabulary"].forEach(type => {
        const subjects = allSubjects.filter(subject => subject["subject_type"].includes(type));
        const passedSubjects = subjects.filter(subject => subject.passed_at != null);

        // level progress bar
        if (type == "kanji")
            updateLevelProgressBar(document.querySelector(".level-progress-bar"), passedSubjects.length, subjects.length);

        // subject tiles lists
        updateTypeContainer(type, document.querySelector(`#${type}-container`), subjects);
    });

    applyChanges();

    // update url params
    const url = new URL(window.location.href);
    url.searchParams.set("level", level);
    window.history.replaceState({}, "", url);

    // update level stats
    const timeLabel = document.querySelector("#level-progress .time-in-level > .label");
    const pastTimesN = document.querySelector("#level-progress .past-times-n");
    const stats = levelsStats && levelsStats[level] ? levelsStats[level] : [];
    if (stats.length > 0) {
        const lastStat = stats[stats.length-1];
        const startedAt = new Date(lastStat["started_at"]);
        const passedAt = lastStat["passed_at"] ? new Date(lastStat["passed_at"]) : new Date();
        const timeInLevel = passedAt - startedAt;
        const readable = msToTime(timeInLevel);
        timeLabel.style.removeProperty("pointer-events");
        timeLabel.innerHTML = `<b>${readable}</b> on this level`;
        timeLabel.title = `Started at: ${startedAt.toISOString().split(".")[0]}\x0DPassed at:  ${passedAt.toISOString().split(".")[0]}`;
        pastTimesN.innerText = stats.length-1;
    }
    else {
        timeLabel.innerText = "Not yet passed";
        timeLabel.title = "";
        timeLabel.style.pointerEvents = "none";
        pastTimesN.innerText = "0";
    }
}

const updateLevelProgressBar = (progressBarWrapper, passedSubjects, allSubjects) => {
    const progressBar = progressBarWrapper.querySelector("div");
    const percentage = passedSubjects / allSubjects * 100;
    progressBar.style.width = (percentage >= 1 ? percentage : 100)+"%";
    if (percentage > 8.1 || percentage < 1) {
        const barLabel = progressBarWrapper.querySelector("div > p");
        barLabel.appendChild(document.createTextNode(percentage.toFixed(percentage > 12 ? 1 : 0)+"%"));
        if (percentage < 1) {
            progressBar.style.backgroundColor = "#c7c7c7";
            barLabel.style.color = "black";
        }
        else {
            progressBar.style.removeProperty("background-color");
            barLabel.style.removeProperty("color");
        }
    }

    const progressValues = progressBarWrapper.querySelector("span");
    if (percentage < 81 && percentage >= 1) {
        progressValues.classList.remove("hidden");
        progressValues.appendChild(document.createTextNode(passedSubjects + " / " + allSubjects.filter));
    }
    else
        progressValues.classList.add("hidden");

    progressBar.title = "Passed Kanji: "+passedSubjects+" / "+percentage.toFixed(1)+"%";
}

const updateTypeContainer = (type, container, subjects) => {
    const passedSubjects = subjects.filter(subject => subject.passed_at != null);
    const availableSubjects = subjects.filter(subject => subject.hidden_at == null);
    const tab = container.querySelector(".subject-tab");
    
    // progress
    tab.querySelector("span").appendChild(document.createTextNode(`${passedSubjects.length} / ${availableSubjects.length}`));
    const progress = tab.querySelector(".progress");
    progress.style.width = (passedSubjects.length / availableSubjects.length * 100)+"%";

    // subject tiles
    const subjectsList = container.querySelector(".subject-container > ul");
    subjects.forEach(subject => subjectsList.appendChild(subjectTile(type, subject)));

    if (type == "vocabulary")
        unjustifyLastRow(subjectsList);
}

const subjectTile = (type, subject) => {
    const subjectWrapper = document.createElement("li");
    const imageUrl = subject["character_images"]?.find(image => image["content_type"] == "image/svg+xml")["url"];
    const characters = subject["characters"] ?
        subject["characters"] :
        `<svg style="width: 25px; height: 25px; margin-top: 5px;">       
            <image xlink:href="${imageUrl}" src="${imageUrl}" width="25" height="25"></image>    
        </svg>`;
    subjectWrapper.classList.add(type+"_back");
    subjectWrapper.title = subject["meanings"][0];
    subjectWrapper.style.position = "relative";
    if (type !== "radical") {
        subjectWrapper.classList.add("clickable", "kanjiDetails");
        subjectWrapper.setAttribute("data-item-id", subject["id"]);
        if (subject["readings"]) {
            if (subject["readings"][0]["reading"])
                subjectWrapper.title += " | "+subject["readings"].filter(reading => reading["primary"])[0]["reading"];
            else
                subjectWrapper.title += " | "+subject["readings"][0];
        }
    }
    let backColor = hexToRGB(getComputedStyle(document.body).getPropertyValue(`--${type}-tag-color`));
    subjectWrapper.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);
    if (characters !== "L")
        subjectWrapper.innerHTML = characters;
    else {
        const wrapperForLi = document.createElement("div");
        subjectWrapper.appendChild(wrapperForLi);
        wrapperForLi.style.marginTop = "5px";
        wrapperForLi.appendChild(document.createTextNode(characters));
    }
    if (characters !== "L" && subjectWrapper.children.length > 0 && subjectWrapper.style.color == "rgb(255, 255, 255)")
        subjectWrapper.children[0].style.filter = "invert(1) drop-shadow(-1px 1px 0px gray)";


    const reviewsInfoWrapper = document.createElement("div");
    subjectWrapper.appendChild(reviewsInfoWrapper);
    reviewsInfoWrapper.classList.add("reviews-info");
        
    if (subject["passed_at"]) {
        const check = document.createElement("img");
        reviewsInfoWrapper.appendChild(check);
        check.src = "../images/check.png";
        check.classList.add("passed-subject-check");
    }
    else if(subject["available_at"]) {
        if (new Date(subject["available_at"]) - new Date() < 0) {
            const time = document.createElement("div");
            reviewsInfoWrapper.appendChild(time);
            time.appendChild(document.createTextNode("now"));
            time.classList.add("time-next-review-subject");
        }
    }

    // subject passed progress bar
    const progressBar = document.createElement("div");
    reviewsInfoWrapper.appendChild(progressBar);
    progressBar.classList.add("subject-passed-progress");
    for (let i = 0; i < 5; i++) {
        const progress = document.createElement("div");
        progressBar.appendChild(progress);
        if (subject["srs_stage"] !== null) {
            if (subject["srs_stage"] > i || subject["passed_at"]) {
                progress.style.backgroundColor = "#42f541";
            }
        }
    }
    if (subject["srs_stage"] >= 5 || subject["passed_at"])
        progressBar.style.columnGap = "0px";

    if (subject["available_at"])
        subjectWrapper.setAttribute("data-available_at", subject["available_at"]);
    
    if (subject["passed_at"])
        subjectWrapper.setAttribute("data-passed_at", subject["passed_at"]);

    if (subject["hidden_at"]) {
        subjectWrapper.setAttribute("data-hidden_at", subject["hidden_at"]);
        subjectWrapper.style.setProperty("opacity", "0.3", "important");
        subjectWrapper.title += " \x0D"+"Unavailable";
    }
    else {
        if (subject["srs_stage"] !== null && subject["srs_stage"] >= 0) {
            subjectWrapper.title += " \x0D"+srsStages[subject["srs_stage"]]["name"];
            subjectWrapper.setAttribute("data-srs", subject["srs_stage"]);
        }
        else {
            subjectWrapper.title += " \x0D"+"Locked";
            subjectWrapper.setAttribute("data-srs", -1);
        }
    }

    return subjectWrapper;
}

const levelsChooser = (levelValue, wrapper) => {
    [
        levelValue > 1 ? levelValue-1 : " ",
        levelValue,
        levelValue < 60 ? levelValue+1 : " "
    ].forEach((level, i) => {
        const levelWrapper = document.createElement("li");
        wrapper.appendChild(levelWrapper);
        const levelContent = document.createElement("div");
        levelWrapper.appendChild(levelContent);
        levelContent.appendChild(document.createTextNode(level));
        levelContent.style.width = "100%";
        levelWrapper.title = i == 0 ? "Previous" : i == 2 ? "Next" : "";
    });	
}

const levelsChooserAction = (levelsList, db) => {
    Array.from(levelsList.querySelectorAll("li")).forEach((levelWrapper, i) => {
        const level = Number(levelWrapper.innerText);
        if (!isNaN(level) && i !== 1) {
            levelWrapper.addEventListener("click", () => {                                
                const newLevelsChooser = document.createElement("ul");
                newLevelsChooser.classList.add("levels-chooser");
                levelsChooser(level, newLevelsChooser);
                document.querySelector(".levels-chooser-wrapper").replaceChild(newLevelsChooser, levelsList);
                newLevelsChooser.style.paddingTop = "175px";

                levelsChooserAction(newLevelsChooser, db);

                updateLevelData(level, db, true);
                updateTopLevelList(level);
                applyChanges();
            });

            let smallLevel;
            const margin = 50;
            levelWrapper.addEventListener("mouseover", () => {
                smallLevel = document.createElement("div");
                smallLevel.classList.add("levels-chooser-small-level");
                if (i == 0) {
                    levelsList.style.marginLeft = margin+"px";
                    levelWrapper.style.paddingLeft = margin+"px";
                    levelWrapper.style.marginLeft = (-1*margin)+"px";
                    if (level !== 1) {
                        levelsList.insertBefore(smallLevel, levelsList.firstChild);
                        smallLevel.appendChild(document.createTextNode(level-1));
                        smallLevel.style.left = (-1*margin/2)+"px";
                    }
                }
                else {
                    levelsList.style.marginRight = margin+"px";
                    levelWrapper.style.paddingRight = margin+"px";
                    levelWrapper.style.marginRight = (-1*margin)+"px";
                    if (level !== 60) {
                        levelsList.appendChild(smallLevel);
                        smallLevel.appendChild(document.createTextNode(level+1));
                        smallLevel.style.right = (-1*margin/2)+"px";
                    }
                }
            });

            levelWrapper.addEventListener("mouseout", () => {
                if (smallLevel) smallLevel.remove();
                if (i == 0) {
                    levelsList.style.removeProperty("margin-left");
                }
                else {
                    levelsList.style.removeProperty("margin-right");
                }
            });
        }
        
        if (i == 1) middleLevel = levelWrapper;
    });
}

const clearData = () => {
    // level progress bar
    const levelProgressBar = document.querySelector(".level-progress-bar");
    levelProgressBar.querySelector("div > p").innerText = "";
    levelProgressBar.querySelector("span").innerText = "";

    // subjects progress from "All"
    document.querySelector(".subject-tab > span").innerText = "";
    // close arrow from "All"
    let closeArrow = document.querySelector(".subject-tab > .menu-icons > div[title='Close']");
    if (closeArrow.querySelector("i").classList.contains("down"))
        closeArrowAction(closeArrow, document.querySelector(".subject-types"));

    // subjects
    Array.from(document.querySelectorAll(".subject-types > div")).forEach(container => {
        // subjects progress
        container.querySelector(".subject-tab > span").innerText = "";
        // subjects tiles
        container.querySelector(".subject-container > ul").innerHTML = "";
        // subjects close arrow
        closeArrow = container.querySelector(".menu-icons > div[title='Close']");
        if (closeArrow.querySelector("i").classList.contains("down"))
            closeArrowAction(closeArrow, container.querySelector(".subject-container"));
        
    });
}

document.addEventListener("click", e => {
    const target = e.target;

    // open/close subjects container
    if (target.closest("div[title='Close']")) {
        const arrow = target.closest("div[title='Close']").querySelector("i");
        const tab = arrow.closest(".subject-tab");
        const title = tab.firstElementChild.innerText;
        let key = Object.keys(menuSettings).filter(k => title.toLowerCase().includes(k))[0];

        closeArrowAction(arrow, tab.nextElementSibling, key);

        // save changes
        chrome.storage.local.set({"settings": settings});
    }

    // checkbox action
    if (target.closest(".checkbox_wrapper")) {
        const checkbox = target.closest(".checkbox_wrapper"); 
        const input = checkbox.querySelector("input[type='checkbox']");
        
        if (!input.checked)
            checkbox.classList.remove("checkbox-enabled");
        else
            checkbox.classList.add("checkbox-enabled");
        
        input.click();
    }

    // open/close menus
    if(target.closest(".menu-icons img")) {
        const tab = target.closest(".subject-tab");
        const menu =  tab.querySelector(".menu-popup");
        if (menu) {
            // hide all other menus
            Array.from(document.querySelectorAll(".menu-popup")).forEach(otherMenu => {
                if (!otherMenu.isEqualNode(menu)) {
                    otherMenu.classList.add("hidden");
                    clearMenu(otherMenu);
                }
            });

            if (menu.classList.contains("hidden"))
                menu.classList.remove("hidden");

            const title = target.closest(".menu-icons img").title;
            if (menu.querySelector("p").innerText === title) {
                menu.classList.add("hidden");
                clearMenu(menu);
            }
            else {
                const key = Object.keys(menuSettings).filter(k => tab.firstElementChild.innerText.toLowerCase().includes(k))[0];
                const sectionWrapper = clearMenu(menu);
                menu.querySelector("p").innerText = title;
                switch(title) {
                    case "Sort":
                        sortMenu(sectionWrapper, menuSettings[key]["sort"]);
                        break;
                    case "Filter":
                        filterMenu(sectionWrapper, menuSettings[key]["filter"]);
                        break;
                    case "Menu":
                        menuMenu(sectionWrapper, menuSettings[key]["menu"]);
                        break;
                }
            }
        }
    }
});

const closeArrowAction = (arrow, subjectsContainer, key) => {
    const opened = !subjectsContainer.classList.contains("hidden");
    if (subjectsContainer) {
        if (opened) {
            arrow.classList.replace("up", "down");
            subjectsContainer.classList.add("hidden");
        }
        else {
            arrow.classList.replace("down", "up");
            subjectsContainer.classList.remove("hidden");
        }

        if (key)
            menuSettings[key]["opened"] = !opened;
    } 
}

document.addEventListener("input", e => {
    const target = e.target;

    // menu actions
    if (target.closest(".menu-popup")) {
        const menu = target.closest(".menu-popup");
        const tab = menu.closest(".subject-tab");
        const title = tab.firstElementChild.innerText;
        const menuTitle = target.closest(".menu-popup").querySelector("p").innerText;

        let keys = [Object.keys(menuSettings).filter(k => title.toLowerCase().includes(k))[0]];
        if (title === "All")
            keys = Object.keys(menuSettings);

        const property = (target.previousElementSibling || target.parentElement.previousElementSibling).innerText;
        const value = target.checked == undefined ? target.value : target.checked;

        menuActions(tab, title, menuTitle, property, keys, value);

        // save changes to menu settings
        chrome.storage.local.set({"settings": settings});
    }
});

// apply changes to those settings that are different from default
const applyChanges = () => {
    Object.keys(menuSettings).forEach(type => {
        const tab = Array.from(document.querySelectorAll(".subject-tab")).filter(tab => tab.firstElementChild.innerText.toLowerCase().includes(type))[0];
        if (tab) {
            Object.keys(menuSettings[type]).forEach(key => {
                if (key === "opened") {
                    if (menuSettings[type][key] == false) {
                        const closeArrow = tab.querySelector("div[title='Close']");
                        closeArrow.click();
                    }
                }
                else {
                    Object.keys(menuSettings[type][key]).forEach(property => {
                        if (menuSettings[type][key][property] !== defaultSettings["profile_menus"][type][key][property]) {                                                
                            const title = type.charAt(0).toUpperCase()+type.slice(1);
                            let keys = [Object.keys(menuSettings).filter(k => title.toLowerCase().includes(k))[0]];
                            if (title === "All")
                                keys = Object.keys(menuSettings);
                    
                            menuActions(tab, title, key.charAt(0).toUpperCase()+key.slice(1), property, keys, menuSettings[type][key][property]);
                        }
                    });
                }
            });
        }
    });
}

const menuActions = (tab, subjectsType, menuTitle, property, keys, value) => {
    property = property.toLowerCase().replaceAll(" ", "_");

    let containers, subjects;
    switch(menuTitle) {
        case "Sort":
            containers = [tab.nextElementSibling.querySelector("ul")];
            if (subjectsType === "All")
                containers = document.querySelectorAll(".subject-container > ul");  

            switch(property) {
                case "type":
                    sortings(containers, value, menuSettings[keys[0]]["sort"]["direction"]);
                    keys.forEach(key => menuSettings[key]["sort"]["type"] = value);
                    break;
                case "direction":
                    sortings(containers, menuSettings[keys[0]]["sort"]["type"], value);
                    keys.forEach(key => menuSettings[key]["sort"]["direction"] = value);
                    break;
            }
            break;
        case "Filter":
            subjects = tab.nextElementSibling.querySelectorAll("li");
            if (subjectsType === "All")
                subjects = document.querySelectorAll(".subject-container > ul > li");

            switch(property) {    
                case "srs_stage":
                    filters(subjects, value, menuSettings[keys[0]]["filter"]["state"]);
                    keys.forEach(key => menuSettings[key]["filter"]["srs_stage"] = value);
                    break;
                case "state":
                    filters(subjects, menuSettings[keys[0]]["filter"]["srs_stage"], value);
                    keys.forEach(key => menuSettings[key]["filter"]["state"] = value);
                    break;
            }
            break;
        case "Menu":
            subjects = tab.nextElementSibling.querySelectorAll("li");
            if (subjectsType === "All")
                subjects = document.querySelectorAll(".subject-container > ul li");

            switch(property) {    
                case "color_by":
                    colorings(subjects, value);
                    keys.forEach(key => menuSettings[key]["menu"]["color_by"] = value);
                    break;
                case "reviews_info":
                    reviewsInfo(subjects, value);
                    keys.forEach(key => menuSettings[key]["menu"]["reviews_info"] = value);
                    break;
            }
            break;
    }
}

const clearMenu = menu => {
    menu.querySelector("p").innerText = "";
    menu.querySelector("ul").remove();
    const ul = document.createElement("ul");
    menu.appendChild(ul);
    return ul;
}

const selector = (title, options, defaultValue) => {
    const wrapper = document.createElement("li");
    const label = document.createElement("label");
    wrapper.appendChild(label);
    label.appendChild(document.createTextNode(title));
    const select = document.createElement("select");
    wrapper.appendChild(select);
    select.classList.add("select");
    select.style.width = "auto";
    options.forEach(option => {
        const optionElem = document.createElement("option");
        select.appendChild(optionElem);
        optionElem.appendChild(document.createTextNode(option));
    });
    if (defaultValue)
        select.value = defaultValue;

    return wrapper;
}

const checkbox = (title, checked) => {
    const wrapper = document.createElement("li");
    const label = document.createElement("label");
    wrapper.appendChild(label);
    label.appendChild(document.createTextNode(title));
    const inputDiv = document.createElement("div");
    inputDiv.classList.add("checkbox_wrapper", "clickable");
    if (checked)
        inputDiv.classList.add("checkbox-enabled");
    wrapper.appendChild(inputDiv);
    const checkbox = document.createElement("input");
    inputDiv.appendChild(checkbox);
    checkbox.type = "checkbox";
    checkbox.style.display = "none";
    checkbox.checked = checked;
    const customCheckboxBall = document.createElement("div");
    inputDiv.appendChild(customCheckboxBall);
    customCheckboxBall.classList.add("custom-checkbox-ball");
    const customCheckboxBack = document.createElement("div");
    inputDiv.appendChild(customCheckboxBack);
    customCheckboxBack.classList.add("custom-checkbox-back");
    
    return wrapper;
}

// MENU MENU

const menuMenu = (wrapper, defaults) => {
    // color by
    wrapper.appendChild(selector("Color by", ["Subject Type", "Subject Progress", "SRS Stage"], defaults ? defaults["color_by"] : null));

    // show reviews info
    wrapper.appendChild(checkbox("Reviews info", defaults["reviews_info"]));	
}

const colorings = (subjects, type) => {
    subjects.forEach(subject => subject.style.removeProperty("color"));

    switch(type) {
        case "Subject Type":
            subjects.forEach(elem => {
                elem.style.removeProperty("background-color");
                elem.style.removeProperty("background");
                if (elem.querySelector("image"))
                    elem.querySelector("image").style.removeProperty("filter");
            });
            break;
        case "Subject Progress":
            subjects.forEach(elem => {
                if (elem.getAttribute("data-passed_at")) {
                    elem.style.removeProperty("background-color");
                    elem.style.setProperty("background", "linear-gradient(to bottom, #ffd700, #daa520)", "important");
                    elem.style.color = "white";
                }
                else if (elem.getAttribute("data-hidden_at")) {
                    elem.style.setProperty("background-color", "#000000", "important");
                    elem.style.color = "white";
                }
                else {
                    elem.style.setProperty("background-color", "#ffffff", "important");
                    elem.style.color = "black";
                    if (elem.querySelector("image"))
                        elem.querySelector("image").style.filter = "invert(1)";
                }
            });
        break;
        case "SRS Stage":
            subjects.forEach(elem => {
                if (elem.getAttribute("data-srs")) {
                    elem.style.removeProperty("background");
                    if (elem.querySelector("image"))
                        elem.querySelector("image").style.removeProperty("filter");

                    let backColor;
                    if (elem.getAttribute("data-srs") == "-1") {
                        backColor = "#ffffff";
                        elem.style.setProperty("background-color", backColor, "important");
                    }
                    else {
                        backColor = settings && settings["appearance"] ? settings["appearance"][srsStages[elem.getAttribute("data-srs")]["short"].toLowerCase()+"_color"] : srsStages[elem.getAttribute("data-srs")]["color"];
                        elem.style.setProperty("background-color", backColor, "important");
                    }
                    backColor = hexToRGB(backColor);
                    elem.style.color = fontColorFromBackground(backColor.r, backColor.g, backColor.b);
                }
            });
            break;
    }
}

const reviewsInfo = (subjects, checked) => {
    if (!checked) {
        subjects.forEach(elem => {
            if (elem.getElementsByClassName("reviews-info")[0])
                elem.getElementsByClassName("reviews-info")[0].style.display = "none"; 
        });
    }
    else {
        subjects.forEach(elem => {
            if (elem.getElementsByClassName("reviews-info")[0])
                elem.getElementsByClassName("reviews-info")[0].style.removeProperty("display"); 
        });
    }
}

// FILTERS MENU

const filterMenu = (wrapper, defaults) => {
    // srs stage
    wrapper.appendChild(selector("SRS Stage", [...["None", "Locked"], ...Object.values(srsStages).map(value => value.name)], defaults ? defaults["srs_stage"] : null));

    // state
    wrapper.appendChild(selector("State", ["None", "Passed", "Not Passed"], defaults ? defaults["state"] : null));
}

const filters = (subjects, srs, state) => {
    // reset tiles
    Array.from(subjects).forEach(elem => elem.classList.remove("hidden"));
    
    if (srs !== "None") {
        Array.from(subjects).forEach(elem => {
            const srsChecker = srs !== "None" && (elem.getAttribute("data-srs") == "-1" && srs !== "Locked" || elem.getAttribute("data-srs") !== "-1" && srs !== srsStages[elem.getAttribute("data-srs")]["name"]);
            if (srsChecker)
                elem.classList.add("hidden");
        });
    }

    if (state !== "None") {
        Array.from(subjects).forEach(elem => {
            const stateChecker = state !== "None" && (state !== (elem.getElementsByClassName("passed-subject-check").length > 0 ? "Passed" : "Not Passed"));
            if (stateChecker)
                elem.classList.add("hidden");
        });
    }
}

// SORTS MENU

const sortMenu = (wrapper, defaults) => {
    // types
    wrapper.appendChild(selector("Type", ["None", "SRS Stage", "Next Review"], defaults ? defaults["type"] : null));

    // direction
    wrapper.appendChild(selector("Direction", ["Ascending", "Descending"], defaults ? defaults["direction"] : null));
}

const sortings = (containers, value, direction) => {
    switch(value) {
        case "SRS Stage":
            containers.forEach(wrapper => {
                Array.from(wrapper.getElementsByTagName("LI")).sort((a, b) => Number((direction == "Descending" ? b : a).getAttribute("data-srs")) - Number((direction == "Descending" ? a : b).getAttribute("data-srs")))
                    .forEach(elem => wrapper.appendChild(elem));
            });
            break;
        case "Next Review":
            containers.forEach(wrapper => {
                Array.from(wrapper.getElementsByTagName("LI"))
                    .filter(elem => elem.getAttribute("data-available_at"))
                    .sort((a, b) => new Date((direction == "Descending" ? b : a).getAttribute("data-available_at")) - new Date((direction == "Descending" ? a : b).getAttribute("data-available_at")))
                    .forEach(elem => wrapper.appendChild(elem));
                
                Array.from(wrapper.getElementsByTagName("LI"))
                    .filter(elem => !elem.getAttribute("data-available_at"))
                    .forEach(elem => wrapper.appendChild(elem));
            });
            break;
    }
}

window.addEventListener("scroll", () => {
    if (window.scrollY > 225)
        document.querySelector(".top-level-list").classList.remove("top-level-list-hidden");
    else
        document.querySelector(".top-level-list").classList.add("top-level-list-hidden");
});