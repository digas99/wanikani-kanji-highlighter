chrome.storage.local.get(["wkhighlight_apiKey", "wkhighlight_userInfo", "wkhighlight_userInfo_updated"], result => {
    const date = result["wkhighlight_userInfo_updated"] ? result["wkhighlight_userInfo_updated"] : formatDate(new Date());

    modifiedSince(result["wkhighlight_apiKey"], date, "https://api.wanikani.com/v2/user")
        .then(modified => {
            const userInfo = result["wkhighlight_userInfo"]["data"];

            // if user info has been updated in wanikani, then update cache
            if (!userInfo || modified)
                fetchUserInfo(apiKey);
            
            if (userInfo) {
                const avatar = document.querySelector("#profile img");
                // get user avatar
                if (!userInfo["avatar"]) {
                    fetch("https://www.wanikani.com/users/"+userInfo["username"])
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

                const level = document.querySelector("#profile p");
                if (level && userInfo["level"])
                    level.appendChild(document.createTextNode(userInfo["level"]));
            }

        });
});