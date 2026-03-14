import TokenResponseStorage from "./response/TokenResponseStorage.js";

console.log("FCTP Background Service Worker Initialized");

const storage = new TokenResponseStorage();

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

function randomAscii(n) {
  let result = "";
  for (let i = 0; i < n; i++) {
    const code = Math.floor(Math.random() * 95) + 32;
    result += String.fromCharCode(code);
  }
  return result;
}