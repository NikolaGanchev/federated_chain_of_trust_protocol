class FtpCallbackClient {

    constructor(callbackUrl) {
        this.callbackUrl = callbackUrl;
    }

    async sendToken(token, claim) {

        const response = await fetch(this.callbackUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                claim: claim
            })
        });

        if (!response.ok) {
            throw new Error(`Callback failed: ${response.status}`);
        }

        return await response.json();
    }
}