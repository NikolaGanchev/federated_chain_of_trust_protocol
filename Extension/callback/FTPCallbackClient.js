export default class FtpCallbackClient {

  constructor(callbackUrl) {
    this.callbackUrl = callbackUrl;
  }

  async sendToken(token, tokenType, claim, nonce) {

    const response = await fetch(this.callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token: token,
        token_type: tokenType,
        claim: claim,
        nonce: nonce
      })
    });

    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status}`);
    }

    return await response.json();
  }
}