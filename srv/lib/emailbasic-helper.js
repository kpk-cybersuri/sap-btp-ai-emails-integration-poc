const cds = require('@sap/cds');
const path = require('path'); // For handling file paths (e.g., attachments)
const fs = require('fs');
const mime = require('mime-types');
const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
// const { SES, SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
// const AWS = require("aws-sdk");
const axios = require("axios");
const FormData = require("form-data");
const { secrets } = require('./secretLoader');

const { Buffer } = require('buffer');

let _transporter_for_gmail = null;
const GMAIL_USER = 'krishnapk808@gmail.com';

require("dotenv").config();

function getMimeType(filename) {
    return mime.lookup(filename) || 'application/octet-stream';
}

function isValidAttachmentInput(obj) {
    if (obj === null || obj === undefined || obj === "") {
        return false;
    }
    if (typeof obj === 'object' && Object.keys(obj).length === 0) {
        return false;
    }
    return true;
}

// const sesClient2 = new SESv2Client({
//     region: "us-east-1",
//     credentials: {
//         accessKeyId: secrets.AWS_KEY_ID,
//         secretAccessKey: secrets.AWS_SAKEY,
//     }
// });
// const sesClient = new SESClient({    
//     region: "us-east-1",
//     credentials: {
//         accessKeyId: SECRET_AWS_KEY_ID,
//         secretAccessKey: SECRET_AWS_SAKEY,
//     }
// });
// const sesClient = new AWS.SES({    
//     region: "us-east-1",    
//     accessKeyId: SECRET_AWS_KEY_ID,
//     secretAccessKey: SECRET_AWS_SAKEY,    
// });


async function trySes(toList, subject, body, htmlBody, attachment, shouldReply = false) {
    const sesClient = new SESv2Client({ region: "us-east-1" });
    console.log("Attempting SES......");
    const transporter = nodemailer.createTransport({
        SES: { sesClient, SendEmailCommand },
        // SESv2: { ses: sesClient, aws: { SendEmailCommand } },
        // SES: { ses: sesClient, aws: { SendEmailCommand } },
    });
    await transporter.verify();

    // let readyForReply = true; // Need to make global

    function getFrom(forReply = false, fallback = true) {
        let from1;
        try {
            from1 = !fallback ? (forReply ? secrets.AWS_FROM_R : secrets.AWS_FROM_F1) : secrets.AWS_FROM_FF;
            console.log("Got the env variable - SES_FROM as : " + from1)
        } catch (err1) {
            console.warn("Error getting env field SES_FROM1 : " + err1)
            console.warn("Using hardcoded fallback");
            from1 = "kkpranav3@outlook.com";
            // readyForReply = false; // Need to make global
        }
        return from1;
    }

    // const attachmentCheck = attachment !== null && attachment !== undefined && attachment !== "";

    const mailOptions = {
        from: getFrom(forReply = shouldReply, fallback = false),
        to: toList,
        subject,
        text: body,
        html: htmlBody,
        attachments: isValidAttachmentInput(attachment) ? [{
            filename: attachment.name,
            content: Buffer.from(attachment.base64, 'base64'),
            contentType: getMimeType(attachment.name),
            encoding: 'base64'
        }] : []
    };

    async function ses_actualsend(reTry = false) {
        try {
            console.warn("Trying sendMail api call SESv2Client .......");
            const info = await transporter.sendMail(mailOptions);
            console.warn("MAIL SENDING VIA SESv2CLient CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
            return true;
        } catch (e) {
            console.error("SES failed:", e);
            if (reTry) {
                // readyForReply = false; // Need to make global
                mailOptions.from = getFrom();
                ses_actualsend();
            }
            return false;
        }
    }
    return await ses_actualsend(true);
}


async function trySesSMTP(toList, subject, body, htmlBody, attachment, shouldReply = false) {
    let SECRET_AWS_KEY_ID;
    let SECRET_AWS_SAKEY;
    try {
        if (secrets.AWS_KEY_ID2) {
            console.log("Obtained secret - AWS ACCESS KEY ID.... ");
            SECRET_AWS_KEY_ID = secrets.AWS_KEY_ID2;
        } else {
            console.log("Hardcoding - AWS ACCESS KEY ID....");
            SECRET_AWS_KEY_ID = 'AKIA24IPINXDDGT4NZ4S'; // secrets.AWS_KEY_ID;        
        }
        if (secrets.AWS_SAKEY2) {
            console.log("Obtained secret - AWS SECRET ACCESS KEY...");
            SECRET_AWS_SAKEY = secrets.AWS_SAKEY2;
        } else {
            console.log("Hardcoding - AWS SECRET ACCESS KEY");
            SECRET_AWS_SAKEY = 'BEcLl1IQ3CLfDmPB8fumwid5SvLZIMLYjtseQTV/jrAT'; // secrets.AWS_SAKEY;
        }
    } catch (e) {
        console.warn("Faced issue while accessing values of secrets, proceeding to hardcode.... (issue :)" + e);
        SECRET_AWS_KEY_ID = 'AKIA24IPINXDDGT4NZ4S';// secrets.AWS_KEY_ID;
        SECRET_AWS_SAKEY = 'BEcLl1IQ3CLfDmPB8fumwid5SvLZIMLYjtseQTV/jrAT';// secrets.AWS_SAKEY;
    }

    const sesSmtpTransporter = nodemailer.createTransport({
        host: "email-smtp.us-east-1.amazonaws.com",
        port: 587,
        secure: false, // Use 'true' for port 465, 'false' for 587
        auth: {
            user: SECRET_AWS_KEY_ID, // SMTP user from AWS SES
            pass: SECRET_AWS_SAKEY, // SMTP password from AWS SES
        }
    });
    console.log("Attempting SES SMTP......");
    await sesSmtpTransporter.verify();

    // let readyForReply = true; // Need to make global
    const attachmentCheck = attachment !== null && attachment !== undefined && attachment !== "";
    function getFrom(forReply = false, fallback = true) {
        let from1;
        try {
            from1 = !fallback ? (forReply ? secrets.AWS_FROM_R : secrets.AWS_FROM_F1) : "krishnapk808@gmail.com";
            console.log("Got the env variable - SES_FROM as : " + from1)
        } catch (err1) {
            console.warn("Error getting env field SES_FROM1 : " + err1)
            console.warn("Using hardcoded fallback");
            from1 = "kkpranav3@outlook.com";
            // readyForReply = false; // Need to make global
        }
        return from1;
    }

    const mailOptions = {
        from: getFrom(forReply = shouldReply, fallback = false),
        to: toList,
        subject,
        text: body,
        html: htmlBody,
        attachments: isValidAttachmentInput(attachment) ? [{
            filename: attachment.name,
            content: Buffer.from(attachment.base64, 'base64'),
            contentType: getMimeType(attachment.name),
            encoding: 'base64'
        }] : []
    };

    async function ses_actualsend(reTry = false) {
        try {
            console.warn("Trying sendMail api call SES SMTP.......");
            const info = await sesSmtpTransporter.sendMail(mailOptions);
            console.warn("MAIL SENDING VIA SES SMTP CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
            return true;
        } catch (e) {
            console.error("SES failed:", e);
            if (reTry) {
                // readyForReply = false; // Need to make global
                mailOptions.from = getFrom();
                ses_actualsend();
            }
            return false;
        }
    }
    return await ses_actualsend(true);
}


async function tryMaileroo(toList, subject, body, htmlBody, attachment) {
    console.log("Attempting Maileroo...")
    const form = new FormData();
    form.append("from", "" + secrets.MAILEROO_FROM);
    toList.forEach(addr => form.append("to", addr));
    form.append("subject", subject);
    form.append("text", body);
    form.append("html", htmlBody || body);

    // const attachmentCheck = attachment !== null && attachment !== undefined && attachment !== "";

    if (isValidAttachmentInput(attachment)) {
        const buffer = Buffer.from(attachment.base64, 'base64'); // Base64 decoding
        form.append("attachments", buffer, {
            filename: attachment.name,
            contentType: getMimeType(attachment.name)
        });
    }

    try {
        console.warn("Attempting Maileroo API Call .....")
        const res = await axios.post("https://smtp.maileroo.com/send", form, {
            headers: {
                "X-API-Key": secrets.MAILEROO_KEY,
                ...form.getHeaders()
            }
        });
        if (res.status < 300) {
            console.warn("MAIL SENDING VIA Maileroo CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
            return true;
        }
        console.error("Maileroo Mail NOT Working ------ :( ------ Sending Failed probably");
        return false;
        // return res.status < 300;
    } catch (e) {
        console.error("Maileroo failed:", e.response?.data || e);
        return false;
    }
}


function initEmailTransporter(googleAppPassword) {
    if (!googleAppPassword) {
        console.error('EmailHelper: Google App Password is required for transporter initialization.');
        return;
    }
    if (_transporter_for_gmail) {
        console.warn('EmailHelper: Nodemailer transporter already initialized. Skipping re-initialization.');
        return;
    }
    _transporter_for_gmail = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use 'true' if port is 465 (SSL/TLS), 'false' for 587 (STARTTLS)
        auth: {
            user: GMAIL_USER,
            pass: googleAppPassword
        },
        logger: true, // Enable logging for debugging
        debug: true   // Enable debug output
    });
    console.log('EmailHelper: Nodemailer transporter initialized successfully.');
}


/**
 * Sends an email using the configured Nodemailer transporter.
 *
 * @param {object} options - Email sending options.
 * @param {string} options.to - Recipient email address(es) (e.g., 'recipient@example.com' or 'a@b.com, c@d.com').
 * @param {string} options.subject - Subject of the email.
 * @param {string} [options.body] - Plain text body of the email.
 * @param {string} [options.htmlBody] - HTML body of the email.
 * @param {Array<object>} [options.attachments] - Array of attachment objects.
 * Each object should have:
 * - filename: string (e.g., 'document.pdf')
 * - path: string (local path to the file, e.g., './attachments/document.pdf')
 * - contentType: string (e.g., 'application/pdf')
 * @returns {Promise<object>} A promise that resolves to an object with { status: "success" | "failure", message: string }.
 */
async function sendGmailEmail({ to, subject, body, htmlBody, attachments }) {
    // Basic validation for core email parameters
    if (!to || !subject || (!body && !htmlBody)) {
        console.error('EmailHelper: Recipient, Subject, and either Body or HtmlBody are required.');
        return { status: "failure", message: 'Recipient, Subject, and either Body or HtmlBody are required.' };
    }

    if (!_transporter_for_gmail) {
        console.error('EmailHelper: Nodemailer transporter not initialized. Call initEmailTransporter first.');
        return { status: "failure", message: 'Email service not initialized. Please contact support.' };
    }

    let nodemailerAttachments = [];
    if (attachments && Array.isArray(attachments)) {
        for (const attach of attachments) {
            // Resolve path relative to the current working directory of the CAP app.
            // Assuming attachments are in a 'attachments' folder at the project root.
            const filePath = path.resolve(process.cwd(), 'attachments', attach.path);

            if (fs.existsSync(filePath)) {
                nodemailerAttachments.push({
                    filename: attach.filename,
                    path: filePath,
                    contentType: attach.contentType || 'application/octet-stream'
                });
            } else {
                console.warn(`EmailHelper: Attachment file not found: ${filePath}. Skipping.`);
            }
        }
    }

    const mailOptions = {
        from: GMAIL_USER,
        to: to,
        subject: subject,
        text: body,
        html: htmlBody,
        attachments: nodemailerAttachments
    };

    try {
        console.warn("Attempting GMAIL EMAIL SMTP SendMail..... ");
        const info = await _transporter_for_gmail.sendMail(mailOptions);
        console.warn("MAIL SENDING VIA GMAIL SMTP CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
        return { status: "success", message: `Email sent successfully to ${to}. Message ID: ${info.messageId}` };
    } catch (error) {
        console.error('EmailHelper: Error sending email:', error);
        return { status: "failure", message: `Failed to send email: ${error.message}` };
    }

}


/**
 * Sends an email using the configured Nodemailer transporter.
 *
 * @param {object} options - Email sending options.
 * @param {string} options.to - Recipient email address(es).
 * @param {string} options.subject - Subject of the email.
 * @param {string} [options.body] - Plain text body of the email.
 * @param {string} [options.htmlBody] - HTML body of the email.
 * @param {Array<object>} [options.attachments] - Array of attachment objects.
 * Each object should have:
 * - filename: string (e.g., 'document.pdf')
 * - path: string (local path OR base64 data URI)
 * - contentType: string (e.g., 'application/pdf')
 * - disposition: string ('inline' for embedded images, 'attachment' for regular attachments)
 * @returns {Promise<object>} A promise that resolves to an object with { status: "success" | "failure", message: string }.
 */
async function sendGmailEmail2t({ to, subject, body, htmlBody, attachments }) {
    if (!to || !subject || (!body && !htmlBody)) {
        console.error('EmailHelper: Recipient, Subject, and either Body or HtmlBody are required.');
        return { status: "failure", message: 'Recipient, Subject, and either Body or HtmlBody are required.' };
    }

    if (!_transporter_for_gmail) {
        console.error('EmailHelper: Nodemailer transporter not initialized. Call initEmailTransporter first.');
        return { status: "failure", message: 'Email service not initialized. Please contact support.' };
    }

    let nodemailerAttachments = [];
    if (attachments && Array.isArray(attachments)) {
        for (const attach of attachments) {
            let attachmentObject = {
                filename: attach.filename,
                contentType: attach.contentType || getMimeType(attach.filename) || 'application/octet-stream',
                disposition: attach.disposition || 'attachment' // Default to 'attachment'
            };

            // If disposition is 'inline', add a Content-ID
            if (attachmentObject.disposition === 'inline') {
                // Use a sanitized filename as the Content-ID
                attachmentObject.cid = attach.filename.replace(/[^a-zA-Z0-9]/g, '_');
            }

            // Check if the 'path' is a base64 data string
            const base64Regex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,([a-zA-Z0-9/+=]+)$/;
            if (base64Regex.test(attach.path)) {
                const matches = attach.path.match(base64Regex);
                const base64Content = matches[2];

                attachmentObject.content = Buffer.from(base64Content, 'base64');
                attachmentObject.contentType = attach.contentType || matches[1];

                nodemailerAttachments.push(attachmentObject);
            } else {
                // Assume it's a file path                
                const filePath = path.resolve(__dirname, '..', 'files', attach.path);

                if (fs.existsSync(filePath)) {
                    nodemailerAttachments.push({
                        filename: attach.filename,
                        path: filePath,
                        contentType: attach.contentType || getMimeType(attach.filename) || 'application/octet-stream'
                    });
                } else {
                    console.warn(`EmailHelper: Attachment file not found Skipping.`);
                }
            }
            // End of for loop
        }
        // End of if -> attachments array check
    }

    const mailOptions = {
        from: GMAIL_USER,
        to: to,
        subject: subject,
        text: body,
        html: htmlBody,
        attachments: nodemailerAttachments
    };

    try {
        console.warn("Attempting GMAIL EMAIL SMTP SendMail..... ");
        const info = await _transporter_for_gmail.sendMail(mailOptions);
        console.warn("MAIL SENDING VIA GMAIL SMTP CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
        return { status: "success", message: `Email sent successfully to ${to}. Message ID: ${info.messageId}` };
    } catch (error) {
        console.error('EmailHelper: Error sending email:', error);
        return { status: "failure", message: `Failed to send email: ${error.message}` };
    }
}


async function tryOtsukaSMTP(toList, subject, body, htmlBody, attachment, shouldReply = false) {
    const OTSUKA_SMTP_HOST = "otsukaus-com01e.mail.protection.outlook.com";
    const SECRET_OTSUKAUSER = "TEST_IDOC";
    const SECRET_OTSUKAPASSWORD = "Welcome@123456789";

    const otsTransporter = nodemailer.createTransport({
        host: OTSUKA_SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: SECRET_OTSUKAUSER,
            pass: SECRET_OTSUKAPASSWORD,
        }
    });

    // console.log("Attempting Otsuka SMTP verification......");
    // await otsTransporter.verify();

    const attachmentCheck = attachment !== null && attachment !== "";

    function getFrom() {
        return "info@otsuka-us.com";
    }

    const mailOptions = {
        from: getFrom(),
        to: toList,
        subject,
        text: body,
        html: htmlBody,
        attachments: attachmentCheck ? [{
            filename: attachment.name,
            content: Buffer.from(attachment.base64, 'base64'),
            contentType: getMimeType(attachment.name),
            encoding: 'base64'
        }] : []
    };


    async function actualsend() {
        try {
            console.warn("Attempting Otsuka SMTP SendMail..... ");
            const info = await otsTransporter.sendMail(mailOptions);
            console.warn("MAIL SENDING VIA Otsuka CODE DONE, CHECK INBOX AND msg id: ", info.messageId);
            return true;
        } catch (error) {
            console.error('Otsuka Email: Error sending email:', error);
            return false;
        }
    }
    return await actualsend();
}


module.exports = { initEmailTransporter, sendGmailEmail, trySes, tryMaileroo, trySesSMTP, tryOtsukaSMTP, sendGmailEmail2t };
