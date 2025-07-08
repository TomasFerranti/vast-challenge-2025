// Question 4 - Person Behavior Comparison Boxplot Visualization
document.addEventListener('DOMContentLoaded', function() {
    const margin = {top: 40, right: 30, bottom: 120, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.bottom - margin.top;

    // Create SVG
    const svg = d3.select("#question4-viz")
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

    let currentData = null;
    let selectedPerson = null;

    // Function to load and display data
    function loadData(person = null) {
        const params = person ? { person: person } : {};
        
        d3.json("/data/question4", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params)
        })
        .then(function(data) {
            console.log("Raw data received:", data);
            
            if (data.error) {
                console.error("Error loading data:", data.error);
                if (data.traceback) {
                    console.error("Traceback:", data.traceback);
                }
                
                // Show error message in visualization
                g.selectAll("*").remove();
                g.append("text")
                    .attr("x", width / 2)
                    .attr("y", height / 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", "16px")
                    .style("fill", "red")
                    .text(`Error: ${data.error}`);
                return;
            }

            currentData = data;
            
            // Update person selector if it's empty
            const personSelect = d3.select("#person-select");
            if (personSelect.selectAll("option").size() <= 1) {
                populatePersonSelector(data.people);
            }

            // Update selected person in dropdown
            if (data.selected_person) {
                selectedPerson = data.selected_person;
                personSelect.property("value", selectedPerson);
            }

            renderVisualization(data);
        })
        .catch(function(error) {
            console.error("Error loading data:", error);
        });
    }

    // Function to populate person selector
    function populatePersonSelector(people) {
        const personSelect = d3.select("#person-select");
        
        // Clear existing options
        personSelect.selectAll("option").remove();
        
        // Add default option
        personSelect.append("option")
            .attr("value", "")
            .text("Select a person...");
        
        // Add person options
        people.forEach(person => {
            personSelect.append("option")
                .attr("value", person.id)
                .text(`${person.name} (${person.role})`);
        });
        
        // Add event listener for person selection
        personSelect.on("change", function() {
            const selectedPersonId = this.value;
            if (selectedPersonId) {
                selectedPerson = selectedPersonId;
                loadData(selectedPersonId);
            }
        });
    }

    // Function to render the boxplot visualization
    function renderVisualization(data) {
        // Clear existing visualization
        g.selectAll("*").remove();

        const boxplotData = data.boxplot_data || [];
        const overallStats = data.overall_stats || {};
        const debugInfo = data.debug || {};
        const personName = data.person_name || "Unknown";
        
        console.log("Boxplot data:", boxplotData);
        console.log("Debug info:", debugInfo);
        console.log("Number of combinations:", boxplotData.length);

        // Update stats
        d3.select("#stats")
            .html(`
                <strong>Selected Person:</strong> ${personName}<br>
                <strong>Industry/Dataset Combinations:</strong> ${overallStats.combinations_count || 0}<br>
                <strong>Total Entries:</strong> ${overallStats.total_entries || 0}<br>
                <strong>Overall Mean Sentiment:</strong> ${overallStats.mean ? overallStats.mean.toFixed(3) : 'N/A'}<br>
                <strong>Overall Std Deviation:</strong> ${overallStats.std ? overallStats.std.toFixed(3) : 'N/A'}<br>
                <br>
                <strong>Debug:</strong><br>
                <small>
                Datasets loaded: ${debugInfo.datasets_loaded ? debugInfo.datasets_loaded.join(', ') : 'N/A'}<br>
                Total people: ${debugInfo.total_people || 0}<br>
                Total sentiment entries: ${debugInfo.total_sentiment_entries || 0}<br>
                Unique combinations: ${debugInfo.unique_combinations || 0}
                </small>
            `);

        // Check if we have any data
        if (!boxplotData || boxplotData.length === 0) {
            console.warn("No boxplot data available for selected person");
            
            // Show message when no data is available
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text(selectedPerson ? `No sentiment data found for ${personName}` : "Please select a person");
                
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2 + 25)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("fill", "#666")
                .text("This person may not appear in any dataset with sentiment data");
                
            return;
        }

        // Set up scales
        const xScale = d3.scaleBand()
            .domain(boxplotData.map(d => d.combination))
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
            .text("Industry/Dataset Combination");

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
        
        console.log("Creating boxplots for", boxplotData.length, "combinations");
        
        // Create boxes
        const boxes = g.selectAll(".box")
            .data(boxplotData)
            .enter()
            .append("rect")
            .attr("class", "box")
            .attr("x", d => xScale(d.combination) + boxWidth * 0.1)
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
                    <strong>${d.combination}</strong><br>
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

        // Add median lines
        g.selectAll(".median")
            .data(boxplotData)
            .enter()
            .append("line")
            .attr("class", "median")
            .attr("x1", d => xScale(d.combination) + boxWidth * 0.1)
            .attr("x2", d => xScale(d.combination) + boxWidth * 0.9)
            .attr("y1", d => yScale(d.median))
            .attr("y2", d => yScale(d.median));

        // Add whiskers
        g.selectAll(".whisker-top")
            .data(boxplotData)
            .enter()
            .append("line")
            .attr("class", "whisker")
            .attr("x1", d => xScale(d.combination) + boxWidth * 0.5)
            .attr("x2", d => xScale(d.combination) + boxWidth * 0.5)
            .attr("y1", d => yScale(d.q3))
            .attr("y2", d => yScale(d.max));

        g.selectAll(".whisker-bottom")
            .data(boxplotData)
            .enter()
            .append("line")
            .attr("class", "whisker")
            .attr("x1", d => xScale(d.combination) + boxWidth * 0.5)
            .attr("x2", d => xScale(d.combination) + boxWidth * 0.5)
            .attr("y1", d => yScale(d.q1))
            .attr("y2", d => yScale(d.min));

        // Add whisker caps
        g.selectAll(".whisker-cap-top")
            .data(boxplotData)
            .enter()
            .append("line")
            .attr("class", "whisker-cap")
            .attr("x1", d => xScale(d.combination) + boxWidth * 0.3)
            .attr("x2", d => xScale(d.combination) + boxWidth * 0.7)
            .attr("y1", d => yScale(d.max))
            .attr("y2", d => yScale(d.max));

        g.selectAll(".whisker-cap-bottom")
            .data(boxplotData)
            .enter()
            .append("line")
            .attr("class", "whisker-cap")
            .attr("x1", d => xScale(d.combination) + boxWidth * 0.3)
            .attr("x2", d => xScale(d.combination) + boxWidth * 0.7)
            .attr("y1", d => yScale(d.min))
            .attr("y2", d => yScale(d.min));

        // Add outliers
        boxplotData.forEach(d => {
            d.outliers.forEach(outlier => {
                g.append("circle")
                    .attr("class", "outlier")
                    .attr("cx", xScale(d.combination) + boxWidth * 0.5)
                    .attr("cy", yScale(outlier))
                    .attr("r", 3)
                    .attr("fill", "red")
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1);
            });
        });

        // Add count labels
        g.selectAll(".count-label")
            .data(boxplotData)
            .enter()
            .append("text")
            .attr("class", "count-label")
            .attr("x", d => xScale(d.combination) + boxWidth * 0.5)
            .attr("y", d => yScale(d.max) - 10)
            .attr("text-anchor", "middle")
            .text(d => `n=${d.count}`);
    }

    // Initial load
    loadData();
}); 