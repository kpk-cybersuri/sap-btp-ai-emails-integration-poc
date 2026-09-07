// srv/visualisation-service.js
const cds = require('@sap/cds');
const { processIdocDataForChart, generateChartHtml, createBarChartImage, createBarChartImage2 } = require('./lib/visualisation-helper');
const { fetchAndStoreIdocs } = require('./lib/idocsdata-helper');
const { AuthTokens: CdsAuthTokens } = cds.entities('my.app');
const { DailyIdocData, DailyFetches } = cds.entities('my.app');

class VisualisationService extends cds.ApplicationService {
    init() {
        this.on('generateBarChart', this.handleGenerateBarChart.bind(this));
        return super.init();
    }

    async handleGenerateBarChart(req) {
        const { needfullHtml } = req.data;
        const tx = cds.transaction(req);
        const { DailyIdocData } = cds.entities('my.app');

        let idocData;
        try {
            idocData = await tx.run(SELECT.from(DailyIdocData));
            if (!idocData.length) {
                const tx = cds.transaction(req);
                const arr = await fetchAndStoreIdocs(tx, CdsAuthTokens, DailyFetches, DailyIdocData);
                if (!arr)
                    req.error("ERROR PROCESSING IDOC DATA");
                console.log(`Fetched ${arr.length} records for visualization.`);
                idocData = arr;
            } else {
                console.log(`Fetched ${idocData.length} records for visualization.`);
            }
        } catch (error) {
            console.error("Error fetching DailyIdocData:", error.message);
            // throw new Error("Failed to retrieve data for chart generation.");
            req.error("Failed to retrieve data for chart generation.");
        }

        const processedChartData = processIdocDataForChart(idocData);
        console.log("Actual Data (Not Using Currently): ", processedChartData);

        const processedChartDataTest = [
            { MESTYP: 'DESADV', 'Success (OAPI)': 2008, 'Failure (OAPI)': 200 },
            { MESTYP: 'ORDERS', 'Success (OAPI)': 1400, 'Failure (OAPI)': 230 },
            { MESTYP: 'REMADV', 'Success (OAPI)': 104, 'Failure (OAPI)': 700 },
            { MESTYP: 'SHPORD', 'Success (OAPI)': 560, 'Failure (OAPI)': 0 }
        ]

        // const chartHtml = generateChartHtml(processedChartData);        
        const svgString = createBarChartImage2(processedChartDataTest);
        // console.log(svgString);

        const base64Image = Buffer.from(svgString).toString('base64');
        const imgTag = `<img src="data:image/svg+xml;base64,${base64Image}" alt="Bar Chart" />`;

        // if (needfullHtml) {
        //     return `
        //         <!DOCTYPE html>
        //         <html>
        //         <head>
        //             <title>IDoc Data Bar Chart</title>
        //             <script src="https://cdn.tailwindcss.com"></script>
        //             <style>
        //                 body { font-family: 'Inter', sans-serif; margin: 20px; }
        //                 .chart-container { width: 90%; max-width: 800px; margin: auto; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); background-color: #fff; }
        //             </style>
        //             <script src="https://d3js.org/d3.v7.min.js"></script> <!-- D3.js for charting -->
        //         </head>
        //         <body>
        //             <div class="chart-container">
        //                 <h1 class="text-2xl font-bold mb-4 text-center">IDoc Success/Failure by MESTYP</h1>
        //                 ${chartHtml}
        //             </div>
        //         </body>
        //         </html>
        //     `;
        // } else {
        //     return chartHtml;
        // }
        if (needfullHtml) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>IDoc Data Bar Chart</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; margin: 20px; text-align: center; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <h1>IDoc Success/Failure by MESTYP</h1>
                    ${imgTag}
                </body>
                </html>
            `;
        } else {
            return imgTag;
        }
    }

    // // Helper function to process data (we'll implement this together)
    // processIdocDataForChart(data) {
    //     // Example: Aggregate SUCESS_OAPI and FAIL_OAPI by MESTYP
    //     const aggregated = {};
    //     for (const record of data) {
    //         const mestyp = record.MESTYP || 'N/A'; // Handle empty MESTYP
    //         if (!aggregated[mestyp]) {
    //             aggregated[mestyp] = { success: 0, fail: 0 };
    //         }
    //         aggregated[mestyp].success += (record.SUCESS_OAPI || 0);
    //         aggregated[mestyp].fail += (record.FAIL_OAPI || 0);
    //     }

    //     // Convert to array format for D3
    //     return Object.keys(aggregated).map(mestyp => ({
    //         MESTYP: mestyp,
    //         Success: aggregated[mestyp].success,
    //         Fail: aggregated[mestyp].fail
    //     }));
    // }    

    // Helper function to generate chart HTML (we'll implement this together)
    // generateChartHtml(chartData) {
    //     // This is where the D3.js or other charting library code will go.
    //     // It will generate an SVG or canvas element within a div.
    //     return `<div id="bar-chart" class="w-full h-96"></div>
    //             <script>
    //                 // D3.js code to render the bar chart
    //                 const data = ${JSON.stringify(chartData)};
    //                 // ... D3.js visualization logic ...
    //             </script>`;
    // }
}

module.exports = VisualisationService;