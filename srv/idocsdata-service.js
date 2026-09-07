// srv/idocsdata-service.js
const cds = require('@sap/cds');
const { fetchAndStoreIdocs } = require('./lib/idocsdata-helper');
const { AuthTokens: CdsAuthTokens } = cds.entities('my.app');
const { DailyIdocData, DailyFetches } = cds.entities('my.app');
const { validateSelectQuery } = require('./lib/snswebhook-helper');

class IdocsDataService extends cds.ApplicationService {
  // constructor(...args) {
  //   super(...args);
  // }

  init() {
    const { DailyIdocData } = this.entities;

    // READ handler: auto-refresh data if stale
    this.before('READ', DailyIdocData, this.ensureFreshIdocs.bind(this));

    // Action handler: manual refresh
    this.on('refreshIdocsData', this.handleRefreshAction.bind(this));

    this.on('checkDynamicQuery', this.checkDynamicQueryHandler);

    return super.init();
  }

  async ensureFreshIdocs(req) {
    const tx = cds.transaction(req);
    let latest;
    try {
      latest = await tx.run(
        SELECT.from(DailyFetches)
          .orderBy('fetchedAt desc')
          .limit(1)
      );
    } catch (et) {
      req.error("ERROR PROCESSING IDOCS STATUS DATA --- " + et);
    }
    const now = new Date();
    if (!latest.length || (now - new Date(latest[0].fetchedAt)) > 24 * 60 * 60 * 1000) {
      console.log("Need to Refresh Idocs Data...");
      const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
      if (!arr)
        req.error("ERROR PROCESSING IDOCS DATA");
    }
  }

  async handleRefreshAction(req) {
    const tx = cds.transaction(req);
    const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
    if (!arr)
      req.error("ERROR PROCESSING IDOC DATA");
    else
      return { message: `Refreshed ${arr.length} records at ${new Date().toISOString()}` };
  }

  async checkDynamicQueryHandler(req) {
    console.log("Checking and Test Executing Dynamic Query..... \n NOTE: there is no hard query sanitization, must send a proper query to expect results");
    const { inputQuery } = req.data;
    console.log("Received Dynamic Query: ", inputQuery);

    const returnQueryStatus = {
      validation: "",
      relevantQuery: "Failed to Get this",
      workingStatus: ""
    }

    if (validateSelectQuery(inputQuery)) {
      try {
        const db = await cds.connect.to('db');

        const query = cds.parse.cql(inputQuery);
        console.log("Parsed Relevant Query : ", JSON.stringify(query, null, 2));
        returnQueryStatus.relevantQuery = query;

        const result = await cds.run(query);

        returnQueryStatus.validation = "SUCCESS";
        if (!result || result.length === 0) {
          console.log("No data found for the query.");
          returnQueryStatus.workingStatus = "Query Ok Result Ok - But No Data in Result";
        } else {
          console.log("Data Found for the query!!! : ) -> " + result.length);
          returnQueryStatus.workingStatus = "Query Ok Result Ok - Data good too"
        }
      } catch (err) {
        console.error("Error executing dynamic CDS query:", err);
        returnQueryStatus.validation = "FAILURE";
        returnQueryStatus.workingStatus = "Problem with parsing Query or Dynamic Execution - Error executing dynamic CDS query: " + err.message;
        // `Failed to execute query: ${err.message}`);
      }
    } else {
      returnQueryStatus.validation = "FAILURE";
      returnQueryStatus.workingStatus = "INVALID QUERY";
    }
    return returnQueryStatus;
  }

}

module.exports = IdocsDataService;
