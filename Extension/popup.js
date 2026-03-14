class TokenResponse {
    constructor({ token, issuer_id, claim, expires_at }) {
        this.token = token;
        this.issuerId = issuer_id;
        this.claim = claim;
        this.expiresAt = expires_at;
    }

    static fromJSON(json) {
        return new TokenResponse({
            token: json.token,
            issuer_id: json.issuer_id,
            claim: json.claim,
            expires_at: json.expires_at
        });
    }

    isExpired(currentTime = Math.floor(Date.now() / 1000)) {
        return currentTime >= this.expiresAt;
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
            issuer_id: this.issuerId,
            claim: this.claim,
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

class TokenStore {

    constructor() {
        this.tokens = {};
    }

    save(tokenResponse) {
        const issuer = tokenResponse.issuerId;
        const claim = tokenResponse.claim;

        if (!this.tokens[issuer]) {
            this.tokens[issuer] = {};
        }

        this.tokens[issuer][claim] = tokenResponse;
    }

    get(issuer, claim) {
        return this.tokens?.[issuer]?.[claim] || null;
    }

    hasValid(issuer, claim) {
        const token = this.get(issuer, claim);
        if (!token) return false;
        return !token.isExpired();
    }

    toJSON() {
        const data = {};

        for (const issuer in this.tokens) {
            data[issuer] = {};
            for (const claim in this.tokens[issuer]) {
                data[issuer][claim] = this.tokens[issuer][claim].toJSON();
            }
        }

        return data;
    }

    static fromJSON(json) {
        const store = new TokenStore();

        for (const issuer in json) {
            store.tokens[issuer] = {};

            for (const claim in json[issuer]) {
                const token = TokenResponse.fromJSON(json[issuer][claim]);
                store.tokens[issuer][claim] = token;
            }
        }

        return store;
    }
}

async function saveStore(store) {
    const data = store.toJSON();

    await chrome.storage.local.set({
        ftp_token_store: data
    });
}

async function loadStore() {

    const result = await chrome.storage.local.get("ftp_token_store");

    if (!result.ftp_token_store) {
        return new TokenStore();
    }

    return TokenStore.fromJSON(result.ftp_token_store);
}

document.getElementById("actionBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    console.warn("Cannot run extension on this page");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      alert("Injected from extension");
    }
  });
});