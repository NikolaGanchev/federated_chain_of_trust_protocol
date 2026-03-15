import TokenResponsesStore from "./response/TokenResponsesStore.js";
import TrustGraphBuilder from "./issuer/graph/TrustGraphBuilder.js";
import TrustGraphStore from "./issuer/graph/TrustGraphStore.js";
import TokenResponse from "./response/TokenResponse.js";
import TokenExchangeClient from "./exchange/TokenExchangeClient.js";

(async () => {

console.log("FCTP Background Service Worker Initialized");

let tokenResponseStore = new TokenResponsesStore();
await tokenResponseStore.load();
let trustGraphBuilder = new TrustGraphBuilder();
let trustGraphStore = new TrustGraphStore();
await trustGraphStore.load();

async function getTokens(tokenResponses) {
  for (let element in tokenResponses) {
    await tokenResponseStore.add(element);
  }
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

  await tokenResponseStore.remove(
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

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log(message.payload)
  console.log("Reached message")
  if (message.type !== "SEND_JSON") {
    return;
  }

  try {
    const payload = message.payload;

    if (!payload) {
      throw new Error("Missing payload");
    }

    const tokens = Array.isArray(payload) ? payload : [payload];

    const parsedTokens = tokens;

    console.log(parsedTokens)
    for (const token of parsedTokens) {
      await tokenResponseStore.add(TokenResponse.fromJSON(token));
    }

    console.log("saved");

    console.log("BEGIN GRAPH");
    if (parsedTokens.length > 0) {
      console.log(parsedTokens);
      console.log(parsedTokens[0].issuer_id);
      const g = await trustGraphBuilder.build(parsedTokens[0].issuer_id);
      console.log(g);
      await trustGraphStore.add(parsedTokens[0].issuer_id, g);
      console.log("saved graph");
    }

    sendResponse({
      status: "ok",
      stored: parsedTokens.length
    });

  } catch (err) {
    console.log(err);
    sendResponse({
      status: "error",
      message: err.message
    });

  }

  return true;
});

const activeChallenges = new Map();
let nextRuleId = 1;
const PROOF_TIMEOUT_MS = 10000;
const IDLE_TIMEOUT_MS = 120000;

chrome.webRequest.onHeadersReceived.addListener(
  async (details) => {
    const headers = details.responseHeaders || [];
    const targetUrl = details.url;
    const targetMethod = details.method.toLowerCase();
    const challengeKey = `${targetMethod} ${targetUrl}`;
    console.log(challengeKey);

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
        let tokenResponse = await giveToken(claim, fctpTrustees);

        console.log("Token response ", tokenResponse);
        if (!tokenResponse) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Missing token",
            message: "No token available in storage for claim '" + claim + "' from issuers " + JSON.stringify(fctpTrustees) + "! Refer to the issuer."
          })
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
                { header: "FCTP-TOKEN", operation: "set", value: tokenResponse.getToken() },
                { header: "FCTP-ISSUER", operation: "set", value: tokenResponse.getIssuer() },
                { header: "FCTP-TOKEN-TYPE", operation: "set", value: tokenResponse.getTokenType() },
              ]
            },
            condition: {
              urlFilter: targetUrl,
              requestMethods: [targetMethod],
            }
          }]
        });
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

      console.log("Active challenges", activeChallenges);
      if (activeChallenges.has(challengeKey) && activeChallenges.get(challengeKey).timeoutIdProof > -1) {
        clearTimeout(activeChallenges.get(challengeKey).timeoutIdProof);
      }

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [activeChallenges.get(challengeKey).ruleId]
      });

    console.log("active challenge deleting nonce")

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
      
    console.log("active challenge detected")
      // Check if DNR successfully injected our FCTP-Nonce
      const hasNonce = details.requestHeaders.some(h => h.name.toLowerCase() === "fctp-nonce");
      
      if (hasNonce) {
    console.log("active challenge has nonce")
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

function randomAscii(n) {
  let result = "";
  for (let i = 0; i < n; i++) {
    const code = Math.floor(Math.random() * 95) + 32;
    result += String.fromCharCode(code);
  }
  return result;
}
    
})();