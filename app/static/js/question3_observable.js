kb_data = FileAttachment("data@7.json").json()

people = kb_data.persons.map(d => d.id)
topics = kb_data.topics.map(d => d.id)

height = 570;
left_margin = 80;
top_margin = 120;
right_margin = 80;
bottom_margin = 5;

topics_scale_x = d3.scaleBand()
    .domain(topics)
    .range([0,width-(left_margin+right_margin)])
    .padding(0.05);

people_scale_y = d3.scaleBand()
    .domain(people)
    .range([0,height-(top_margin+bottom_margin)])
    .padding(0.05);

max_plans = d3.max(kb_data.discussions, d => d.plan_order) + 1
max_discussions = d3.max(kb_data.discussions, d => d.discussion_order) + 2

discussion_scale_x = d3.scaleBand()
    .domain(d3.range(max_discussions))
    .range([0,topics_scale_x.bandwidth()])
    .padding(0.05);

plan_scale_y = d3.scaleBand()
    .domain(d3.range(max_plans))
    .range([0,people_scale_y.bandwidth()])
    .padding(0.05);

sentiment_color = d3.scaleDiverging()
    .domain([-1, 0, 1]) // Input sentiment from -1 (negative) to 1 (positive)
    .interpolator(d3.interpolateRdYlGn); // Output: Red -> Yellow -> Green

plot = {  
    let svg = d3.create('svg').attr('width', width).attr('height', height);
    let main_plot = svg.append('g').attr('transform', `translate(${left_margin},${top_margin})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "white")
        .style("padding", "4px")
        .style("border-radius", "4px")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("display", "none")
        .style("pointer-events", "none");

    main_plot
        .append('g')
        .attr('transform', 'translate(0,-5)')
        .call(d3.axisTop(topics_scale_x))
        .selectAll("text")  
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "start")
        .attr("dx", "0.5em") // Nudges the label slightly to the right
        .attr("dy", "-0.2em"); // Nudges the label slightly up

    main_plot
        .append('g')
        .attr('transform', 'translate(-5,0)')
        .call(d3.axisLeft(people_scale_y));

    main_plot.append('g')
        .selectAll('rect')
        .data(kb_data.discussions)
        .join('rect')
        .attr('x', d => topics_scale_x(d.topic_id))
        .attr('y', d => people_scale_y(d.person_id))
        .attr('width', topics_scale_x.bandwidth())
        .attr('height', people_scale_y.bandwidth())
        .attr('fill', d3.hcl(0,0,87));

    // Define the hashed pattern with a lighter fill
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
        .attr('fill', d3.hcl(0,0,50)); // Lighter grey for the hash lines

    let discussion_circle_radius = Math.min(discussion_scale_x.bandwidth(), plan_scale_y.bandwidth()) / 2;
    let discussion_y_offset = plan_scale_y.bandwidth() / 2;
    main_plot.append('g')
        // .selectAll('rect')
        .selectAll('circle')
        .data(kb_data.discussions)
        // .join('rect')
        .join('circle')
        // .attr('x', d => topics_scale_x(d.topic_id) + discussion_scale_x(d.discussion_order + 1))
        // .attr('y', d => people_scale_y(d.person_id) + plan_scale_y(d.plan_order))
        .attr('cx', d => topics_scale_x(d.topic_id) + discussion_scale_x(d.discussion_order + 1) + discussion_circle_radius)
        .attr('cy', d => people_scale_y(d.person_id) + plan_scale_y(d.plan_order) + discussion_y_offset)
        // .attr('width', discussion_scale_x.bandwidth())
        // .attr('height', plan_scale_y.bandwidth())
        .attr('r', discussion_circle_radius)
        .attr('fill', d => {
            if (d.absent) {
            return 'url(#hash-pattern)';
            } else {
            return sentiment_color(d.discussion_info[0].sentiment);
            }
        })
        .on("mouseover", function (event, discussion) {
        // Enter - Tooltip
        tooltip.style("display", "block")
            .html(`
            <ul>
                <li><strong>Discussion:</strong> ${discussion.discussion_id}</li>
                <li><strong>Discussion Status:</strong> ${discussion.discussion_status}</li>
                ${discussion.discussion_info.map(item => `
                <li><strong>Reason:</strong> ${item.reason}</li>
                <li><strong>Sentiment:</strong> ${item.sentiment}</li>
                <li><strong>Industry:</strong> ${item.industry}</li>
                `).join('')}
            </ul>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseleave", function () {
        // Leave - Tooltip
        tooltip.style("display", "none");
        });

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
            return sentiment_color(d.plan_info[0].sentiment);
            }
        })
        .on("mouseover", function (event, plan) {
        // Enter - Tooltip
        tooltip.style("display", "block")
            .html(`
            <ul>
                <li><strong>Plan:</strong> ${plan.plan_id}</li>
                <li><strong>Plan Type:</strong> ${plan.plan_type}</li>
                ${plan.plan_info.map(item => `
                <li><strong>Reason:</strong> ${item.reason}</li>
                <li><strong>Sentiment:</strong> ${item.sentiment}</li>
                <li><strong>Industry:</strong> ${item.industry}</li>
                `).join('')}
            </ul>
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseleave", function () {
        // Leave - Tooltip
        tooltip.style("display", "none");
        });

    return svg.node();
}