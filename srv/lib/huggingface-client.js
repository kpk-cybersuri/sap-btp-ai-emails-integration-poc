const { InferenceClient } = require('@huggingface/inference');
const { secrets } = require('./secretLoader');

// class HuggingFaceClientSingleton {
//     constructor() {
//         if (!HuggingFaceClientSingleton.instance) {
//             this.hfApiToken = secrets.HF_API_TOKEN;
//             this.client = null;

//             if (!this.hfApiToken) {
//                 console.warn("HF_API_TOKEN not found. Hugging Face client may not initialize correctly.");
//             } else {
//                 try {
//                     this.client = new InferenceClient(this.hfApiToken);
//                     console.log("Hugging Face Inference Client initialized.");
//                 } catch (e) {
//                     console.error(`ERROR: Failed to initialize Hugging Face Inference Client: ${e.message}`);
//                     this.client = null;
//                 }
//             }
//             HuggingFaceClientSingleton.instance = this;
//         }
//         return HuggingFaceClientSingleton.instance;
//     }

//     getClient() {
//         if (!this.client) {
//             throw new Error("Hugging Face client is not initialized. Please ensure HF_API_TOKEN is set.");
//         }
//         return this.client;
//     }
// }

// module.exports = new HuggingFaceClientSingleton();


let hfClientInstance = null; // This will hold the singleton instance

/**
 * Initializes the Hugging Face Inference Client.
 * This function should be called once during application bootstrap (e.g., in server.js).
 * @param {string} apiToken The Hugging Face API token.
 * @returns {InferenceClient} The initialized client instance.
 * @throws {Error} If the API token is missing or client initialization fails.
 */
function initializeHuggingFaceClient(apiToken) {
    if (hfClientInstance) {
        console.warn("Hugging Face client already initialized. Skipping re-initialization.");
        return hfClientInstance;
    }

    if (!apiToken) {
        const errorMsg = "HF_API_TOKEN is missing. Cannot initialize Hugging Face client.";
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        hfClientInstance = new InferenceClient(apiToken);
        console.log("Hugging Face Inference Client initialized during bootstrap.");
        return hfClientInstance;
    } catch (e) {
        const errorMsg = `ERROR: Failed to initialize Hugging Face Inference Client: ${e.message}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }
}

/**
 * Gets the globally initialized Hugging Face Inference Client instance.
 * @returns {InferenceClient} The initialized client.
 * @throws {Error} If the client has not been initialized yet.
 */
function getHuggingFaceClient() {
    if (!hfClientInstance) {
        throw new Error("Hugging Face client not initialized. Call initializeHuggingFaceClient first.");
    }
    return hfClientInstance;
}

module.exports = {
    initializeHuggingFaceClient,
    getHuggingFaceClient 
};

