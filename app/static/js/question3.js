// Question 3 - Dataset Comparison Heatmap
document.addEventListener('DOMContentLoaded', function() {
    const width = 1000;
    const height = 600;
    const left_margin = 120;
    const top_margin = 120;
    const right_margin = 80;
    const bottom_margin = 20;

    // Create SVG
    const svg = d3.select("#question3-viz")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const main_plot = svg.append('g')
        .attr('transform', `translate(${left_margin},${top_margin})`);

    // Create tooltip using vanilla JavaScript
    let tooltip = document.getElementById('heatmap-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
    
    tooltip = document.createElement("div");
    tooltip.id = "heatmap-tooltip";
    tooltip.className = "heatmap-tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.backgroundColor = "white";
    tooltip.style.color = "#333";
    tooltip.style.padding = "8px";
    tooltip.style.borderRadius = "4px";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.fontSize = "12px";
    tooltip.style.lineHeight = "1.4";
    tooltip.style.pointerEvents = "none";
    tooltip.style.zIndex = "10000";
    tooltip.style.display = "none";
    tooltip.style.maxWidth = "250px";
    tooltip.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    document.body.appendChild(tooltip);

    // Color scale for sentiment
    const sentiment_color = d3.scaleDiverging()
        .domain([-1, 0, 1])
        .interpolator(d3.interpolateRdYlGn);

    // Dataset selector
    const dataset_selector = d3.select("#question3-viz")
        .insert("div", "svg")
        .attr("class", "dataset-selector")
        .style("margin-bottom", "20px");

    dataset_selector.append("label")
        .text("Dataset: ")
        .style("font-weight", "bold")
        .style("margin-right", "10px");

    const select = dataset_selector.append("select")
        .attr("id", "dataset-select")
        .style("padding", "5px")
        .style("margin-right", "20px");

    // Load data
    d3.json("/data/question3")
        .then(function(data) {
            if (data.error) {
                console.error("Error loading data:", data.error);
                d3.select("#question3-viz")
                    .append("div")
                    .attr("class", "error-message")
                    .style("color", "red")
                    .style("font-weight", "bold")
                    .text("Error loading data: " + data.error);
                return;
            }

            // Populate dataset selector
            select.selectAll("option")
                .data(data.datasets)
                .enter()
                .append("option")
                .attr("value", d => d)
                .text(d => d.charAt(0).toUpperCase() + d.slice(1));

            // Set default to journalist (complete dataset)
            select.property("value", "journalist");

            // Initial render
            renderVisualization(data, "journalist");

            // Handle dataset change
            select.on("change", function() {
                const selectedDataset = this.value;
                renderVisualization(data, selectedDataset);
            });

        })
        .catch(function(error) {
            console.error("Error loading data:", error);
        });

    function renderVisualization(data, selectedDataset) {
        const kb_data = data[selectedDataset];
        
        if (!kb_data || !kb_data.topics || !kb_data.persons) {
            console.error("Invalid data structure for dataset:", selectedDataset);
            return;
        }

        // Clear previous visualization
        main_plot.selectAll("*").remove();

        // Extract unique people and topics
        const people = kb_data.persons.map(d => d.id);
        const topics = kb_data.topics.map(d => d.id);

        // Create scales
        const topics_scale_x = d3.scaleBand()
            .domain(topics)
            .range([0, width - (left_margin + right_margin)])
            .padding(0.05);

        const people_scale_y = d3.scaleBand()
            .domain(people)
            .range([0, height - (top_margin + bottom_margin)])
            .padding(0.05);

        // Calculate max plans and discussions for sub-scales
        const max_plans = d3.max(kb_data.discussions, d => d.plan_order) + 1;
        const max_discussions = d3.max(kb_data.discussions, d => d.discussion_order) + 2;

        const discussion_scale_x = d3.scaleBand()
            .domain(d3.range(max_discussions))
            .range([0, topics_scale_x.bandwidth()])
            .padding(0.05);

        const plan_scale_y = d3.scaleBand()
            .domain(d3.range(max_plans))
            .range([0, people_scale_y.bandwidth()])
            .padding(0.05);

        // Add axes
        main_plot
            .append('g')
            .attr('transform', 'translate(0,-5)')
            .call(d3.axisTop(topics_scale_x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "start")
            .attr("dx", "0.5em")
            .attr("dy", "-0.2em")
            .style("font-size", "10px");

        main_plot
            .append('g')
            .attr('transform', 'translate(-5,0)')
            .call(d3.axisLeft(people_scale_y))
            .selectAll("text")
            .style("font-size", "10px");

        // Background rectangles for each person-topic combination
        main_plot.append('g')
            .selectAll('rect')
            .data(kb_data.discussions)
            .join('rect')
            .attr('x', d => topics_scale_x(d.topic_id))
            .attr('y', d => people_scale_y(d.person_id))
            .attr('width', topics_scale_x.bandwidth())
            .attr('height', people_scale_y.bandwidth())
            .attr('fill', d3.hcl(0, 0, 92))
            .attr('stroke', '#ddd')
            .attr('stroke-width', 0.5);

        // Define hashed pattern for missing data
        const defs = main_plot.append('defs');
        defs.append('pattern')
            .attr('id', 'hash-pattern')
            .attr('width', '8')
            .attr('height', '8')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('patternTransform', 'rotate(45)')
            .append('rect')
            .attr('width', '4')
            .attr('height', '8')
            .attr('transform', 'translate(0,0)')
            .attr('fill', d3.hcl(0, 0, 70));

        // Add plans as rectangles
        main_plot.append('g')
            .selectAll('rect')
            .data(kb_data.plans)
            .join('rect')
            .attr('x', d => topics_scale_x(d.topic_id) + discussion_scale_x(0))
            .attr('y', d => people_scale_y(d.person_id) + plan_scale_y(d.plan_order))
            .attr('width', discussion_scale_x.bandwidth())
            .attr('height', plan_scale_y.bandwidth())
            .attr('fill', d => {
                if (d.absent) {
                    return 'url(#hash-pattern)';
                } else {
                    return d.plan_info && d.plan_info.length > 0 ? sentiment_color(d.plan_info[0].sentiment) : '#ccc';
                }
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on("mouseover", function (event, plan) {
                const tooltipContent = `
                    <ul>
                        <li><strong>Plan:</strong> ${plan.plan_id}</li>
                        <li><strong>Plan Type:</strong> ${plan.plan_type}</li>
                        ${plan.plan_info && plan.plan_info.length > 0 ? plan.plan_info.map(item => `
                            <li><strong>Reason:</strong> ${item.reason}</li>
                            <li><strong>Sentiment:</strong> ${item.sentiment}</li>
                            <li><strong>Industry:</strong> ${item.industry}</li>
                        `).join('') : '<li>No plan information</li>'}
                    </ul>
                `;
                
                tooltip.innerHTML = tooltipContent;
                tooltip.style.display = "block";
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY + 10) + "px";
            })
            .on("mousemove", function (event) {
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY + 10) + "px";
            })
            .on("mouseleave", function () {
                tooltip.style.display = "none";
            });

        // Add discussions as circles
        const discussion_circle_radius = Math.min(discussion_scale_x.bandwidth(), plan_scale_y.bandwidth()) / 2;
        const discussion_y_offset = plan_scale_y.bandwidth() / 2;

        main_plot.append('g')
            .selectAll('circle')
            .data(kb_data.discussions)
            .join('circle')
            .attr('cx', d => topics_scale_x(d.topic_id) + discussion_scale_x(d.discussion_order + 1) + discussion_circle_radius)
            .attr('cy', d => people_scale_y(d.person_id) + plan_scale_y(d.plan_order) + discussion_y_offset)
            .attr('r', discussion_circle_radius)
            .attr('fill', d => {
                if (d.absent) {
                    return 'url(#hash-pattern)';
                } else {
                    return d.discussion_info && d.discussion_info.length > 0 ? sentiment_color(d.discussion_info[0].sentiment) : '#ccc';
                }
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on("mouseover", function (event, discussion) {
                const tooltipContent = `
                    <ul>
                        <li><strong>Discussion:</strong> ${discussion.discussion_id}</li>
                        <li><strong>Discussion Status:</strong> ${discussion.discussion_status}</li>
                        ${discussion.discussion_info && discussion.discussion_info.length > 0 ? discussion.discussion_info.map(item => `
                            <li><strong>Reason:</strong> ${item.reason}</li>
                            <li><strong>Sentiment:</strong> ${item.sentiment}</li>
                            <li><strong>Industry:</strong> ${item.industry}</li>
                        `).join('') : '<li>No discussion information</li>'}
                    </ul>
                `;
                
                tooltip.innerHTML = tooltipContent;
                tooltip.style.display = "block";
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY + 10) + "px";
            })
            .on("mousemove", function (event) {
                tooltip.style.left = (event.pageX + 10) + "px";
                tooltip.style.top = (event.pageY + 10) + "px";
            })
            .on("mouseleave", function () {
                tooltip.style.display = "none";
            });

        // Update stats
        const stats = d3.select("#stats");
        if (stats.empty()) {
            d3.select(".info-panel").append("div").attr("id", "stats");
        }
        d3.select("#stats")
            .html(`
                <strong>Dataset:</strong> ${selectedDataset.charAt(0).toUpperCase() + selectedDataset.slice(1)}<br>
                <strong>People:</strong> ${people.length}<br>
                <strong>Topics:</strong> ${topics.length}<br>
                <strong>Plans:</strong> ${kb_data.plans.length}<br>
                <strong>Discussions:</strong> ${kb_data.discussions.length}
            `);
    }
}); 