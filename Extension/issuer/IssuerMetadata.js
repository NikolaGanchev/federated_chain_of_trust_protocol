class IssuerMetadata {

    constructor({
        issuer_id,
        display_name,
        verification_delegation,
        public_key,
        token_formats,
        claim,
        trusts,
        parents,
        ttl
    }) {

        this.issuerId = issuer_id;
        this.displayName = display_name;
        this.verificationDelegation = verification_delegation || "local";
        this.publicKey = public_key;

        this.tokenFormats = token_formats || [];
        this.claim = claim;

        this.trusts = trusts || [];
        this.parents = parents || [];

        this.ttl = ttl || 0;
    }

    static fromJSON(json) {

        if (!json.issuer_id) {
            throw new Error("issuer_id missing");
        }

        if (!json.public_key) {
            throw new Error("public_key missing");
        }

        return new IssuerMetadata({
            issuer_id: json.issuer_id,
            display_name: json.display_name,
            verification_delegation: json.verification_delegation,
            public_key: json.public_key,
            token_formats: json.token_formats,
            claim: json.claim,
            trusts: json.trusts,
            parents: json.parents,
            ttl: json.ttl
        });
    }

    origin() {
        return new URL(this.issuerId).origin;
    }

    trustsIssuer(issuerId) {
        return this.trusts.includes(issuerId);
    }

    hasParent(issuerId) {
        return this.parents.includes(issuerId);
    }

    supportsTokenFormat(format) {
        return this.tokenFormats.includes(format);
    }

    supportsClaim(claim) {
        return this.claim === claim;
    }

    requiresDelegatedVerification() {
        return this.verificationDelegation === "call";
    }

    cacheExpiry(cachedAt) {
        return cachedAt + this.ttl;
    }

}