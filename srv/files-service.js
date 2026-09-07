const cds = require('@sap/cds');
const ExcelJS = require('exceljs');
const { createRowWorkbookAndGetEncodedString, createReportWorkbook } = require('./lib/excel-helper');
// const { createRowWorkbook } = require('./lib/excel-helper');
const { readJsonFile } = require('./lib/files-helper');

const sampleidocdata1path = 'files/sampleidocdata1.json';
const mockIdocdatapath = 'files/mockidocdatacheck.json';

class FilesService extends cds.ApplicationService {
  async init() {
    // this.on('GenerateSampleExcelFromStrings', this.generateFromStrings.bind(this));
    this.on('generateExcelRowReportBase64', this.gERRB64.bind(this));
    this.on('getSampleJsonData', this.onGetSampleJsonData);
    // this.on('generateExcelReportBase64', this.gERB64.bind(this));
    this.on('mockIDOCJsonData', this.onMockIDOCJsonData);
    await super.init();
  }

  async gERRB64(req) {
    const { input, wantZipped } = req.data;
    const row = input;
    if (!Array.isArray(row) || row.some(item => typeof item !== 'string'))
      req.error(400, 'Input must be array of strings');
    const base64 = await createRowWorkbookAndGetEncodedString(row, wantZipped == 0);
    return base64;
  }

  async onGetSampleJsonData(req) {
    try {
      const jsonData = await readJsonFile(sampleidocdata1path);
      return jsonData; // Returns array of objects
    } catch (e) {
      console.error('Error in MockData1Service.onGetJsonData:', e.message);
      req.error(500, `Internal Server Error: ${e.message}`);
    }
  }

  async onMockIDOCJsonData(req) {
    try {
      const jsonData = await readJsonFile(mockIdocdatapath);
      return jsonData; // Returns array of objects
    } catch (e) {
      console.error('Error in MockData1Service.onGetJsonData:', e.message);
      req.error(500, `Internal Server Error: ${e.message}`);
    }
  }

  // async gERB64(req) {
  //   const { data, zipped } = req.data;
  //   const condition1 = !Array.isArray(data);
  //   const condition2 = !data.every(
  //     row => Array.isArray(row) && row.every(cell => typeof cell === 'string')
  //   );

  //   if (condition1 || condition2) {
  //     req.error(400, 'Input must be a 2D array of strings');
  //   }

  //   const base64 = await createReportWorkbook(data, zipped);
  //   return base64;
  // }



  // ------------------------------------------------------------------
  // async generateFromStrings(req) {
  //   const inputStrings = req.data.input;
  //   console.log("Generating the Excel from Strings passed....")
  //   if (!Array.isArray(inputStrings)) {
  //     return req.error(400, 'Invalid input: expected array of strings');
  //   }

  //   const workbook = new ExcelJS.Workbook();
  //   const sheet = workbook.addWorksheet('Sheet1');
  //   inputStrings.forEach((str, idx) => {
  //     sheet.getCell(`A${idx + 1}`).value = str;
  //   });

  //   const buffer = await workbook.xlsx.writeBuffer();
  //   const base64 = buffer.toString('base64');
  //   return { value: base64 }; // Return as object for OData compliance
  // }

}

module.exports = FilesService;