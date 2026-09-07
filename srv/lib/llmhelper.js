// const hfClientSingleton = require('./huggingface-client');
const { getHuggingFaceClient } = require('./huggingface-client');

/**
 * Handles freestyle text generation using the Hugging Face Inference API.
 * @param {string} prompt The user's input prompt.
 * @returns {Promise<{content: string}>} The generated text response from the model.
 * @throws {Error} If the Hugging Face client is not initialized or the API call fails.
 */
async function freestyleTextGen(prompt) {
    const client = getHuggingFaceClient(); // hfClientSingleton.getClient(); 
    const hfModelId = "Qwen/Qwen2.5-7B-Instruct"; 

    const finalPrompt = `${prompt}\n\nNote: Keep the response brief and relevant. Avoid excessive explanation.`;

    try {
        console.log("Calling Hugging Face chat completion API...");
        const chatCompletion = await client.chatCompletion({
            provider: "together",
            model: hfModelId,
            messages: [
                {
                    role: "user",
                    content: finalPrompt,
                },
            ],
        });

        console.log("Hugging Face response received.");

        if (chatCompletion?.choices?.[0]?.message?.content) {
            return { content: chatCompletion.choices[0].message.content.trim() };
        } else {
            throw new Error("Hugging Face API returned an unexpected or empty chat completion response.");
        }

    } catch (error) {
        console.error(`Freestyle LLM call failed: ${error.message}`);
        if (error.response?.data) {
            console.error("Hugging Face API Error Details:", error.response.data);
        }
        throw new Error(`LLM freestyle inference failed: ${error.message}`);
    }
}



module.exports = {
    freestyleTextGen
};
