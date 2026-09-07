service AiChatService @(path: '/hf') {
    /**
     * An OData Action to send a prompt to the Hugging Face model and get a response.
     * @param prompt The text prompt to send to the AI.
     * @returns A string containing the AI's generated response.
     */
    action askAI(prompt : String) returns {
        content : String
    };
}
