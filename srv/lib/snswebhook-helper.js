const { getHuggingFaceClient } = require('./huggingface-client');
const cds = require('@sap/cds');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const { generateExcelReport } = require('./excel-helper');


/**
 * Extracts the reply text from a raw email content string.
 * This function handles both plain text and multipart emails,
 * specifically looking for the 'text/plain' section and then
 * parsing out quoted reply content.
 * @param {string} fullEmailContent The raw email content as a string.
 * @returns {string} The extracted reply text.
 */
function extractReplyText(fullEmailContent) {
    // 1. Find the plain text part of the email.
    // This is necessary for multipart emails.
    const plainTextSectionMarker = 'Content-Type: text/plain';
    const plainTextSectionEndMarker = '--'; // Boundary for multipart

    let textContent = '';
    const startOfPlainText = fullEmailContent.indexOf(plainTextSectionMarker);

    if (startOfPlainText !== -1) {
        const afterMarker = fullEmailContent.substring(startOfPlainText + plainTextSectionMarker.length);
        const endOfPlainText = afterMarker.indexOf(plainTextSectionEndMarker);

        if (endOfPlainText !== -1) {
            textContent = afterMarker.substring(0, endOfPlainText).trim();
        } else {
            // Handle cases where the email might not have a clean boundary
            textContent = afterMarker.trim();
        }
    } else {
        // Fallback for simple emails that are not multipart
        textContent = fullEmailContent;
    }

    // 2. Look for common reply markers and split the content.
    const replyMarkers = [
        "On Thu, 7 Aug 2025 at", // A specific marker found in your logs
        "On [A-Za-z]{3}, [0-9]{1,2} [A-Za-z]{3} [0-9]{4} at", // Generic marker for Gmail
        "From: ", // A more generic marker
        "---",
        "--- Original Message ---",
        "_____",
        "Subject: "
    ];

    for (const marker of replyMarkers) {
        const regex = new RegExp(marker, 'i');
        const markerIndex = textContent.search(regex);

        if (markerIndex !== -1) {
            const reply = textContent.substring(0, markerIndex).trim();
            // Clean up any quoted-printable encoding artifacts
            return reply.replace(/=E2=80=AF/g, '').replace(/=3D/g, '').replace(/\r\n/g, '\n').trim();
        }
    }

    // If no marker is found, assume the entire content is the reply.
    return textContent.replace(/=E2=80=AF/g, '').replace(/=3D/g, '').replace(/\r\n/g, '\n').trim();
}

/**
 * Decodes a string encoded with quoted-printable encoding.
 * This is a helper function to make the email content readable.
 * @param {string} encodedString The string with quoted-printable encoding.
 * @returns {string} The decoded string.
 */
function decodeQuotedPrintable(encodedString) {
    // Replace =XX sequences with the corresponding character
    const decoded = encodedString.replace(/=([0-9A-Fa-f]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    });
    // Replace = followed by newline
    return decoded.replace(/=\r\n/g, '').trim();
}

/**
 * Extracts the user's reply from a multipart email body.
 * This function first isolates the `text/plain` part, decodes it,
 * and then extracts the new message by looking for common reply markers.
 *
 * @param {string} fullEmailContent The raw, full email body content from SNS.
 * @returns {string} The extracted, decoded reply text.
 */
function robustExtractReplyText(fullEmailContent) {
    // 1. Find the plain text part of the multipart email.
    // The regular expression looks for the 'text/plain' content type
    // and captures the content between the boundaries.
    const plaintextRegex = /Content-Type: text\/plain;[\s\S]*?Content-Transfer-Encoding: quoted-printable\r\n\r\n([\s\S]*?)(?:--|$)/;
    const match = fullEmailContent.match(plaintextRegex);

    if (!match || match.length < 2) {
        console.error("Could not find the plain text part of the email.");
        return "";
    }

    let plaintextBody = match[1];

    // 2. Decode the quoted-printable content.
    plaintextBody = decodeQuotedPrintable(plaintextBody);

    // 3. Extract the reply text using the known reply marker.
    // The marker is typically 'On [Date], [Sender] wrote:'
    const replyMarkerIndex = plaintextBody.indexOf('On Thu, 7 Aug 2025 at 9:49 PM, <mailbot@gobridge4tasks.site> wrote:');

    if (replyMarkerIndex > -1) {
        // Everything before this line is the new message.
        return plaintextBody.substring(0, replyMarkerIndex).trim();
    }

    // If no specific marker is found, we might be dealing with a simple reply
    // that just has a '>' prefix on the quoted content.
    // This regex looks for lines not starting with '>' or any whitespace.
    const replyLines = plaintextBody.split('\n').filter(line => !line.trim().startsWith('>'));
    if (replyLines.length > 0) {
        return replyLines.join('\n').trim();
    }

    // If all else fails, return the entire body as a last resort.
    return plaintextBody.trim();
}

/**
 * Extracts the user's reply from a multipart email body.
 * This function first isolates the `text/plain` part, decodes it,
 * and then extracts the new message by looking for common reply markers.
 *
 * @param {string} fullEmailContent The raw, full email body content from SNS.
 * @returns {string} The extracted, decoded reply text.
 */
function robustExtractReplyText2(fullEmailContent) {
    // 1. Find the plain text part of the multipart email.
    // The regular expression looks for the 'text/plain' content type
    // and captures the content between the boundaries.
    const plaintextRegex = /Content-Type: text\/plain;[\s\S]*?Content-Transfer-Encoding: quoted-printable\r\n\r\n([\s\S]*?)(?:--|$)/;
    const match = fullEmailContent.match(plaintextRegex);

    if (!match || match.length < 2) {
        console.error("Could not find the plain text part of the email.");
        return "";
    }

    let plaintextBody = match[1];

    // 2. Decode the quoted-printable content.
    plaintextBody = decodeQuotedPrintable(plaintextBody);

    // 3. Extract the reply text using a flexible regular expression.
    // This regex looks for the pattern 'On <date> at <time>, <sender> wrote:'
    // and captures everything before it.
    const replyMarkerRegex = /On (?:.+? at )?(\d{1,2}:\d{2}\s?(?:AM|PM)?,?) <.*?> wrote:/i;
    const replyMarkerIndex = plaintextBody.search(replyMarkerRegex);

    if (replyMarkerIndex > -1) {
        // Everything before this line is the new message.
        return plaintextBody.substring(0, replyMarkerIndex).trim();
    }

    // As a fallback, check for common signature markers like '---' or '__'
    const signatureMarkers = ['---', '___', 'From:', 'Sent from my'];
    for (const marker of signatureMarkers) {
        const markerIndex = plaintextBody.indexOf(marker);
        if (markerIndex > -1) {
            return plaintextBody.substring(0, markerIndex).trim();
        }
    }

    // If no specific marker is found, we might be dealing with a simple reply
    // that just has a '>' prefix on the quoted content.
    // This regex looks for lines not starting with '>' or any whitespace.
    const replyLines = plaintextBody.split('\n').filter(line => !line.trim().startsWith('>'));
    if (replyLines.length > 0) {
        return replyLines.join('\n').trim();
    }

    // If all else fails, return the entire body as a last resort.
    return plaintextBody.trim();
}

/**
 * Function 1: Sends the user's reply to the LLM with a detailed context.
 * It instructs the LLM to either provide a SQL SELECT query or a free-form text response.
 * @param {string} userReply The extracted reply text from the user's email.
 * @returns {Promise<string>} The raw response string from the LLM.
 */
async function askAIForQueryOrText(userReply) {
    console.log("[DEBUG] Attempting to process extracted user's reply using AI");

    const fullPrompt2 = `
    You are an AI assistant that decodes user requests from emails. Your task is to analyze the user's request and provide a structured response based on the following rules.

    Output Rules:
    - If the user's request is a clear request for data, you MUST generate a SQL SELECT query. The response must start with the keyword "QUERY ".
    - For all other requests (questions, gibberish, invalid commands), you MUST generate a natural language response. The response must start with the keyword "RESPONSETEXT ".

    SQL Query Generation Rules:
    - The table name is 'DailyIdocData'.
    - The available columns are: ID, DATE, MODULE, DIRECTION, MESTYP, SYSTEM, SUCESS_OAPI, FAIL_OAPI, SUCESS_OCPI, FAIL_OCPI, STATUSTEXT.
    - Only generate a SELECT query using these columns. Do not add or modify the schema.
    - Do not generate any other SQL statements like INSERT, UPDATE, or DELETE. If a user asks for these, respond with a blocking RESPONSETEXT.
    - If a user provides a SELECT statement, validate its syntax and columns against the schema and return it verbatim if valid. If it's invalid, respond with a RESPONSETEXT.

    Response Tone Rules:
    - For genuine questions related to the IDoc data, provide a helpful and respectful RESPONSETEXT.
    - For malicious, irrelevant, or unperformable requests (e.g., 'Delete the data', 'Send email again', gibberish), provide a firm but respectful blocking RESPONSETEXT that states the action cannot be performed.

    Examples:
    - User asks "Show me all failure IDocs for MESTYP 'COSMAS'":
      "QUERY SELECT ID, DATE, MESTYP, FAIL_OAPI FROM DailyIdocData WHERE MESTYP = 'COSMAS' AND FAIL_OAPI > 0"
    - User asks "How many HRMD_A IDocs failed?":
      "QUERY SELECT SUM(FAIL_OAPI) + SUM(FAIL_OCPI) AS TotalFailures FROM DailyIdocData WHERE MESTYP = 'HRMD_A'"
    - User asks "I need help with my coffee machine":
      "RESPONSETEXT I'm sorry, I can only provide data related to the IDoc report and cannot assist with that request."
    - User asks "DELETE FROM DailyIdocData WHERE FAIL_OAPI > 100":
      "RESPONSETEXT I am unable to perform that action. For security reasons, I can only provide SELECT queries for data retrieval."

    User's Reply:
    "${userReply}"

    Your response must start with either "QUERY " or "RESPONSETEXT ".
    `;

    const fullPrompt4 = `
    You are an AI assistant that decodes user requests from emails. Your task is to analyze the user's request and provide a structured response based on the following rules.

    Output Rules:
    - If the user's request is a clear request for data, you MUST generate ONLY the SQL SELECT query string. Your response must NOT contain any other text, prefixes, or conversational filler.
    - For all other requests (questions, gibberish, invalid commands), you MUST generate ONLY a natural language response. The response must NOT contain any other text or prefixes.

    SQL Query Generation Rules:
    - The table name is 'DailyIdocData'.
    - The available columns are: ID, DATE, MODULE, DIRECTION, MESTYP, SYSTEM, SUCESS_OAPI, FAIL_OAPI, SUCESS_OCPI, FAIL_OCPI, STATUSTEXT.
    - Only generate a SELECT query using these columns. Do not add or modify the schema.
    - Do not generate any other SQL statements like INSERT, UPDATE, or DELETE. If a user asks for these, respond with a blocking natural language response.
    - If a user provides a SELECT statement, validate its syntax and columns against the schema and return it verbatim if valid. If it's invalid, respond with a natural language response.

    Response Tone Rules:
    - For genuine questions related to the IDoc data, provide a helpful and respectful natural language response.
    - For malicious, irrelevant, or unperformable requests (e.g., 'Delete the data', 'Send email again', gibberish), provide a firm but respectful blocking natural language response that states the action cannot be performed.

    Examples:
    - User asks "Show me all failure IDocs for MESTYP 'COSMAS'":
      "SELECT ID, DATE, MESTYP, FAIL_OAPI FROM DailyIdocData WHERE MESTYP = 'COSMAS' AND FAIL_OAPI > 0"
    - User asks "How many HRMD_A IDocs failed?":
      "SELECT SUM(FAIL_OAPI) + SUM(FAIL_OCPI) AS TotalFailures FROM DailyIdocData WHERE MESTYP = 'HRMD_A'"
    - User asks "I need help with my coffee machine":
      "I'm sorry, I can only provide data related to the IDoc report and cannot assist with that request."
    - User asks "DELETE FROM DailyIdocData WHERE FAIL_OAPI > 100":
      "I am unable to perform that action. For security reasons, I can only provide SELECT queries for data retrieval."

    User's Reply:
    "${userReply}"

    Your response should be only the query string or the response text, with no prefixes like "QUERY" or "RESPONSETEXT".
    `;


    const fullPrompt3 = `
    You are an AI assistant that decodes user requests from emails. Your task is to analyze the user's request and provide a structured response based on the following rules.

    Output Rules:
    - If the user's request is a clear request for data, you MUST generate ONLY the SQL SELECT query string. Your response must NOT contain any other text, prefixes, or conversational filler.
    - For all other requests (questions, gibberish, invalid commands), you MUST generate ONLY a natural language response. The response must NOT contain any other text or prefixes.

    SQL Query Generation Rules:
    - The table name is 'DailyIdocData'.
    - The available columns are: ID, DATE, MODULE, DIRECTION, MESTYP, SYSTEM, SUCESS_OAPI, FAIL_OAPI, SUCESS_OCPI, FAIL_OCPI, STATUSTEXT.
    - Only generate a SELECT query using these columns. Do not add or modify the schema.
    - Do not generate any other SQL statements like INSERT, UPDATE, or DELETE. If a user asks for these, respond with a blocking natural language response.
    - If a user provides a SELECT statement, validate its syntax and columns against the schema and return it verbatim if valid. If it's invalid, respond with a natural language response.

    Response Tone Rules:
    - For genuine questions related to the IDoc data, provide a helpful and respectful natural language response.
    - For malicious, irrelevant, or unperformable requests (e.g., 'Delete the data', 'Send email again', gibberish), provide a firm but respectful blocking natural language response that states the action cannot be performed.

    Examples:
    - User asks "Show me all failure IDocs for MESTYP 'COSMAS'":
      "SELECT ID, DATE, MESTYP, FAIL_OAPI FROM DailyIdocData WHERE MESTYP = 'COSMAS' AND FAIL_OAPI > 0"
    - User asks "How many HRMD_A IDocs failed?":
      "SELECT SUM(FAIL_OAPI) + SUM(FAIL_OCPI) AS TotalFailures FROM DailyIdocData WHERE MESTYP = 'HRMD_A'"
    - User asks "I need help with my coffee machine":
      "I'm sorry, I can only provide data related to the IDoc report and cannot assist with that request."
    - User asks "DELETE FROM DailyIdocData WHERE FAIL_OAPI > 100":
      "I am unable to perform that action. For security reasons, I can only provide SELECT queries for data retrieval."

    User's Reply:
    "${userReply}"

    Your response should be only the query string or the response text, with no prefixes like "QUERY" or "RESPONSETEXT".
    `;


    const client = getHuggingFaceClient(); // hfClientSingleton.getClient(); 
    const hfModelId = "Qwen/Qwen2.5-7B-Instruct";

    try {
        console.log("Calling Hugging Face chat completion API...");
        console.log("PROMPT SENT TO AI : ", fullPrompt4);
        const chatCompletion = await client.chatCompletion({
            provider: "together",
            model: hfModelId,
            messages: [
                {
                    role: "user",
                    content: fullPrompt4,
                },
            ],
        });

        console.log("Hugging Face response received.");

        if (chatCompletion?.choices?.[0]?.message?.content) {
            return chatCompletion.choices[0].message.content.trim();
        } else {
            throw new Error("Hugging Face API returned an unexpected or empty chat completion response.");
        }

    } catch (error) {
        console.error(`[AI_PROCESSOR][ERROR] Failed to get response from LLM: ${error.message}`);
        if (error.response?.data) {
            console.error("Hugging Face API Error Details:", error.response.data);
        }
        // throw new Error(`IDOC related prompt LLM inference failed: ${error.message}`);
        // Return a default response text in case of an error
        return "RESPONSETEXT There was an error processing your request. Please try again later.";
    }
}

/**
 * Validates a generated SELECT query to ensure it is safe to execute.
 * @param {string} query The raw query string to validate.
 * @returns {boolean} True if the query is a valid and safe SELECT statement.
 */
function validateSelectQuery(query) {
    const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE'];
    const lowerCaseQuery = query.toLowerCase();

    // Check for forbidden keywords
    if (forbiddenKeywords.some(keyword => lowerCaseQuery.includes(keyword.toLowerCase()))) {
        return false;
    }

    // A simple regex to check for a basic SELECT structure
    const selectRegex = /^\s*SELECT\s.+?\sFROM\sDailyIdocData/i;
    if (!selectRegex.test(query)) {
        return false;
    }

    // A more robust check for columns could be added here if needed,
    // by tokenizing the query and checking against an array of allowed column names.
    return true;
}


/**
 * Executes a dynamic CDS query string and returns the results.
 * @param {string} sqlQuery The raw SQL string generated by the LLM.
 * @returns {Promise<Array<object>>} The query result as an array of objects.
 */
async function processQueryAndFetchData(sqlQuery) {
    try {
        const db = await cds.connect.to('db');
    
        const parsedQuery = cds.parse.cql(sqlQuery);
        console.log("Parsed Query : ", JSON.stringify(parsedQuery, null, 2));

        const result = await cds.run(parsedQuery);

        if (!result || result.length === 0) {
            console.log("No data found for the query.");
            return [];
        }

        return result;
    } catch (err) {
        console.error("Error executing dynamic CDS query:", err);
        throw new Error(`Failed to execute query: ${err.message}`);
    }
}

// /**
//  * Executes a dynamic CDS query string and returns the results.
//  * @param {string} sqlQuery The raw SQL string generated by the LLM.
//  * @returns {Promise<Array<object>>} The query result as an array of objects.
//  */
// async function processQueryAndFetchData(sqlQuery) {
//     try {
//         const db = await cds.connect.to('db');
//         const result = await cds.run(sqlQuery);

//         if (!result || result.length === 0) {
//             console.log("No data found for the query.");
//             return [];
//         }

//         return result;
//     } catch (err) {
//         console.error("Error executing dynamic CDS query:", err);
//         throw new Error(`Failed to execute query: ${err.message}`);
//     }
// }


// /**
//  * Function 2: Processes the raw LLM response to either execute a query or return text.
//  * @param {string} llmResponse The raw response string from the LLM.
//  * @returns {Promise<string>} The final text or data to be sent to the user.
//  */
// async function processAIResponse(llmResponse) {
//     console.log("Obtained AI LLM Response to process: ", llmResponse);

//     const returnData = {
//         responseCategory: "",
//         responseString: "",
//         attachmentBase64IfAny: ""
//     };

//     if (llmResponse.startsWith("QUERY ")) {
//         returnData.responseCategory = "QUERY";
//         const sqlQuery = llmResponse.substring("QUERY ".length).trim();
//         console.log(`[AI_PROCESSOR] Detected a SQL query: ${sqlQuery}`);

//         // PLACEHOLDER --------------------------
//         console.log("Query processing logic is a placeholder. Returning the query string.");
//         const queryGotText = `QUERY detected: "${sqlQuery}" Please Check the Attachment for the Queried Data`;
//         function processQueryGetArray(sqlQuery) {
//             // code
//         }
//         const outputArray = processQueryGetArray(queryGot);
//         function getExcelFileBase64WritingTheOutputArrayIntoIt(passedArray) {
//             // code
//         }
//         const queryOutputArrayInExcelFileBase64 = getExcelFileBase64WritingTheOutputArrayIntoIt(outputArray);
//         // PLACEHOLDER --------------------------

//         returnData.responseString = queryGotText;
//         returnData.attachmentBase64IfAny = queryOutputArrayInExcelFileBase64; // "Huge Output Base 64 String";        
//     } else if (llmResponse.startsWith("RESPONSETEXT ")) {
//         returnData.responseCategory = "RESPONSETEXT";
//         const responseText = llmResponse.substring("RESPONSETEXT ".length).trim();
//         console.log(`[AI_PROCESSOR] Detected a text response.`);

//         // Standard queries to append
// const standardQueries = `
//     Standard Queries you can copy and paste in your next reply:
//     - Show me all MESTYPs with failures.
//     - Give me the total number of successful OAPI IDocs for today.
//     - What is the total count of failures for the 'ORDERS' MESTYP?
// `;

//         // Combine the LLM's response with the list of standard queries
//         returnData.responseString = `${responseText}\n\n${standardQueries}`;
//     } else {
//         returnData.responseCategory = "UNEXPECTED";
//         console.warn(`[AI_PROCESSOR] Unexpected response format from LLM: ${llmResponse}`);
//         returnData.responseString = "I'm sorry, I couldn't understand your request. Please try rephrasing it.";
//     }

//     return returnData;
// }


/**
 * Function 2: Processes the raw LLM response to either execute a query or return text.
 * @param {string} llmResponse The raw response string from the LLM.
 * @returns {Promise<object>} An object containing the response details.
 */
async function processAIResponse(llmResponse) {
    console.log("Obtained AI LLM Response to process: ", llmResponse);

    const returnData = {
        responseCategory: "",
        responseString: "",
        attachmentBase64IfAny: ""
    };

    // Use a regex to find a SELECT query in the response, allowing for extra text
    const queryRegex = /SELECT\s.+?FROM\sDailyIdocData[\s\S]*/i;
    const queryMatch = llmResponse.match(queryRegex);

    if (queryMatch && validateSelectQuery(queryMatch[0])) {
        const sqlQuery = queryMatch[0].trim();
        returnData.responseCategory = "QUERY";
        console.log(`[AI_PROCESSOR] Detected a valid SQL query: ${sqlQuery}`);

        try {
            const outputArray = await processQueryAndFetchData(sqlQuery);

            if (outputArray.length > 0) {
                // Case 1: User's query worked and returned data.
                console.warn("Attempting to view the first item in the outputArray: " + outputArray[0]);

                const queryOutputArrayInExcelFileBase64 = await generateExcelReport(outputArray);

                // returnData.responseString = `Your query was processed successfully. Please check the attachment for the data.`;
                returnData.responseString = `Your query which was deduced as: ${sqlQuery} -> was processed successfully. Please check the attachment for the data.`;
                returnData.attachmentBase64IfAny = queryOutputArrayInExcelFileBase64;
            } else {
                // Case 2: User's query worked but returned no data. Fallback to default report.
                console.log(`[AI_PROCESSOR] User's query returned no data. Executing default query as a fallback.`);
                const defaultQuery = "SELECT DATE, MESTYP, SUCESS_OAPI, FAIL_OAPI FROM DailyIdocData";
                const defaultOutputArray = await processQueryAndFetchData(defaultQuery);

                if (defaultOutputArray.length > 0) {
                    const defaultExcelFileBase64 = await generateExcelReport(defaultOutputArray);
                    returnData.responseString = `I'm sorry, your query returned no data. Instead, here is a default report. Please check the attachment.`;
                    returnData.attachmentBase64IfAny = defaultExcelFileBase64;
                } else {
                    returnData.responseString = `I'm sorry, your query returned no data, and the default report also had no data.`;
                    returnData.attachmentBase64IfAny = "";
                }
            }
        } catch (error) {
            console.error("Error during query processing:", error);
            returnData.responseString = `I'm sorry, I was unable to process that query. Please check your request and try again.`;
            returnData.attachmentBase64IfAny = "";
        }

    } else {
        // Case 3: No valid query was detected, so handle it as a text response.
        returnData.responseCategory = "RESPONSETEXT";
        console.log(`[AI_PROCESSOR] Detected a text response.`);

        // const responseText = queryMatch ? llmResponse.replace(queryMatch[0], '').trim() : llmResponse.trim();

        const standardQueries = `
            Standard Queries you can copy and paste in your next reply:
            - Show me all MESTYPs with failures.
            - Give me the total number of successful OAPI IDocs for today.
            - What is the total count of failures for the 'ORDERS' MESTYP?
        `;

        returnData.responseString = `${responseText}\n\n${standardQueries}`;
        returnData.attachmentBase64IfAny = "";
    }

    return returnData;
}



/**
 * Function 3: Safety check to determine if the extracted reply is worth processing.
 * This function acts as a guardrail before calling the LLM.
 * @param {string} replyText The extracted text from the email.
 * @returns {boolean} True if the reply is non-empty and seems like a valid message.
 */
function isReplySafeForProcessing(replyText) {
    // A simple check for a minimum length to filter out empty replies or signatures
    const minLength = 10;
    return replyText && replyText.length > minLength;
}


module.exports = {
    askAIForQueryOrText,
    processAIResponse,
    extractReplyText,
    robustExtractReplyText,
    robustExtractReplyText2,
    validateSelectQuery
};