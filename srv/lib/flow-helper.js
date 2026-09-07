const cds = require('@sap/cds');
const { fetchAndStoreIdocs } = require('./idocsdata-helper');
const path = require('path');
const fs = require('fs');

const DB_QUERY_TIMEOUT_MS = 5000; // 5000 milliseconds = 5 seconds

async function queryWithTimeout(promise, timeoutMs) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Query timed out after ${timeoutMs} ms.`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

function getCurrentDateTimePlusOneMinute() {
    const now = new Date();

    // Add one minute to the current time
    now.setMinutes(now.getMinutes() + 1);

    // Get date components
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();

    // Get time components
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    hours = String(hours).padStart(2, '0');

    // Construct the final string
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}

//   // Example usage:
//   const futureDateTime = getCurrentDateTimePlusOneMinute();
//   console.log(futureDateTime); // e.g., "05-Aug-2025 07:26 PM"

/**
 * Generates an HTML string for an automated IDoc data report email with a Fiori-inspired design.
 *
 * @param {Array<object>} processedChartData - The aggregated IDoc data to be displayed in a table.
 * @param {boolean} capableToReply - A boolean indicating whether technical queries can be responded to.
 * @param {string} [userText=''] - Optional text to include in the body of the email.
 * @returns {string} The complete HTML content for the email body.
 */
function generateIdocReportHtmlBody(processedChartData, capableToReply, userText = '') {
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Generate the table rows dynamically
    const tableHeaders = Object.keys(processedChartData[0]);
    const tableRows = processedChartData.map(row => {
        return `
            <tr>
                ${tableHeaders.map(header => `<td>${row[header]}</td>`).join('')}
            </tr>
        `;
    }).join('');

    // Construct the optional user text section
    const optionalUserText = userText ? `
        <div style="padding: 20px; background-color: #f7f7f7; border-left: 5px solid #007cc0; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #333333;"><strong>User's Note:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #555555;">${userText}</p>
        </div>
    ` : '';

    // Construct the reply message section based on 'capableToReply'
    const replyMessage = capableToReply ? `
        <div style="padding: 15px; background-color: #d1e7dd; border-radius: 8px; text-align: center; border: 1px solid #c3e6cb;">
            <p style="font-size: 14px; font-weight: bold; color: #155724; margin: 0;">
                <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 20px; margin-right: 8px;">&#10003;</span>
                Please Respond if you have any Technical Queries regarding the IDoc Report Data, i.e., if you want the Data with any filters or aggregations applied or any other way you want the Data to look like.
            </p>
        </div>
    ` : `
        <div style="padding: 15px; background-color: #f8d7da; border-radius: 8px; text-align: center; border: 1px solid #f5c6cb;">
            <p style="font-size: 14px; font-weight: bold; color: #721c24; margin: 0;">
                <span style="background-color: #dc3545; color: white; padding: 4px 12px; border-radius: 20px; margin-right: 8px;">&#9888;</span>
                Maynot be able to respond to Technical Queries at the moment, please email your technical queries related to the IDoc Data Report to <a href="mailto:support.sapclienttest1697@gmail.com" style="color: #721c24; text-decoration: underline; font-weight: bold;">support.sapclienttest1697@gmail.com</a>.
            </p>
        </div>
    `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>IDoc Data Report</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body, html { margin: 0; padding: 0; font-family: "72", "72full", "Noto Sans", "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #dddddd; }
                th { background-color: #007cc0; color: white; font-weight: 600; text-transform: uppercase; }
                tr:nth-child(even) { background-color: #f2f2f2; }
                tr:hover { background-color: #e6f3ff; }
                .container { max-width: 800px; margin: 20px auto; padding: 20px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.05); }
                .header { text-align: center; padding: 20px; border-bottom: 3px solid #007cc0; margin-bottom: 20px; }
                .header h1 { font-size: 28px; color: #003366; margin: 0; }
                .header p { font-size: 14px; color: #666666; margin: 5px 0 0 0; }
                .description { font-size: 14px; color: #555555; margin-bottom: 20px; }
                .table-title { font-size: 18px; font-weight: bold; color: #003366; margin-bottom: 10px; }
            </style>
        </head>
        <body style="background-color: #f0f4f7;">
            <div class="container">
                <div class="header">
                    <h1>IDocs Report</h1>
                    <p style="font-size: 16px;">Generated on: ${today}</p>
                </div>

                <div class="description">
                    <p>
                        This automated report provides a concise overview of the IDoc data for today. We strongly encourage all SAP Developers to
                        carefully review this data to identify and address any failed IDocs or related issues promptly.
                    </p>
                    <p>
                        <strong>A full-fledged IDoc Data Report with complete details has been attached separately for your in-depth analysis.<strong/>
                    </p>
                </div>

                ${optionalUserText}

                <h2 class="table-title">Daily IDoc Aggregated View</h2>
                <table>
                    <thead>
                        <tr>
                            ${tableHeaders.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px;">
                    ${replyMessage}
                </div>

            </div>
        </body>
        </html>
    `;
    // Nice alt font for neat look and feel: "72", "72full", "Noto Sans", "Helvetica Neue", Arial, sans-serif;

}

// const processedChartDataTest2ex = [
//     { MESTYP: 'DESADV', 'Success (OAPI)': 400, 'Failure (OAPI)': 300, 'Success (OCPI)': 208, 'Failure (OCPI)': 107 },
//     { MESTYP: 'ORDERS', 'Success (OAPI)': 168, 'Failure (OAPI)': 230, 'Success (OCPI)': 548, 'Failure (OCPI)': 350 },
//     { MESTYP: 'REMADV', 'Success (OAPI)': 292, 'Failure (OAPI)': 690, 'Success (OCPI)': 158, 'Failure (OCPI)': 700 },
//     { MESTYP: 'SHPORD', 'Success (OAPI)': 318, 'Failure (OAPI)': 280, 'Success (OCPI)': 608, 'Failure (OCPI)': 450 }
// ];

module.exports = { queryWithTimeout, DB_QUERY_TIMEOUT_MS, getCurrentDateTimePlusOneMinute, generateIdocReportHtmlBody };