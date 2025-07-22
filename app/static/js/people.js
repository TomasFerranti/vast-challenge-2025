const people_data = [
    { name: 'Carol Limpet', type: "girl" },
    { name: 'Ed Helpsford', type: "boy" },
    { name: 'Seal', type: "boy" },
    { name: 'Simone Kat', type: "girl" },
    { name: 'Tante Titan', type: "girl" },
    { name: 'Teddy Goldstein', type: "girl" },
]

const sizes = {
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
    width: 700 - 20 - 20
};



const createPeople = () => {
    const people_height = 150;
    const svg = d3.select("#people")
        .append("svg")
        .attr("width", sizes.width + sizes.margin.left + sizes.margin.right)
        .attr("height", people_height)

    const size = 48;
    const people = svg.append("g")
        .attr("id", "people")
        .attr("transform", `translate(${sizes.margin.right + size}, ${sizes.margin.top + size})`)
        .selectAll(".person")
        .data(people_data).enter().append("g")
            .classed("person", true)
            .attr("transform", (d, i) => `translate(${sizes.width * i / people_data.length}, 0)`)
            .on("click", function (event, d) {
                d3.selectAll("#people .person").classed("selected", false);
                d3.select(this).classed("selected", true);
                updateTrips();
                updateScatter();
                updateMeetings();
            })
        
    people.append("text")
        .attr("x", 0)
        .attr("y", size)
        .text(d => d.name)
    
    people.append("g").each(function(d, i) {
        d3.xml(`/static/svg/p${i}.svg`).then(data => {
            const importedNode = document.importNode(data.documentElement, true);
            importedNode.setAttribute("width", `${size}`);
            importedNode.setAttribute("height", `${size}`);
            d3.select(this)
                .attr("transform", `translate(${-size / 2}, ${-size / 2})`)
                .append(() => importedNode.cloneNode(true));
        });
    });
}


// Ensure createPeople is called after the DOM is ready and after the #people container exists
document.addEventListener("DOMContentLoaded", function() {
    createPeople();

const DATASETS = {
    journalist: {
        people: [
            { name: 'Carol Limpet', type: "girl" },
            { name: 'Ed Helpsford', type: "boy" },
            { name: 'Seal', type: "boy" },
            { name: 'Simone Kat', type: "girl" },
            { name: 'Tante Titan', type: "girl" },
            { name: 'Teddy Goldstein', type: "girl" }
        ]
    },
    filah: {
        people: [
            { name: 'Carol Limpet', type: "girl" },
            { name: 'Ed Helpsford', type: "boy" },
            { name: 'Seal', type: "boy" },
            { name: 'Simone Kat', type: "girl" },
            { name: 'Tante Titan', type: "girl" },
            { name: 'Teddy Goldstein', type: "girl" }
        ]
    },
    trout: {
        people: [
            { name: 'Carol Limpet', type: "girl" },
            { name: 'Ed Helpsford', type: "boy" },
            { name: 'Seal', type: "boy" },
            { name: 'Simone Kat', type: "girl" },
            { name: 'Tante Titan', type: "girl" },
            { name: 'Teddy Goldstein', type: "girl" }
        ]
    }
};

let currentDataset = "journalist"; // Ensure default is journalist

function renderPersonTable() {
    const people = DATASETS[currentDataset].people;
    const tbody = d3.select("#person-table tbody");
    tbody.html("");
    people.forEach(person => {
        // Create a new row for each person
        const personGroup = tbody.append("tbody")
            .attr("class", "person-group")
            .attr("data-person", person.name);

        personGroup.append("td").text(person.name);

        const tr = tbody.append("tr")
            .attr("class", "person-row")
            .attr("data-person", person.name);

        // Meetings cell
        tr.append("td")
            .append("span")
            .attr("class", "meeting-cell")
            .text("●");

        // Sentiments cell
        tr.append("td")
            .append("span")
            .attr("class", "sentiment-cell")
            .text("●");

        // // Trips cell
        // tr.append("td")
        //     .append("span")
        //     .attr("class", "trip-cell")
        //     .text("●");
    });

    // Row click: select person and update all visualizations
    d3.selectAll(".person-row").on("click", function() {
        const personName = d3.select(this).attr("data-person");
        // Select person in people viz
        d3.selectAll("#people .person").classed("selected", d => d.name === personName);
        // Update all visualizations
        updateTrips();
        updateScatter();
        if (window.updateMeetings) window.updateMeetings(personName);
    });
}

// Add after createPeople() call and DATASETS definition:
function renderMiniVisualizations() {
    const dataset = currentDataset;
    const people = DATASETS[dataset].people;
    const container = d3.select("#person-mini-viz-list");
    container.html(""); // Clear

    people.forEach((person, idx) => {
        const personBlock = container.append("div")
        .attr("class", "person-block")
        .attr("data-person", person.name)
        .style("margin-bottom", "16px")
        .style("cursor", "pointer")
        .on("click", function() {
            d3.selectAll("#people .person").classed("selected", d => d.name === person.name);
            updateTrips();
            updateScatter();
            if (window.updateMeetings) window.updateMeetings(person.name);
        });

    // Add centered title at the top
    personBlock.append("div")
        .attr("class", "person-title")
        .text(person.name)
        .style("text-align", "center")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("margin-bottom", "8px");

    const row = personBlock.append("div")
        .attr("class", "mini-viz-row")
        .style("display", "flex")
        .style("align-items", "center");

    row.append("div")
        .attr("id", `mini-meeting-${idx}`)
        .style("margin-right", "6px");

    row.append("div")
        .attr("id", `mini-scatter-${idx}`)
        .style("vertical-align", "middle")
        .style("margin-right", "6px");

    // row.append("div")
    //     .attr("id", `mini-timeline-${idx}`)
    //     .style("width", "90px")
    //     .style("height", "60px");

    });

    // Render mini visualizations for each person
    people.forEach((person, idx) => {
        // Mini meetings
        if (window.renderFullMeeting) window.renderFullMeeting(dataset, person.name, `#mini-meeting-${idx}`);
        // Mini scatter
        if (window.renderFullScatter) window.renderFullScatter(dataset, person.name, `#mini-scatter-${idx}`);
        // Mini timeline
        // if (window.renderMiniTimeline) window.renderMiniTimeline(dataset, person.name, `#mini-timeline-${idx}`);
    });
}

// Helper to render a person icon inline (SVG)
function renderPersonIcon(container, personIdx, size = 32) {
    d3.xml(`/static/svg/p${personIdx}.svg`).then(data => {
        const importedNode = document.importNode(data.documentElement, true);
        importedNode.setAttribute("width", `${size}`);
        importedNode.setAttribute("height", `${size}`);
        container.node().appendChild(importedNode);
    });
}

// Replace renderPersonVisualizations with a thinner row, icon+name at start, and timeline using generateTimeline
function renderPersonVisualizations() {
    const dataset = currentDataset;
    const people = DATASETS[dataset].people;
    const container = d3.select("#person-viz-list");
    container.html(""); // Clear

    people.forEach((person, idx) => {
        const personBlock = container.append("div")
        .attr("class", "person-block")
        .attr("data-person", person.name)
        .style("margin-bottom", "16px")
        .style("cursor", "pointer")
        .on("click", function() {
            d3.selectAll("#people .person").classed("selected", d => d.name === person.name);
            updateTrips();
            updateScatter();
            if (window.updateMeetings) window.updateMeetings(person.name);
        });

    // Add centered title at the top
    personBlock.append("div")
        .attr("class", "person-title")
        .text(person.name)
        .style("text-align", "center")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .style("margin-bottom", "8px");

    const row = personBlock.append("div")
        .attr("class", "mini-viz-row")
        .style("display", "flex")
        .style("align-items", "center");

        // Meetings
        row.append("div")
            .attr("id", `full-meeting-${idx}`)
            .style("display", "inline-block")
            .style("vertical-align", "middle")
            .style("margin-right", "8px");

        // Scatter
        row.append("div")
            .attr("id", `full-scatter-${idx}`)
            .style("display", "inline-block")
            .style("vertical-align", "middle")
            .style("margin-right", "8px");

        // // Timeline (bigger than before)
        // row.append("div")
        //     .attr("id", `full-timeline-${idx}`)
        //     .style("display", "inline-block")
        //     .style("vertical-align", "middle");
    });

    // Render full-size visualizations for each person
    people.forEach((person, idx) => {
        // Meetings
        if (window.renderFullMeeting) window.renderFullMeeting(dataset, person.name, `#full-meeting-${idx}`);
        // Scatter
        if (window.renderFullScatter) window.renderFullScatter(dataset, person.name, `#full-scatter-${idx}`);
        // Timeline: use bigger width for left-side
        // if (window.renderFullTimelineRow) window.renderFullTimelineRow(dataset, person.name, `#full-timeline-${idx}`);
    });
}

// Dataset button logic (replace previous)
d3.selectAll(".dataset-btn").on("click", function() {
    const dataset = d3.select(this).attr("data-dataset");
    currentDataset = dataset;
    renderMiniVisualizations();
    renderPersonVisualizations();
});

// Set the journalist button as active/selected visually if needed
d3.selectAll(".dataset-btn").classed("active", function() {
    return d3.select(this).attr("data-dataset") === "journalist";
});

// Initial render
renderPersonTable();
renderMiniVisualizations();
renderPersonVisualizations();

});

// At the end of the file, after DOMContentLoaded:
window.renderFullTimelineRow = function(datasetKey, personName, containerSelector) {
    // Wait until tripsData is loaded before rendering
    if (!window.tripsData) return;

    let dataset;
    if (datasetKey === "filah") dataset = tripsData["FILAH"];
    else if (datasetKey === "trout") dataset = tripsData["TROUT"];
    else dataset = tripsData["journalist"];
    if (!dataset) return;

    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    // Get container width or fallback to 340
    let containerNode = container.node();
    let availableWidth = 340;
    if (containerNode && containerNode.getBoundingClientRect) {
        availableWidth = Math.max(180, containerNode.getBoundingClientRect().width || 340);
    }
    const margin = { top: 10, right: 4, bottom: 24, left: 4 };
    const width = availableWidth - margin.left - margin.right;
    const height = 44 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const timeline_group = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain([new Date(2040, 3, 1), new Date(2040, 7, 1)])
        .range([0, width]);

    const xAxis = d3.axisBottom(x).ticks(Math.max(3, Math.floor(width / 80)));

    const xAxisGroup = timeline_group.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    const pointsGroup = timeline_group.append("g");

    // Render points for this person
    const trips = (dataset.trips && dataset.trips[personName]) || [];
    // Circle radius proportional to width (min 3, max 14)
    const rScale = d3.scaleLinear()
        .domain([180, 700])
        .range([3, 14])
        .clamp(true);
    const circleR = rScale(width);

    pointsGroup.selectAll("circle")
        .data(trips)
        .enter()
        .append("circle")
        .attr("cy", d => {
            const dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            const year = dateStr.split("-")[0];
            return year === "2040" ? 15 : 0;
        })
        .attr("cx", d => {
            let dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            let date = new Date(dateStr);
            if (date.getFullYear() === 40)
                date.setFullYear(2040);
            return x(date);
        })
        .attr("r", d => {
            // Proportional scaling for number of locations
            const a = dataset["trips_info"][d]["locations"].length;
            if (a === 0) return circleR * 0.4;
            if (a === 1) return circleR * 0.7;
            if (a === 2) return circleR * 1.0;
            if (a === 3) return circleR * 1.2;
            return circleR * 1.4;
        })
        .attr("fill", d => {
            const trip = dataset["trips_info"][d];
            const zones = trip["locations"].map(l => dataset["places"][l[0]]["zone"]);
            const tourismCount = zones.filter(zone => zone === "tourism").length;
            const commercialCount = zones.filter(zone => zone === "residential").length;
            if (tourismCount > commercialCount) {
                return "green";
            } else if (tourismCount < commercialCount) {
                return "blue";
            } else {
                return "gray";
            }
        })
        .attr("class", "timeline-point")
        .on("mouseenter", function(event, d) {
            d3.select("#tooltip")
                .html(`${d}<br>Date: ${dataset["trips_info"][d]["date"].split("_")[0]}`)
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
            d3.select(this).attr("stroke", null).attr("stroke-width", null);
        });
}; 