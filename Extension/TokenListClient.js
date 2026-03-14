class TokenListClient {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetchTokenList() {
        const response = await fetch(this.baseUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid token list format");
        }

        return data.map(token => TokenResponse.fromJSON(token));
    }
}