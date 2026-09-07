const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const MAX_BUFFER_SIZE = 1024 * 1024 * 5;

function columnLetter(n) {
    let s = '';
    while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}


async function createRowWorkbookAndGetEncodedString(
    row,
    isZipped = false,
    saveFile = true,
    filename = 'report.xlsx', // Default filename
    filepath = process.cwd() // Default to current working directory
) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(row);
    row.forEach((_, i) =>
        (ws.getColumn(i + 1).width = Math.max(10, row[i].length + 2))
    );
    const buffer = await wb.xlsx.writeBuffer();

    if (saveFile) {
        const fullPath = path.join(filepath, filename);
        try {
            fs.writeFileSync(fullPath, buffer);
            console.log(`File saved successfully to: ${fullPath}`);
        } catch (error) {
            console.error(`Error saving file: ${error.message}`);
        }
    }

    if (isZipped || buffer.length > MAX_BUFFER_SIZE) {
        const zip = new JSZip();
        zip.file('report.xlsx', buffer);
        const zippedBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        return zippedBuffer.toString('base64');
    }
    return buffer.toString('base64');
}

/**
 * Creates an Excel report from a dataset, with an optional header row styling,
 * and handles saving and zipping based on input parameters.
 * This is the second part of the two-function chain. It's an adaptation of your second code block.
 * * @param {Array<object>} idocData - The array of JSON objects (IDoc data) to be written to the Excel file.
 * @param {object} [options] - Optional parameters.
 * @param {boolean} [options.shouldSave=false] - Whether to save the file to a local directory.
 * @param {boolean} [options.needZipped=false] - Whether to zip the file before Base64 encoding.
 * @param {string} [options.filename='report.xlsx'] - The filename for the saved report.
 * @param {string} [options.filepath=path.join(__dirname, '..', 'files')] - The directory to save the file.
 * @returns {Promise<string>} A promise that resolves to the Base64 encoded string of the Excel file.
 */
async function generateExcelReport(idocData, options = {}) {

    const {
        shouldSave = false,
        needZipped = false,
        filename = 'report.xlsx',
        // Default to a 'files' directory inside the 'srv' folder.
        filepath = path.join(__dirname, '..', 'files')
    } = options;

    if (!idocData || idocData.length === 0) {
        throw new Error("No data provided to generate the Excel report.");
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('IDoc Data');

    // 1. Get the header row from the keys of the first data object
    const headers = Object.keys(idocData[0]);
    const headerRow = ws.addRow(headers);

    // 2. Apply styling to the header row
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' } // Light grey background
        };
        cell.font = {
            bold: true,
            color: { argb: 'FF000000' }
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
        };
    });

    // 3. Add the data rows
    idocData.forEach(item => {
        ws.addRow(Object.values(item));
    });

    // 4. Adjust column widths
    ws.columns.forEach((column) => {
        const maxLength = column.values.reduce((max, value) => {
            const currentLength = (value && value.toString().length) || 0;
            return Math.max(max, currentLength);
        }, 0);
        column.width = Math.max(10, maxLength + 2);
    });

    // 5. Write the workbook to a buffer
    const buffer = await wb.xlsx.writeBuffer();

    // 6. Handle saving the file to a local directory
    if (shouldSave) {
        // Ensure the directory exists
        if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath, { recursive: true });
        }
        const fullPath = path.join(filepath, filename);
        try {
            fs.writeFileSync(fullPath, buffer);
            console.log(`File saved successfully to: ${fullPath}`);
        } catch (error) {
            console.error(`Error saving file: ${error.message}`);
        }
    }

    // 7. Handle zipping and Base64 encoding
    if (needZipped || buffer.length > MAX_BUFFER_SIZE) {
        console.log("Zipping the Excel file...");
        const zip = new JSZip();
        zip.file(filename, buffer);
        const zippedBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        return zippedBuffer.toString('base64');
    }

    return buffer.toString('base64');
}

// async function createReportWorkbook(data, isZipped = false) {
//     const wb = new ExcelJS.Workbook();
//     const ws = wb.addWorksheet('Sheet1');

//     ws.addRows(data); // Bulk-write rows

//     // Adjust column widths dynamically
//     data[0].forEach((_, colIdx) => {
//         const maxLen = data.reduce(
//             (max, r) => Math.max(max, (r[colIdx] || '').length),
//             10
//         );
//         ws.getColumn(colIdx + 1).width = maxLen + 2;
//     });

//     const buffer = await wb.xlsx.writeBuffer();

//     if (isZipped || buffer.length > MAX_BUFFER_SIZE) {
//         const zip = new JSZip();
//         zip.file('report.xlsx', buffer);
//         const zippedBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
//         return zippedBuffer.toString('base64');
//     }

//     return buffer.toString('base64');
// }


module.exports = { createRowWorkbookAndGetEncodedString, generateExcelReport }//, createReportWorkbook };
