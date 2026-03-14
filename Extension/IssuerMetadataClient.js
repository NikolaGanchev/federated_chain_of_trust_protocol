class IssuerMetadataClient {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetchMetadata() {
        const response = await fetch(`${this.baseUrl}/.well-known/fctp-issuer`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Issuer metadata request failed: ${response.status}`);
        }

        const json = await response.json();

        return IssuerMetadata.fromJSON(json);
    }
}