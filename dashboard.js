// Load the JSON file and initialize the dashboard
d3.json("dashboard_data.json").then(data => {
    create2dDensityChart(data.scatter_data);
    createPieChart(data.risk_contributions);
    createScatterPlots(data.scatter_data);
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
        .text("Final Scores");

    chart.append("g")
        .call(d3.axisLeft(yScale)
            .tickValues([0, 0.1, ...yScale.ticks(10)]) // Add 0 and 0.1 explicitly
            )
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("fill", "black")
        .text("weekday Alcohol"); // Format ticks to 1 decimal place

    // Contour Density
    const contours = d3.contourDensity()
        .x(d => xScale(d.G3))
        .y(d => yScale(d.Dalc_Normalized))
        .size([width, height])
        .bandwidth(9)(data);

    chart.selectAll("path")
        .data(contours)
        .enter()
        .append("path")
        .attr("d", d3.geoPath())
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.7);
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
