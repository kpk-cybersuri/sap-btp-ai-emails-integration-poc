const cds = require('@sap/cds');
const { D3Node } = require('d3-node');
const d3 = require('d3');
const svg2png = require('svg2png');

function processIdocDataForChart(data) {
    console.log("Processing raw data for chart...");
    const aggregatedData = {};

    for (const record of data) {
        const mestyp = record.MESTYP || 'N/A'; // Use 'N/A' for records without a MESTYP
        if (!aggregatedData[mestyp]) {
            aggregatedData[mestyp] = {
                MESTYP: mestyp,
                'Success (OAPI)': 0,
                'Failure (OAPI)': 0
            };
        }
        aggregatedData[mestyp]['Success (OAPI)'] += (record.SUCESS_OAPI || 0);
        aggregatedData[mestyp]['Failure (OAPI)'] += (record.FAIL_OCPI || 0);
    }

    // Convert the aggregated object into an array
    const chartData = Object.values(aggregatedData);
    console.log("Processed chart data:", chartData);
    return chartData;
}


function generateChartHtml(chartData) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const keys = ['Success (OAPI)', 'Failure (OAPI)'];
    const colors = { 'Success (OAPI)': 'green', 'Failure (OAPI)': 'red' };

    // We will generate the HTML with the data embedded in a script tag
    // This makes the entire chart self-contained.
    const htmlString = `
    <div id="bar-chart-container">
        <style>
            .axis path,
            .axis line {
                fill: none;
                stroke: #000;
                shape-rendering: crispEdges;
            }
            .bar rect {
                stroke: white;
            }
            .tooltip {
                position: absolute;
                text-align: center;
                width: 120px;
                height: 50px;
                padding: 2px;
                font: 12px sans-serif;
                background: lightsteelblue;
                border: 0px;
                border-radius: 8px;
                pointer-events: none;
                opacity: 0;
            }
        </style>
        <svg id="bar-chart-svg" width="${width + margin.left + margin.right}" height="${height + margin.top + margin.bottom}"></svg>
    </div>
    
    <script>
        // Data and setup from the server
        const data = ${JSON.stringify(chartData)};
        const keys = ${JSON.stringify(keys)};
        const colors = ${JSON.stringify(colors)};
        const margin = ${JSON.stringify(margin)};
        const width = ${width};
        const height = ${height};

        // Create scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.MESTYP))
            .rangeRound([0, width])
            .paddingInner(0.05);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d3.sum(keys, key => d[key]))])
            .rangeRound([height, 0]);

        // Stack the data
        const stack = d3.stack().keys(keys);
        const stackedData = stack(data);

        // Create the SVG container
        const svg = d3.select("#bar-chart-svg")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Tooltip div
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip");

        // Draw the bars
        svg.append("g")
            .selectAll("g")
            .data(stackedData)
            .enter().append("g")
            .attr("fill", d => colors[d.key])
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("x", d => x(d.data.MESTYP))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth())
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", .9);
                tooltip.html(d.data.MESTYP + "<br/>" + d.data.name + ": " + (d[1] - d[0]))
                    .style("left", (event.pageX) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.style("opacity", 0);
            });

        // Add the X axis
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        // Add the Y axis
        svg.append("g")
            .call(d3.axisLeft(y).ticks(null, "s"));

    </script>
    `;
    return htmlString;
}


function createBarChartImage(chartData) {
    // console.warn("c1........");
    const d3n = new D3Node({
        selector: '#bar-chart',
        styles: `
            .axis path, .axis line {
                fill: none;
                stroke: #000;
                shape-rendering: crispEdges;
            }
            .bar rect {
                stroke: white;
            }
        `
    });

    // console.warn("c2b....");
    // console.warn("c2........" + d3n);
    const d3 = d3n.d3;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // const svg = d3n.createSVG()
    //     .attr('width', width + margin.left + margin.right)
    //     .attr('height', height + margin.top + margin.bottom)
    //     .append('g')
    //     .attr('transform', `translate(${margin.left},${margin.top})`);

    const svg = d3n.createSVG(width + margin.left + margin.right, height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = ['Success (OAPI)', 'Failure (OAPI)'];
    const colors = { 'Success (OAPI)': 'green', 'Failure (OAPI)': 'red' };

    // Create scales
    // console.warn("c3........" + svg);
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.MESTYP))
        .rangeRound([0, width])
        .paddingInner(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d3.sum(keys, key => d[key]))])
        .rangeRound([height, 0]);

    // Stack the data
    // console.warn("c4........" + y);
    const stack = d3.stack().keys(keys);
    const stackedData = stack(chartData);

    // Draw the bars
    svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter().append("g")
        .attr("fill", d => colors[d.key])
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => x(d.data.MESTYP))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth());

    // console.warn("c5........" + svg);
    // Add the X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add the Y axis
    svg.append("g")
        .call(d3.axisLeft(y).ticks(null, "s"));

    // console.warn("c6........" + svg);
    // Return the generated SVG string and the D3Node object
    const svgStr = d3n.svgString();
    // console.warn("c6l ...... " + svgStr.length + " ... checking..." + (svgStr == "") ? " Yes Empty " : " Nope ");
    return svgStr;
}

function createBarChartImage2(chartData) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const d3n = new D3Node(); // no selector/styles needed
    const svg = d3n.createSVG(width + margin.left + margin.right, height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = ['Success (OAPI)', 'Failure (OAPI)'];
    const colors = { 'Success (OAPI)': 'green', 'Failure (OAPI)': 'red' };

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.MESTYP))
        .rangeRound([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d3.sum(keys, k => d[k]))])
        .rangeRound([height, 0]);

    const stack = d3.stack().keys(keys);
    const series = stack(chartData);

    svg.selectAll('g.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colors[d.key])
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x(d.data.MESTYP))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth());

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    const svgString = d3n.svgString();

    console.log('SVG length:', svgString.length);
    return svgString;
}

// Test data
// const testData = [
//   { MESTYP: 'DESADV', 'Success (OAPI)': 2208, 'Failure (OAPI)': 0 },
//   { MESTYP: 'ORDERS', 'Success (OAPI)': 0, 'Failure (OAPI)': 0 },
//   { MESTYP: 'REMADV', 'Success (OAPI)': 104, 'Failure (OAPI)': 0 },
//   { MESTYP: 'SHPORD', 'Success (OAPI)': 0, 'Failure (OAPI)': 0 }
// ];

// createBarChartImage2(testData);

// SUCESS_OAPI : Integer;
//         FAIL_OAPI   : Integer;
//         SUCESS_OCPI : Integer;
//         FAIL_OCPI   : Integer;

function processIdocDataForChart3(data) {
    console.log("Processing raw data for chart...");
    const aggregatedData = {};

    for (const record of data) {
        const mestyp = record.MESTYP || 'N/A'; // Use 'N/A' for records without a MESTYP
        if (!aggregatedData[mestyp]) {
            aggregatedData[mestyp] = {
                MESTYP: mestyp,
                'Success (OAPI)': 0,
                'Failure (OAPI)': 0,
                'Success (OCPI)': 0,
                'Failure (OCPI)': 0
            };
        }
        aggregatedData[mestyp]['Success (OAPI)'] += (record.SUCESS_OAPI || 0);
        aggregatedData[mestyp]['Failure (OAPI)'] += (record.FAIL_OAPI || 0);
        aggregatedData[mestyp]['Success (OCPI)'] += (record.SUCESS_OCPI || 0);
        aggregatedData[mestyp]['Failure (OCPI)'] += (record.FAIL_OCPI || 0);
    }

    // Convert the aggregated object into an array
    const chartData = Object.values(aggregatedData);
    console.log("Processed chart data:", chartData);
    return chartData;
}

function createBarChartImage3(chartData) {
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 680 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    // const d3n = new D3Node(); // no selector/styles needed

    const d3n = new D3Node({
        styles: `
        text {
            font-family: Arial, sans-serif;
            font-size: 12px;
        }
    `
    });

    const svg = d3n.createSVG(width + margin.left + margin.right, height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = ['Success (OAPI)', 'Failure (OAPI)', 'Success (OCPI)', 'Failure (OCPI)'];
    const colors = { 'Success (OAPI)': 'blue', 'Failure (OAPI)': 'red', 'Success (OCPI)': 'green', 'Failure (OCPI)': 'yellow' };

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.MESTYP))
        .rangeRound([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d3.sum(keys, k => d[k]))])
        .rangeRound([height, 0]);

    const stack = d3.stack().keys(keys);
    const series = stack(chartData);

    svg.selectAll('g.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colors[d.key])
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x(d.data.MESTYP))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth());

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append('g')
        .call(d3.axisLeft(y));

    const svgString = d3n.svgString();

    console.log('SVG length:', svgString.length);
    return svgString;
}


function createBarChartImage4(chartData) {
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width = 680 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    const d3n = new D3Node({
        styles: `
            svg {
                background-color: white;
            }
            text {
                font-family: Arial, sans-serif;
                font-size: 12px;
                fill: #333;
            }
            .axis path,
            .axis line {
                fill: none;
                stroke: #000;
                shape-rendering: crispEdges;
            }
        `
    });

    const svg = d3n.createSVG(width + margin.left + margin.right, height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = ['Success (OAPI)', 'Failure (OAPI)', 'Success (OCPI)', 'Failure (OCPI)'];
    const colors = {
        'Success (OAPI)': '#4CAF50',
        'Failure (OAPI)': '#F44336',
        'Success (OCPI)': '#2196F3',
        'Failure (OCPI)': '#FFC107'
    };

    const x = d3.scaleBand()
        .domain(chartData.map(d => d.MESTYP))
        .rangeRound([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d3.sum(keys, k => d[k]))])
        .nice()
        .rangeRound([height, 0]);

    const stack = d3.stack().keys(keys);
    const series = stack(chartData);

    svg.selectAll('g.layer')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'layer')
        .attr('fill', d => colors[d.key])
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x(d.data.MESTYP))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth());

    // X Axis
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("dy", "1em")
        .attr("dx", "-0.8em")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Y Axis
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y));

    // Chart Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("IDoc Processing Summary");

    // d3n.svgString();
    const svgString = d3n.svgString();
    console.log('SVG length:', svgString.length);
    return svgString;
}


async function createBarChartImageAsPng(chartData) {
    const svgString = createBarChartImage4(chartData);

    try {
        const pngBuffer = await svg2png(svgString, { width: 680, height: 420 });

        // Convert the PNG buffer to a Base64 data URI
        const pngBase64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        return pngBase64;
    } catch (error) {
        console.error('Error converting SVG to PNG:', error);
        return null; // Handle the error appropriately
    }
}



module.exports = {
    processIdocDataForChart,
    generateChartHtml,
    createBarChartImage,
    createBarChartImage2,
    processIdocDataForChart3,
    createBarChartImage4,
    createBarChartImageAsPng
};



// console.warn("[DEBUG] chart Data obtained -- " + imgTag);

// const emailTableHtml = generateEmailTableHtml(
//     idocData,
//     "Daily IDoc Processing Summary", // Your desired title
//     "This table provides a summary of IDoc success and failure counts by type and direction for the day.",
//     imgTag
// );

// const finalbody = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//             <title>IDoc Data Bar Chart</title>
//             <style>
//                 body { font-family: 'Inter', sans-serif; margin: 20px; text-align: center; }
//                 img { max-width: 100%; height: auto; }
//             </style>
//         </head>
//         <body>
//             <h1>IDoc Success/Failure by MESTYP</h1>
//             ${emailTableHtml}
//         </body>
//         </html>
//     `;
// console.warn("[DEBUG] finalhtmlbody -- " + finalbody);