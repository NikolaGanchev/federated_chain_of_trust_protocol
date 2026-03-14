export default class IssuerTrustGraphStorage {

    static STORAGE_KEY = "fctp_trust_graphs";

    static async saveGraphs(graphs) {

        const serialized = graphs.map(g => g.toJSON());

        return new Promise((resolve, reject) => {

            chrome.storage.local.set(
                { [this.STORAGE_KEY]: serialized },
                () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                }
            );

        });
    }

    static async loadGraphs() {

        return new Promise((resolve, reject) => {

            chrome.storage.local.get(
                [this.STORAGE_KEY],
                (result) => {

                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }

                    const stored = result[this.STORAGE_KEY] || [];

                    const graphs = stored.map(g =>
                        IssuerTrustGraph.fromJSON(g)
                    );

                    resolve(graphs);
                }
            );

        });
    }

}