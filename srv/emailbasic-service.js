// srv/mailbasic-service.js

const cds = require('@sap/cds');
const { sendGmailEmail, tryMaileroo, trySes, trySesSMTP, tryOtsukaSMTP } = require('./lib/emailbasic-helper');
// const AWS = require('aws-sdk');
const { secrets } = require('./lib/secretLoader')
// const sns = new AWS.SNS({ region: process.env.AWS_REGION });
const nodemailer = require('nodemailer');
// const sns = new AWS.SNS({ region: "us-east-1" });

const path = require('path'); // For handling file paths (e.g., attachments)
const fs = require('fs');
const { queryWithTimeout, DB_QUERY_TIMEOUT_MS } = require('./lib/flow-helper');

class EmailBasicService extends cds.ApplicationService {
    async init() {

        this.on('sendEmail', this.sendEmailHandler1);
        this.on('sendSmtpGmailEmail', this.sendSmtpGmailEmailHandler);
        this.on('sendSmtpOutlookEmail', this.sendSmtpOutlookEmailHandler);
        this.on('sendSmtpOtsukaEmail', this.sendSmtpOtsukaEmailHandler);

        // this.on('sendSimpleSmtpEmail', this.sendSimpleSmtpEmailHandler);
        // this.on('processBPAMailReplyComplete', this.processBPAMailReplyCompleteHandler);
        await super.init();
    }

    async sendEmailHandler1(req) {
        const {
            to = [], subject, body, htmlBody, shouldObserveReplies,
            attachmentBase64, attachmentName
        } = req.data;

        // Validation logic
        if (!Array.isArray(to) || to.length === 0) {
            return req.error(400, "Invalid recipient list");
        }
        const recipient = [to[0]];
        if (!recipient || !subject || !body || !htmlBody) {
            return req.error(400, 'Subject, Body and HtmlBody are required.');
        }

        const attachment = attachmentBase64
            ? { base64: attachmentBase64, name: attachmentName || "attachment.pdf" }
            : null;

        const replyNeed = shouldObserveReplies == "True" || shouldObserveReplies == "true" || shouldObserveReplies == "Yes" || shouldObserveReplies == "yes" || shouldObserveReplies == "Ya";
        let canReply = false;

        try {
            let methodUsed = "";
            if (await trySes(recipient, subject, body, htmlBody, attachment, replyNeed)) {
                methodUsed = "aws_ses";
                canReply = true;
            } else if (await trySesSMTP(recipient, subject, body, htmlBody, attachment, replyNeed)) {
                methodUsed = "aws_ses_smtp";
                canReply = true;
            } else if (await tryMaileroo(recipient, subject, body, htmlBody, attachment)) {
                canReply = false;
                methodUsed = "maileroo";
            } else {
                return req.error(500, "All email methods failed");
            }
            return { status: "success", method: methodUsed, readyForReply: canReply };
        } catch (e) {
            const issue = "ERROR SENDING EMAIL VIA THE METHODS USED: " + e;
            console.warn(issue);
            return req.error(500, issue);
        }
    }


    /** 
     * WARNING!!!: Maynot work because Microsoft not allowing Basic Auth -> i.e. App Password SMTP Way,
     * Probably need OAuth2 and Azure App registration to make this work (go ahead)
     * */
    async sendSmtpOutlookEmailHandler(req) {
        const { to, subject, text, htmlText } = req.data

        // Validate required fields
        if (!to || !subject || !text || !htmlText) {
            return req.error(400, 'Missing required fields: to, subject, or text')
        }

        console.log("Sending Email via Outlook SMTP!!.....");

        // 1. Create Transporter (SMTP configuration)
        //kkpranav3@outlook.com
        const app_pass = secrets.OUTLOOK_APPPW || '';
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com', // Outlook SMTP
            port: 587, // TLS port
            secure: false, // false for TLS
            auth: {
                user: 'kkpranav3@outlook.com',
                pass: app_pass,
            },
            tls: {
                ciphers: 'SSLv3', // Required for Outlook
            },
        });

        try {
            const info = await transporter.sendMail({
                from: 'kkpranav3@outlook.com',
                to,
                subject,
                text,
                htmlText
            })

            return {
                status: 'Success',
                message: 'SMTP Outlook',
            }

        } catch (error) {
            console.error('SMTP Error:', error)
            return req.error(500, `Email failed: ${error.message}`)
        }

    }

    async sendSmtpGmailEmailHandler(req) {
        const { to, subject, body, htmlBody, attachments } = req.data;

        if (!to || !subject || !body || !htmlBody) {
            req.error(400, 'Recipient , Subject, Body and HtmlBody are required.');
            return { success: false, message: 'Recipient , Subject, Body and HtmlBody are required.' };
        }

        try {
            // Call the shared email sending helper function
            const result = await sendGmailEmail({ to, subject, body, htmlBody, attachments });

            // Map the helper's result to the CAP service's BasicMailResponse
            if (result.status === "success") {
                return { status: "success", message: result.message };
            } else {
                // If helper returned failure, log it and return a CAP error/response
                console.error("Email sending helper reported failure:", result.message);
                req.error(500, `Email sending failed: ${result.message}`);
                return { status: "failure", message: result.message }; // added anyway
            }
        } catch (error) {
            // Catch any unexpected errors from the helper call itself
            console.error('Unexpected error calling email helper:', error);
            req.error(500, `An unexpected error occurred during email sending: ${error.message}`);
            return { status: "failure", message: `An unexpected error occurred: ${error.message}` }; // added anyway
        }

    }



    async sendSmtpOtsukaEmailHandler(req) {
        const {
            to = [], subject, body, htmlBody,
            attachmentBase64, attachmentName
        } = req.data;

        // Validation logic
        if (!Array.isArray(to) || to.length === 0) {
            return req.error(400, "Invalid recipient list");
        }

        if (!to || !subject || !body || !htmlBody) {
            return req.error(400, 'Subject, Body and HtmlBody are required.');
        }

        const attachment = attachmentBase64
            ? { base64: attachmentBase64, name: attachmentName || "attachment.pdf" }
            : null;

        try {
            console.log("Otsuka Smtp Code Execution starts....");
            const verdict = await queryWithTimeout(
                tryOtsukaSMTP(to, subject, body, htmlBody, attachment),
                10000 // tried with 10 sec, 1 min - taking time and not working
            );
            return { status: (verdict) ? "success" : "failure", message: "Check the inbox if Email Sending via this Otsuka SMTP Approach is successful to verify..." };
        } catch (error) {
            console.error('ERROR with calling smtp code:', error);
            return req.error(500, `An unexpected error occurred during email sending: ${error.message}`);
        }

    }





}

// -----------------------------------------------------------------------------------------------------

// async processBPAMailReplyCompleteHandler(req) {
//     console.warn("-----------------SNS Process Reply Code Reached!!!!--------------------------");
//     const headers = req._.req.headers;
//     const msgType = headers['x-amz-sns-message-type'];
//     const payload = req.data.payload;
//     console.warn(payload);
//     console.warn("---------------------------------------------------------------------------------");

//     if (msgType === 'SubscriptionConfirmation') {
//         const msg = payload; // JSON.parse(payload);
//         await sns.confirmSubscription({
//             Token: msg.Token,
//             TopicArn: msg.TopicArn
//         }).promise();
//         console.log('✅ SNS subscription confirmed.');
//         return true;

//     } else if (msgType === 'Notification') {
//         // const outer = JSON.parse(payload);
//         const message = JSON.parse(payload.Message);
//         console.log('📩 convId:', message.convId);
//         console.log('💬 emailBody:', message.emailBody);
//         return true;

//     } else {
//         console.warn('⚠️ Unexpected SNS message type:', msgType);
//         return false;
//     }

// }

// }


module.exports = EmailBasicService;
