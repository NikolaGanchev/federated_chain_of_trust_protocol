class FtpCallbackClient {

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

class TokenExchangeClient {

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

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const json = await response.json();

    return TokenResponse.fromJSON(json);
  }

}

class TrustGraph {

  constructor(startIssuerUrl) {
    this.nodes = new Map();
    this.edges = new Map();
    this.startIssuerUrl = startIssuerUrl
  }

  getRootIssuer() {
    return this.startIssuerUrl
  }

  addNode(metadata) {
    this.nodes.set(metadata.issuerId, metadata);
    this.edges.set(metadata.issuerId, [...(metadata.parents || [])]);
  }

  getParents(issuerId) {
    return this.edges.get(issuerId) || [];
  }

  bfs(startIssuerId, targetIssuerId) {

    if (!this.nodes.has(startIssuerId)) {
      throw new Error(`Unknown start issuer: ${startIssuerId}`);
    }

    const visited = new Set();
    const queue = [[startIssuerId]];

    while (queue.length > 0) {

      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === targetIssuerId) {
        return path;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      const parents = this.getParents(current);

      for (const parent of parents) {

        if (!visited.has(parent) && this.nodes.has(parent)) {
          queue.push([...path, parent]);
        }

      }
    }

    return null;
  }

  toJSON() {
    return {
      startIssuerUrl: this.startIssuerUrl,
      nodes: [...this.nodes.values()],
      edges: [...this.edges.entries()]
    };
  }

  static fromJSON(json) {
    const graph = new TrustGraph(json.startIssuerUrl);

    for (const node of json.nodes) {
      const metadata = IssuerMetadata.fromJSON(node);
      graph.nodes.set(metadata.issuerId, metadata);
    }

    for (const [issuerId, parents] of json.edges) {
      graph.edges.set(issuerId, parents);
    }

    return graph;
  }
}

class TrustGraphBuilder {
  constructor() {
  }

  async build(startIssuerUrl) {
    this.visited = new Set();
    this.graph = new TrustGraph(startIssuerUrl);
    await this.crawl(startIssuerUrl)
    return this.graph;
  }

  async crawl(issuerUrl) {

    const origin = new URL(issuerUrl).origin;

    if (this.visited.has(origin)) {
      return;
    }

    this.visited.add(origin);

    const client = new IssuerMetadataClient(origin);
    const metadata = await client.fetchMetadata();

    this.graph.addNode(metadata);

    for (const parent of (metadata.parents || [])) {
      await this.crawl(parent);
    }
  }
}

class TrustGraphStore {

  static STORAGE_KEY = "fctp_trust_graphs";

  constructor() {
    this.graphs = new Map();
    this.load();
  }

  load() {
    const raw = localStorage.getItem(TrustGraphStore.STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    for (const name of Object.keys(parsed)) {
      this.graphs.set(name, TrustGraph.fromJSON(parsed[name]));
    }
  }

  persist() {
    const obj = {};

    for (const [startIssuerUrl, graph] of this.graphs.entries()) {
      obj[startIssuerUrl] = graph.toJSON();
    }

    localStorage.setItem(
      TrustGraphStore.STORAGE_KEY,
      JSON.stringify(obj)
    );
  }

  add(startIssuerUrl, graph) {
    this.graphs.set(startIssuerUrl, graph);
    this.persist();
  }

  remove(startIssuerUrl) {
    this.graphs.delete(startIssuerUrl);
    this.persist();
  }

  get(startIssuerUrl) {
    return this.graphs.get(startIssuerUrl) || null;
  }

  has(startIssuerUrl) {
    return this.graphs.has(startIssuerUrl);
  }

  clear() {
    this.graphs.clear();
    this.persist();
  }

  *entries() {
    for (const entry of this.graphs.entries()) {
      yield entry;
    }
  }

  *issuerUrls() {
    for (const startIssuerUrl of this.graphs.keys()) {
      yield startIssuerUrl;
    }
  }

  *values() {
    for (const graph of this.graphs.values()) {
      yield graph;
    }
  }

}

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

class IssuerMetadataClient {

  constructor(baseUrl) {
    this.baseUrl = new URL(baseUrl).origin;
  }

  async fetchMetadata() {

    const url = `${this.baseUrl}/.well-known/fctp-issuer`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Issuer metadata request failed: ${response.status}`);
    }

    const json = await response.json();

    const metadata = IssuerMetadata.fromJSON(json);

    const fetchedOrigin = new URL(this.baseUrl).origin;
    const declaredOrigin = new URL(metadata.issuerId).origin;

    if (fetchedOrigin !== declaredOrigin) {
      throw new Error(
        `Issuer origin mismatch: fetched=${fetchedOrigin} declared=${declaredOrigin}`
      );
    }

    return metadata;
  }
}

class TokenResponse {
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

let tokenResponseStore = new TokenResponsesStore();
let trustGraphBuilder = new TrustGraphBuilder();
let trustGraphStore = new TrustGraphStore();

function getTokens(tokenResponses) {
  tokenResponses.forEach(element => {
    tokenResponseStore.add(element)
  });
}

async function giveToken(claim, trustees) {
  for(const graph of trustGraphStore.values()) {
    const token = await giveTokenGraph(claim, trustees, graph);

    if(token !== null) {
      return token;
    }
  }

  return null;
}

async function giveTokenGraph(claim, trustees, trustGraph) {

  const issuers = tokenResponseStore.getIssuersForClaim(claim);
  if (issuers.length === 0) return null;

  let bestIssuer = null;
  let bestTrustee = null;
  let bestToken = null;
  let bestDepth = -1;

  for (const issuer of issuers) {
    for (const trustee of trustees) {
      const path = trustGraph.bfs(issuer, trustee);
      if (!path) continue;

      const depth = path.length;

      if (depth > bestDepth) {
        const tokens = tokenResponseStore.get(claim, issuer);
        if (tokens.length === 0) continue;

        const token = tokens[0];

        if (!token) continue;

        bestIssuer = issuer;
        bestTrustee = trustee;
        bestToken = token;
        bestDepth = depth;
      }
    }
  }

  if (!bestToken) return null;

  tokenResponseStore.remove(
    bestToken.getClaim(),
    bestToken.getIssuer(),
    bestToken
  );

  if (bestIssuer === bestTrustee) {
    return bestToken;
  }

  const exchangeClient = new TokenExchangeClient(bestTrustee);

  const newToken = await exchangeClient.exchangeToken(
    bestToken.getToken(),
    bestToken.getTokenType(),
    bestIssuer,
    claim
  );

  return newToken;
}


// listen for adding tokens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type !== "SEND_JSON") {
    return;
  }

  try {
    const payload = message.payload;

    if (!payload) {
      throw new Error("Missing payload");
    }

    const tokens = Array.isArray(payload) ? payload : [payload];

    const parsedTokens = tokens.map(obj => TokenResponse.fromJSON(obj));

    parsedTokens.forEach(token => {
      tokenResponseStore.add(token);
    });

    sendResponse({
      status: "ok",
      stored: parsedTokens.length
    });

  } catch (err) {

    sendResponse({
      status: "error",
      message: err.message
    });

  }

  return true;
});

function randomAscii(n) {
  let result = "";
  for (let i = 0; i < n; i++) {
    const code = Math.floor(Math.random() * 95) + 32;
    result += String.fromCharCode(code);
  }
  return result;
}

chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    const headers = details.responseHeaders || [];
    const targetUrl = details.url;
    const targetMethod = details.method.toLowerCase();
    const challengeKey = `${targetMethod} ${targetUrl}`;

    if (details.statusCode === 403) {
      let claim = null;
      let fctpTrustees = [];

      for (const h of headers) {
        const name = h.name.toLowerCase();
        if (name === "fctp-claim") {
          claim = h.value;
        }
        if (name === "fctp-trustees") {
          fctpTrustees = (h.value || "")
            .split(",")
            .map(v => v.trim())
            .filter(v => v.length > 0);
        }
      }

      if (claim) {
        let tokenResponse = null;
        for (let i = 0; i < fctpTrustees.length; i++) {   
          if (storage.length(fctpTrustees, claim) !== 0) {
            tokenResponse = storage.pop(fctpTrustees, claim);
            break;
          }
        }

        if (!tokenResponse) {
          // TODO
          console.error("No token available in storage for the requested trustees/claim.");
          return;
        }

        const nonce = randomAscii(32);

        const currentRuleId = nextRuleId++;

        // The frontend can just never attempt a retry and clean up needs to happen
        const idleTimeoutId = setTimeout(async () => {
          console.log(`[CLEANUP] Frontend never retried. Purging abandoned rule ${currentRuleId}.`);
          await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [currentRuleId] });
          activeChallenges.delete(challengeKey);
        }, IDLE_TIMEOUT_MS);

        activeChallenges.set(challengeKey, {
          ruleId: currentRuleId,
          timeoutIdIdle: idleTimeoutId,
          timeoutIdProof: -1
        });

        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [currentRuleId],
          addRules: [{
            id: currentRuleId,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "FCTP-NONCE", operation: "set", value: nonce },
                { header: "FCTP-TOKEN", operation: "set", value: tokenResponse.token }
              ]
            },
            condition: {
              urlFilter: targetUrl,
              requestMethods: [targetMethod],
              resourceTypes: ["xmlhttprequest", "fetch", "main_frame"]
            }
          }]
        });

        chrome.tabs.sendMessage(details.tabId, {
          action: "RETRY_FCTP_REQUEST",
          url: targetUrl,
          method: targetMethod
        }).catch(err => console.log("Could not send message to tab.", err));
      }

      return; 
    }

    // The response was not 403
    let proof = null;
    for (const h of headers) {
      if (h.name.toLowerCase() === "fctp-proof") {
        proof = h.value;
        break;
      }
    }

    if (proof) {
      console.log("Successfully extracted FCTP-Proof:", proof);
      
      await chrome.storage.session.set({ fctpProof: proof });
      // TODO: Verify

      if (activeChallenges.has(challengeKey) && activeChallenges.get(challengeKey).timeoutIdProof > -1) {
        clearTimeout(activeChallenges.get(challengeKey).timeoutIdProof);
      }

      activeChallenges.delete(challengeKey);
      console.log("Proof verified");
    }
  },
  { urls: ["<all_urls>"] },
  // "extraHeaders" ensures we can read custom headers reliably across all Chrome versions
  ["responseHeaders", "extraHeaders"] 
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    const targetUrl = details.url;
    const targetMethod = details.method.toLowerCase();
    const challengeKey = `${targetMethod} ${targetUrl}`;

    // Check if there is an active challenge for this URL
    if (activeChallenges.has(challengeKey) && activeChallenges.get(challengeKey).timeoutIdIdle > -1) {
      
      // Check if DNR successfully injected our FCTP-Nonce
      const hasNonce = details.requestHeaders.some(h => h.name.toLowerCase() === "fctp-nonce");
      
      if (hasNonce) {
        console.log(`Request in flight. Destroying DNR rule for ${challengeKey}.`);
        
        const challengeData = activeChallenges.get(challengeKey);
        
        clearTimeout(challengeData.timeoutIdIdle);
        
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [challengeData.ruleId]
        });

        activeChallenges.get(challengeKey).timeoutIdIdle = -1;

        activeChallenges.get(challengeKey).timeoutIdProof = setTimeout(async () => {
          console.error(`10s timeout reached for ${challengeKey}. Proof has not been provided. Assuming token could have been stolen.`);
          
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Security Alert: Missing FCTP Proof",
            message: "The website has not provided a proof of verification. Your token may be used for illicit purpose. Alert your Issuer."
          });

          activeChallenges.delete(challengeKey);

        }, PROOF_TIMEOUT_MS);
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders", "extraHeaders"]
);