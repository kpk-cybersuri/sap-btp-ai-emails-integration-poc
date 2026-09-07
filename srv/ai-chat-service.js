const cds = require('@sap/cds');
const { freestyleTextGen } = require('./lib/llmhelper');

class HuggingFaceService extends cds.ApplicationService {
    async init() {
        console.log("Activating HuggingFaceService...");

        this.on('askAI', this.onAskedAI);

        await super.init();
    }

    /**
     * OData Action Handler for hfChat.
     * @param {object} req The CAPM request object.
     */
    async onAskedAI(req) {
        const { prompt } = req.data;
        console.log(`Received prompt for Hugging Face chat via OData: "${prompt}"`);

        try {
            const response = await freestyleTextGen(prompt);
            return response;
        } catch (error) {
            console.error(`Error in CAPM hfChat action handler: ${error.message}`);
            if (error.message.includes("Hugging Face client is not initialized")) {
                req.error(400, "Hugging Face client setup error: " + error.message);
            } else if (error.message.includes("LLM freestyle inference failed")) {
                req.error(500, "Failed to get response from Hugging Face: " + error.message);
            } else {
                req.error(500, "An unexpected error occurred: " + error.message);
            }
        }
    }
}

module.exports = HuggingFaceService;
