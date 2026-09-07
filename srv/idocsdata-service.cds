using my.app as db from '../db/schema';

type DataRefreshStatus : {
    message : String;
};

type QueryStatus       : {
    validation    : String;
    relevantQuery : String;
    workingStatus : String;
}

service IdocsDataService @(path: '/idocdata') {
    entity DailyIdocData as projection on db.DailyIdocData;
    action refreshIdocsData()                     returns DataRefreshStatus;
    action checkDynamicQuery(inputQuery : String) returns QueryStatus;
}
