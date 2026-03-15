import TokenResponse from "./TokenResponse.js";

class TokenResponsesStore {

  static STORAGE_KEY = "fctp_token_store";

  constructor() {
    this.tokens = new Map();
    this.load();
  }

  load() {
    const raw = localStorage.getItem(TokenResponsesStore.STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);

    for (const claim of Object.keys(parsed)) {

      const issuerMap = new Map();

      for (const issuerId of Object.keys(parsed[claim])) {

        const arr = parsed[claim][issuerId]
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

    this.cleanupExpired();
  }

  persist() {

    const obj = {};

    for (const [claim, issuerMap] of this.tokens.entries()) {

      obj[claim] = {};

      for (const [issuerId, list] of issuerMap.entries()) {
        obj[claim][issuerId] = list.map(t => t.toJSON());
      }

    }

    localStorage.setItem(TokenResponsesStore.STORAGE_KEY, JSON.stringify(obj));
  }

  add(tokenResponse) {

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

    this.persist();
  }

  remove(claim, issuerId, token = null) {

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

    this.persist();
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

  cleanupExpired() {

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

    this.persist();
  }
}

export const tokenStore = new TokenResponsesStore();