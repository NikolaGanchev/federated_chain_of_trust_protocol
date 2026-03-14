class TokenExchangeClient {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async exchangeToken(childToken, childIssuerId, claim) {

        const response = await fetch(`${this.baseUrl}/exchange_token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                child_token: childToken,
                child_issuer_id: childIssuerId,
                claim: claim
            })
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const json = await response.json();

        return TokenResponse.fromJSON(json);
    }

}