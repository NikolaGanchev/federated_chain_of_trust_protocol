class IssuerMetadata {
    constructor({ issuer_id, public_key, trusts, claims }) {
        this.issuerId = issuer_id;
        this.publicKey = public_key;
        this.trustedIssuers = trusts || [];
        this.claims = claims || [];
    }

    static fromJSON(json) {
        return new IssuerMetadata({
            issuer_id: json.issuer_id,
            public_key: json.public_key,
            trusts: json.trusts,
            claims: json.claims
        });
    }

    trustsIssuer(issuerId) {
        return this.trustedIssuers.includes(issuerId);
    }

    supportsClaim(claim) {
        return this.claims.includes(claim);
    }
}
