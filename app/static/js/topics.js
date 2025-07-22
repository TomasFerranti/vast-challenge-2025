let meetingsData = null;

// Load the meetings data from the JSON file
const meetingFiles = [
    { file: "/data/vast_challenge_viz?file=topics_filah", container: "#meeting-1", label: "FILAH Meetings" },
    { file: "/data/vast_challenge_viz?file=topics_trout", container: "#meeting-2", label: "TROUT Meetings" },
    { file: "/data/vast_challenge_viz?file=topics_journalist", container: "#meeting-3", label: "Journalist Meetings" }
];

let meetingsDatasets = [null, null, null];

// Store sentiment datasets in the same order as meetingsDatasets
let sentimentDatasets = [null, null, null];

function parseSentimentJson(sentJson) {
    // Find the number of rows by the length of any column
    const keys = Object.keys(sentJson.person);
    return keys.map(idx => ({
        person: sentJson.person[idx],
        sentiment: sentJson.sentiment[idx],
        reason: sentJson.reason[idx],
        topic: sentJson.topic[idx],
        industry: sentJson.industry[idx]
    }));
}

// Load all sentiment datasets and store them
Promise.all([
    d3.json("/data/vast_challenge_viz?file=sent_filah"),
    d3.json("/data/vast_challenge_viz?file=sent_trout"),
    d3.json("/data/vast_challenge_viz?file=sent_journalist")
]).then(results => {
    sentimentDatasets = results.map(parseSentimentJson);
}).catch(error => {
    console.error("Error loading sentiment data:", error);
});

function renderPersonMeetingsToContainer(containerSelector, meetingsData, personName, label, sentimentData) {
    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    // Remove any previous .dataset-title div before adding a new one
    container.selectAll(".dataset-title").remove();

    // Sort meetings ascending by name (assuming numeric or string sort)
    const meetings = [...meetingsData.topics].sort((a, b) => {
        // Try numeric sort if names are numbers, else string
        const an = Number(a.id), bn = Number(b.id);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return a.id.localeCompare(b.id);
    });

    // Use the maximum number of topics in any meeting for columns
    let maxTopics = 0;
    meetings.forEach(meeting => {
        if (meeting.items.length > maxTopics) maxTopics = meeting.items.length;
    });
    const sortedMeetings = [...meetings].sort((a, b) => {
        const an = Number(a.id), bn = Number(b.id);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return a.id.localeCompare(b.id);
    });

    // Add this to measure text width
    const getTextWidth = (text) => {
        const temp = d3.select('body').append('svg');
        const textElem = temp.append('text').text(text).style('font-size', '10px');
        const width = textElem.node().getComputedTextLength();
        temp.remove();
        return width;
    };

    // Calculate required right margin based on longest meeting name
    const maxNameWidth = Math.max(...sortedMeetings.map(m => getTextWidth(m.name)));
    const rightMargin = Math.max(150, maxNameWidth + 5); // Add padding

        // Meetings as rows, topics as columns, aligned left
    const boxSize = 14, boxSpacing = 4, rowSpacing = 10, startX = 310, startY = 10;
    // Calculate the X where reasons should start (after the last possible topic box)
    const reasonStartX = rightMargin + maxTopics * (boxSize + boxSpacing) + 10;
    const svgWidth = Math.max(120, maxTopics * (boxSize + boxSpacing) + startX + rightMargin + 120);
    const svgHeight = Math.max(80, sortedMeetings.length * (boxSize + boxSpacing + rowSpacing) + startY + 5);

    // Create a container for the entire visualization
    const vizContainer = container.append("div")
        .attr("class", "meeting-viz-container");

    // Add centered title at the top
    container.append("div")
        .attr("class", "dataset-title")
        .style("text-align", "center")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("margin-bottom", "10px")
        .text(label);

    const svg = container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // Draw a strong separator line at the top of each person's container
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", svgWidth)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#222")
        .attr("stroke-width", 3);

    // Meeting labels (rows)
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        // Split name if too long
        const nameThreshold = 60;
        let nameLines = [meeting.name];
        if (meeting.name.length > nameThreshold) {
            const mid = Math.floor(meeting.name.length / 2);
            let splitIdx = meeting.name.lastIndexOf(' ', mid);
            if (splitIdx === -1 || splitIdx === 0) splitIdx = meeting.name.indexOf(' ', mid);
            if (splitIdx > 0 && splitIdx < meeting.name.length - 1) {
                nameLines = [
                    meeting.name.slice(0, splitIdx),
                    meeting.name.slice(splitIdx + 1)
                ];
            }
        }
        const textElem = svg.append("text")
            .attr("x", startX - 10)
            .attr("y", y + boxSize / 2 + 3 - (nameLines.length - 1) * 6)
            .attr("text-anchor", "end")
            .attr("font-size", "10px")
            .attr("fill", "#333");
        nameLines.forEach((line, idx) => {
            textElem.append("tspan")
                .attr("x", startX - 10)
                .attr("dy", idx === 0 ? 0 : 13)
                .text(line);
        });
    });

    // Draw matrix: meetings as rows, topics as columns, aligned left
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        // Use topics or items property
        const topicsArr = Array.isArray(meeting.topics) ? meeting.topics
            : Array.isArray(meeting.items) ? meeting.items : [];
        const sortedTopics = [...topicsArr].sort((a, b) => a.id.localeCompare(b.id));
        let lastBoxX = rightMargin;
        sortedTopics.forEach((topic, i) => {
            const x = rightMargin + i * (boxSize + boxSpacing);
            lastBoxX = x;
            const isPresent = topic.attendees.includes(personName);
            const industryColor = (meetingsData.industries.find(
                ind => ind.id === topic.industry
            ) || { color: "#ccc" }).color;

            svg.append("rect")
                .attr("class", "topic-box")
                .attr("x", x)
                .attr("y", y)
                .attr("width", boxSize)
                .attr("height", boxSize)
                .attr("fill", industryColor)
                .attr("stroke", "#333")
                .attr("stroke-width", 0.5)
                .attr("opacity", isPresent ? 1 : 0.25)
                .on("mouseenter", function(event) {
                    d3.select("#tooltip")
                        .html(
                            `${topic.name}<br>Type: ${topic.type}<br>Industry: ${topic.industry}<br>Attendees: ${topic.attendees.join(", ")}`
                        )
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px")
                        .style("opacity", 1);
                })
                .on("mousemove", function(event) {
                    d3.select("#tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseleave", function() {
                    d3.select("#tooltip").style("opacity", 0);
                });
        });

        // After drawing all squares for this row, add the "reason" text for the selected person and topic(s)
        if (personName && sentimentData) {
            
            // Collect all reasons for this meeting row and person, for all topics in this row
            let reasonText = "";
            sortedTopics.forEach(topic => {
                const entry = sentimentData.find(
                    e => e.person === personName && (e.topic === meeting.id)
                );
                if (entry && entry.reason) {
                    // Concatenate sentiment and reason
                    let sentimentStr = `[${entry.sentiment}] ` || "";
                    reasonText = (sentimentStr + entry.reason) || "";
                }
            });
            // Join all reasons with " | " if multiple
            // const reasonText = reasons || ""
            if (reasonText) {
                // Split reasonText into two lines if too long
                const reasonThreshold = 100;
                let reasonLines = [reasonText];
                if (reasonText.length > reasonThreshold) {
                    const mid = Math.floor(reasonText.length / 2);
                    let splitIdx = reasonText.lastIndexOf(' ', mid);
                    if (splitIdx === -1 || splitIdx === 0) splitIdx = reasonText.indexOf(' ', mid);
                    if (splitIdx > 0 && splitIdx < reasonText.length - 1) {
                        reasonLines = [
                            reasonText.slice(0, splitIdx),
                            reasonText.slice(splitIdx + 1)
                        ];
                    }
                }
                const reasonElem = svg.append("text")
                    .attr("x", reasonStartX)
                    .attr("y", y + boxSize / 2 + 5 - (reasonLines.length - 1) * 6)
                    .attr("font-size", "11px")
                    .attr("fill", "#444")
                    .attr("alignment-baseline", "middle");
                reasonLines.forEach((line, idx) => {
                    reasonElem.append("tspan")
                        .attr("x", reasonStartX)
                        .attr("dy", idx === 0 ? 0 : 13)
                        .text(line);
                });
            }
        }
    });

    // Draw a light horizontal line under each meeting row
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        svg.append("line")
            .attr("x1", rightMargin - 20)
            .attr("x2", svgWidth - 10)
            .attr("y1", y + boxSize + rowSpacing / 2)
            .attr("y2", y + boxSize + rowSpacing / 2)
            .attr("stroke", "#bbb")
            .attr("stroke-width", 1);
    });
}

function renderLegend(meetingsData) {
    // Render color legend for all industries in the dataset
    const legend = d3.select("#meetings-legend").html("");
    if (!meetingsData || !meetingsData.industries) return;
    legend.append("span")
        .style("font-weight", "bold")
        .style("margin-right", "10px")
        .text("Industry Legend:");
    meetingsData.industries.forEach(industry => {
        legend.append("span")
            .attr("class", "legend-item")
            .style("display", "inline-block")
            .style("margin-right", "18px")
            .style("vertical-align", "middle")
            .html(
                `<span style="display:inline-block;width:16px;height:16px;background:${industry.color};border-radius:3px;border:1px solid #aaa;margin-right:5px;vertical-align:middle;"></span>
                <span style="vertical-align:middle;font-size:13px;">${industry.id || "none"}</span>`
            );
    });
}

function getSelectedPerson() {
    const selected = d3.select("#people .person.selected");
    return selected.empty() ? null : selected.data()[0].name;
}

function updateMeetings() {
    const selectedPerson = getSelectedPerson();
    meetingsDatasets.forEach((data, i) => {
        renderPersonMeetingsToContainer(
            meetingFiles[i].container,
            data,
            selectedPerson,
            meetingFiles[i].label,
            sentimentDatasets[i]
        );
    });
    // Render legend from the first loaded dataset
    renderLegend(meetingsDatasets[0]);
}

// Load all meeting datasets
Promise.all(meetingFiles.map(d => d3.json(d.file))).then(results => {
    meetingsDatasets = results;
    updateMeetings();
}).catch(error => {
    console.error("Error loading meetings data:", error);
});

// Expose updateMeetings globally for people.js to call
window.updateMeetings = updateMeetings;

window.renderFullMeeting = function(datasetKey, personName, containerSelector, sentimentData) {
    // Map datasetKey to index in meetingsDatasets
    const idx = datasetKey === "filah" ? 0 : datasetKey === "trout" ? 1 : 2;
    const meetingsData = meetingsDatasets[idx];
    if (!meetingsData) return;
    if (!sentimentData) sentimentData = sentimentDatasets[idx];
    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    // Sort meetings ascending by name (assuming numeric or string sort)
    const meetings = [...meetingsData.topics].sort((a, b) => {
        // Try numeric sort if names are numbers, else string
        const an = Number(a.id), bn = Number(b.id);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return a.id.localeCompare(b.id);
    });

    // Use the maximum number of topics in any meeting for columns
    let maxTopics = 0;
    meetings.forEach(meeting => {
        if (meeting.items.length > maxTopics) maxTopics = meeting.items.length;
    });
    const sortedMeetings = [...meetings].sort((a, b) => {
        const an = Number(a.id), bn = Number(b.id);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return a.id.localeCompare(b.id);
    });

    // Add this to measure text width
    const getTextWidth = (text) => {
        const temp = d3.select('body').append('svg');
        const textElem = temp.append('text').text(text).style('font-size', '10px');
        const width = textElem.node().getComputedTextLength();
        temp.remove();
        return width;
    };

    // Calculate required right margin based on longest meeting name
    const maxNameWidth = Math.max(...sortedMeetings.map(m => getTextWidth(m.name)));
    const rightMargin = Math.max(150, maxNameWidth + 5); // Add padding

    // Meetings as rows, topics as columns, aligned left
    const boxSize = 14, boxSpacing = 4, rowSpacing = 12, startX = 310, startY = 10;
    // Calculate the X where reasons should start (after the last possible topic box)
    const reasonStartX = rightMargin + maxTopics * (boxSize + boxSpacing) + 10;
    const svgWidth = Math.max(120, maxTopics * (boxSize + boxSpacing) + startX + rightMargin + 120);
    const svgHeight = Math.max(80, sortedMeetings.length * (boxSize + boxSpacing + rowSpacing) + startY + 5);

    // Create a container for the entire visualization
    const vizContainer = container.append("div")
        .attr("class", "meeting-viz-container");

    const svg = container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight);

    // Draw a strong separator line at the top of each person's container
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", svgWidth)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", "#222")
        .attr("stroke-width", 3);

    // Meeting labels (rows)
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        // Split name if too long
        const nameThreshold = 60;
        let nameLines = [meeting.name];
        if (meeting.name.length > nameThreshold) {
            const mid = Math.floor(meeting.name.length / 2);
            let splitIdx = meeting.name.lastIndexOf(' ', mid);
            if (splitIdx === -1 || splitIdx === 0) splitIdx = meeting.name.indexOf(' ', mid);
            if (splitIdx > 0 && splitIdx < meeting.name.length - 1) {
                nameLines = [
                    meeting.name.slice(0, splitIdx),
                    meeting.name.slice(splitIdx + 1)
                ];
            }
        }
        const textElem = svg.append("text")
            .attr("x", startX - 10)
            .attr("y", y + boxSize / 2 + 5 - (nameLines.length - 1) * 6)
            .attr("text-anchor", "end")
            .attr("font-size", "10px")
            .attr("fill", "#333");
        nameLines.forEach((line, idx) => {
            textElem.append("tspan")
                .attr("x", startX - 10)
                .attr("dy", idx === 0 ? 0 : 13)
                .text(line);
        });
    });

    // Draw matrix: meetings as rows, topics as columns, aligned left
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        // Use topics or items property
        const topicsArr = Array.isArray(meeting.topics) ? meeting.topics
            : Array.isArray(meeting.items) ? meeting.items : [];
        const sortedTopics = [...topicsArr].sort((a, b) => a.id.localeCompare(b.id));
        let lastBoxX = rightMargin;
        sortedTopics.forEach((topic, i) => {
            const x = rightMargin + i * (boxSize + boxSpacing);
            lastBoxX = x;
            const isPresent = topic.attendees.includes(personName);
            const industryColor = (meetingsData.industries.find(
                ind => ind.id === topic.industry
            ) || { color: "#ccc" }).color;

            svg.append("rect")
                .attr("class", "topic-box")
                .attr("x", x)
                .attr("y", y)
                .attr("width", boxSize)
                .attr("height", boxSize)
                .attr("fill", industryColor)
                .attr("stroke", "#333")
                .attr("stroke-width", 0.5)
                .attr("opacity", isPresent ? 1 : 0.25)
                .on("mouseenter", function(event) {
                    d3.select("#tooltip")
                        .html(
                            `${topic.name}<br>Type: ${topic.type}<br>Industry: ${topic.industry}<br>Attendees: ${topic.attendees.join(", ")}`
                        )
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px")
                        .style("opacity", 1);
                })
                .on("mousemove", function(event) {
                    d3.select("#tooltip")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseleave", function() {
                    d3.select("#tooltip").style("opacity", 0);
                });
        });

        // After drawing all squares for this row, add the "reason" text for the selected person and topic(s)
        if (personName && sentimentData) {
            
            // Collect all reasons for this meeting row and person, for all topics in this row
            let reasonText = "";
            sortedTopics.forEach(topic => {
                const entry = sentimentData.find(
                    e => e.person === personName && (e.topic === meeting.id)
                );
                if (entry && entry.reason) {
                    // Concatenate sentiment and reason
                    let sentimentStr = `[${entry.sentiment}] ` || "";
                    reasonText = (sentimentStr + entry.reason) || "";
                }
            });
            // Join all reasons with " | " if multiple
            // const reasonText = reasons || ""
            if (reasonText) {
                // Split reasonText into two lines if too long
                const reasonThreshold = 100;
                let reasonLines = [reasonText];
                if (reasonText.length > reasonThreshold) {
                    const mid = Math.floor(reasonText.length / 2);
                    let splitIdx = reasonText.lastIndexOf(' ', mid);
                    if (splitIdx === -1 || splitIdx === 0) splitIdx = reasonText.indexOf(' ', mid);
                    if (splitIdx > 0 && splitIdx < reasonText.length - 1) {
                        reasonLines = [
                            reasonText.slice(0, splitIdx),
                            reasonText.slice(splitIdx + 1)
                        ];
                    }
                }
                const reasonElem = svg.append("text")
                    .attr("x", reasonStartX)
                    .attr("y", y + boxSize / 2 + 3 - (reasonLines.length - 1) * 6)
                    .attr("font-size", "11px")
                    .attr("fill", "#444")
                    .attr("alignment-baseline", "middle");
                reasonLines.forEach((line, idx) => {
                    reasonElem.append("tspan")
                        .attr("x", reasonStartX)
                        .attr("dy", idx === 0 ? 0 : 13)
                        .text(line);
                });
            }
        }
    });

    // Draw a light horizontal line under each meeting row
    sortedMeetings.forEach((meeting, j) => {
        const y = startY + j * (boxSize + boxSpacing + rowSpacing);
        svg.append("line")
            .attr("x1", rightMargin - 20)
            .attr("x2", svgWidth - 10)
            .attr("y1", y + boxSize + rowSpacing / 2)
            .attr("y2", y + boxSize + rowSpacing / 2)
            .attr("stroke", "#bbb")
            .attr("stroke-width", 1);
    });
}; 