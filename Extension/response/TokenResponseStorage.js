import TokenResponse from "./TokenResponse";

export default class TokenResponseStore {

    static STORAGE_KEY = "ftp_token_store";

    static async save(tokens) {

        const serialized = {};

        for (const [key, token] of tokens.entries()) {
            serialized[key] = token.toJSON();
        }

        await chrome.storage.local.set({
            [this.STORAGE_KEY]: serialized
        });
    }

    static async loadResponses() {

        const result = await chrome.storage.local.get(this.STORAGE_KEY);

        const stored = result[this.STORAGE_KEY];

        if (!stored) {
            return new Map();
        }

        const map = new Map();

        for (const [key, value] of Object.entries(stored)) {

            const token = TokenResponse.fromJSON(value);

            if (!token.isExpired()) {
                map.set(key, token);
            }

        }

        return map;
    }

}