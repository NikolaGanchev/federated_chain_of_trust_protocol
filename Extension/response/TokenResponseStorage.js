import TokenResponse from "./TokenResponse";

class Mutex {
    constructor() {
        this.locked = false;
        this.waiters = [];
    }

    async lock() {
        if (!this.locked) {
            this.locked = true;
            return;
        }
        return new Promise(resolve => this.waiters.push(resolve));
    }

    unlock() {
        if (this.waiters.length) {
            const next = this.waiters.shift();
            next();
        } else {
            this.locked = false;
        }
    }

    async runExclusive(fn) {
        await this.lock();
        try {
            return await fn();
        } finally {
            this.unlock();
        }
    }
}

export default class TokenResponseStorage {

    static STORAGE_KEY = "ftp_token_store";

    static #mutex = new Mutex();
    static #loaded = false;

    // Map<issuerId::claimType, TokenResponse[]>
    static #tokens = new Map();

    static #key(issuerId, claimType) {
        return `${issuerId}::${claimType}`;
    }

    static async #ensureLoaded() {
        if (this.#loaded) return;

        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        const stored = result[this.STORAGE_KEY];

        this.#tokens = new Map();

        if (stored) {
            for (const [key, list] of Object.entries(stored)) {
                const tokens = [];

                for (const value of list) {
                    const token = TokenResponse.fromJSON(value);
                    if (!token.isExpired()) {
                        tokens.push(token);
                    }
                }

                if (tokens.length) {
                    this.#tokens.set(key, tokens);
                }
            }
        }

        this.#loaded = true;
    }

    static async #persist() {
        const serialized = {};

        for (const [key, tokens] of this.#tokens.entries()) {
            serialized[key] = tokens.map(t => t.toJSON());
        }

        await chrome.storage.local.set({
            [this.STORAGE_KEY]: serialized
        });
    }

    static async add(token) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(token.issuerId, token.claimType);

            if (!this.#tokens.has(key)) {
                this.#tokens.set(key, []);
            }

            this.#tokens.get(key).push(token);

            await this.#persist();
        });
    }

    static async peek(issuerId, claimType) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(issuerId, claimType);
            const queue = this.#tokens.get(key);

            if (!queue || queue.length === 0) return null;

            return queue[0];
        });
    }

    static async pop(issuerId, claimType) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(issuerId, claimType);
            const queue = this.#tokens.get(key);

            if (!queue || queue.length === 0) return null;

            const token = queue.shift();

            if (queue.length === 0) {
                this.#tokens.delete(key);
            }

            await this.#persist();

            return token;
        });
    }

    static async remove(issuerId, claimType, predicate) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(issuerId, claimType);
            const queue = this.#tokens.get(key);

            if (!queue) return null;

            const index = queue.findIndex(predicate);
            if (index === -1) return null;

            const removed = queue.splice(index, 1)[0];

            if (queue.length === 0) {
                this.#tokens.delete(key);
            }

            await this.#persist();

            return removed;
        });
    }

    static async getAll(issuerId, claimType) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(issuerId, claimType);
            const queue = this.#tokens.get(key);

            if (!queue) return [];

            return [...queue];
        });
    }

    static async size(issuerId, claimType) {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();

            const key = this.#key(issuerId, claimType);
            const queue = this.#tokens.get(key);

            return queue ? queue.length : 0;
        });
    }

    static async keys() {
        return this.#mutex.runExclusive(async () => {
            await this.#ensureLoaded();
            return [...this.#tokens.keys()];
        });
    }
}
