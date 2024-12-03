
d3.csv("Combined.csv").then(
    function (dataset) {
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

        var svg = d3
            .select("#stackedbarchart")
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
           .style("font-size", "16px")
           .text("Final Exam Score")
        svg.append("text")
           .attr("transform", "rotate(-90)")
           .attr("x", -((dimensions.height - dimensions.margin.top) / 2))
           .attr("y", 15)
           .attr("text-anchor", "middle")
           .style("font-size", "16px")
           .text("Weekday Alcohol Consumption Frequency")

        // legend
        svg.append("rect").attr("x", 1000).attr("y", 70).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[0])).attr("class", "legend")
        svg.append("rect").attr("x", 1000).attr("y", 100).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[1])).attr("class", "legend")
        svg.append("rect").attr("x", 1000).attr("y", 130).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[2])).attr("class", "legend")
        svg.append("rect").attr("x", 1000).attr("y", 160).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[3])).attr("class", "legend")
        svg.append("rect").attr("x", 1000).attr("y", 190).attr("width", 12).attr("height", 12).style("fill", colorScale(keys[4])).attr("class", "legend")
        svg.append("text").attr("x", 1020).attr("y", 77).text("None").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 107).text("Low").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 137).text("Medium").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 167).text("High").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 197).text("Significant").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", (dimensions.width - dimensions.margin.right) / 2).attr("y", (dimensions.margin.top / 2)).attr("text-anchor", "middle").style("font-size", "20px").text("Final Exam Performance on Weekday Alcohol Consumption")
        

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
)
