export default class TrustGraphStore {

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