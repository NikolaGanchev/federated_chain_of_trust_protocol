document.getElementById("get-token").addEventListener("click", async function (e) {
    try {
        const url = 'http://localhost:3001/issue_token';
        const result = await fetch(url, {
            method: "POST",
            body: JSON.stringify({
                claim: "age_over_18"
            }),
            headers: {
                "Content-Type": "application/json"
            }
        })
        
        if (!result.ok) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon128.png",
                title: "Could not get token from issuer",
                message: "Could not get token from issuer " + "http://localhost:3001/issue_token"
            })
            return;
        }
        let response = await result.json();
        console.log(response);

        chrome.runtime.sendMessage({
            type: "SEND_JSON",
            payload: response
        });
    } catch (err) {
        console.error(err);
    }
});