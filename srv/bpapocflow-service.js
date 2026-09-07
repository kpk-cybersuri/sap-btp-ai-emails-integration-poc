const cds = require('@sap/cds');
const { fetchAndStoreIdocs } = require('./lib/idocsdata-helper');
const { AuthTokens: CdsAuthTokens } = cds.entities('my.app');
const { DailyIdocData, DailyFetches } = cds.entities('my.app');
const { generateEmailTableHtml, generateEmailTableHtml2 } = require('./lib/generate-email-table');
const { createBarChartImage2, processIdocDataForChart, processIdocDataForChart3, createBarChartImage4 } = require('./lib/visualisation-helper');
const { trySes, tryMaileroo, sendGmailEmail, trySesSMTP, sendGmailEmail2t } = require('./lib/emailbasic-helper');
const { queryWithTimeout, DB_QUERY_TIMEOUT_MS, getCurrentDateTimePlusOneMinute, generateIdocReportHtmlBody } = require('./lib/flow-helper');
const { generateExcelReport } = require('./lib/excel-helper');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { some } = require('d3');


class BpaPocFlowService extends cds.ApplicationService {

    async init() {
        this.on('mailflow1', this.flow1);

        this.on('idocwf1', this.idocWorkFlow1);

        // this.on('flow2', this.flow2);        
        await super.init();
    }

    /**           
     * CAPM IDOCs Process Flow Algorithm:     
     * 1. Fetch Idoc Data -> Either Select Data from the Persisted SQLite Domain Entity or Perform the REST API Request and get it from the Backend
     * 2. Perform Aggregation and prepare Data for Bar Chart
     * 3. Generate the Bar Chart usingd3-node package -> Either as encoded image string or image file
     * 4. Generate HTML String with Table to be Embedded in the email body
     * 5. Send Email as: 
     *     TO: TAKEN FROM REQ PARAM
     *     SUBJECT: TAKEN FROM REQ PARAM
     *     BODY: EMBEDDED HTML AS: EITHER (TITLE/TEXT + IMAGE + DATA TABLE) OR (TITLE/TEXT + DATA TABLE)
     *     ATTACHMENT: BASE64 ENCODED STRING OR FILE READ FROM PATH 
     *      
    */
    async flow1(req) {

        const { toEmail, optionalMessageText } = req.data;
        const tx = cds.transaction(req);
        const { DailyIdocData } = cds.entities('my.app');
        let idocData = [];
        let processedDataForChartGen = [];
        let emailSubject = "IDoc Success/Failure Data Update"; // "Img Testing ASR0"
        let h_recipient = "pranavkrishna5by6@gmail.com";
        let h_recipient3 = "krishnapk808@gmail.com";
        let h_recipient2 = "Vivek.Mantha@genpact.com";
        let h_recipient4 = "Vivek.Mantha-CW@otsuka-us.com";
        // const emailRecipient = toEmail;        
        const emailRecipient = h_recipient4;


        // 1. Fetch Idoc Data -> Either Select Data from the Persisted SQLite Domain Entity or Perform the REST API Request and get it from the Backend---------------------------------------------
        async function fetchNeededData() {
            const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
            if (!arr)
                req.error(500, "ERROR PROCESSING IDOC DATA");
            console.log(`Fetched ${arr.length} records for visualization.`);
            return arr;
        }

        try {
            idocData = await queryWithTimeout(
                tx.run(SELECT.from('DailyIdocData')),
                DB_QUERY_TIMEOUT_MS
            );
            if (!idocData.length) {
                console.log("INFO: No records found in DailyIdocData. Query completed within timeout.");
                idocData = await fetchNeededData();
            } else {
                console.log(`Fetched ${idocData.length} records for Process.`);
            }
        } catch (error) {
            if (error.message.includes("Query timed out")) {
                idocData = await fetchNeededData();
            } else {
                console.error("Error fetching DailyIdocData:", error.message);
                // throw new Error("Failed to retrieve data for chart generation.");
                req.error(500, "Failed to retrieve data for HTML Table generation and other steps.");
            }
        }
        console.warn("[DEBUG] idocData obtained -- " + idocData.length);


        // 2. Perform Aggregation and prepare Data for Bar Chart-----------------------------------------------------------------------------------------------
        const processedChartDataTest = [
            { MESTYP: 'DESADV', 'Success (OAPI)': 1608, 'Failure (OAPI)': 400 },
            { MESTYP: 'ORDERS', 'Success (OAPI)': 1400, 'Failure (OAPI)': 230 },
            { MESTYP: 'REMADV', 'Success (OAPI)': 104, 'Failure (OAPI)': 700 },
            { MESTYP: 'SHPORD', 'Success (OAPI)': 660, 'Failure (OAPI)': 0 }
        ]

        processedDataForChartGen = processIdocDataForChart(idocData);
        // Using Test Data For Now
        processedDataForChartGen = processedChartDataTest;
        console.log("Processed - Aggregated Idoc Data for Chart Generation --- " + processedDataForChartGen);


        // 3. Generate the Bar Chart usingd3-node package -> Either as encoded image string or image file--------------------------------------------------------
        const svgString = createBarChartImage2(processedDataForChartGen);
        const base64Image = Buffer.from(svgString).toString('base64');
        const imgHtml = `<img src="data:image/svg+xml;base64,${base64Image}" alt="IDoc Bar Chart" style="max-width: 100%; height: auto; display: block; margin: 0 auto 20px auto;" />`;

        // This is a tiny red circle SVG
        const simpleSvgBase64 = "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0icmVkIi8+PC9zdmc+";
        // const imgHtml2 = `<img src="data:image/svg+xml;base64,${simpleSvgBase64}" alt="Static SVG Test" style="max-width: 100%; height: auto; display: block; margin: 0 auto 10px auto;" />`;
        const imgHtml2 = `<img src="data:image/svg+xml;base64,${simpleSvgBase64}" alt="Static SVG Test" />`;

        // This is a tiny black square PNG (very basic)
        const simplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0EAwImj/AwAD9gFQ5iNEkAAAAAElFTkSuQmCC";
        // const imgHtml3 = `<img src="data:image/png;base64,${simplePngBase64}" alt="Static PNG Test" style="max-width: 100%; height: auto; display: block; margin: 0 auto 10px auto;" />`;
        const imgHtml3 = `<img src="data:image/png;base64,${simplePngBase64}" alt="Static PNG Test" />`;

        const imgurImageLink = `<blockquote class="imgur-embed-pub" lang="en" data-id="a/4aybsFt"  ><a href="//imgur.com/a/4aybsFt">Tiny home</a></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>`;

        // const chartImageUrl = `/visuals/getChartImage()`;
        const testImageUrlImgurTemplate = "https://i.imgur.com/your_test_image.png";
        const testImageUrlImgur = "https://i.imgur.com/EuGmbhN.jpeg";
        const testImageUrlImgur2 = "https://postimg.cc/YvGxkfrb";
        const imgHtmlVar2 = "<img src='https://i.postimg.cc/YvGxkfrb/tbarchart1.png' border='0' alt='tbarchart1'/>"
        const imgHtmlImgur = `<img src="${testImageUrlImgur2}" alt="External Test Image" style="max-width: 100%; height: auto; display: block; margin: 0 auto 20px auto;" />`;

        // Your base64 encoded image strings
        const simple2PngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0EAwImj/AwAD9gFQ5iNEkAAAAAElFTkSuQmCC"; // Black Square
        const redSquarePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADElEQVQI12P4//8/A6wIAAfV32mUAAAAAElFTkSuQmCC"; // Red Square
        const blackSquareJpegBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfJwgGCysgFTgjJRgqICwsIyMkNSIrMjPl5sDAqN//Z"; // Black JPEG Square
        const emailHtmlBody2T = `
            <h1>Email with Embedded Images (Data URIs)</h1>
            <p>This email contains images directly embedded in the HTML using Data URIs.</p>

            <p><strong>Black PNG Square:</strong></p>
            <img src="data:image/png;base64,${simple2PngBase64}" alt="Black PNG" style="width: 50px; height: 50px; border: 1px solid black;" />

            <p><strong>Red PNG Square:</strong></p>
            <img src="data:image/png;base64,${redSquarePngBase64}" alt="Red PNG" style="width: 50px; height: 50px; border: 1px solid black;" />

            <p><strong>Black JPEG Square (might look blocky):</strong></p>
            <img src="data:image/jpeg;base64,${blackSquareJpegBase64}" alt="Black JPEG" style="width: 50px; height: 50px; border: 1px solid black;" />

            ${imgHtmlImgur}

            <p>Best regards,<br>Your App</p>
        `;


        console.warn("[DEBUG] chart img generated  -- ");


        // 4. Generate HTML String with Table to be Embedded in the email body------------------------------------------------------------------------------------------                
        const emailTableHtml = generateEmailTableHtml2(idocData);
        console.warn("[DEBUG] table generated  -- ");
        // Adding a main container div and titles for better structure in email
        const mainContainerStyle = "font-family: Arial, sans-serif; color: #333333; margin: 0 auto; max-width: 800px; padding: 20px; border: 1px solid #eeeeee;";
        const mainContainerStyle2 = "font-family: Arial, sans-serif; color: #333333; margin: 0 auto; max-width: 1000px; padding: 10px;";
        const h1Style = "font-size: 24px; text-align: center; margin-bottom: 20px;";
        const h2Style = "font-size: 20px; text-align: center; margin-top: 30px; margin-bottom: 15px;";
        let optionalMessageTextHtml = (optionalMessageText) ? "<br/><h3>Message From Sender:</h3><h4>" + optionalMessageText + "</h4>" : "";
        const textForImage = "<h4>The attached chart highlights IDoc processing status: While DESADV and SHPORD show high success, REMADV has an alarmingly high failure rate, and ORDERS also presents a significant number of failures. SAP Developers should prioritize investigating and resolving the issues causing failures in REMADV and ORDERS IDocs to ensure smoother operations.<h4/>";

        const finalContent = `
            <div style="${mainContainerStyle}">                
                <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
                ${imgHtml} ${optionalMessageTextHtml} <h2 style="${h2Style}">Detailed IDoc Data</h2>
                ${emailTableHtml} </div>                
        `;
        const finalContent2 = `
            <div style="${mainContainerStyle2}">
                <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
                ${imgHtml2} </div>                
        `;
        const finalContent3 = `
            <div style="${mainContainerStyle}">
                <h2 style="${h2Style}">Detailed IDoc Data</h2>
                ${emailTableHtml} ${optionalMessageTextHtml} </div>                
        `;

        const finalContent4 = `
            <div style="${mainContainerStyle2}">
                <h2 style="${h2Style}">CHECK: </h2>
                ${imgHtml3}  <br/><br/> ${imgHtml2} <br/><br/> ${imgHtmlImgur} </div>                
        `;

        const finalContent5 = `
            <div style="${mainContainerStyle2}">                
                ${imgHtml3} </div>                
        `;

        const finalContentUR = `
            <div style="${mainContainerStyle}">                
                <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
                ${imgHtmlVar2} <br/><br/> ${textForImage} <h2 style="${h2Style}">Detailed IDoc Data</h2>
                ${emailTableHtml} </div>                
        `;

        const finalbody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>IDoc Data Report</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        /* Basic reset for email compatibility */
                        body, html { margin: 0; padding: 0; }
                        table { border-collapse: collapse; }
                        img { border: 0; }
                    </style>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                    ${finalContentUR}
                </body>
                </html>
            `;


        /** 
         * * 5. Send Email as: 
         *     TO: TAKEN FROM REQ PARAM
         *     SUBJECT: TAKEN FROM REQ PARAM
         *     BODY: EMBEDDED HTML AS: EITHER (TITLE/TEXT + IMAGE + DATA TABLE) OR (TITLE/TEXT + DATA TABLE)
         *     ATTACHMENT: BASE64 ENCODED STRING OR FILE READ FROM PATH 
         * */

        // Will be needed if going for attachment
        const sampleAttachmentOptions = [{
            filename: "packagehehejson.txt",
            path: "../srv/files/packagehehejson.txt",
            contentType: "text/plain"
        }];

        const mailOptions4Gmail = {
            // from: 'krishnapk808@gmail.com', 
            to: emailRecipient,
            subject: emailSubject,
            body: "",
            htmlBody: finalbody,
            attachments: [] //sampleAttachmentOptions // Attachments array
        };

        const option = 3;

        const recipient2l = [emailRecipient];
        console.warn("[DEBUG] Sending Email to Recipient -- " + emailRecipient);
        if (option == 1) {
            await trySes(emailRecipient, emailSubject, "", finalbody, "", true)
            console.log("Mail Sent via SES...");
            return { status: "Mail Sent via SES, check message for body", message: finalbody };
        } else if (option == 2) {
            await tryMaileroo(recipient2l, emailSubject, "", finalbody, "")
            console.log("Mail Sent via Maileroo...");
            return { status: "Mail Sent via Maileroo, check message for body", message: finalbody };
        } else if (option == 3) {
            await sendGmailEmail(mailOptions4Gmail) // == "success"
            console.log("Mail Sent via Gmail SMTP... ? ");
            return { status: "Mail Sent via Gmail SMTP, check message for body", message: finalbody };
        } else {
            return req.error(500, "All email methods failed");
        }


    }


    async idocWorkFlow1(req) {
        const { toMail, optionalMessageText } = req.data;

        const tx = cds.transaction(req);
        const { DailyIdocData } = cds.entities('my.app');

        const putExcelAttachment = true;
        let idocData = [];
        let processedDataForChartGen = [];

        const thisMoment = getCurrentDateTimePlusOneMinute();
        let emailSubject = "IDocs Report Update @" + thisMoment;
        const emailRecipient = toMail;
        console.log("Email Recipient: " + emailRecipient);
        console.log("Email Subject Generated: " + emailSubject);


        async function fetchNeededData() {
            const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
            if (!arr)
                req.error(500, "ERROR PROCESSING IDOC DATA");
            console.log(`Fetched ${arr.length} records for process.`);
            return arr;
        }

        try {
            idocData = await queryWithTimeout(
                tx.run(SELECT.from('DailyIdocData')),
                DB_QUERY_TIMEOUT_MS
            );
            if (!idocData.length) {
                console.log("INFO: No records found in DailyIdocData. Query completed within timeout.");
                idocData = await fetchNeededData();
            } else {
                console.log(`Able to Fetch ${idocData.length} records for Process from SQLite Cache`);
            }
        } catch (error) {
            if (error.message.includes("Query timed out")) {
                idocData = await fetchNeededData();
            } else {
                console.error("Error fetching DailyIdocData:", error.message);
                // throw new Error("Failed to retrieve data for chart generation.");
                req.error(500, "Failed to retrieve data for HTML Table generation and other steps.");
            }
        }
        console.warn("[DEBUG] idocData obtained -- " + idocData.length);

        let excelBase64;
        const excelBase64FileName = `daily_idoc_report_${thisMoment}.xlsx`;
        try {
            excelBase64 = await generateExcelReport(idocData, {
                shouldSave: true,
                needZipped: false,
                filename: excelBase64FileName
            });

            console.log("\nExcel report successfully generated and saved.");
            console.log("Base64 encoded string length:", excelBase64.length);

        } catch (e) {
            console.error("An error occurred during the process:", e.message);
        }

        const processedChartDataTest2ex = [
            { MESTYP: 'DESADV', 'Success (OAPI)': 400, 'Failure (OAPI)': 300, 'Success (OCPI)': 208, 'Failure (OCPI)': 107 },
            { MESTYP: 'ORDERS', 'Success (OAPI)': 168, 'Failure (OAPI)': 230, 'Success (OCPI)': 548, 'Failure (OCPI)': 350 },
            { MESTYP: 'REMADV', 'Success (OAPI)': 292, 'Failure (OAPI)': 690, 'Success (OCPI)': 158, 'Failure (OCPI)': 700 },
            { MESTYP: 'SHPORD', 'Success (OAPI)': 318, 'Failure (OAPI)': 280, 'Success (OCPI)': 608, 'Failure (OCPI)': 450 }
        ]

        processedDataForChartGen = processIdocDataForChart3(idocData);
        // processedDataForChartGen = processedChartDataTest2ex;
        console.log("Processed - Aggregated Idoc Data for Chart Generation --- ", Object.values(processedDataForChartGen));

        const iDocExcelReportAttachment = putExcelAttachment
            ? { base64: excelBase64, name: excelBase64FileName }
            : null;

        // Attempting Chart Image
        const svgString = createBarChartImage4(processedDataForChartGen);
        const base64Image = Buffer.from(svgString).toString('base64');
        const svgBase64String_gmail = `data:image/svg+xml;base64,${base64Image}`;
        const imgHtml = `<img src="data:image/svg+xml;base64,${base64Image}" alt="IDoc Bar Chart" style="max-width: 100%; height: auto; display: block; margin: 0 auto 20px auto;" />`;


        // Generating the Email HTML Content    
        const finalHtmlBody1 = generateIdocReportHtmlBody(
            processedDataForChartGen,
            true,
            optionalMessageText
        );
        const finalHtmlBody2 = generateIdocReportHtmlBody(
            processedDataForChartGen,
            false,
            optionalMessageText // "Please also include data for the last 7 days in the next report."
        );

        const attachments_gmail = [
            {
                filename: 'idoc_chart.svg',
                path: svgBase64String_gmail,
                contentType: 'image/svg+xml',
                disposition: 'inline'
            },
            {
                filename: excelBase64FileName, // 'iDocExcelReport.xlsx',
                path: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBase64}`,
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                disposition: 'attachment'
            }
        ];

        const recipient2l = [emailRecipient];
        console.warn("[DEBUG] Sending Email to Recipient -- " + emailRecipient);
        // if (await trySes(emailRecipient, emailSubject, "", finalHtmlBody1, iDocExcelReportAttachment, true)) {
        //     console.log("Mail Sent via SES...");
        //     return { status: "Mail Sent via SES, CAN REPLY :)", message: finalHtmlBody1 };
        // } else 
        if (await trySesSMTP(emailRecipient, emailSubject, "", finalHtmlBody1, iDocExcelReportAttachment, true)) {
            console.log("Mail Sent via SES SMTP ...");
            return { status: "Mail Sent via SES SMTP, CAN REPLY :)", message: finalHtmlBody1 };
        } else if (await tryMaileroo(recipient2l, emailSubject, "", finalHtmlBody2, iDocExcelReportAttachment)) {
            console.log("Mail Sent via Maileroo...");
            return { status: "Mail Sent via Maileroo, CANNOT REPLY MAYBE", message: finalHtmlBody2 };
        } else if ((await sendGmailEmail2t({
            to: emailRecipient,
            subject: emailSubject,
            body: "",
            htmlBody: finalHtmlBody2,
            attachments: attachments_gmail
        })).status === "success") {
            console.log("Mail Sent via Gmail SMTP...");
            return { status: "Mail Sent via Gmail SMTP", message: finalHtmlBody2 };
        } else {
            return req.error(500, "Unable to Trigger Email");
        }

        // return { status: "TEST", message: "TEST OK" };
    }




    // async flow2(req) {

    //     // const { toEmail, optionalMessageText } = req.data;
    //     // const tx = cds.transaction(req);
    //     // const { DailyIdocData } = cds.entities('my.app');
    //     // let idocData = [];
    //     let processedDataForChartGen = [];
    //     // let emailSubject = "IDoc Success/Failure Data Update";
    //     // let h_recipient = "pranavkrishna5by6@gmail.com";
    //     // let h_recipient3 = "krishnapk808@gmail.com";
    //     // let h_recipient2 = "Vivek.Mantha@genpact.com";
    //     // let h_recipient4 = "Vivek.Mantha-CW@otsuka-us.com";
    //     // // const emailRecipient = toEmail;        
    //     // const emailRecipient = h_recipient4;


    //     // // 1. Fetch Idoc Data -> Either Select Data from the Persisted SQLite Domain Entity or Perform the REST API Request and get it from the Backend---------------------------------------------
    //     // async function fetchNeededData() {
    //     //     const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
    //     //     if (!arr)
    //     //         req.error(500, "ERROR PROCESSING IDOC DATA");
    //     //     console.log(`Fetched ${arr.length} records for visualization.`);
    //     //     return arr;
    //     // }

    //     // try {
    //     //     idocData = await queryWithTimeout(
    //     //         tx.run(SELECT.from('DailyIdocData')),
    //     //         DB_QUERY_TIMEOUT_MS
    //     //     );
    //     //     if (!idocData.length) {
    //     //         console.log("INFO: No records found in DailyIdocData. Query completed within timeout.");
    //     //         idocData = await fetchNeededData();
    //     //     } else {
    //     //         console.log(`Fetched ${idocData.length} records for Process.`);
    //     //     }
    //     // } catch (error) {
    //     //     if (error.message.includes("Query timed out")) {
    //     //         idocData = await fetchNeededData();
    //     //     } else {
    //     //         console.error("Error fetching DailyIdocData:", error.message);
    //     //         // throw new Error("Failed to retrieve data for chart generation.");
    //     //         req.error(500, "Failed to retrieve data for HTML Table generation and other steps.");
    //     //     }
    //     // }
    //     // console.warn("[DEBUG] idocData obtained -- " + idocData.length);


    //     // 2. Perform Aggregation and prepare Data for Bar Chart-----------------------------------------------------------------------------------------------
    //     // const processedChartDataTest = [
    //     //     { MESTYP: 'DESADV', 'Success (OAPI)': 1608, 'Failure (OAPI)': 400 },
    //     //     { MESTYP: 'ORDERS', 'Success (OAPI)': 1400, 'Failure (OAPI)': 230 },
    //     //     { MESTYP: 'REMADV', 'Success (OAPI)': 104, 'Failure (OAPI)': 700 },
    //     //     { MESTYP: 'SHPORD', 'Success (OAPI)': 660, 'Failure (OAPI)': 0 }
    //     // ]
    //     const processedChartDataTest2ex = [
    //         { MESTYP: 'DESADV', 'Success (OAPI)': 400, 'Failure (OAPI)': 300, 'Success (OCPI)': 208, 'Failure (OCPI)': 107 },
    //         { MESTYP: 'ORDERS', 'Success (OAPI)': 168, 'Failure (OAPI)': 230, 'Success (OCPI)': 548, 'Failure (OCPI)': 350 },
    //         { MESTYP: 'REMADV', 'Success (OAPI)': 292, 'Failure (OAPI)': 690, 'Success (OCPI)': 158, 'Failure (OCPI)': 700 },
    //         { MESTYP: 'SHPORD', 'Success (OAPI)': 318, 'Failure (OAPI)': 280, 'Success (OCPI)': 608, 'Failure (OCPI)': 450 }
    //     ]

    //     // processedDataForChartGen = processIdocDataForChart3(processedChartDataTest2ex);
    //     processedDataForChartGen = processedChartDataTest2ex;
    //     console.log("Processed - Aggregated Idoc Data for Chart Generation --- ", Object.values(processedDataForChartGen));

    //     // 3. Generate the Bar Chart usingd3-node package -> Either as encoded image string or image file--------------------------------------------------------
    //     const svgString = createBarChartImage4(processedDataForChartGen);
    //     const base64Image = Buffer.from(svgString).toString('base64');
    //     const imgHtml = `<img src="data:image/svg+xml;base64,${base64Image}" alt="IDoc Bar Chart" style="max-width: 100%; height: auto; display: block; margin: 0 auto 20px auto;" />`;
    //     // const imgHtml = "Hehe";

    //     // Convert SVG to PNG and save
    //     const outputPath = path.join(__dirname, 'files', 'chart.png');
    //     console.log(outputPath)

    //     // sharp(Buffer.from(svgString))
    //     //     .png()
    //     //     .toFile(outputPath)
    //     //     .then(() => {
    //     //         console.log('PNG image saved to:', outputPath);
    //     //     })
    //     //     .catch(err => {
    //     //         console.error('Error saving PNG image:', err);
    //     //     });

    //     await saveChartAsPNG(__dirname, svgString);

    //     return { status: "ok", message: "saved to " + outputPath + "     also see this: " + imgHtml };

    //     // // This is a tiny red circle SVG
    //     // const simpleSvgBase64 = "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0icmVkIi8+PC9zdmc+";
    //     // // const imgHtml2 = `<img src="data:image/svg+xml;base64,${simpleSvgBase64}" alt="Static SVG Test" style="max-width: 100%; height: auto; display: block; margin: 0 auto 10px auto;" />`;
    //     // const imgHtml2 = `<img src="data:image/svg+xml;base64,${simpleSvgBase64}" alt="Static SVG Test" />`;

    //     // // This is a tiny black square PNG (very basic)
    //     // const simplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0EAwImj/AwAD9gFQ5iNEkAAAAAElFTkSuQmCC";
    //     // // const imgHtml3 = `<img src="data:image/png;base64,${simplePngBase64}" alt="Static PNG Test" style="max-width: 100%; height: auto; display: block; margin: 0 auto 10px auto;" />`;
    //     // const imgHtml3 = `<img src="data:image/png;base64,${simplePngBase64}" alt="Static PNG Test" />`;

    //     // const imgurImageLink = `<blockquote class="imgur-embed-pub" lang="en" data-id="a/4aybsFt"  ><a href="//imgur.com/a/4aybsFt">Tiny home</a></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>`;

    //     // // const chartImageUrl = `/visuals/getChartImage()`;
    //     // const testImageUrlImgurTemplate = "https://i.imgur.com/your_test_image.png";
    //     // const testImageUrlImgur = "https://i.imgur.com/EuGmbhN.jpeg";
    //     // const testImageUrlImgur2 = "https://postimg.cc/YvGxkfrb";
    //     // const imgHtmlVar2 = "<img src='https://i.postimg.cc/YvGxkfrb/tbarchart1.png' border='0' alt='tbarchart1'/>"
    //     // const imgHtmlImgur = `<img src="${testImageUrlImgur2}" alt="External Test Image" style="max-width: 100%; height: auto; display: block; margin: 0 auto 20px auto;" />`;

    //     // // Your base64 encoded image strings
    //     // const simple2PngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0EAwImj/AwAD9gFQ5iNEkAAAAAElFTkSuQmCC"; // Black Square
    //     // const redSquarePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADElEQVQI12P4//8/A6wIAAfV32mUAAAAAElFTkSuQmCC"; // Red Square
    //     // const blackSquareJpegBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfJwgGCysgFTgjJRgqICwsIyMkNSIrMjPl5sDAqN//Z"; // Black JPEG Square
    //     // const emailHtmlBody2T = `
    //     //     <h1>Email with Embedded Images (Data URIs)</h1>
    //     //     <p>This email contains images directly embedded in the HTML using Data URIs.</p>

    //     //     <p><strong>Black PNG Square:</strong></p>
    //     //     <img src="data:image/png;base64,${simple2PngBase64}" alt="Black PNG" style="width: 50px; height: 50px; border: 1px solid black;" />

    //     //     <p><strong>Red PNG Square:</strong></p>
    //     //     <img src="data:image/png;base64,${redSquarePngBase64}" alt="Red PNG" style="width: 50px; height: 50px; border: 1px solid black;" />

    //     //     <p><strong>Black JPEG Square (might look blocky):</strong></p>
    //     //     <img src="data:image/jpeg;base64,${blackSquareJpegBase64}" alt="Black JPEG" style="width: 50px; height: 50px; border: 1px solid black;" />

    //     //     ${imgHtmlImgur}

    //     //     <p>Best regards,<br>Your App</p>
    //     // `;


    //     // console.warn("[DEBUG] chart img generated  -- ");


    //     // // 4. Generate HTML String with Table to be Embedded in the email body------------------------------------------------------------------------------------------                
    //     // const emailTableHtml = generateEmailTableHtml2(idocData);
    //     // console.warn("[DEBUG] table generated  -- ");
    //     // // Adding a main container div and titles for better structure in email
    //     // const mainContainerStyle = "font-family: Arial, sans-serif; color: #333333; margin: 0 auto; max-width: 800px; padding: 20px; border: 1px solid #eeeeee;";
    //     // const mainContainerStyle2 = "font-family: Arial, sans-serif; color: #333333; margin: 0 auto; max-width: 1000px; padding: 10px;";
    //     // const h1Style = "font-size: 24px; text-align: center; margin-bottom: 20px;";
    //     // const h2Style = "font-size: 20px; text-align: center; margin-top: 30px; margin-bottom: 15px;";
    //     // let optionalMessageTextHtml = (optionalMessageText) ? "<br/><h3>Message From Sender:</h3><h4>" + optionalMessageText + "</h4>" : "";
    //     // const textForImage = "<h4>The attached chart highlights IDoc processing status: While DESADV and SHPORD show high success, REMADV has an alarmingly high failure rate, and ORDERS also presents a significant number of failures. SAP Developers should prioritize investigating and resolving the issues causing failures in REMADV and ORDERS IDocs to ensure smoother operations.<h4/>";

    //     // const finalContent = `
    //     //     <div style="${mainContainerStyle}">                
    //     //         <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
    //     //         ${imgHtml} ${optionalMessageTextHtml} <h2 style="${h2Style}">Detailed IDoc Data</h2>
    //     //         ${emailTableHtml} </div>                
    //     // `;
    //     // const finalContent2 = `
    //     //     <div style="${mainContainerStyle2}">
    //     //         <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
    //     //         ${imgHtml2} </div>                
    //     // `;
    //     // const finalContent3 = `
    //     //     <div style="${mainContainerStyle}">
    //     //         <h2 style="${h2Style}">Detailed IDoc Data</h2>
    //     //         ${emailTableHtml} ${optionalMessageTextHtml} </div>                
    //     // `;

    //     // const finalContent4 = `
    //     //     <div style="${mainContainerStyle2}">
    //     //         <h2 style="${h2Style}">CHECK: </h2>
    //     //         ${imgHtml3}  <br/><br/> ${imgHtml2} <br/><br/> ${imgHtmlImgur} </div>                
    //     // `;

    //     // const finalContent5 = `
    //     //     <div style="${mainContainerStyle2}">                
    //     //         ${imgHtml3} </div>                
    //     // `;

    //     // const finalContentUR = `
    //     //     <div style="${mainContainerStyle}">                
    //     //         <h1 style="${h1Style}">IDoc Success/Failure by MESTYP</h1>
    //     //         ${imgHtmlVar2} <br/><br/> ${textForImage} <h2 style="${h2Style}">Detailed IDoc Data</h2>
    //     //         ${emailTableHtml} </div>                
    //     // `;        

    //     // const finalbody = `
    //     //         <!DOCTYPE html>
    //     //         <html>
    //     //         <head>
    //     //             <title>IDoc Data Report</title>
    //     //             <meta charset="UTF-8">
    //     //             <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //     //             <style>
    //     //                 /* Basic reset for email compatibility */
    //     //                 body, html { margin: 0; padding: 0; }
    //     //                 table { border-collapse: collapse; }
    //     //                 img { border: 0; }
    //     //             </style>
    //     //         </head>
    //     //         <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    //     //             ${finalContentUR}
    //     //         </body>
    //     //         </html>
    //     //     `;


    //     // /** 
    //     //  * * 5. Send Email as: 
    //     //  *     TO: TAKEN FROM REQ PARAM
    //     //  *     SUBJECT: TAKEN FROM REQ PARAM
    //     //  *     BODY: EMBEDDED HTML AS: EITHER (TITLE/TEXT + IMAGE + DATA TABLE) OR (TITLE/TEXT + DATA TABLE)
    //     //  *     ATTACHMENT: BASE64 ENCODED STRING OR FILE READ FROM PATH 
    //     //  * */

    //     // // Will be needed if going for attachment
    //     // const sampleAttachmentOptions = [{
    //     //     filename: "packagehehejson.txt",
    //     //     path: "../srv/files/packagehehejson.txt",
    //     //     contentType: "text/plain"
    //     // }];

    //     // const mailOptions4Gmail = {
    //     //     // from: 'krishnapk808@gmail.com', 
    //     //     to: emailRecipient,
    //     //     subject: emailSubject,
    //     //     body: "",
    //     //     htmlBody: finalbody,
    //     //     attachments: [] //sampleAttachmentOptions // Attachments array
    //     // };

    //     // const option = 3;

    //     // const recipient2l = [emailRecipient];
    //     // console.warn("[DEBUG] Sending Email to Recipient -- " + emailRecipient);
    //     // if (option == 1) {
    //     //     await trySes(emailRecipient, emailSubject, "", finalbody, "", true)
    //     //     console.log("Mail Sent via SES...");
    //     //     return { status: "Mail Sent via SES, check message for body", message: finalbody };
    //     // } else if (option == 2) {
    //     //     await tryMaileroo(recipient2l, emailSubject, "", finalbody, "")
    //     //     console.log("Mail Sent via Maileroo...");
    //     //     return { status: "Mail Sent via Maileroo, check message for body", message: finalbody };
    //     // } else if (option == 3) {
    //     //     await sendGmailEmail(mailOptions4Gmail) // == "success"
    //     //     console.log("Mail Sent via Gmail SMTP... ? ");
    //     //     return { status: "Mail Sent via Gmail SMTP, check message for body", message: finalbody };
    //     // } else {
    //     //     return req.error(500, "All email methods failed");
    //     // }


    // }


}

async function saveChartAsPNG(cwd, svgString) {
    // const svgString = createBarChartImage3(chartData);
    const htmlContent = `
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; background: white; }
                svg { width: 100%; height: auto; display: block; margin: 0 auto; }
            </style>
        </head>
        <body>
            ${svgString}
        </body>
        </html>
    `;

    const outputPath = path.join(cwd, 'files', 'chart.png');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const svgElement = await page.$('svg');
    await svgElement.screenshot({ path: outputPath });

    await browser.close();
    console.log('Chart saved as PNG at:', outputPath);
}


module.exports = BpaPocFlowService;