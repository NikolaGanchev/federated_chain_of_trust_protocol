import TokenResponse from "./TokenResponse.js";

export default class TokenResponsesStore {

  static STORAGE_KEY = "fctp_token_store";

  constructor() {
    this.tokens = new Map();
  }
  async load() {
    const result = await chrome.storage.local.get(TokenResponsesStore.STORAGE_KEY);
    
    const storedData = result[TokenResponsesStore.STORAGE_KEY];
    
    if (!storedData) return;

    const now = Math.floor(Date.now() / 1000);

    for (const claim of Object.keys(storedData)) {
      const issuerMap = new Map();

      for (const issuerId of Object.keys(storedData[claim])) {
        const arr = storedData[claim][issuerId]
          .map(obj => TokenResponse.fromJSON(obj))
          .filter(t => !t.isExpired(now));

        if (arr.length > 0) {
          issuerMap.set(issuerId, arr);
        }
      }

      if (issuerMap.size > 0) {
        this.tokens.set(claim, issuerMap);
      }
    }

    await this.cleanupExpired();
  }

  async persist() {
    const obj = {};

    for (const [claim, issuerMap] of this.tokens.entries()) {
      obj[claim] = {};

      for (const [issuerId, list] of issuerMap.entries()) {
        obj[claim][issuerId] = list.map(t => t.toJSON());
      }
    }

    await chrome.storage.local.set({ [TokenResponsesStore.STORAGE_KEY]: obj });
  }

  async add(tokenResponse) {

    const claim = tokenResponse.getClaim();
    const issuer = tokenResponse.getIssuer();

    if (!this.tokens.has(claim)) {
      this.tokens.set(claim, new Map());
    }

    const issuerMap = this.tokens.get(claim);

    if (!issuerMap.has(issuer)) {
      issuerMap.set(issuer, []);
    }

    issuerMap.get(issuer).push(tokenResponse);

    await this.persist();
  }

  async remove(claim, issuerId, token = null) {

    const issuerMap = this.tokens.get(claim);
    if (!issuerMap) return false;

    const list = issuerMap.get(issuerId);
    if (!list) return false;

    if (token === null) {
      issuerMap.delete(issuerId);
    } else {

      const index = list.indexOf(token);
      if (index === -1) return false;

      list.splice(index, 1);

      if (list.length === 0) {
        issuerMap.delete(issuerId);
      }
    }

    if (issuerMap.size === 0) {
      this.tokens.delete(claim);
    }

    await this.persist();
    return true;
  }

  get(claim, issuerId = null) {
    const issuerMap = this.tokens.get(claim);
    if (!issuerMap) return [];

    const now = Math.floor(Date.now() / 1000);

    if (issuerId === null) {

      const result = [];

      for (const list of issuerMap.values()) {
        for (const t of list) {
          if (!t.isExpired(now)) {
            result.push(t);
          }
        }
      }

      return result;
    }

    const list = issuerMap.get(issuerId);
    if (!list) return [];

    return list.filter(t => !t.isExpired(now));
  }
  
  getIssuersForClaim(claim) {

    const issuerMap = this.tokens.get(claim);
    if (!issuerMap) return [];

    return [...issuerMap.keys()];
  }

  async cleanupExpired() {

    const now = Math.floor(Date.now() / 1000);

    for (const [claim, issuerMap] of this.tokens.entries()) {

      for (const [issuerId, list] of issuerMap.entries()) {

        const valid = list.filter(t => !t.isExpired(now));

        if (valid.length === 0) {
          issuerMap.delete(issuerId);
        } else {
          issuerMap.set(issuerId, valid);
        }

      }

      if (issuerMap.size === 0) {
        this.tokens.delete(claim);
      }

    }

    await this.persist();
  }
}