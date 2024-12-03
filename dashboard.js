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
        .attr("stroke", "steelblue")
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
            .attr("fill", "red")
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

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const dataReady = pie(Object.entries(data));

    svg.selectAll("path")
        .data(dataReady)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data[0]))
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

    const margin = { top: 40, right: 40, bottom: 80, left: 80 };
    const width = svg.attr("width") - margin.left - margin.right;
    const height = svg.attr("height") - margin.top - margin.bottom;

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
    const color = d3.scaleOrdinal()
        .domain(["High", "Average", "Low"])
        .range(["green", "blue", "red"]);

    chart.append("g").call(d3.axisLeft(yScale));
    chart.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale));

    // Add axis labels
    chart.append("text")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Risk Score");

    chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Absences (Normalized)");

    // Add a group for each score bucket to enable toggling
    const scoreGroups = d3.group(data, d => d.Performance);
    const groupSelection = chart.selectAll("g.score-group")
        .data(Array.from(scoreGroups.entries()))
        .enter()
        .append("g")
        .attr("class", "score-group")
        .attr("data-category", d => d[0]);

    // Add points for each group
    groupSelection.selectAll("circle")
        .data(d => d[1])
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.Absences_Normalized))
        .attr("cy", d => yScale(d.Risk_Score))
        .attr("r", 6)
        .attr("fill", d => color(d.Performance))
        .attr("opacity", 0.7)
        .on("mouseover", function(e, d) {
            // Capture the hovered point
            const selected = d3.select(this);
            selected.attr("stroke", "black").attr("stroke-width", 2).attr("r", 10);

            tooltip.style("opacity", 1)
                .html(`<b>Performance</b>: ${d.Performance}<br>Risk: ${d.Risk_Score}<br>Absences: ${d.Absences_Normalized}`);

            // Calculate distance and repel other points
            groupSelection.selectAll("circle").each(function(other) {
                const otherPoint = d3.select(this);
                if (other !== d) {
                    const dx = xScale(other.Absences_Normalized) - xScale(d.Absences_Normalized);
                    const dy = yScale(other.Risk_Score) - yScale(d.Risk_Score);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 50) {
                        const angle = Math.atan2(dy, dx);
                        otherPoint.transition()
                            .duration(300)
                            .attr("cx", xScale(other.Absences_Normalized) + Math.cos(angle) * 50)
                            .attr("cy", yScale(other.Risk_Score) + Math.sin(angle) * 50);
                    }
                }
            });
        })
        .on("mousemove", e => {
            tooltip.style("left", (e.pageX + 10) + "px").style("top", (e.pageY - 20) + "px");
        })
        .on("mouseout", function(e, d) {
            const selected = d3.select(this);
            selected.attr("stroke", "none").attr("r", 6);

            tooltip.style("opacity", 0);

            // Reset all points to their original positions
            groupSelection.selectAll("circle").transition()
                .duration(300)
                .attr("cx", d => xScale(d.Absences_Normalized))
                .attr("cy", d => yScale(d.Risk_Score));
        });

    // Add checkboxes for toggling categories
    const filterContainer = d3.select("#scatter-plots").append("div").attr("class", "filters");
    filterContainer.selectAll("label")
        .data(Array.from(scoreGroups.keys()))
        .enter()
        .append("label")
        .html(d => `<input type="checkbox" checked data-category="${d}"> ${d}`)
        .on("change", function() {
            const checkbox = d3.select(this).select("input");
            const category = checkbox.attr("data-category");
            const visible = checkbox.property("checked");

            chart.selectAll(`g.score-group[data-category="${category}"]`)
                .attr("display", visible ? "block" : "none");
        });
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

        // blue sequential color scale
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([-0.5 * 5, 1.5 * 5])

        // create axis
        var xAxis = d3.axisBottom(xScale)
        //.tickFormat((d) => d)
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
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 70).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[0])).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 90).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[1])).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 110).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[2])).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 130).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[3])).attr("class", "legend")
        svg.append("rect").attr("x", dimensions.width-65).attr("y", 150).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[4])).attr("class", "legend")
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
            .attr("fill", (d, i) => colorScale(keys[i]))
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
            //svg.selectAll(".grouped-bar")
                .data(processedData)
                .join("g")
                .attr("class", "grouped-bar")
                .attr("transform", (d, i) => `translate(${xScale(d.G3)}, 0)`)  // position bar correctly
        
            // add the bars for each Dalc level within the group
            const rects = groupedBars.selectAll("rect")
            //svg.selectAll(".grouped-bars rect")
                .data(d => d3.range(5).map(i => ({
                    G3: d.G3,
                    Dalc: i + 1,
                    count: d[i + 1],
                })))
                .join("rect")
                .style("fill", d => colorScale(d.Dalc))
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
            //.attr("y", d => yScale(d3.sum(keys, (key) => d[key])) - 5)
            .attr("y", function(d) { if (c === "stacked") { return yScale(d3.sum(keys, (key) => d[key])) - 5} else { return yScale(d3.max(keys, (key) => d[key])) - 5}})
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "black")
            //.text((d) => d3.sum(keys, (key) => d[key]))
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
