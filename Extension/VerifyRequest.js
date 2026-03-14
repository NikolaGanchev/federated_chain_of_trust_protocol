class VerifyRequest {
    constructor({ rp_id, claim, nonce, trust_root }) {
        this.rpId = rp_id;
        this.claim = claim;
        this.nonce = nonce;
        this.trustRoot = trust_root;
    }

    static fromJSON(json) {
        return new VerifyRequest({
            rp_id: json.rp_id,
            claim: json.claim,
            nonce: json.nonce,
            trust_root: json.trust_root
        });
    }

    toJSON() {
        return {
            rp_id: this.rpId,
            claim: this.claim,
            nonce: this.nonce,
            trust_root: this.trustRoot
        };
    }
}