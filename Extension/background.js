import TokenResponseStorage from "./response/TokenResponseStorage.js"

console.log("Hello")
let pendingFctp = null;
let storage = new TokenResponseStorage();

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.statusCode !== 403) return;

    let claim = null;
    let fctpTrustees = [];

    for (const h of details.responseHeaders || []) {
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
      chrome.storage.session.set({
        fctpChallenge: true,
        fctpClaim: claim,
        fctpIssuers: fctpTrustees
      });

      if (!claim) return;
      
      pendingFctp = { claim, issuers: fctpTrustees  };
      
      chrome.tabs.reload(details.tabId);
    }

  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!pendingFctp) return;

    const headers = details.requestHeaders || [];

    let claim = pendingFctp.claim
    let issuers = pendingFctp.issuers
    let tokenResponse = null;
    for(let i = 0; i < issuers.length; i++) {   
      if(storage.length(issuers, claim) !== 0) {
        tokenResponse = storage.pop(issuers, claim);
        break;
      }
    }

    headers.push({ name: "FCTP-Nonce", value: randomAscii(32)});
    headers.push({ name: "FCTP-Token", value: tokenResponse.token });

    pendingFctp = null;

    return { requestHeaders: headers };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders", "extraHeaders"]
);

function randomAscii(n) {
  let result = "";
  for (let i = 0; i < n; i++) {
    const code = Math.floor(Math.random() * 95) + 32;
    result += String.fromCharCode(code);
  }
  return result;
}