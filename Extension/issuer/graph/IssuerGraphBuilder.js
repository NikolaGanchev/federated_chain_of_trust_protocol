import IssuerTrustGraph from "./IssuerTrustGraph";

export default class IssuerGraphBuilder {

    constructor() {
        this.visited = new Set();
        this.graph = new IssuerTrustGraph();
    }

    async build(startIssuerUrl) {
        await this.crawl(startIssuerUrl);

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

        for (const parent of metadata.parents) {
            await this.crawl(parent);
        }
    }

}