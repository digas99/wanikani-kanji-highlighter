let subjectsData, settings, menuSettings;

chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_userInfo_updated", "wkhighlight_settings"], result => {
    const date = result["wkhighlight_userInfo_updated"] ? result["wkhighlight_userInfo_updated"] : formatDate(new Date());
    settings = result["wkhighlight_settings"];
    menuSettings = settings && settings["profile_menus"] ? settings["profile_menus"] : defaultSettings["profile_menus"];

    const db = new Database("wanikani");
    db.create("subjects").then(created => {
        if (created) {
            db.getAll("subjects").then(data => {
                subjectsData = data.filter(subject => !subject["hidden_at"]);

                modifiedSince(result["wkhighlight_apiKey"], date, "https://api.wanikani.com/v2/user")
                    .then(modified => {
                        const userInfo = result["wkhighlight_userInfo"]["data"];

                        // if user info has been updated in wanikani, then update cache
                        if (!userInfo || modified)
                            fetchUserInfo(apiKey);
                        
                        if (userInfo) {
                            const avatar = document.querySelector("#profile-pic img");
                            const link = "https://www.wanikani.com/users/"+userInfo["username"];
                            // get user avatar
                            if (!userInfo["avatar"]) {
                                fetch(link)
                                    .then(result => result.text())
                                    .then(content => {
                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(content, 'text/html');
                                        const avatarElem = doc.getElementsByClassName("avatar user-avatar-default")[0];
                                        const avatarSrc = "https://"+avatarElem.style.backgroundImage.split('url("//')[1].split('")')[0];
                                        userInfo["avatar"] = avatarSrc;
                                        avatar.src = userInfo["avatar"];
                                        chrome.storage.local.set({"wkhighlight_userInfo":result["wkhighlight_userInfo"]});
                                    });
                            }
                            else
                                avatar.src = userInfo["avatar"];

                            avatar.parentElement.href = link;
                            avatar.parentElement.title = link;

                            // username
                            const username = document.querySelector("#username");
                            username.appendChild(document.createTextNode(userInfo["username"]));

                            // scroll down arrow
                            const goDownArrowWrapper = document.querySelector(".scroll-down");
                            if (goDownArrowWrapper)
                                goDownArrowWrapper.addEventListener("click", () => window.scroll(0, 420));

                            updateLevelData(Number(userInfo["level"]));

                            // apply previously saved changes to subject tiles
                            applyChanges();
                        }
                    });
            });
        }
    });
});

const updateLevelData = (level, clear) => {
    if (clear) clearData();
    
    if (!clear)
        levelsChooser(level, document.querySelector(".levels-chooser"));

    const allSubjects = subjectsData.filter(subject => subject["level"] === level);
    const allPassedSubjects = allSubjects.filter(subject => subject.passed_at != null);

    // add clicking events and animation to levels
    if (!clear)
        levelsChooserAction(document.querySelector(".levels-chooser"));

    // all subjects progress
    const allTab = document.querySelector(".subject-tab");
    allTab.querySelector("span").appendChild(document.createTextNode(`${allPassedSubjects.length} / ${allSubjects.length}`));
    
    // subject types containers
    ["radical", "kanji", "vocab"].forEach(type => {
        const subjects = allSubjects.filter(subject => subject["subject_type"] === (type == "vocab" ? "vocabulary" : type));
        const passedSubjects = subjects.filter(subject => subject.passed_at != null);

        // level progress bar
        if (type == "kanji")
            updateLevelProgressBar(document.querySelector(".level-progress-bar"), passedSubjects.length, subjects.length);

        // subject tiles lists
        updateTypeContainer(type, document.querySelector(`#${type}-container`), subjects);
    });
}

const updateLevelProgressBar = (progressBarWrapper, passedSubjects, allSubjects) => {
    const progressBar = progressBarWrapper.querySelector("div");
    const percentage = passedSubjects / allSubjects * 100;
    progressBar.style.width = (percentage >= 1 ? percentage : 100)+"%";
    if (percentage > 8.1 || percentage < 1) {
        const barLabel = progressBarWrapper.querySelector("div > p");
        barLabel.appendChild(document.createTextNode(percentage.toFixed(percentage > 12 ? 1 : 0)+"%"));
        if (percentage < 1) {
            progressBar.style.backgroundColor = "white";
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
        progressValues.appendChild(document.createTextNode(passedSubjects + " / " + allSubjects));
    }
    else
        progressValues.classList.add("hidden");

    progressBar.classList.add("clickable");
    progressBar.title = "Passed Kanji: "+passedSubjects+" / "+percentage.toFixed(1)+"%";
}

const updateTypeContainer = (type, container, subjects) => {
    const passedSubjects = subjects.filter(subject => subject.passed_at != null);
    const tab = container.querySelector(".subject-tab");
    
    // progress
    tab.querySelector("span").appendChild(document.createTextNode(`${passedSubjects.length} / ${subjects.length}`));

    // subject tiles
    const subjectsList = container.querySelector(".subject-container > ul");
    subjects.forEach(subject => subjectsList.appendChild(subjectTile(type, subject)));
}

const subjectTile = (type, subject) => {
    const subjectWrapper = document.createElement("li");
    const characters = subject["characters"] ? subject["characters"]  : `<img height="22px" style="margin-top:-3px;margin-bottom:-4px;padding-top:8px" src="${subject["character_images"].filter(image => image["content_type"] == "image/png")[0]["url"]}"><img>`;
    subjectWrapper.classList.add(type+"_back");
    subjectWrapper.title = subject["meanings"][0];
    subjectWrapper.style.position = "relative";
    if (type !== "radical") {
        subjectWrapper.classList.add("clickable", "kanjiDetails");
        subjectWrapper.setAttribute("data-item-id", subject["id"]);
        if (subject["readings"][0]["reading"])
            subjectWrapper.title += " | "+subject["readings"].filter(reading => reading["primary"])[0]["reading"];
        else
            subjectWrapper.title += " | "+subject["readings"][0];
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
        subjectWrapper.children[0].style.filter = "invert(1)";

    if (subject["passed_at"]) {
        const check = document.createElement("img");
        subjectWrapper.appendChild(check);
        check.src = "../images/check.png";
        check.classList.add("passed-subject-check", "reviews-info");
        // fix issues with radicals that are images
        if (subjectWrapper.firstChild.tagName == "IMG") {
            subjectWrapper.firstChild.style.marginTop = "unset";
        }
    }
    else if(subject["available_at"]) {
        if (new Date(subject["available_at"]) - new Date() < 0) {
            const time = document.createElement("div");
            subjectWrapper.appendChild(time);
            time.appendChild(document.createTextNode("now"));
            time.classList.add("time-next-review-subject", "reviews-info");
        }
    }

    if (subject["available_at"])
        subjectWrapper.setAttribute("data-available_at", subject["available_at"]);
    

    if (subject["srs_stage"] !== null) {
        subjectWrapper.title += " \x0D"+srsStages[subject["srs_stage"]]["name"];
        subjectWrapper.setAttribute("data-srs", subject["srs_stage"]);
    }
    else {
        subjectWrapper.title += " \x0D"+"Locked";
        subjectWrapper.setAttribute("data-srs", -1);
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

const levelsChooserAction = levelsList => {
    Array.from(levelsList.querySelectorAll("li")).forEach((levelWrapper, i) => {
        const level = Number(levelWrapper.innerText);
        if (!isNaN(level) && i !== 1) {
            levelWrapper.addEventListener("click", () => {                                
                const newLevelsChooser = document.createElement("ul");
                newLevelsChooser.classList.add("levels-chooser");
                levelsChooser(level, newLevelsChooser);
                document.querySelector(".levels-chooser-wrapper").replaceChild(newLevelsChooser, levelsList);
                newLevelsChooser.style.paddingTop = "175px";

                levelsChooserAction(newLevelsChooser);

                updateLevelData(level, true);

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

    // all
    document.querySelector(".subject-tab > span").innerText = "";

    // subjects
    Array.from(document.querySelectorAll(".subject-types > div")).forEach(container => {
        container.querySelector(".subject-tab > span").innerText = "";
        container.querySelector(".subject-container > ul").remove();
        container.querySelector(".subject-container").appendChild(document.createElement("ul"));
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

        const subjectsContainer = tab.nextElementSibling;
        if (subjectsContainer) {
            if (!subjectsContainer.classList.contains("hidden")) {
                arrow.classList.replace("up", "down");
                subjectsContainer.classList.add("hidden");
                menuSettings[key]["opened"] = false;
            }
            else {
                arrow.classList.replace("down", "up");
                subjectsContainer.classList.remove("hidden");
                menuSettings[key]["opened"] = true;
            }
        }

        // save changes
        chrome.storage.local.set({"wkhighlight_settings": settings});
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
        chrome.storage.local.set({"wkhighlight_settings": settings});
    }
});

const applyChanges = () => {
    Object.keys(menuSettings).forEach(type => {
        const tab = Array.from(document.querySelectorAll(".subject-tab")).filter(tab => tab.firstElementChild.innerText.toLowerCase().includes(type))[0];
        if (tab) {
            // apply changes to those settings that are different from default
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

            // reset tiles
            Array.from(document.querySelectorAll(".subject-container > ul > li")).forEach(subject => subject.classList.remove("hidden"));
            
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
                subjects = document.querySelectorAll(".subject-container > ul > li");

            // reset tiles
            Array.from(document.querySelectorAll(".subject-container > ul > li")).forEach(subject => subject.style.removeProperty("color"));

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
    wrapper.appendChild(selector("Color by", ["Subject Type", "SRS Stage"], defaults ? defaults["color_by"] : null));

    // show reviews info
    wrapper.appendChild(checkbox("Reviews info", defaults["reviews_info"]));	
}

const colorings = (subjects, type) => {
    switch(type) {
        case "Subject Type":
            subjects.forEach(elem => elem.style.removeProperty("background-color"));
            break;
        case "SRS Stage":
            subjects.forEach(elem => {
                if (elem.getAttribute("data-srs")) {
                    let backColor;
                    if (elem.getAttribute("data-srs") == "-1") {
                        backColor = "#000000";
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