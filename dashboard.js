// Define the global color scale at the top of your file
const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, 5]); // Adjusted domain to provide darker blues

// Load the JSON file and initialize the dashboard

/*
d3.json("dashboard_data.json").then(data => {
    create2dDensityChart(data.scatter_data);
    createPieChart(data.risk_contributions);
    createScatterPlots(data.scatter_data);
    // Add additional visualizations as needed
});
*/

Promise.all([
    d3.json("dashboard_data.json"),
    d3.csv("Combined.csv")
]).then(([jsonData, csvData]) => {
    create2dDensityChart(jsonData.scatter_data);
    createPieChart(jsonData.risk_contributions);
    createScatterPlots(jsonData.scatter_data);
    createBarChart(csvData); // pass CSV data to bar chart
    // Add additional visualizations as needed
});

// Tooltip initialization
const tooltip = d3.select("#tooltip");

// Stacked Bar Chart
function create2dDensityChart(data) {
    const svg = d3.select("#heatmap").append("svg")
        .attr("width", 800)
        .attr("height", 400);

    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const width = svg.attr("width") - margin.left - margin.right;
    const height = svg.attr("height") - margin.top - margin.bottom;

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.G3))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, Math.max(0.1, d3.max(data, d => d.Dalc_Normalized))]) // Include 0 and 0.1 in domain
        .range([height, 0]);

    // Axes
    chart.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(10))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .text("G3");

    chart.append("g")
        .call(d3.axisLeft(yScale)
            .tickValues([0, 0.1, ...yScale.ticks(10)])) // Add 0 and 0.1 explicitly
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("fill", "black")
        .text("Dalc");  

    // Contour Density
    const contours = d3.contourDensity()
        .x(d => xScale(d.G3))
        .y(d => yScale(d.Dalc_Normalized))
        .size([width, height])
        .bandwidth(13)(data);

    chart.selectAll("path")
        .data(contours)
        .enter()
        .append("path")
        .attr("d", d3.geoPath())
        .attr("fill", "none")
        .attr("stroke", colorScale(2)) // Use color scale
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.7);

        const groupedData = d3.rollup(
            data,
            v => v.length,
            d => d.Dalc_Normalized.toFixed(2),
            d => d.G3.toFixed(2)
        );
    
        // Scatter Plot
        chart.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.G3))
            .attr("cy", d => yScale(d.Dalc_Normalized))
            .attr("r", 2)
            .attr("fill", d => colorScale(0.5 + d.Dalc_Normalized/2)) // Using blues with varying intensity
            .attr("opacity", 0.8)
            .on("mouseover", function (e, d) {
                const count = groupedData
                    .get(d.Dalc_Normalized.toFixed(2))
                    ?.get(d.G3.toFixed(2));
    
                d3.select("#tooltip")
                    .style("opacity", 1)
                    .text(`Count: ${count}`);
            })
            .on("mousemove", e => {
                d3.select("#tooltip")
                    .style("left", (e.pageX + 5) + "px")
                    .style("top", (e.pageY - 28) + "px");
            })
            .on("mouseout", () => d3.select("#tooltip").style("opacity", 0));
}
// Pie Chart
function createPieChart(data) {
    const svg = d3.select("#pie-chart").append("svg")
        .attr("width", 400).attr("height", 400)
        .append("g")
        .attr("transform", "translate(200, 200)");

    const radius = 200;

    //const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const dataReady = pie(Object.entries(data));

    svg.selectAll("path")
        .data(dataReady)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => colorScale(i)) // Use color scale
        .on("mouseover", function(e, d) {
            tooltip.style("opacity", 1).text(`${d.data[0]}: ${d.data[1]}`);
        })
        .on("mousemove", e => {
            tooltip.style("left", (e.pageX + 5) + "px").style("top", (e.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

function createScatterPlots(data) {
    const svg = d3.select("#scatter-plots").append("svg")
        .attr("width", 800).attr("height", 500);

    const margin = { top: 40, right: 100, bottom: 80, left: 80 }; // Increased right margin
    const width = svg.attr("width") - margin.left - margin.right;
    const height = svg.attr("height") - margin.top - margin.bottom;

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Calculate min/max values for scales, excluding zeros
    const minAbsences = d3.min(data.filter(d => d.Absences_Normalized > 0), d => d.Absences_Normalized);
    const maxAbsences = d3.max(data, d => d.Absences_Normalized);
    const minRisk = d3.min(data.filter(d => d.Risk_Score > 0), d => d.Risk_Score);
    const maxRisk = d3.max(data, d => d.Risk_Score);
    const minWeekdayAlc = d3.min(data.filter(d => d.Dalc_Normalized > 0), d => d.Dalc_Normalized);
    const maxWeekdayAlc = d3.max(data, d => d.Dalc_Normalized);

    // Use log scales with adjusted domains to minimize whitespace
    const xScale = d3.scaleLog()
        .domain([minRisk * 0.9, maxRisk * 1.1]) // Swapped axes
        .range([0, width])
        .clamp(true);

    const yScale = d3.scaleLog()
        .domain([minAbsences * 0.9, maxAbsences * 1.1]) // Swapped axes
        .range([height, 0])
        .clamp(true);

    // Create color gradient scale for normalized weekday alcohol consumption
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([minWeekdayAlc, maxWeekdayAlc]); // Adjusted domain for weekday alcohol consumption

    // Add axes with custom ticks for better readability on log scale
    const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.format(".2f"));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d3.format(".2f"));

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    chart.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    // Add axis labels
    chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Risk Score (log scale)"); // Swapped labels

    chart.append("text")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Absences (log scale)"); // Swapped labels

    // Add a group for each score bucket to enable toggling
    const scoreGroups = d3.group(data, d => d.Performance);
    const groupSelection = chart.selectAll("g.score-group")
        .data(Array.from(scoreGroups.entries()))
        .enter()
        .append("g")
        .attr("class", "score-group")
        .attr("data-category", d => d[0]);

    // Add points for each group, handling zero values
    groupSelection.selectAll("circle")
        .data(d => d[1])
        .enter()
        .append("circle")
        .attr("cx", d => xScale(Math.max(minRisk, d.Risk_Score))) // Swapped values
        .attr("cy", d => yScale(Math.max(minAbsences, d.Absences_Normalized))) // Swapped values
        .attr("r", 6)
        .attr("fill", d => colorScale(d.Dalc_Normalized)) // Color by normalized weekday alcohol consumption
        .attr("opacity", 0.8)
        .on("mouseover", function(e, d) {
            const selected = d3.select(this);
            selected.attr("stroke", "black").attr("stroke-width", 2).attr("r", 10);

            tooltip.style("opacity", 1)
                .html(`<b>Weekday Alc</b>: ${d.Dalc_Normalized.toFixed(3)}<br>Risk: ${d.Risk_Score.toFixed(3)}<br>Absences: ${d.Absences_Normalized.toFixed(3)}`);
        })
        .on("mousemove", e => {
            tooltip.style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 20) + "px");
        })
        .on("mouseout", function(e, d) {
            const selected = d3.select(this);
            selected.attr("stroke", "none").attr("r", 6);
            tooltip.style("opacity", 0);
        });

    // Add legend with continuous gradient
    const legendWidth = 20;
    const legendHeight = 200;
    
    const legend = svg.append("g") // Moved legend to the main SVG
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.right - 20}, 125)`); // Adjusted position to the far right

    // Create gradient definition
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "colorGradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // Add gradient stops
    const stops = d3.range(0, 21);
    stops.forEach(stop => {
        gradient.append("stop")
            .attr("offset", `${(stop/20) * 100}%`)
            .attr("stop-color", colorScale(stop));
    });

    // Add gradient rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#colorGradient)");

    // Add legend axis
    const legendScale = d3.scaleLinear()
        .domain([minWeekdayAlc, maxWeekdayAlc])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // Add legend title
    legend.append("text")
        .attr("x", -legendHeight/2)
        .attr("y", legendWidth + 40)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("font-size", "12px")
        .text("Normalized Weekday Alc"); // Updated legend title
}



function createBarChart(dataset) {
    /*
        var dimensions = {
            width: 1500,
            height: 600,
            margin: {
                top: 50,
                bottom: 50,
                right: 500,
                left: 50,
            },
        }
    */
        var dimensions = {
            width: 600,
            height: 400,
            margin: {
                top: 60,
                bottom: 50,
                right: 0,
                left: 50,
            },
        }

        var svg = d3
            .select("#bar-chart")
            .append("svg")
            .style("width", dimensions.width)
            .style("height", dimensions.height)

        let test = 0 // for testing
        let examScores = Array.from({ length: 5 }, () => Array(21).fill(0))
        dataset.forEach(d => {
            //examScores[d.G1]++
            //examScores[d.G2]++
            //examScores[d.G3]++
            if (d.G3 == 2) {
                test++
            }
   
            examScores[d.Dalc-1][d.G3]++
        })

        console.log("Test!", test) // for testing

        function findMax(arr) {
            let max = 0
            for (let i = 0; i < arr.length; i++) {
                for (let j = 0; j < arr[i].length; j++) {
                    if (arr[i][j] > max) {
                        max = arr[i][j]
                    }
                }
            }
        }
 
        // weekday alcohol consumption levels as keys
        var keys = ["1", "2", "3", "4", "5"]

        // group data for future processing
        var groupedData = d3.rollups(
            dataset, v => {
                const dalcCounts = Array(5).fill(0)
                v.forEach((d) => {
                    dalcCounts[d.Dalc - 1]++
                })
                console.log(`Dalc counts for G3=${v[0].G3}: `, dalcCounts)
                return dalcCounts
            },
            d => +d.G3 // group by each unique G3 score
        )

        // transform grouped data for each exam score G3
        const processedData = groupedData.map(([G3, dalcCounts]) => ({
            G3,
            1: dalcCounts[0],
            2: dalcCounts[1],
            3: dalcCounts[2],
            4: dalcCounts[3],
            5: dalcCounts[4],
        }))

        // stacked data
        var stack = d3.stack().keys(keys)
        var stackedData = stack(processedData)

        // create scales
        var xScale = d3.scaleBand()
            .domain(d3.range(21))
            .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
            .padding(0.1)
        var yScale = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], (d) => d[1])])
            .range([dimensions.height - dimensions.margin.bottom, dimensions.margin.top])

        // create axis
        var xAxis = d3.axisBottom(xScale)
        var yAxis = d3.axisLeft(yScale)

        // append axis
        svg.append("g").attr("transform", `translate(0,${dimensions.height - dimensions.margin.bottom})`).call(xAxis)
        svg.append("g").attr("transform", `translate(${dimensions.margin.left},0)`).attr("class", "y-axis").call(yAxis)
        svg.append("text")
           .attr("x", (dimensions.width - dimensions.margin.right) / 2)
           .attr("y", dimensions.height - 10)
           .attr("text-anchor", "middle")
           .style("font-size", "12px")
           .text("Final Exam Score")
        svg.append("text")
           .attr("transform", "rotate(-90)")
           .attr("x", -((dimensions.height - dimensions.margin.bottom) / 2))
           .attr("y", 15)
           .attr("text-anchor", "middle")
           .style("font-size", "12px")
           .text("Weekday Alcohol Consumption Frequency")

        // legend
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 70).attr("width", 12).attr("height", 12).style("fill", colorScale(1)).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 90).attr("width", 12).attr("height", 12).style("fill", colorScale(2)).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 110).attr("width", 12).attr("height", 12).style("fill", colorScale(3)).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 130).attr("width", 12).attr("height", 12).style("fill", colorScale(4)).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 150).attr("width", 12).attr("height", 12).style("fill", colorScale(5)).attr("class", "legend")
        svg.append("text").attr("x", dimensions.width-50).attr("y", 77).text("None").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", dimensions.width-50).attr("y", 97).text("Low").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", dimensions.width-50).attr("y", 117).text("Medium").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", dimensions.width-50).attr("y", 137).text("High").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", dimensions.width-50).attr("y", 157).text("Significant").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", (dimensions.width - dimensions.margin.right) / 2).attr("y", (dimensions.margin.top / 2)).attr("text-anchor", "middle").style("font-size", "12px").text("Weekday Alcohol Consumption on Final Exam Performance")
        
        // draw stacked bars
        function drawStacked() {
            svg.selectAll(".stacked-bar")
            .data(stackedData)
            .join("g")
            .attr("class", "stacked-bar")
            .attr("fill", (d, i) => colorScale(i + 1)) // Use colorScale for stacked bars
            .selectAll("rect")
            .data((d) => d)
            .join("rect")
            .attr("x", d => xScale(d.data.G3))
            .attr("y", dimensions.height - dimensions.margin.bottom)
            .attr("width", 5)
            .attr("height", 0)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSinInOut)
                    .attr("y", d => yScale(d[1]))
                    .attr("height", d => yScale(d[0]) - yScale(d[1]))
                    .transition()
                    .duration(500)
            .attr("width", xScale.bandwidth())
        }

        // draw grouped bars
        function drawGrouped() {
            const groupedBars = svg.selectAll(".grouped-bar")
                .data(processedData)
                .join("g")
                .attr("class", "grouped-bar")
                .attr("transform", (d, i) => `translate(${xScale(d.G3)}, 0)`)  // position bar correctly
        
            // add the bars for each Dalc level within the group
            const rects = groupedBars.selectAll("rect")
                .data(d => d3.range(5).map(i => ({
                    G3: d.G3,
                    Dalc: i + 1,
                    count: d[i + 1],
                })))
                .join("rect")
                .style("fill", d => colorScale(d.Dalc)) // Use colorScale for grouped bars
                .attr("x", (d, i) => i * (xScale.bandwidth() / 5))  // position each Dalc level within the group
                .attr("y", dimensions.height - dimensions.margin.bottom)
                .attr("width", 5)
                .attr("height", 0)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSinInOut)
                    .attr("y", d => yScale(d.count))
                    .attr("height", d => yScale(0) - yScale(d.count))
                    .transition()
                    .duration(500)
                .attr("width", xScale.bandwidth() / 5)
        }

        // add totals for each stack
        function addTotals(c) {
            svg.selectAll(".total-label")
            .data(processedData)
            .join("text")
            .attr("class", "total-label")
            .attr("x", d => xScale(d.G3) + xScale.bandwidth() / 2) // center
            .attr("y", function(d) { if (c === "stacked") { return yScale(d3.sum(keys, (key) => d[key])) - 5} else { return yScale(d3.max(keys, (key) => d[key])) - 5}})
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "black")
            .text(function(d) { if (c === "stacked") { return d3.sum(keys, (key) => d[key])} else { return d3.max(keys, (key) => d[key])}})
        }

        // reference lines at each y-axis tick
        function addTicks() {
            for (var i = 5; i < d3.max(stackedData[stackedData.length - 1], d => d[1]); i+=5) {
                svg.append("line")
                    .attr("class", "line-label")
                    .attr("x1", dimensions.margin.left)
                    .attr("x2", dimensions.width - dimensions.margin.right)
                    .attr("y1", yScale(i))
                    .attr("y2", yScale(i))
                    .attr("stroke", "white")
                    .attr("stroke-width", 0.35)
                    .attr("stroke-dasharray", "3,3")
            }
        }

        drawStacked()
        addTicks()
        addTotals("stacked")

        // ON CLICK FUNCTION
        function transitionGrouped() {
            // update y-scale
            yScale.domain([0, d3.max(processedData.flatMap(d => keys.map(k => d[k])))])
        
            // animate preexisting stacked bars
            svg.selectAll(".stacked-bar rect")
                    .transition()
                    .duration(500)
                    .attr("width", 5)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSinInOut)
                    .attr("y", dimensions.height - dimensions.margin.bottom)
                    .attr("height", 0)
                    .remove()
                    // once animation is complete, add grouped bars
                    .on("end", function() {
                        svg.selectAll(".total-label")
                            .remove()
                        svg.selectAll(".line-label")
                            .remove()
                        svg.selectAll(".y-axis")
                            .transition()
                            .duration(500)
                            .call(d3.axisLeft(yScale))  // Update axis based on new scale
                            .on("end", function() {                 
                                drawGrouped()
                                addTicks()
                                addTotals("grouped")
                            })
                    })
        }
        
        // ON CLICK FUNCTION
        function transitionStacked() {
            yScale.domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])

            // animate preexisting grouped bars
            svg.selectAll(".grouped-bar rect")
                    .transition()
                    .duration(500)
                    .attr("width", 5)
                    .transition()
                    .duration(1000)
                    .ease(d3.easeSinInOut)
                    .attr("y", dimensions.height - dimensions.margin.bottom)
                    .attr("height", 0)
                    .remove()
                    // once animation is complete, add grouped bars
                    .on("end", function() {
                        svg.selectAll(".total-label")
                            .remove()
                        svg.selectAll(".line-label")
                            .remove()
                        svg.selectAll(".y-axis")
                            .transition()
                            .duration(500)
                            .call(d3.axisLeft(yScale))  // Update axis based on new scale
                            .on("end", function() {                 
                                drawStacked()
                                addTicks()
                                addTotals("stacked")
                            })
                    })
        }

        d3.select("#grouped").on('click', () => transitionGrouped())
        d3.select("#stacked").on('click', () => transitionStacked())
   
}
