// Question 2 - Boxplot Visualization for Sentiment by Industry
document.addEventListener('DOMContentLoaded', function() {
    const margin = {top: 40, right: 30, bottom: 80, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.bottom - margin.top;

    // Create SVG
    const svg = d3.select("#question2-viz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Load data
    d3.json("/data/question2")
        .then(function(data) {
            console.log("Raw data received:", data);
            
            if (data.error) {
                console.error("Error loading data:", data.error);
                if (data.traceback) {
                    console.error("Traceback:", data.traceback);
                }
                
                // Show error message in visualization
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("fill", "red")
                    .text(`Error: ${data.error}`);
                return;
            }

            const boxplotData = data.boxplot_data || [];
            const overallStats = data.overall_stats || {};
            const debugInfo = data.debug || {};
            
            console.log("Boxplot data:", boxplotData);
            console.log("Debug info:", debugInfo);
            console.log("Number of industries:", boxplotData.length);

            // Show debug information
            if (debugInfo) {
                console.log("Debug Information:");
                console.log("- File path used:", debugInfo.filepath_used);
                console.log("- Total nodes:", debugInfo.total_nodes);
                console.log("- Total edges:", debugInfo.total_edges);
                console.log("- Participant edges:", debugInfo.total_participant_edges);
                console.log("- Valid sentiment edges:", debugInfo.valid_sentiment_edges);
                console.log("- Unique combinations:", debugInfo.unique_combinations);
                console.log("- Industries found:", debugInfo.industries_found);
                console.log("- Boxplot entries:", debugInfo.boxplot_entries);
            }

            // Update stats
            d3.select("#stats")
                .html(`
                    <strong>Industries:</strong> ${overallStats.industries_count || 0}<br>
                    <strong>Total Entries:</strong> ${overallStats.total_entries || 0}<br>
                    <strong>Overall Mean Sentiment:</strong> ${overallStats.mean ? overallStats.mean.toFixed(3) : 'N/A'}<br>
                    <strong>Overall Std Deviation:</strong> ${overallStats.std ? overallStats.std.toFixed(3) : 'N/A'}<br>
                    <br>
                    <strong>Debug:</strong><br>
                    <small>
                    File path: ${debugInfo.filepath_used || 'N/A'}<br>
                    Total nodes: ${debugInfo.total_nodes || 0}<br>
                    Total edges: ${debugInfo.total_edges || 0}<br>
                    Participant edges: ${debugInfo.total_participant_edges || 0}<br>
                    Valid sentiment edges: ${debugInfo.valid_sentiment_edges || 0}<br>
                    Unique combinations: ${debugInfo.unique_combinations || 0}<br>
                    Industries found: ${debugInfo.industries_found ? debugInfo.industries_found.join(', ') : 'None'}
                    </small>
                `);

            // Check if we have any data
            if (!boxplotData || boxplotData.length === 0) {
                console.warn("No boxplot data available");
                
                // Show message when no data is available
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("fill", "#666")
                    .text("No sentiment data found for visualization");
                    
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2 + 25)
                    .attr("text-anchor", "middle")
                    .style("font-size", "12px")
                    .style("fill", "#666")
                    .text("Check console for debug information");
                    
                return;
            }

            // Set up scales
            const xScale = d3.scaleBand()
                .domain(boxplotData.map(d => d.industry))
                .range([0, width])
                .padding(0.3);

            const yScale = d3.scaleLinear()
                .domain([-1.1, 1.1])  // Sentiment range from -1 to 1
                .range([height, 0]);

            // Create axes
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            g.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${height})`)
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-45)");

            g.append("g")
                .attr("class", "y-axis")
                .call(yAxis);

            // Add axis labels
            g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .text("Sentiment");

            g.append("text")
                .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
                .style("text-anchor", "middle")
                .style("font-size", "14px")
                .text("Industry");

            // Add zero line
            g.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", yScale(0))
                .attr("y2", yScale(0))
                .attr("stroke", "#666")
                .attr("stroke-dasharray", "3,3")
                .attr("opacity", 0.7);

            // Create boxplots
            const boxWidth = xScale.bandwidth();
            
            console.log("Creating boxplots for", boxplotData.length, "industries");
            
            // Create boxes with proper data binding
            const boxes = g.selectAll(".box")
                .data(boxplotData)
                .enter()
                .append("rect")
                .attr("class", "box")
                .attr("x", d => xScale(d.industry) + boxWidth * 0.1)
                .attr("y", d => yScale(d.q3))
                .attr("width", boxWidth * 0.8)
                .attr("height", d => yScale(d.q1) - yScale(d.q3))
                .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
                .attr("fill-opacity", 0.7)
                .attr("stroke", "#333")
                .attr("stroke-width", 2)
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    
                    tooltip.html(`
                        <strong>${d.industry}</strong><br>
                        Count: ${d.count}<br>
                        Mean: ${d.mean.toFixed(3)}<br>
                        Median: ${d.median.toFixed(3)}<br>
                        Q1: ${d.q1.toFixed(3)}<br>
                        Q3: ${d.q3.toFixed(3)}<br>
                        Std Dev: ${d.std.toFixed(3)}
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            // Add other elements using the same data binding pattern
            boxplotData.forEach((d, i) => {
                console.log(`Processing industry ${i + 1}/${boxplotData.length}: ${d.industry}`, d);
                
                const x = xScale(d.industry);
                const centerX = x + boxWidth / 2;

                // Median line
                g.append("line")
                    .attr("class", "median")
                    .attr("x1", x + boxWidth * 0.1)
                    .attr("x2", x + boxWidth * 0.9)
                    .attr("y1", yScale(d.median))
                    .attr("y2", yScale(d.median))
                    .attr("stroke", "#333")
                    .attr("stroke-width", 3);

                // Whiskers
                // Upper whisker
                g.append("line")
                    .attr("class", "whisker")
                    .attr("x1", centerX)
                    .attr("x2", centerX)
                    .attr("y1", yScale(d.q3))
                    .attr("y2", yScale(d.max))
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);

                // Lower whisker
                g.append("line")
                    .attr("class", "whisker")
                    .attr("x1", centerX)
                    .attr("x2", centerX)
                    .attr("y1", yScale(d.q1))
                    .attr("y2", yScale(d.min))
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);

                // Whisker caps
                g.append("line")
                    .attr("class", "whisker-cap")
                    .attr("x1", centerX - boxWidth * 0.1)
                    .attr("x2", centerX + boxWidth * 0.1)
                    .attr("y1", yScale(d.max))
                    .attr("y2", yScale(d.max))
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);

                g.append("line")
                    .attr("class", "whisker-cap")
                    .attr("x1", centerX - boxWidth * 0.1)
                    .attr("x2", centerX + boxWidth * 0.1)
                    .attr("y1", yScale(d.min))
                    .attr("y2", yScale(d.min))
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);

                // Outliers
                if (d.outliers && d.outliers.length > 0) {
                    d.outliers.forEach(outlier => {
                        g.append("circle")
                            .attr("class", "outlier")
                            .attr("cx", centerX)
                            .attr("cy", yScale(outlier))
                            .attr("r", 3)
                            .attr("fill", "#ff0000")
                            .attr("stroke", "#333")
                            .attr("stroke-width", 1)
                            .on("mouseover", function(event) {
                                tooltip.transition()
                                    .duration(200)
                                    .style("opacity", .9);
                                
                                tooltip.html(`
                                    <strong>Outlier</strong><br>
                                    Industry: ${d.industry}<br>
                                    Sentiment: ${outlier.toFixed(3)}
                                `)
                                    .style("left", (event.pageX + 10) + "px")
                                    .style("top", (event.pageY - 28) + "px");
                            })
                            .on("mouseout", function() {
                                tooltip.transition()
                                    .duration(500)
                                    .style("opacity", 0);
                            });
                    });
                }

                // Add count labels
                g.append("text")
                    .attr("class", "count-label")
                    .attr("x", centerX)
                    .attr("y", yScale(d.max) - 10)
                    .attr("text-anchor", "middle")
                    .style("font-size", "11px")
                    .style("fill", "#666")
                    .text(`n=${d.count}`);
            });

            // Add animation to boxes - now with proper data binding
            boxes
                .attr("height", 0)
                .attr("y", yScale(0))
                .transition()
                .duration(1000)
                .delay((d, i) => i * 200)
                .attr("height", d => yScale(d.q1) - yScale(d.q3))
                .attr("y", d => yScale(d.q3));

            console.log("Boxplot visualization completed");

        })
        .catch(function(error) {
            console.error("Error loading data:", error);
            
            // Show error message in visualization
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "red")
                .text(`Network Error: ${error.message}`);
        });
}); 