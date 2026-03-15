import TrustGraph from "./TrustGraph.js";

export default class TrustGraphStore {

  static STORAGE_KEY = "fctp_trust_graphs";

  constructor() {
    this.graphs = new Map();
  }

  async load() {
    const result = await chrome.storage.local.get(TrustGraphStore.STORAGE_KEY);
    
    const storedData = result[TrustGraphStore.STORAGE_KEY];
    
    if (!storedData) return;

    for (const name of Object.keys(storedData)) {
      this.graphs.set(name, TrustGraph.fromJSON(storedData[name]));
    }
  }

  async persist() {
    const obj = {};

    for (const [startIssuerUrl, graph] of this.graphs.entries()) {
      obj[startIssuerUrl] = graph.toJSON();
    }

    await chrome.storage.local.set({ [TrustGraphStore.STORAGE_KEY]: obj });
  }

  async add(startIssuerUrl, graph) {
    this.graphs.set(startIssuerUrl, graph);
    await this.persist();
  }

  async remove(startIssuerUrl) {
    this.graphs.delete(startIssuerUrl);
    await this.persist();
  }

  get(startIssuerUrl) {
    return this.graphs.get(startIssuerUrl) || null;
  }

  has(startIssuerUrl) {
    return this.graphs.has(startIssuerUrl);
  }

  async clear() {
    this.graphs.clear();
    await this.persist();
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