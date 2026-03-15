**FEDERATED CHAIN OF TRUST PROTOCOL**

*FCTP/1.0*

A Privacy-Preserving, Federated Identity Verification Protocol

# **Abstract**

The Federated Trust Protocol (FCTP) defines a general-purpose, privacy-preserving framework for identity and attribute verification across the internet. It enables any website to accept verified claims — such as age or nationality — without implementing custom integrations against government APIs or third-party identity providers. 

FCTP operates as an open, directed trust graph. Any entity — from a government ministry to a local chess club — can act as an issuer. Websites declare which issuers they trust; users present a single token exchanged directly at the highest trusted issuer, regardless of how deep in the graph their original credential originates.

The protocol is designed to sit on top of existing identity infrastructure — including eIDAS 2.0 — rather than replace it. It is token-format agnostic, supporting Privacy Pass blinded tokens, SD-JWT, mdoc, and others.

# **1\. Motivation and Goals**

## **1.1 The Problem**

Age and identity verification on the internet is broken in two distinct ways:

* Websites bear an enormous implementation burden. Integrating even a handful of government identity providers requires managing a list of separate APIs, compliance obligations, and legal agreements per jurisdiction.

* Users repeat the same verification process dozens of times, uploading sensitive documents to unknown third parties with no control over what is stored or shared.

## **1.2 Design Goals**

| Goal | Description |
| :---- | :---- |
| Privacy by default | Verifying websites learn only the minimum necessary claim. The origin issuer is never revealed. |
| Minimal integration cost | A website integrates once against the FCTP API and automatically accepts tokens from any issuer in its trusted graph. |
| No mandatory root | There is no central authority. Any entity can be an issuer. Trust is established by declaration. |
| Single-hop exchange | A user exchanges their local token directly at the target issuer in one call, regardless of chain depth. |
| Format agnostic | Existing identity systems plug in at the trust layer without reimplementing the issuing process. |
| Scalable by design | No endpoint serves more than its own immediate relationships. Load is bounded and predictable. |

# **2\. Architecture Overview**

## **2.1 The Trust Graph**

FCTP models the identity ecosystem as a directed trust graph. Each node is an issuer. A directed edge from node A to node B means: 'A trusts the tokens issued by B.' Trust flows strictly downward — a child node does not inherit trust from its parent and cannot act on its behalf.

There is no mandatory root. Websites declare the set of issuers they trust directly. An issuer gains effective reach proportional to how many websites (directly or transitively) include it in their trust graph.

|  *Example: A website trusts MegaIssuer(ex. Cloudflare). MegaIssuer trusts the EU federation. The EU federation trusts national issuers. A national issuer trusts regional clerks. A clerk verifies a physical ID and mints a key. The key can then be used to mint a token from our local issuer. That token, when presented to MegaIssuer, is valid at the website — but the website only ever sees a MegaIssuer-signed token.* |
| :---- |

## **2.2 Bidirectional Awareness: Children and Parents**

Each node in the graph maintains two lists:

* trusts (children): the set of issuers this node directly trusts. Populated by the node operator's own configuration.

* parents: the set of issuers that have declared trust in this node. Populated by the node operator's own configuration.

This bidirectional awareness is essential. A leaf issuer (e.g. Sofia) needs to know who its parents are so a client can determine the path to the target issuers. Without the parents field, upward traversal would require scanning the entire graph.

## **2.3 Single-Hop Exchange**

The defining performance characteristic of FCTP is that token exchange is always a single call from the client to the target issuer, regardless of chain depth. The client does not walk the chain step by step.

When a client holds a Sofia-issued token and needs a MegaIssuer token:

* Client presents the Sofia token directly to MegaIssuer via /exchange\_token.

* MegaIssuer verifies the token's signature against Sofia's public key (fetched from Sofia's /.well-known/FCTP-issuer).

* MegaIssuer issues a fresh token. Done — in one round trip.

MegaIssuer maintains its transitive trust cache via a background crawl (see Section 5). This cache is keyed by issuer\_id and stores the public key and trust path for every node reachable from MegaIssuer's direct children. The crawl is driven by each node's TTL, not by client requests — so there is no per-request chain traversal and no DDoS risk.

## **2.4 Three Protocol Layers**

| Layer | Responsibility |
| :---- | :---- |
| 1 — Transport | HTTP endpoints, request/response formats, error codes. Defines how nodes communicate. |
| 2 — Token | Supported token formats (Privacy Pass, SD-JWT, mdoc, JWT), nullifier scheme. |
| 3 — Trust | How nodes declare and discover trust relationships, parent registration. |

## **2.5 Multi-Tenant Issuers**

A single server may hold private keys and manage trust relationships for many independent groups (a chess club, a neighbourhood association, a guild). Each tenant has a distinct issuer\_id and key pair. The host server's identity is never exposed to relying parties.

# **3\. Actors and Roles**

| Actor | Description |
| :---- | :---- |
| Issuer | Any entity that mints tokens asserting claims. May be a government body, corporation, community organisation, or automated system. |
| Client | Software on the user's device that stores tokens, selects the correct one to present, and performs the single-hop exchange. |
| Relying Party (RP) | A website that requests a verified claim from the user. |
| Trust Graph | The collective directed graph of all trust declarations across all participants. No single entity owns it. |

# **4\. Issuer Node Endpoints**

Every FCTP-compliant issuer node MUST expose the following endpoints over HTTPS. There is no /trust\_path endpoint — each node serves only its own immediate relationships. Transitive graph knowledge is the responsibility of the node that needs it, built via background crawl.

## **4.1  GET /.well-known/fctp-issuer**

Returns this issuer's metadata: its public key, the issuers it directly trusts (children), and the issuers that have registered as its parents. This is the single source of truth for graph topology. 

| Response 200 {   "issuer\_id":   "https://sofia.bg",   "display\_name": "Sofia Municipal Issuer",   “verification\_delegation”: “call”,   “public\_key”: \<key\>,   "token\_formats": \["privacy-pass", "jwt"\],   "claim":      "nationality:BG",   "trusts":      \["https://clerk-a.sofia.bg", "https://clerk-b.sofia.bg"\],   "parents":     \["https://bulgaria.bg"\],   "ttl":         86400 } |
| :---- |
| *The ttl field tells any crawling parent how frequently to re-fetch this metadata. This drives the background crawl schedule and prevents unnecessary load on leaf nodes.* |

“verification\_delegation: call” means that the server may need to nullify or specially process tokens. This means If a Sofia token is trying to promote itself to a Europe token, the Europe server MUST call the Sofia one to verify its own token and not do it locally. 

Any Issuer MUST only trust children who issue the same or a stronger claim.

**Origin Matching Rule:** When the background crawler fetches metadata from a URL, it **MUST** verify that the scheme and authority (origin) of the fetched URL exactly match the scheme and authority of the `"issuer_id"` declared in the resulting payload. 

## **4.2 POST /exchange\_token**

The core exchange endpoint. Accepts a token from any transitively trusted child issuer and returns a fresh token signed by this issuer. The client calls this endpoint only on the target issuer — not on every intermediate node.

| Request {   "child\_token":      "\<token bytes — format specified by child\_token\_type\>",   "child\_token\_type": "privacy-pass",   "child\_issuer\_id":  "https://sofia.bg",   "claim":            "nationality:BG" } Response 200 {   "token":      "\<fresh token signed by this issuer\>",   "token\_type": "privacy-pass",   "claim":      "nationality:BG",   "issuer\_id":  "https://megaissuer.com",   "expires\_at": 1717086400 } Response 403  (child\_issuer\_id not in transitive trust cache,                or token signature invalid, or claim mismatch) |
| :---- |

## **4.3 POST /verify\_token**

Verifies a token presented by an RP or relay. 

| Request {   "token":      "\<token bytes\>",   "token\_type": "privacy-pass",   "claim":      "nationality:BG",   "nonce":      "\<random value from client\>" } Response 200 {   "valid":       true,   "claim":       "nationality:BG",   "issuer\_id":   "https://megaissuer.com",   "verified\_at": 1717000000,   "nonce\_sig":   "\<sig over client nonce, if nonce was provided\>" } |
| :---- |

# **5\. Transitive Trust Cache and Background Crawl**

Every issuer that acts as a trust root for one or more relying parties MUST maintain a transitive trust cache — a map of every issuer\_id reachable transitively from its direct children, along with their public keys and the path by which they are trusted.

## **5.1 Cache Structure**

| trust\_cache\[issuer\_id\] \= {   public\_key:  \<JWK\>,   path:        \["https://bulgaria.bg", "https://sofia.bg"\],   cached\_at:   \<unix timestamp\>,   ttl:         86400,     // from the node's own /.well-known/FCTP-issuer   expires\_at:  \<cached\_at \+ ttl\> } |
| :---- |

## **5.2 Crawl Behaviour**

* On startup, crawl all direct children recursively, respecting each node's TTL.

* Run a background job that re-fetches nodes whose expires\_at has passed.

* Crawl is depth-first from direct children with cycle detection. Each node's TTL governs its own refresh frequency independently.

* If an issuer is unreachable during crawl, retain the stale cache entry until 2x TTL, then remove it and treat as untrusted.

* When a child is removed from the direct trust list, remove it and all nodes reachable only through it from the cache.

# **6\. Complete Verification Flow**

This section describes the full flow for a nationality login. The user holds a Sofia-issued credential. The website trusts MegaIssuer only.

## **Step 1 — RP Declares Its Requirements**

| GET https://website.com/.well-known/FCTP-relying-party {   "trusted\_issuers":  \["https://megaissuer.com"\],   "accepted\_claim":  "nationality:BG" } |
| :---- |

## **Step 2 — Client Determines Exchange Target**

The client checks its token store. It holds a Sofia token. It needs a MegaIssuer token. It does not walk the chain manually — it calls /exchange\_token directly on MegaIssuer with the Sofia token. MegaIssuer's background crawl has already established that Sofia is transitively trusted.

|  *If the client holds tokens at multiple chain levels (Sofia, Bulgaria, MegaIssuer), it always uses the highest-level one it has, skipping the exchange entirely if it already holds a valid MegaIssuer token.* |
| :---- |

## **Step 3 — Single-Hop Exchange**

| POST https://megaissuer.com/exchange\_token {   "child\_token":      "\<Sofia JWT\>",   "child\_token\_type": "jwt",   "child\_issuer\_id":  "https://sofia.bg",   "claim":            "nationality:BG" } → 200 {   "token":      "\<fresh MegaIssuer JWT\>",   "token\_type": "jwt",   "claim":      "nationality:BG",   "issuer\_id":  "https://megaissuer.com",   "expires\_at": 1717086400 } |
| :---- |

MegaIssuer looks up sofia.bg in its trust cache (a local operation), verifies the token signature using the cached public key, and issues a fresh token. In most cases, especially with single use tokens, this will result in a network call.

## **Step 4 — Client Presents Token to RP**

| POST https://website.com/FCTP-callback {   "token":      "\<MegaIssuer JWT\>",   "token\_type": "jwt",   "claim":      "nationality:BG",   "nonce":      "a3f8c2..." } |
| :---- |

The nonce is to prevent token stealing. A website can verify the user without actually calling the issuer, in turn allowing it to steal a token. The /verify-token path requires the user nonce and the website it is for, which it signs. [website.com](http://website.com) then sends back the new JWT as a verification that the key indeed was spent, which the client can verify. If the server does not send this back, the client can take protective action by issuing a signal to the issuer servers, adding the site to a blacklist, and taking steps to spend the token. Technically, a website could still perform a theft attack by offloading the token to a third party which presents a false website to the verifier. However, in reality, this an inherent property of transitivie trust \- a third party is not differentiable from just a different internal service. 

## **Step 5 — RP Verifies and Logs In**

* Remote path: RP calls MegaIssuer /verify\_token with the nonce. Checks returned nonce\_sig for liveness assurance.

* Megaissuers stores the token nullifier to prevent replay.

* User is logged in. The RP knows: nationality:BG, verified by MegaIssuer. Nothing else.

# **7\. Client Behaviour**

## **7.1 Minimum Specificity Rule**

When multiple tokens satisfy an RP's requirements, the client MUST present the token signed by the highest (most general) issuer available. This prevents the RP from inferring the user's jurisdiction or community from the token issuer field.

## **7.2 Single-Hop Exchange**

The client MUST NOT walk the trust chain manually by calling /exchange\_token on each intermediate node. It presents its lowest-level token directly to the target issuer. Chain verification is the target issuer's responsibility.

## **7.3 Multiple Parents**

An issuer may have multiple parents (e.g. Sofia trusted by both Bulgaria and a Balkans regional issuer). When the client needs to reach a specific target issuer, it consults the parents field of its current token's issuer to determine which parent leads toward the target. It picks the parent that is closer to the target in the graph and calls /exchange\_token on the target directly.

## **7.4 Per-Site Issuer Whitelist**

Users MAY configure the client to restrict which issuers are eligible for specific sites. Enforced entirely client-side.

## **7.5 Token Pre-warming**

Clients SHOULD proactively exchange tokens up to the highest available level after initial issuance, reducing latency at verification time.

# **8\. Supported Token Formats**

| Format | Notes |
| :---- | :---- |
| Privacy Pass (RFC 9576\) | Baseline mandatory format. Provides unlinkability between issuance and redemption. |
| SD-JWT | Used by eIDAS 2.0 wallets. Supports selective disclosure of claim attributes. |
| mdoc / ISO 18013-5 | Mobile driving licence format. Used by Apple and Google Wallet. |
| Non-blinded JWT | For systems where auditability outweighs privacy. Must be documented by the issuer. |
| Proof-of-work | For anti-bot use cases. No identity claim; proves computational effort. |

| *Blinded tokens are non-revocable after issuance. Tokens issued before a child issuer is removed from the trust graph remain valid until expiry. Short TTLs (24–72 hours) mitigate this window. This is a fundamental property of blinded token schemes, not a defect of this protocol.* |
| :---- |

# **9\. Canonical Claim Vocabulary**

| Claim Identifier | Meaning |
| :---- | :---- |
| age\_over\_18 | Holder is 18 or older at time of issuance. |
| age\_over\_21 | Holder is 21 or older at time of issuance. |
| nationality:{ISO3166} | Holder is a national of the specified country. |
| resident\_of:{ISO3166} | Holder is a legal resident of the specified country. |
| verified\_human | Holder has passed a human-verification challenge. |
| member\_of:{issuer\_id} | Holder is a verified member of the group operated by the named issuer. |

# **10\. Trust Discovery**

FCTP has no mandatory root and no central registry. Discovery happens through complementary mechanisms:

## **10.1 Direct Declaration**

A website operator adds an issuer\_id to their trusted\_issuers list after their own due diligence.

## **10.2 DNS-Based Discovery**

| \_FCTP.issuer.example.com. TXT "v=FCTP1; url=https://issuer.example.com/.well-known/FCTP-issuer" |
| :---- |

## **10.3 Transitive Trust**

If a site trusts Issuer A and Issuer A trusts Issuer B, the site transitively accepts tokens from Issuer B via the single-hop exchange mechanism. No additional RP configuration is needed.

# **11\. Issuer Revocation**

If a child issuer becomes compromised, any parent removes it from its trust list. The background crawl then removes the child from the transitive trust cache within one TTL cycle. Subsequent /exchange\_token calls with tokens from that issuer return 403\.

An issuer can also be made invisible by being omitted from a parent's trusts list — it does not appear in the crawl and is therefore unreachable from any RP that trusts that parent.

The child can also drop a parent. This is done passively. The child simply deletes and blacklists the parent from its trustee list that it returns /fctp-issuer. Then, clients, upon updating the cache, will not know that child tokens can be exchanged for parent tokens and in turn will not send child tokens to RPs requesting the dropped parent.

|  *Revocation is effective within one TTL period. This is the primary reason leaf nodes should use short TTLs (1–24 hours) for high-stakes claim types.* |
| :---- |

# **Appendix A — Endpoint Summary**

| Endpoint | Description |
| :---- | :---- |
| GET /.well-known/FCTP-issuer | Metadata, public key, direct children (trusts), confirmed parents |
| GET /.well-known/FCTP-relying-party | RP's trusted issuer list and accepted claims (RP only) |
| POST /exchange\_token | Exchange a child token for a fresh token from this issuer |
| POST /verify\_token | Verify a token's validity, claim, and optional nonce |
