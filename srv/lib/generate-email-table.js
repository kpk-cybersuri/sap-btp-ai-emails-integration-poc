/**
 * Generates an HTML table string with inline CSS, suitable for email clients.
 *
 * @param {Array<Object>} idocData - The array of IDoc data records.
 * @param {string} title - The title for the table.
 * @param {string} description - A description for the table.
 * @returns {string} The HTML string containing the div and the table.
 */
function generateEmailTableHtml(idocData, title, description, visBigString) {
    // Basic inline styles for email compatibility
    const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 20px;";
    const thTdStyle = "border: 1px solid #dddddd; text-align: left; padding: 8px;";
    const thStyle = "background-color: #f2f2f2; font-weight: bold;";
    const headerDivStyle = "font-family: Arial, sans-serif; color: #333333; margin-bottom: 15px;";
    const titleStyle = "font-size: 20px; font-weight: bold; margin-bottom: 5px;";
    const descriptionStyle = "font-size: 14px; color: #666666;";
    const rowEvenStyle = "background-color: #ffffff;"; // White background for even rows
    const rowOddStyle = "background-color: #f9f9f9;";  // Light grey background for odd rows

    // Start building the HTML string
    let htmlString = `
        <div style="${headerDivStyle}">
            <p style="${titleStyle}">${title}</p>
            <p style="${descriptionStyle}">${description}</p>
            <p>${visBigString}</p>
        </div>
        <table style="${tableStyle}">
            <thead>
                <tr>
                    <th style="${thTdStyle} ${thStyle}">Date</th>
                    <th style="${thTdStyle} ${thStyle}">Module</th>
                    <th style="${thTdStyle} ${thStyle}">Direction</th>
                    <th style="${thTdStyle} ${thStyle}">Message Type</th>
                    <th style="${thTdStyle} ${thStyle}">System</th>
                    <th style="${thTdStyle} ${thStyle}">Success (OAPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Fail (OAPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Success (OCPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Fail (OCPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Status Text</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Loop through the data to create table rows
    idocData.forEach((row, index) => {
        const rowStyle = index % 2 === 0 ? rowEvenStyle : rowOddStyle; // Apply alternating row styles
        htmlString += `
                <tr style="${rowStyle}">
                    <td style="${thTdStyle}">${row.DATE || ''}</td>
                    <td style="${thTdStyle}">${row.MODULE || ''}</td>
                    <td style="${thTdStyle}">${row.DIRECTION || ''}</td>
                    <td style="${thTdStyle}">${row.MESTYP || ''}</td>
                    <td style="${thTdStyle}">${row.SYSTEM || ''}</td>
                    <td style="${thTdStyle}">${row.SUCESS_OAPI || 0}</td>
                    <td style="${thTdStyle}">${row.FAIL_OAPI || 0}</td>
                    <td style="${thTdStyle}">${row.SUCESS_OCPI || 0}</td>
                    <td style="${thTdStyle}">${row.FAIL_OCPI || 0}</td>
                    <td style="${thTdStyle}">${row.STATUSTEXT || ''}</td>
                </tr>
        `;
    });

    // Close the table and body tags
    htmlString += `
            </tbody>
        </table>
    `;

    return htmlString;
}

// srv/lib/email-utils/generate-email-table.js

/**
 * Generates an HTML table string with inline CSS, suitable for email clients.
 *
 * @param {Array<Object>} idocData - The array of IDoc data records.
 * @returns {string} The HTML string containing the table.
 */
function generateEmailTableHtml2(idocData) { // Removed title, description parameters
    // Basic inline styles for email compatibility
    const tableStyle = "width: 100%; border-collapse: collapse; margin-top: 20px; font-family: Arial, sans-serif; color: #333333;"; // Added font-family and color for consistency
    const thTdStyle = "border: 1px solid #dddddd; text-align: left; padding: 8px;";
    const thStyle = "background-color: #f2f2f2; font-weight: bold;";
    const rowEvenStyle = "background-color: #ffffff;"; // White background for even rows
    const rowOddStyle = "background-color: #f9f9f9;";  // Light grey background for odd rows

    // Start building the HTML string (removed the header div)
    let htmlString = `
        <table style="${tableStyle}">
            <thead>
                <tr>
                    <th style="${thTdStyle} ${thStyle}">Date</th>
                    <th style="${thTdStyle} ${thStyle}">Module</th>
                    <th style="${thTdStyle} ${thStyle}">Direction</th>
                    <th style="${thTdStyle} ${thStyle}">Message Type</th>
                    <th style="${thTdStyle} ${thStyle}">System</th>
                    <th style="${thTdStyle} ${thStyle}">Success (OAPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Fail (OAPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Success (OCPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Fail (OCPI)</th>
                    <th style="${thTdStyle} ${thStyle}">Status Text</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Loop through the data to create table rows
    idocData.forEach((row, index) => {
        const rowStyle = index % 2 === 0 ? rowEvenStyle : rowOddStyle; // Apply alternating row styles
        htmlString += `
                <tr style="${rowStyle}">
                    <td style="${thTdStyle}">${row.DATE || ''}</td>
                    <td style="${thTdStyle}">${row.MODULE || ''}</td>
                    <td style="${thTdStyle}">${row.DIRECTION || ''}</td>
                    <td style="${thTdStyle}">${row.MESTYP || ''}</td>
                    <td style="${thTdStyle}">${row.SYSTEM || ''}</td>
                    <td style="${thTdStyle}">${row.SUCESS_OAPI || 0}</td>
                    <td style="${thTdStyle}">${row.FAIL_OAPI || 0}</td>
                    <td style="${thTdStyle}">${row.SUCESS_OCPI || 0}</td>
                    <td style="${thTdStyle}">${row.FAIL_OCPI || 0}</td>
                    <td style="${thTdStyle}">${row.STATUSTEXT || ''}</td>
                </tr>
        `;
    });

    // Close the table and body tags
    htmlString += `
            </tbody>
        </table>
    `;

    return htmlString;
}


// If you put this in a separate file, export it:
module.exports = { generateEmailTableHtml, generateEmailTableHtml2 };