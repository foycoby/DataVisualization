
d3.csv("Maths.csv").then(
    function(dataset){

        console.log(dataset)
        
        var dimensions = {
            width: 1500,
            height: 600,
            margin:{
                top: 50,
                bottom: 50,
                right: 500,
                left: 50
            }
        }

        var svg = d3.select("#stackedbarchart")
                    .style("width", dimensions.width)
                    .style("height", dimensions.height)

        svg.append("rect").attr("x", 1000).attr("y", 70).attr("width", 12).attr("height", 12).style("fill", "#f29479")
        svg.append("rect").attr("x", 1000).attr("y", 100).attr("width", 12).attr("height", 12).style("fill", "#f26a4f")
        svg.append("rect").attr("x", 1000).attr("y", 130).attr("width", 12).attr("height", 12).style("fill", "#ef3c2d")
        svg.append("text").attr("x", 1020).attr("y", 70).text("G1").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 100).text("G2").style("font-size", "15px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", 1020).attr("y", 130).text("G3").style("font-size", "15px").attr("alignment-baseline", "middle")

        svg.append("text").attr("x", (dimensions.width - dimensions.margin.right) / 2).attr("y", (dimensions.margin.top / 2)).attr("text-anchor", "middle").style("font-size", "20px").text("Exam Scores vs Weekday Alcohol Consumption")

        var keys = dataset.columns.slice(30)
        console.log(keys)

        /*
        var total = 0
        dataset.forEach(function(d) {
            total += d.G1 + d.G2 + d.G3 
        })
        console.log(total)
        */

        var groupedData = d3.rollups(
            dataset, v => ({
                G1: d3.mean(v, d => d.G1),
                G2: d3.mean(v, d => d.G2),
                G3: d3.mean(v, d => d.G3),
            }),
            d => d.Dalc
        )


        /*
        var dalcGroups = d3.group(dataset, function(d) { return d.Dalc; })
        var averages = Array.from(dalcGroups, ([key, values]) => {
            var totalG1 = d3.sum(values, d => d.G1)
            var totalG2 = d3.sum(values, d => d.G2)
            var totalG3 = d3.sum(values, d => d.G3)

            var count = values.length; 

            var g1 = totalG1 / count
            var g2 = totalG2 / count
            var g3 = totalG3 / count

            return {
                Dalc: key,
                avgG1: g1,  // Average for G1
                avgG2: g2,  // Average for G2
                avgG3: g3,   // Average for G3
                total: g1 + g2 + g3
            }
        })
        */

        var colorScale = d3.scaleOrdinal()
                    .domain(keys)
                    .range(["#f29479","#f26a4f","#ef3c2d"])

        /*
        var stackedData = d3.stack()
                    .keys(keys)
                    (averages)

        console.log(stackedData)
        */
       var stack = d3.stack().keys(keys)
       var stackedData = stack(
        groupedData.map(([Dalc, grades]) => ({
            Dalc, ...grades,
        }))
       )

       var xScale = d3.scaleBand()
                    //.domain(d3.map(dataset, d => d.Dalc))
                    .domain(Array.from(new Set(dataset.map(d => d.Dalc))))
                    .range([dimensions.margin.left, dimensions.width - dimensions.margin.right])
                    .padding([0.2])

       var yScale = d3.scaleLinear()
                    .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
                    .range([dimensions.height-dimensions.margin.bottom, dimensions.margin.top])

        var xAxis = d3.axisBottom(xScale).tickSize(0);
        svg.append("g").selectAll(".y-axis").data(dataset).enter().append("g").attr("transform", "translate(0," + (dimensions.height - dimensions.margin.bottom) + ")").call(xAxis);
            
        var yAxis = d3.axisLeft(yScale).tickSize(2.5);
        svg.append("g").selectAll(".x-axis").data(dataset).enter().append("g").attr("transform", "translate(" + (dimensions.margin.left) + ")").call(yAxis);

        svg.append("text")
           .attr("x", (dimensions.width - dimensions.margin.right) / 2)
           .attr("y", dimensions.height - 10)
           .attr("text-anchor", "middle")
           .style("font-size", "16px")
           .text("Weekday Alcohol Consumption (Dalc)");

        svg.append("text")
           .attr("transform", "rotate(-90)")
           .attr("x", -((dimensions.height - dimensions.margin.top) / 2))
           .attr("y", 15)
           .attr("text-anchor", "middle")
           .style("font-size", "16px")
           .text("Average Exam Grades");

        var individualBars = svg.append("g")
                    .selectAll("g")
                    .data(stackedData)
                    .enter()
                    .append("g")
                    .attr("fill", d => colorScale(d.key))
                    .selectAll("rect")
                    .data(function(d) { return d })
                    .enter()
                    .append("rect")
                    .attr("x", d => xScale(d.data.Dalc))
                    .attr("y", dimensions.height - dimensions.margin.bottom)
                    .attr("width", 10)
                    .attr("height", 0)
                    .transition()
                    .duration(2000)
                    .ease(d3.easeSinInOut)
                    .attr("y", d => yScale(d[1]))
                    .attr("height", d => yScale(d[0]) - yScale(d[1]))
                    .transition()
                    .duration(500)
                    .transition()
                    .attr("width", d => xScale.bandwidth())


        for(var i = 0; i < d3.max(stackedData[stackedData.length - 1], d => d[1]); i+=5) {
            svg.append("line")
                    .attr("x1", dimensions.margin.left)
                    .attr("x2", dimensions.width - dimensions.margin.right)
                    .attr("y1", yScale(i))
                    .attr("y2", yScale(i))
                    .attr("stroke", "white")
                    .attr("stroke-width", 0.5)
                    .attr("stroke-dasharray", "8,8")
        }
    }
)