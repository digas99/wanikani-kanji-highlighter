chrome.storage.local.get(["wkhighlight_apiKey"], ({wkhighlight_apiKey}) => {
    if (!wkhighlight_apiKey) {
        fetch("../../manifest.json")
            .then(response => response.json())
            .then(manifest => document.getElementById("version").innerText = `v${manifest["version"]}`);
    
        const submit = document.querySelector("#submit");
        if (submit)
            submit.addEventListener("click", submitAction);
    }
    else {
        window.location.href = "../home.html";
    }
});

const submitAction = () => {
    let invalidKey = false;
    const msg = document.getElementById("message");
    if (msg)
        msg.remove();

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

    fetchUserInfo(apiKey, user => {
        if (!invalidKey && user.code != 401) {
            let msg, color;
            chrome.storage.local.set({"wkhighlight_apiKey":apiKey, "wkhighlight_userInfo":user, "wkhighlight_userInfo_updated":formatDate(new Date())});
            msg = "The API key was accepted!";
            color = "green";

            const apiInputWrapper = document.getElementsByClassName("apiKey_wrapper")[0];
            if (apiInputWrapper)
                apiInputWrapper.remove();

            window.location.href = "../home.html";
        }
        else {
            const submitMessage = document.createElement("p");
            main.appendChild(submitMessage);
            submitMessage.id = "message";
            submitMessage.style.marginTop = "5px";	
            submitMessage.style.color = "red";
            submitMessage.appendChild(document.createTextNode("The API key is invalid!"));
        }
    });
}