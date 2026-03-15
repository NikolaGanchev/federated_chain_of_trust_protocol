export default class TokenResponse {
  constructor({ token, token_type, issuer_id, claim, expires_at }) {
    this.token = token;
    this.tokenType = token_type;
    this.claim = claim;
    this.issuerId = issuer_id;
    this.expiresAt = expires_at;
  }

  static fromJSON(json) {
    return new TokenResponse({
      token: json.token,
      token_type: json.token_type,
      issuer_id: json.issuer_id,
      claim: json.claim,
      expires_at: json.expires_at
    });
  }

  isExpired(currentTime = Math.floor(Date.now() / 1000)) {
    return currentTime >= this.expiresAt;
  }

  getTokenType() {
    return this.tokenType;
  }

  getIssuer() {
    return this.issuerId;
  }

  getClaim() {
    return this.claim;
  }

  getToken() {
    return this.token;
  }

  getExpiration() {
    return this.expiresAt;
  }

  toJSON() {
    return {
      token: this.token,
      token_type: this.tokenType,
      claim: this.claim,
      issuer_id: this.issuerId,
      expires_at: this.expiresAt
    };
  }

  static async fromFetchResponse(response) {
    if (!response.ok) {
      throw new Error(`Exchange failed: ${response.status}`);
    }

    const data = await response.json();
    return TokenResponse.fromJSON(data);
  }
}