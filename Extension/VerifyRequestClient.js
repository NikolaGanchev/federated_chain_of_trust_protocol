class VerifyRequestClient {

    constructor(endpointUrl) {
        this.endpointUrl = endpointUrl;
    }

    async sendVerificationRequest(rpId, claim, nonce, trustRoot) {

        const response = await fetch(this.endpointUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                rp_id: rpId,
                claim: claim,
                nonce: nonce,
                trust_root: trustRoot
            })
        });

        if (!response.ok) {
            throw new Error(`Verification request failed: ${response.status}`);
        }

        const json = await response.json();

        return VerifyRequest.fromJSON(json);
    }

}