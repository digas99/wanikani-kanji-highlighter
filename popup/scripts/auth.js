const popupLoading = new MessagePopup(document.body);
popupLoading.create("Loading data...");

chrome.storage.local.get(["apiKey", "settings"], result => {
    if (!result["apiKey"]) {
        popupLoading.remove();

        fetch("../../manifest.json")
            .then(response => response.json())
            .then(manifest => document.getElementById("version").innerText = `v${manifest["version"]}`);
    
        const submit = document.querySelector("#submit");
        if (submit) submit.addEventListener("click", submitAction);
    }
    else {
        const page = result["settings"] ? result["settings"]["home_page"]["page"] : "home";
        window.location.href = `${page ? page.toLowerCase() : "home"}.html`;
    }
});

const submitAction = () => {
    let invalidKey = false;
    const msg = document.getElementById("message");
    if (msg) msg.remove();

    // check if key is valid
    const apiKey = document.getElementById("apiKeyInput").value.trim();
    const splitKey = apiKey.split("-");
    const keyPartsLength = [8, 4, 4, 4, 12];
    let keyPart, partLength;
    for (let i = 0; i < keyPartsLength.length; i++) {
        keyPart = splitKey[i];
        partLength = keyPartsLength[i];
        if (!keyPart || keyPart.length !== partLength) {
            invalidKey = true;
            break;
        }
    }

    const main = document.getElementById("main");
    const form = main.querySelector(".api-key-form"); 
    if (!invalidKey) {
        popupLoading.create("Loading user info...");
        fetchUserInfo(apiKey, user => {
            if (user) {
                if (user.code == 401) {
                    main.insertBefore(message("The API key doesn't exist!", "red"), form);
                    popupLoading.remove();
                }
                else if (user.code == 429) {
                    main.insetBefore(message("Too many requests! Wait a few minutes and try again.", "red"), form);
                    popupLoading.remove();
                }
                else {
                    chrome.storage.local.set({"apiKey":apiKey, "userInfo":user, "userInfo_updated":formatDate(addHours(new Date(), -1))});
                    window.location.href = "home.html";
                }
            } else {
                main.insertBefore(message("Unexpected error!", "red"), form);
                popupLoading.remove();
            }
        });
    }
    else
        main.insertBefore(message("The API key is invalid!", "red"), form);
}

const message = (msg, color) => {
    const submitMessage = document.createElement("p");
    submitMessage.id = "message";
    submitMessage.style.marginTop = "5px";	
    submitMessage.style.color = color;
    submitMessage.appendChild(document.createTextNode(msg));
    return submitMessage;
}