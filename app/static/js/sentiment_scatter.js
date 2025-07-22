// D3 scatterplots for sentiment files (one per file, colored by industry, filtered by selected person, sentiment on x-axis)

const scatterMargin = { top: 20, right: 20, bottom: 40, left: 40 };
const scatterWidth = 220;
const scatterHeight = 100;

const industryColor = industry => {
    if (!industry) return "#f5f0f0";
    
    // Map industry strings to colors
    const colorMap = {
        "tourism": "#ffd70e",
        "large vessel": "#06143b",
        "small vessel": "#0effeb",
        "large vessel/small vessel": "#0e6eff",
        "small vessel/tourism": "#3aff0e"
    };
    
    return colorMap[industry.toLowerCase()] || "#f5f0f0";
};

function flattenSentiments(data) {
    // data: { sentiments: { person: [ {sentiment, ...}, ... ], ... } }
    const arr = [];
    for (const person in data.sentiments) {
        data.sentiments[person].forEach(d => {
            arr.push({
                ...d,
                person
            });
        });
    }
    return arr;
}

let filahData = [], troutData = [], journalistData = [];
let currentMeetingFilter = null;

function createSingleAxisScatter(container, data, title, selectedPerson) {
    container.selectAll("svg").remove();

    const svg = container.append("svg")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

    // x scale: sentiment value
    const x = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, scatterWidth]);

    // y: jitter for visibility
    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([scatterHeight, 0]);

    // x-axis
    g.append("g")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(x).ticks(5));

    // Title
    g.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#333")
        .text(title);

    // Filter by selected person if any
    let filtered = data;
    if (selectedPerson) {
        filtered = data.filter(d => d.person === selectedPerson);
    }
    // Filter by meeting if set
    if (currentMeetingFilter) {
        filtered = filtered.filter(d =>
            (typeof d.topic === "string" && d.topic === currentMeetingFilter) ||
            (typeof d.source === "string" && d.source.startsWith(currentMeetingFilter))
        );
    }

    // Points
    g.selectAll("circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("cy", () => y(Math.random())) // jitter vertically
        .attr("cx", d => x(+d.sentiment))
        .attr("r", 7)
        .attr("fill", d => industryColor(d.industry))
        .attr("opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseenter", function(event, d) {
            d3.select("#tooltip")
                .html(
                    `<b>${d.person}</b><br>Sentiment: ${d.sentiment}<br>Industry: ${d.industry}<br>Reason: ${d.reason}<br>Source: ${d.source}`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("opacity", 1);
            d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select("#tooltip").style("opacity", 0);
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
        });
}

function getSelectedPerson() {
    const selected = d3.select("#people .person.selected");
    return selected.empty() ? null : selected.data()[0].name;
}

function updateScatter() {
    const selectedPerson = getSelectedPerson();
    // Update right-side (main) scatter plots
    createSingleAxisScatter(
        d3.select("#scatter-1"),
        filahData,
        "FILAH Sentiments",
        selectedPerson
    );
    createSingleAxisScatter(
        d3.select("#scatter-2"),
        troutData,
        "TROUT Sentiments",
        selectedPerson
    );
    createSingleAxisScatter(
        d3.select("#scatter-3"),
        journalistData,
        "Journalist Sentiments",
        selectedPerson
    );

    // Update left-side (mini/full) scatter plots if present
    d3.selectAll(".mini-scatter, .full-scatter").each(function() {
        const container = d3.select(this);
        const datasetKey = container.attr("data-dataset");
        const personName = container.attr("data-person");
        let data;
        if (datasetKey === "filah") data = filahData;
        else if (datasetKey === "trout") data = troutData;
        else if (datasetKey === "journalist") data = journalistData;
        else return; // skip if not a valid dataset

        // Use the same filter logic as main scatter
        let filtered = data;
        if (personName) {
            filtered = filtered.filter(d => d.person === personName);
        }
        if (currentMeetingFilter) {
            filtered = filtered.filter(d =>
                (typeof d.topic === "string" && d.topic === currentMeetingFilter) ||
                (typeof d.source === "string" && d.source.startsWith(currentMeetingFilter))
            );
        }

        // Redraw mini or full scatter
        container.selectAll("svg").remove();
        // Mini
        if (container.classed("mini-scatter")) {
            const width = 50, height = 50, margin = 2;
            const x = d3.scaleLinear().domain([-1, 1]).range([margin, width - margin]);
            const y = d3.scaleLinear().domain([0, 1]).range([height - margin, margin]);
            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height);
            svg.selectAll("circle")
                .data(filtered)
                .enter()
                .append("circle")
                .attr("cx", d => x(+d.sentiment))
                .attr("cy", () => y(Math.random()))
                .attr("r", 4)
                .attr("fill", d => industryColor(d.industry))
                .attr("opacity", 0.7)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.7);
        }
        // Full
        if (container.classed("full-scatter")) {
            const width = scatterWidth, height = scatterHeight, margin = scatterMargin;
            const svg = container.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);
            const g = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            const x = d3.scaleLinear().domain([-1, 1]).range([0, width]);
            const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);
            g.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x).ticks(5));
            g.append("text")
                .attr("x", width / 2)
                .attr("y", -8)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("fill", "#333")
                .text("Sentiments");
            g.selectAll("circle")
                .data(filtered)
                .enter()
                .append("circle")
                .attr("cy", () => y(Math.random()))
                .attr("cx", d => x(+d.sentiment))
                .attr("r", 7)
                .attr("fill", d => industryColor(d.industry))
                .attr("opacity", 0.8)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
                .on("mouseenter", function(event, d) {
                    d3.select("#tooltip")
                        .html(
                            `<b>${d.person || d.target}</b><br>Sentiment: ${d.sentiment}<br>Industry: ${d.industry}<br>Reason: ${d.reason}<br>Source: ${d.source}`
                        )
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px")
                        .style("opacity", 1);
                    d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
                })
                .on("mousemove", function(event) {
                    d3.select("#tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseleave", function() {
                    d3.select("#tooltip").style("opacity", 0);
                    d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
                });
        }
    });
}

// Load data once, then update on person selection
Promise.all([
    d3.json("/data/vast_challenge_viz?file=sentiments_filah"),
    d3.json("/data/vast_challenge_viz?file=sentiments_trout"),
    d3.json("/data/vast_challenge_viz?file=sentiments_journalist")
]).then(([filah, trout, journalist]) => {
    filahData = flattenSentiments(filah);
    troutData = flattenSentiments(trout);
    journalistData = flattenSentiments(journalist);
    updateScatter();
}).catch(error => {
    console.error("Error loading scatter data:", error);
});

// Expose updateScatter globally for people.js to call
window.updateScatter = updateScatter;

window.renderMiniScatter = function(datasetKey, personName, containerSelector) {
    let data, title;
    if (datasetKey === "filah") {
        data = filahData;
        title = "FILAH";
    } else if (datasetKey === "trout") {
        data = troutData;
        title = "TROUT";
    } else {
        data = journalistData;
        title = "JOURNALIST";
    }
    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    const width = 50, height = 50, margin = 2;
    const x = d3.scaleLinear().domain([-1, 1]).range([margin, width - margin]);
    const y = d3.scaleLinear().domain([0, 1]).range([height - margin, margin]);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const filtered = data.filter(d => d.person === personName);

    svg.selectAll("circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("cx", d => x(+d.sentiment))
        .attr("cy", () => y(Math.random()))
        .attr("r", 4)
        .attr("fill", d => industryColor(d.industry))
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.7);
};

window.renderFullScatter = function(datasetKey, personName, containerSelector) {
    let data, title;
    if (datasetKey === "filah") {
        data = filahData;
        title = "FILAH Sentiments";
    } else if (datasetKey === "trout") {
        data = troutData;
        title = "TROUT Sentiments";
    } else {
        data = journalistData;
        title = "Journalist Sentiments";
    }
    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    // Use the same dimensions as the main scatter
    const width = scatterWidth, height = scatterHeight, margin = scatterMargin;
    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([-1, 1]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));

    g.append("text")
        .attr("x", width / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#333")
        .text("Sentiments");

    const filtered = data.filter(d => d.person === personName);

    g.selectAll("circle")
        .data(filtered)
        .enter()
        .append("circle")
        .attr("cy", () => y(Math.random()))
        .attr("cx", d => x(+d.sentiment))
        .attr("r", 7)
        .attr("fill", d => industryColor(d.industry))
        .attr("opacity", 0.8)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseenter", function(event, d) {
            d3.select("#tooltip")
                .html(
                    `<b>${d.person || d.target}</b><br>Sentiment: ${d.sentiment}<br>Industry: ${d.industry}<br>Reason: ${d.reason}<br>Source: ${d.source}`
                )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("opacity", 1);
            d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select("#tooltip").style("opacity", 0);
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
        });
};

window.filterScatterByMeeting = function(meetingId) {
    currentMeetingFilter = meetingId;
    updateScatter();
}; 