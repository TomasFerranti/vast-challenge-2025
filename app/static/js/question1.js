// Question 1 - Sentiment Heatmap Visualization
document.addEventListener('DOMContentLoaded', function() {
    const margin = {top: 80, right: 100, bottom: 150, left: 200};
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.bottom - margin.top;
    
    let currentDataset = 'FILAH';
    
    // Create SVG
    const svg = d3.select("#question1-viz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    
    // Color scale for sentiment (-1 to 1)
    const colorScale = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range(["#d73027", "#ffffbf", "#1a9850"]);
    
    // Create dataset toggle buttons
    const controls = d3.select("#question1-viz")
        .insert("div", "svg")
        .attr("class", "controls")
        .style("margin-bottom", "20px")
        .style("text-align", "center");
    
    controls.append("label")
        .text("Dataset: ")
        .style("margin-right", "10px")
        .style("font-weight", "bold");
    
    const datasetButtons = controls.append("div")
        .style("display", "inline-block");
    
    datasetButtons.selectAll("button")
        .data(["FILAH", "TROUT"])
        .enter()
        .append("button")
        .text(d => d)
        .attr("class", d => d === currentDataset ? "active" : "")
        .style("margin", "0 5px")
        .style("padding", "8px 16px")
        .style("border", "1px solid #ccc")
        .style("background", d => d === currentDataset ? "#007bff" : "#fff")
        .style("color", d => d === currentDataset ? "#fff" : "#000")
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            currentDataset = d;
            updateVisualization();
            
            // Update button styles
            datasetButtons.selectAll("button")
                .attr("class", btn => btn === currentDataset ? "active" : "")
                .style("background", btn => btn === currentDataset ? "#007bff" : "#fff")
                .style("color", btn => btn === currentDataset ? "#fff" : "#000");
        });
    
    // Create legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + margin.left + 20}, ${margin.top})`);
    
    // Legend gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
    
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#1a9850");
    
    gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", "#ffffbf");
    
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#d73027");
    
    legend.append("rect")
        .attr("width", 20)
        .attr("height", 100)
        .style("fill", "url(#legend-gradient)");
    
    legend.append("text")
        .attr("x", 30)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text("1.0")
        .style("font-size", "12px");
    
    legend.append("text")
        .attr("x", 30)
        .attr("y", 50)
        .attr("dy", "0.35em")
        .text("0.0")
        .style("font-size", "12px");
    
    legend.append("text")
        .attr("x", 30)
        .attr("y", 100)
        .attr("dy", "0.35em")
        .text("-1.0")
        .style("font-size", "12px");
    
    legend.append("text")
        .attr("x", 25)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .text("Sentiment")
        .style("font-size", "14px")
        .style("font-weight", "bold");
    
    function updateVisualization() {
        // Load data
        d3.json(`/data/question1?dataset=${currentDataset}`)
            .then(function(data) {
                if (data.error) {
                    console.error("Error loading data:", data.error);
                    return;
                }
                
                // Update stats
                d3.select("#stats")
                    .html(`
                        <strong>Dataset:</strong> ${data.dataset}<br>
                        <strong>Entities:</strong> ${data.total_entities}<br>
                        <strong>Data Points:</strong> ${data.total_entries}
                    `);
                
                // Clear existing visualization
                g.selectAll("*").remove();
                
                // Set up scales
                const xScale = d3.scaleBand()
                    .domain(data.entities.map(d => d.name))
                    .range([0, width])
                    .padding(0.05);
                
                const yScale = d3.scaleBand()
                    .domain(data.industries)
                    .range([0, height])
                    .padding(0.05);
                
                // Create heatmap rectangles
                const cells = g.selectAll(".cell")
                    .data(data.heatmap_data)
                    .enter()
                    .append("rect")
                    .attr("class", "cell")
                    .attr("x", d => xScale(d.entity))
                    .attr("y", d => yScale(d.industry))
                    .attr("width", xScale.bandwidth())
                    .attr("height", yScale.bandwidth())
                    .attr("fill", d => {
                        if (d.sentiment === null) {
                            return "#f0f0f0";  // Light gray for no data
                        }
                        return colorScale(d.sentiment);
                    })
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 1)
                    .style("cursor", "pointer")
                    .on("mouseover", function(event, d) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        
                        let tooltipText = `<strong>${d.entity}</strong><br>`;
                        tooltipText += `Industry: ${d.industry}<br>`;
                        tooltipText += `Type: ${d.entity_type.replace('entity.', '')}<br>`;
                        if (d.entity_role) tooltipText += `Role: ${d.entity_role}<br>`;
                        
                        if (d.sentiment !== null) {
                            tooltipText += `Sentiment: ${d.sentiment}<br>`;
                            tooltipText += `Count: ${d.count}<br>`;
                            if (d.reasons.length > 0) {
                                tooltipText += `Reasons:<br>`;
                                d.reasons.forEach(reason => {
                                    tooltipText += `• ${reason}<br>`;
                                });
                            }
                        } else {
                            tooltipText += `No sentiment data available`;
                        }
                        
                        tooltip.html(tooltipText)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function(d) {
                        tooltip.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });
                
                // Add sentiment values as text
                g.selectAll(".cell-text")
                    .data(data.heatmap_data)
                    .enter()
                    .append("text")
                    .attr("class", "cell-text")
                    .attr("x", d => xScale(d.entity) + xScale.bandwidth() / 2)
                    .attr("y", d => yScale(d.industry) + yScale.bandwidth() / 2)
                    .attr("text-anchor", "middle")
                    .attr("dy", "0.35em")
                    .text(d => d.sentiment !== null ? d.sentiment : "N/A")
                    .style("font-size", "10px")
                    .style("font-weight", "bold")
                    .style("fill", d => {
                        if (d.sentiment === null) return "#999";
                        return Math.abs(d.sentiment) > 0.5 ? "#fff" : "#000";
                    })
                    .style("pointer-events", "none");
                
                // Add x-axis
                const xAxis = g.append("g")
                    .attr("class", "x-axis")
                    .attr("transform", `translate(0, ${height})`);
                
                xAxis.selectAll("text")
                    .data(data.entities)
                    .enter()
                    .append("text")
                    .attr("x", d => xScale(d.name) + xScale.bandwidth() / 2)
                    .attr("y", 35)
                    .attr("text-anchor", "middle")
                    .text(d => d.name)
                    .style("font-size", "11px")
                    .attr("transform", d => `rotate(-45, ${xScale(d.name) + xScale.bandwidth() / 2}, 35)`);
                
                // Add entity type indicators
                xAxis.selectAll("circle")
                    .data(data.entities)
                    .enter()
                    .append("circle")
                    .attr("cx", d => xScale(d.name) + xScale.bandwidth() / 2)
                    .attr("cy", 75)
                    .attr("r", 4)
                    .attr("fill", d => d.type === "entity.person" ? "#4CAF50" : "#2196F3")
                    .append("title")
                    .text(d => d.type === "entity.person" ? "Person" : "Organization");
                
                // Add y-axis
                const yAxis = g.append("g")
                    .attr("class", "y-axis");
                
                yAxis.selectAll("text")
                    .data(data.industries)
                    .enter()
                    .append("text")
                    .attr("x", -25)
                    .attr("y", d => yScale(d) + yScale.bandwidth() / 2)
                    .attr("text-anchor", "end")
                    .attr("dy", "0.35em")
                    .text(d => d)
                    .style("font-size", "12px")
                    .style("font-weight", "bold");
                
                // Add axis labels
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", height + 140)
                    .attr("text-anchor", "middle")
                    .text("Entities (People → Organizations)")
                    .style("font-size", "14px")
                    .style("font-weight", "bold");
                
                g.append("text")
                    .attr("transform", "rotate(-90)")
                    .attr("x", -height / 2)
                    .attr("y", -100)
                    .attr("text-anchor", "middle")
                    .text("Industries")
                    .style("font-size", "14px")
                    .style("font-weight", "bold");
                
                // Add title
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", -40)
                    .attr("text-anchor", "middle")
                    .text(`Sentiment Heatmap - ${data.dataset} Dataset`)
                    .style("font-size", "16px")
                    .style("font-weight", "bold");
                
                // Animation
                cells
                    .style("opacity", 0)
                    .transition()
                    .duration(1000)
                    .delay((d, i) => i * 20)
                    .style("opacity", 1);
                
            })
            .catch(function(error) {
                console.error("Error loading data:", error);
            });
    }
    
    // Initial load
    updateVisualization();
}); 