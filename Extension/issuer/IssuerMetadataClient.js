import IssuerMetadata from "./IssuerMetadata.js";

export default class IssuerMetadataClient {

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