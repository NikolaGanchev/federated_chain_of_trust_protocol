import TokenResponse from "../response/TokenResponse.js";

export default class TokenExchangeClient {

  constructor(baseUrl) {
    this.baseUrl = new URL(baseUrl).origin;;
  }

  async exchangeToken(childToken, childTokenType, childIssuerId, claim) {

    const response = await fetch(`${this.baseUrl}/exchange_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        child_token: childToken,
        child_token_type: childTokenType,
        child_issuer_id: childIssuerId,
        claim: claim
      })
    });

    console.log(response);

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const json = await response.json();

    console.log(json);

    return TokenResponse.fromJSON(json);
  }

}