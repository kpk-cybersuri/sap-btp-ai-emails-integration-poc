type OneDimArrays : array of String;

service FilesService @(path: '/xlsxf') {
    // action GenerateSampleExcelFromStrings(input : array of String) returns String;
    
    action generateExcelRowReportBase64(input : array of String,
                                        wantZipped : Int16) returns String;

    function getSampleJsonData() returns array of Map;

    function mockIDOCJsonData() returns array of Map;                                        

    /**
     * Following worked in cds watch, but not in cf deploy
     */
    // action generateExcelReportBase64(data : array of OneDimArrays,
    //                                  zipped : Boolean)    returns String;
}
