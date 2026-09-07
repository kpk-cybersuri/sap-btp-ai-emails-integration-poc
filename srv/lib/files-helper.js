const fs = require('fs/promises'); // Use fs.promises for async file operations
const path = require('path');

/**
 * Reads and parses a JSON file.
 * @param {string} filePath The relative path to the JSON file within the 'srv' directory.
 * E.g., 'mockdata/sampleidocdata.json'
 * @returns {Promise<any>} The parsed JSON content.
 * @throws {Error} If the file cannot be read or parsed.
 */
async function readJsonFile(filePath) {
    // Construct the absolute path to the file.
    // __dirname in this helper file would be 'srv/lib', so we need to go up one level to 'srv'
    // and then append the provided filePath.
    const absolutePath = path.join(__dirname, '..', filePath); 

    try {
        console.log(`Attempting to read file: ${absolutePath}`);
        const text = await fs.readFile(absolutePath, 'utf8');
        console.log("File Read successfully.");
        return JSON.parse(text);
    } catch (e) {
        console.error(`Failed to read or parse JSON file at ${absolutePath}:`, e);
        // Re-throw the error to be caught by the service handler
        throw new Error(`Could not read or parse JSON file: ${e.message}`);
    }
}

module.exports = {
    readJsonFile
};
