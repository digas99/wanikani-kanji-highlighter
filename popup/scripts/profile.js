let initialSetup = true;

chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_userInfo_updated"], result => {
    const date = result["wkhighlight_userInfo_updated"] ? result["wkhighlight_userInfo_updated"] : formatDate(new Date());

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
            }

        });
});

const updateLevelData = (level, clear) => {
    if (clear) clearData();
    
    if (!clear)
        levelsChooser(level, document.querySelector(".levels-chooser"));

    const db = new Database("wanikani");
    db.create("subjects").then(created => {
        if (created) {
            db.getAll("subjects", "level", level)
                .then(results => {
                    const allSubjects = results.filter(subject => !subject["hidden_at"]);
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
                });
        }
    });
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
    }

    if (percentage < 81 && percentage >= 1) {
        const progressValues = progressBarWrapper.querySelector("span");
        progressValues.appendChild(document.createTextNode(passedSubjects + " / " + allSubjects));
    }
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

const levelsChooserAction = levelsList => {
    Array.from(levelsList.querySelectorAll("li")).forEach((levelWrapper, i) => {
        const level = Number(levelWrapper.innerText);
        if (!isNaN(level) && i !== 1) {
            console.log(level);
            levelWrapper.addEventListener("click", () => {
                initialSetup = true;
                                
                const newLevelsChooser = document.createElement("ul");
                newLevelsChooser.classList.add("levels-chooser");
                levelsChooser(level, newLevelsChooser);
                document.querySelector(".levels-chooser-wrapper").replaceChild(newLevelsChooser, levelsList);
                newLevelsChooser.style.paddingTop = "175px";

                levelsChooserAction(newLevelsChooser);

                updateLevelData(level, true);
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

    initialSetup = false;
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