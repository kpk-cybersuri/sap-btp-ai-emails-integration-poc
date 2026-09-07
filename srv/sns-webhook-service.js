const cds = require('@sap/cds');
const axios = require('axios');
const util = require('util');
const { trySes, tryMaileroo, sendGmailEmail, trySesSMTP, sendGmailEmail2t } = require('./lib/emailbasic-helper');
const { robustExtractReplyText2, askAIForQueryOrText, processAIResponse } = require('./lib/snswebhook-helper');

// module.exports = async function () {
//     // Log service registration
//     console.log(`[SNS_WEBHOOK][INIT] SnsWebhookService handler is being initialized.`);

//     this.on('HandleSnsNotification', async (req) => {
//         console.warn("--------------------1---HANDLERCODEDEBUG----------------------");
//         console.log(`[SNS_WEBHOOK][REQUEST_START] Received a POST request to /snswh/HandleSnsNotification`);
//         console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Request Headers: ${JSON.stringify(req.headers, null, 2)}`);
//         console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Request Method: ${req.method}`);
//         console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Request Path: ${req.path}`);
//         console.warn("--------------------2---HANDLERCODEDEBUG----------------------");
//         console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Raw Request Body (before CDS processing, if available):`);
//         // Note: req.body might not be directly available or might be a stream
//         // CAP typically parses it into req.data for bound/unbound actions.        
//         if (req._.req.body) { // Accessing the underlying express request body directly
//             console.warn("--------------------2RAWB---HANDLERCODEDEBUG----------------------");
//             console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Express Raw Body: ${JSON.stringify(req._.req.body, null, 2)}`);
//         } else {
//             console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Express Raw Body: Not directly accessible or already consumed.`);
//         }


//         // IMPORTANT: With "Raw message delivery" enabled on the SNS subscription,
//         // the entire POST body (which is already JSON) is directly in req.data.
//         // There's no outer 'payload' wrapper from the CDS action.
//         console.warn("--------------------3---HANDLERCODEDEBUG----------------------");
//         let snsMessage;
//         try {
//             // Attempt to access req.data directly, assuming it's already parsed JSON
//             snsMessage = req.data;
//             console.log(`[SNS_WEBHOOK][PARSING] Successfully accessed req.data as a JSON object.`);
//             console.log(`[SNS_WEBHOOK][PARSED_MESSAGE] Parsed SNS Message (from req.data): ${JSON.stringify(snsMessage, null, 2)}`);

//             // Validate that the parsed message has a 'Type' property
//             if (!snsMessage || typeof snsMessage.Type === 'undefined') {
//                 console.error(`[SNS_WEBHOOK][ERROR] Invalid SNS message format: 'Type' property is missing or undefined.`);
//                 req.error(400, "Invalid SNS message format: 'Type' property is missing.");
//                 return; // Exit handler
//             }

//             console.warn("--------------------4---HANDLERCODEDEBUG----------------------");

//         } catch (e) {
//             console.error(`[SNS_WEBHOOK][ERROR] Failed to access or parse req.data as JSON. Error: ${e.message}`);
//             // If raw message delivery is NOT enabled and Content-Type is text/plain,
//             // req.data might be different or not available as expected.
//             // If the 415 error still occurs, it means the Content-Type is NOT application/json.
//             req.error(415, "Content-Type mismatch or body parsing error. Ensure 'application/json' and 'Raw Message Delivery' for SNS.");
//             return; // Exit handler
//         }

//         console.warn("--------------------5---HANDLERCODEDEBUG----------------------");
//         // --- AWS SNS Message Type Handling ---
//         const messageType = snsMessage.Type;
//         console.log(`[SNS_WEBHOOK][MESSAGE_TYPE] Detected SNS Message Type: ${messageType}`);

//         console.warn("--------------------6---HANDLERCODEDEBUG----------------------");
//         if (messageType === 'SubscriptionConfirmation') {
//             console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Handling SubscriptionConfirmation message.`);
//             const subscribeURL = snsMessage.SubscribeURL;
//             console.log(`[SNS_WEBHOOK][SUB_CONFIRM] SubscribeURL received: ${subscribeURL}`);

//             if (!subscribeURL) {
//                 console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] SubscribeURL is missing from SubscriptionConfirmation message.`);
//                 req.error(400, "Missing SubscribeURL in SubscriptionConfirmation message.");
//                 return;
//             }

//             console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Attempting to automatically confirm subscription...`);
//             try {
//                 // Perform the GET request to the SubscribeURL
//                 // Ensure your BTP CAP app has outbound internet access (e.g., via a destination or firewall rules if needed)
//                 const confirmationResponse = await axios.get(subscribeURL);
//                 console.log(`[SNS_WEBHOOK][SUB_CONFIRM] SNS Subscription confirmed automatically! HTTP Status: ${confirmationResponse.status}`);
//                 console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Confirmation Response Data: ${JSON.stringify(confirmationResponse.data)}`);
//                 req.reply("Subscription confirmed successfully."); // Send a 200 OK response back to SNS
//                 console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Sent successful response for SubscriptionConfirmation.`);

//             } catch (error) {
//                 console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Error during automatic SNS Subscription confirmation: ${error.message}`);
//                 if (error.response) {
//                     console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios error response status: ${error.response.status}`);
//                     console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios error response data: ${JSON.stringify(error.response.data)}`);
//                 } else if (error.request) {
//                     console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios no response received. Request details: ${JSON.stringify(error.request)}`);
//                 } else {
//                     console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios config or general error: ${error.config ? JSON.stringify(error.config) : 'N/A'}`);
//                 }
//                 req.error(500, `Error confirming subscription: ${error.message}`); // Send an error response
//                 console.error(`[SNS_WEBHOOK][SUB_CONFIRM] Sent error response for SubscriptionConfirmation.`);
//             }

//         } else if (messageType === 'Notification') {
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Handling Notification message.`);
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Message ID: ${snsMessage.MessageId}`);
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Topic ARN: ${snsMessage.TopicArn}`);
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Subject: ${snsMessage.Subject}`);

//             // The 'Message' field within the SNS Notification can be a string,
//             // or if the original publisher sent JSON, it might be a stringified JSON.
//             let actualContent;
//             try {
//                 // Attempt to parse the 'Message' field
//                 actualContent = JSON.parse(snsMessage.Message);
//                 console.log(`[SNS_WEBHOOK][NOTIFICATION] Successfully parsed 'Message' field as JSON.`);
//                 console.log(`[SNS_WEBHOOK][NOTIFICATION] Parsed Actual Message Content: ${JSON.stringify(actualContent, null, 2)}`);
//             } catch (e) {
//                 // If it's not valid JSON, treat it as a plain string
//                 console.log(`[SNS_WEBHOOK][NOTIFICATION] 'Message' field is not JSON or parsing failed. Treating as plain string.`);
//                 console.log(`[SNS_WEBHOOK][NOTIFICATION] Raw Message Content: ${snsMessage.Message}`);
//                 actualContent = snsMessage.Message; // Keep as string if not JSON
//             }

//             // Your desired logic: Print "Hello World"
//             console.log("Hello World");
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Business logic 'Hello World' executed.`);

//             req.reply("Notification received and processed successfully."); // Send a 200 OK response back to SNS
//             console.log(`[SNS_WEBHOOK][NOTIFICATION] Sent successful response for Notification.`);

//         } else if (messageType === 'UnsubscribeConfirmation') {
//             console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Handling UnsubscribeConfirmation message.`);
//             console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Topic ARN: ${snsMessage.TopicArn}`);
//             console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Unsubscribe confirmation token: ${snsMessage.Token}`);
//             // You might want to log the SubscribeURL here as well if you need to re-subscribe manually.
//             console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Message: ${snsMessage.Message}`);

//             req.reply("Unsubscribe confirmation received."); // Send a 200 OK response
//             console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Sent successful response for UnsubscribeConfirmation.`);

//         } else {
//             console.warn(`[SNS_WEBHOOK][UNKNOWN_TYPE] Received unknown SNS Message Type: ${messageType}`);
//             console.warn(`[SNS_WEBHOOK][UNKNOWN_TYPE] Full unknown message: ${JSON.stringify(snsMessage, null, 2)}`);
//             req.error(400, `Unknown SNS message type: ${messageType}`); // Respond with an error for unknown types
//             console.error(`[SNS_WEBHOOK][UNKNOWN_TYPE] Sent error response for unknown type.`);
//         }

//         console.log(`[SNS_WEBHOOK][REQUEST_END] Request processing finished.`);
//     });
// };

module.exports = async function () {
    console.log(`[SNS_WEBHOOK][INIT] SnsWebhookService handler is being initialized.`);

    this.on('HandleSnsNotification', async (req) => {
        console.log(`[SNS_WEBHOOK][REQUEST_START] Received a POST request to /snswh/HandleSnsNotification`);
        console.warn(`[SNS_WEBHOOK][REQUEST_DETAILS] Request Headers: ${JSON.stringify(req.headers, null, 2)}`);
        console.log(`[SNS_WEBHOOK][REQUEST_DETAILS] Request Method: ${req.method}`); // This will correctly be 'POST'                

        let snsMessage;
        try {
            // Access the raw body from the underlying Express request.
            // For 'application/json' Content-Type, Express (via CAP's body-parser setup)
            // usually parses the JSON body into req._.req.body directly as an object.
            const rawBodyFromExpress = req._.req.body;
            // console.log(`[SNS_WEBHOOK][RAW_BODY_EXPRESS] Express Raw Body (type: ${typeof rawBodyFromExpress}): ${util.inspect(rawBodyFromExpress, { depth: 4 })}`); //${JSON.stringify(rawBodyFromExpress, null, 2)}`);            

            // If rawBodyFromExpress is already an object (parsed by Express), use it directly.
            // Otherwise, if it's a string, attempt to parse it as JSON.
            if (typeof rawBodyFromExpress === 'object' && rawBodyFromExpress !== null) {
                console.warn("Obtained raw Body from Express is an object! ");
                snsMessage = rawBodyFromExpress;
                console.log(`[SNS_WEBHOOK][PARSING] Successfully accessed and used Express raw body as JSON object.`);
            } else if (typeof rawBodyFromExpress === 'string') {
                console.warn("Obtained raw Body from Express is a string! ");
                snsMessage = JSON.parse(rawBodyFromExpress);
                console.log(`[SNS_WEBHOOK][PARSING] Successfully parsed Express raw body string into JSON object.`);
            } else {
                console.warn("Difficulty handling the raw Body from Express");
                console.error(`[SNS_WEBHOOK][ERROR] Unexpected type for raw body from Express: ${typeof rawBodyFromExpress}.`);
                return req.error(400, "Unable to parse request body as JSON.");
            }
            // console.log(`[SNS_WEBHOOK][PARSED_MESSAGE] Final Parsed SNS Message: ${JSON.stringify(snsMessage, null, 2)}`);            
            // console.log(`[SNS_WEBHOOK][PARSED_MESSAGE] Final Parsed SNS Message: ${util.inspect(snsMessage, { depth: 4 })}`);            

            // Validate that the parsed message has a 'Type' property
            if (!snsMessage || typeof snsMessage.Type === 'undefined' && typeof snsMessage.notificationType === 'undefined') {
                console.error(`[SNS_WEBHOOK][ERROR] Invalid SNS message format: 'Type' property is missing or undefined after parsing.`);
                console.error(`[SNS_WEBHOOK][ERROR] Invalid message format: Missing 'Type' or 'notificationType' property.`);
                return req.error(400, "Invalid message format: Missing 'Type' or 'notificationType' property.");
            }
        } catch (e) {
            console.error(`[SNS_WEBHOOK][ERROR] Critical parsing failure for incoming request body. Error: ${e.message}`);
            // This catch block would indicate a fundamental issue with the incoming data not being valid JSON
            return req.error(400, "Failed to parse request body. Ensure it's valid JSON."); //Exit Handler
            // return; // Exit handler
        }


        // --- AWS SNS Message Type Handling ---        
        const messageType = snsMessage.Type || snsMessage.notificationType;
        console.log(`[SNS_WEBHOOK][MESSAGE_TYPE] Detected SNS Message Type: ${messageType}`);

        if (messageType === 'SubscriptionConfirmation') {
            console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Handling SubscriptionConfirmation message.`);
            const subscribeURL = snsMessage.SubscribeURL;
            console.log(`[SNS_WEBHOOK][SUB_CONFIRM] SubscribeURL received: ${subscribeURL}`);

            if (!subscribeURL) {
                console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] SubscribeURL is missing from SubscriptionConfirmation message.`);
                return req.error(400, "Missing SubscribeURL in SubscriptionConfirmation message.");
            }
            console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Attempting to automatically confirm subscription...`);
            try {
                const confirmationResponse = await axios.get(subscribeURL);
                console.log(`[SNS_WEBHOOK][SUB_CONFIRM] SNS Subscription confirmed automatically! HTTP Status: ${confirmationResponse.status}`);
                console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Confirmation Response Data: ${JSON.stringify(confirmationResponse.data)}`);
                req.reply("Subscription confirmed successfully.");
                console.log(`[SNS_WEBHOOK][SUB_CONFIRM] Sent successful response for SubscriptionConfirmation.`);
            } catch (error) {
                console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Error during automatic SNS Subscription confirmation: ${error.message}`);
                if (error.response) {
                    console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios response status: ${error.response.status} and Axios response data: ${JSON.stringify(error.response.data)}`);
                } else if (error.request) {
                    console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios no response received. Request details: ${JSON.stringify(error.request)}`);
                } else {
                    console.error(`[SNS_WEBHOOK][SUB_CONFIRM][ERROR] Axios config or general error: ${error.config ? JSON.stringify(error.config) : 'N/A'}`);
                }
                return req.error(500, `Error confirming subscription: ${error.message}`);
                // console.error(`[SNS_WEBHOOK][SUB_CONFIRM] Sent error response for SubscriptionConfirmation.`);
            }

        } else if (messageType === 'Notification' || messageType === 'Received' || messageType === 'Email') {

            console.log(`[SNS_WEBHOOK][NOTIFICATION] Handling Notification / Received message.`);

            const senderEmail = snsMessage.mail.source;
            const subject = snsMessage.mail.commonHeaders.subject;
            const messageId = snsMessage.mail.messageId;
            let extractedUserQuery1 = "Yo";

            try {
                // console.log(`[SNS_WEBHOOK][NOTIFICATION] Mail Message ID: ${snsMessage.mail.messageId}`);
                console.log(`[SNS_WEBHOOK][NOTIFICATION] Sender: ${senderEmail}`);
                console.log(`[SNS_WEBHOOK][NOTIFICATION] Recipient: ${snsMessage.mail.destination.join(', ')}`);
                console.log(`[SNS_WEBHOOK][NOTIFICATION] Subject: ${subject}`);
                console.warn(`[SNS_WEBHOOK][NOTIFICATION] LOGGING SNS MESSAGE DATA RECEIVED.... `);
                console.warn(JSON.stringify(snsMessage["content"], null, 2));

                // 1. Extract the Uer's Natural Language Query or Statement from Obtained EmailContent
                extractedUserQuery1 = robustExtractReplyText2(snsMessage["content"]);
                console.log("--> Printing Extracted User Query: ", extractedUserQuery1);

            } catch (e) {
                console.error(`[SNS_WEBHOOK][ERROR] Issue printing and processing Notification Data: ${e.message}`);
                return req.error(500, `Error logging and processing Notification Data: ${e.message}`);
            }

            // Actual BUSINESS LOGIC ------------------------------
            try {
                console.log(`[SNS_WEBHOOK][NOTIFICATION] Business logic executing....`);
                let genReplyBody = "We have received your message and will get back to you shortly.";
                let genReplyHtmlBody = `<h4>We have received your message and will get back to you shortly. We have noted what you have asked us which is: <h4/> <p>${extractedUserQuery1}</p>`;
                let finalSingleAttachment;
                let finalSingleGmailAttachment = []; 

                try {
                    // Evaluate User's Reply by asking AI - get its response (chat String)
                    const llmRawResponse = await askAIForQueryOrText(extractedUserQuery1);
                    // Process the LLM's response
                    const finalResponseObject = await processAIResponse(llmRawResponse);

                    // const returnData = {
                    //     responseCategory: "",
                    //     responseString: "",
                    //     attachmentBase64IfAny: ""
                    // };                                        

                    finalSingleAttachment = (finalResponseObject["responseCategory"] == "QUERY")
                        ? (finalResponseObject["attachmentBase64IfAny"] ? { base64: finalResponseObject["attachmentBase64IfAny"], name: "datareport.xlsx" } : null)
                        : null;

                    finalSingleGmailAttachment = (finalResponseObject["responseCategory"] == "QUERY")
                        ? [{
                            filename: 'datareport.xlsx',
                            // Add the data URI prefix before passing the Base64 string
                            path: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${finalResponseObject["attachmentBase64IfAny"]}`,
                            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            disposition: 'attachment'
                        }]
                        : [];

                    // Corrected logic: add note ONLY if the attachment is missing
                    const additionalNoteIfAttachmentFailedButResponseCategoryIsQuery = ((finalSingleAttachment !== null || !finalSingleAttachment.length) && finalResponseObject["responseCategory"] == "QUERY")
                        ? " \n NOTE: If you don't find the attachment please be patient and try again if not received."
                        : "";

                    genReplyBody = finalResponseObject["responseString"] + additionalNoteIfAttachmentFailedButResponseCategoryIsQuery;
                    genReplyHtmlBody = `<p>${finalResponseObject["responseString"].replace(/\n/g, '<br>')}</p> <p>${additionalNoteIfAttachmentFailedButResponseCategoryIsQuery.replace(/\n/g, '<br>')}</p>`;
                } catch (err) {
                    console.warn("Problem faced while processing User's Query: ", err);
                }

                // Sending the Automated Reply Email
                const toList = [senderEmail];
                const replySubject = `${subject}`;
                const finalReplyBody = `Thank you for your email. This is an automated response. ${genReplyBody}`;
                const finalReplyHtmlBody = `<h1>Thank you for your email. This is an automated response.<h1/> ${genReplyHtmlBody}`;
                const shouldReply = true;
                const simpleSESWorked = false;

                console.warn("Sending REPLY Email to this Recipient --> " + senderEmail);
                try {
                    if (await trySes(senderEmail, replySubject, finalReplyBody, finalReplyHtmlBody, finalSingleAttachment, shouldReply)) {
                        console.log("REPLIED VIA SES - SO SAME REPLIED TO SAME MAIL CHAIN.....  :)  .....");
                        req.reply("Replied via SES, Replied properly :) ");
                        simpleSESWorked = true;
                    }
                } catch (e) {
                    console.log("Problem with SESv2Client approach : ", e);
                }

                if (!simpleSESWorked) {
                    if (await trySesSMTP(senderEmail, replySubject, finalReplyBody, finalReplyHtmlBody, finalSingleAttachment, shouldReply)) {
                        console.log("REPLIED VIA SES SMTP - SO SAME REPLIED TO SAME MAIL CHAIN.....  :)  .....");
                        req.reply("Replied via SES SMTP, Replied properly :) ");
                    } else if (await tryMaileroo(toList, replySubject, finalReplyBody, finalReplyHtmlBody, finalSingleAttachment)) {
                        console.log("REPLIED VIA Maileroo - CHECK IF REPLIED VIA NEW EMAIL .....  ;/  .....");
                        req.reply("Replied via Maileroo, Check if replied via new email.  ");
                    } else if ((await sendGmailEmail2t({
                        to: senderEmail,
                        subject: replySubject,
                        body: finalReplyBody,
                        htmlBody: finalReplyHtmlBody,
                        attachments: finalSingleGmailAttachment
                    })).status === "success") {
                        console.log("Replied via Gmail SMTP...");
                        req.reply("Replied via Gmail SMTP, check if replied via new email.  ");
                    } else {
                        return req.error(500, "Unable to Trigger Email");
                    }
                }
                console.warn(`[SNS_WEBHOOK][NOTIFICATION] Successfully sent a reply email to ${senderEmail}.`);
            } catch (error) {
                console.error(`[SNS_WEBHOOK][NOTIFICATION][REPLY_ERROR] Failed to send reply email to ${senderEmail}. Error: ${error}`);
            }

            req.reply("Notification received and processed successfully.");
            console.log(`[SNS_WEBHOOK][NOTIFICATION] Sent successful response for Notification?`);

        } else if (messageType === 'UnsubscribeConfirmation') {
            console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Handling UnsubscribeConfirmation message.`);
            console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Topic ARN: ${snsMessage.TopicArn}`);
            console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Unsubscribe confirmation token: ${snsMessage.Token}`);
            console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Message: ${snsMessage.Message}`);

            req.reply("Unsubscribe confirmation received.");
            console.log(`[SNS_WEBHOOK][UNSUBSCRIBE] Sent successful response for UnsubscribeConfirmation.`);

        } else {
            console.warn(`[SNS_WEBHOOK][UNKNOWN_TYPE] Received unknown SNS Message Type: ${messageType}`);
            console.warn(`[SNS_WEBHOOK][UNKNOWN_TYPE] Full unknown message: ${JSON.stringify(snsMessage, null, 2)}`);
            req.error(400, `Unknown SNS message type: ${messageType}`);
            console.error(`[SNS_WEBHOOK][UNKNOWN_TYPE] Sent error response for unknown type.`);
        }

        console.warn(`[SNS_WEBHOOK][REQUEST_END] Request processing finished.`);
    });
};
