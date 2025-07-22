// Topic visualization: selector, participants & opinions, places & travel circles

// Use new data sources for topic visualization
let topicPlacesData = null;
let allSentiments = [];
let allPeople = new Set();
let allVisits = {};
let currentDataset = "journalist";

Promise.all([
    d3.json("/data/vast_challenge_viz?file=topic_places_ds"),
    d3.json("/data/vast_challenge_viz?file=sent_filah"),
    d3.json("/data/vast_challenge_viz?file=sent_trout"),
    d3.json("/data/vast_challenge_viz?file=sent_journalist"),
    d3.json("/data/vast_challenge_viz?file=visits_filah"),
    d3.json("/data/vast_challenge_viz?file=visits_trout"),
    d3.json("/data/vast_challenge_viz?file=visits_journalist")
]).then(([topicPlaces, sentFilah, sentTrout, sentJournalist, visitsFilah, visitsTrout, visitsJournalist]) => {
    topicPlacesData = topicPlaces.topics_places;
    
    // Flatten all sentiments for all datasets
    function flattenSentiments(data, datasetName) {
        const arr = [];
        for (const person in data.sentiments) {
            data.sentiments[person].forEach(d => {
                arr.push({ 
                    ...d, 
                    person,
                    dataset: datasetName  // Add dataset identifier
                });
                allPeople.add(person);
            });
        }
        return arr;
    }

    // Pass dataset names when flattening
    allSentiments = [
        ...flattenSentiments(sentFilah, 'filah'),
        ...flattenSentiments(sentTrout, 'trout'),
        ...flattenSentiments(sentJournalist, 'journalist')
    ];
    
    allVisits = {
        filah: visitsFilah,
        trout: visitsTrout,
        journalist: visitsJournalist
    };
    
    populateDatasetSelector();
    populateTopicSelector();
    renderTopicVisualization();
});

function populateDatasetSelector() {
    // Add dataset selector above topic selector
    let container = d3.select("#topic-visualization-container");
    let dsDiv = container.select("#topic-dataset-selector");
    if (dsDiv.empty()) {
        dsDiv = container.insert("div", ":first-child")
            .attr("id", "topic-dataset-selector")
            .style("margin-bottom", "10px");
    }
    dsDiv.html(`
        <label for="topic-dataset"><b>Dataset:</b></label>
        <select id="topic-dataset">
            <option value="filah">FILAH</option>
            <option value="trout">TROUT</option>
            <option value="journalist">Journalist</option>
        </select>
    `);
    dsDiv.select("select")
        .property("value", currentDataset)
        .on("change", function() {
            currentDataset = this.value;
            renderTopicVisualization();
        });
}

function populateTopicSelector() {
    const selector = d3.select("#topic-selector");
    selector.selectAll("option").remove();
    topicPlacesData.forEach(tp => {
        selector.append("option")
            .attr("value", tp.topic)
            .text(tp.topic);
    });
    selector.on("change", renderTopicVisualization);
}

function renderTopicVisualization() {
    const topic = d3.select("#topic-selector").property("value");
    const topicData = topicPlacesData.find(tp => tp.topic === topic);
    
    if (!topicData) {
        d3.select("#topic-participants").html("<div>No data for selected topic</div>");
        d3.select("#topic-places").html("<div>No data for selected topic</div>");
        return;
    }
    
    const topic_id = topicData.id;
    const topicPlaces = topicData.places || [];

    // --- LEFT: Participants and opinions ---
    const participantsDiv = d3.select("#topic-participants");
    participantsDiv.html("<b>Participants & Opinions</b><br>");
    
    // Get unique participants with latest meeting entry and remove 'source'
    let participants = Array.from(
        allSentiments
            .filter(d => d.topic === topic_id && d.dataset === currentDataset)
            .reduce((personMap, item) => {
                const { source, ...cleanItem } = item;
                const existing = personMap.get(cleanItem.person);
                if (!existing || existing.meeting_id < cleanItem.meeting_id) {
                    personMap.set(cleanItem.person, cleanItem);
                }
                return personMap;
            }, new Map())
            .values()
    );
    
    if (participants.length === 0) {
        participantsDiv.append("div").text("No opinions found.");
    } else {
        participants.forEach(d => {
            participantsDiv.append("div")
                .style("margin-bottom", "8px")
                .html(`<b>${d.person}</b>: <span style="color:#555">${d.sentiment !== null ? d.sentiment : "?"}</span><br><span style="font-size:13px;color:#888">${d.reason || ""}</span>`);
        });
    }

    // --- RIGHT: Places and travel circles ---
    const placesDiv = d3.select("#topic-places");
    placesDiv.html("<b>Places & Visits</b>");
    
    if (!topicPlaces || topicPlaces.length === 0) {
        placesDiv.append("div").text("No places mapped.");
        return;
    }

    // Gather visit counts: { place: { person: count } }
    const placePersonCounts = {};
    const visits = allVisits[currentDataset];
    
    // Normalize place names for matching
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Create mapping of normalized visit keys to original keys
    const visitKeysMap = {};
    if (visits) {
        for (const placeName in visits) {
            if (placeName && placeName !== "null") {
                const normalized = normalize(placeName);
                visitKeysMap[normalized] = visitKeysMap[normalized] || [];
                visitKeysMap[normalized].push(placeName);
            }
        }
    }

    // For each place in topic
    topicPlaces.forEach(tpPlace => {
        const normalizedTpPlace = normalize(tpPlace);
        placePersonCounts[tpPlace] = placePersonCounts[tpPlace] || {};
        
        // Find matching visit keys
        const matchingVisitKeys = [];
        
        // 1. Check for exact normalized match
        if (visitKeysMap[normalizedTpPlace]) {
            matchingVisitKeys.push(...visitKeysMap[normalizedTpPlace]);
        }
        
        // 2. Check for partial matches
        Object.keys(visitKeysMap).forEach(normalizedVisitKey => {
            if (normalizedVisitKey.includes(normalizedTpPlace) || 
                normalizedTpPlace.includes(normalizedVisitKey)) {
                matchingVisitKeys.push(...visitKeysMap[normalizedVisitKey]);
            }
        });
        
        // Process matching visits
        matchingVisitKeys.forEach(visitKey => {
            visits[visitKey].forEach(visit => {
                const person = visit.person;
                placePersonCounts[tpPlace][person] = (placePersonCounts[tpPlace][person] || 0) + 1;
            });
        });
    });

    // Draw SVG for places and circles
    const width = 320, height = 220, margin = 10;
    placesDiv.append("div").attr("id", "topic-places-svg");
    const svg = placesDiv.select("#topic-places-svg")
        .html("")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Layout: vertical list of places, circles for each person
    const placeList = topicPlaces;
    const xScale = d3.scalePoint()
        .domain(placeList)
        .range([margin, width - margin])
        .padding(0.5);

    // Draw place labels
    svg.selectAll("text.place-label")
        .data(placeList)
        .enter()
        .append("text")
        .attr("class", "place-label")
        .attr("x", d => xScale(d) - 20)
        .attr("y", 10)
        .attr("font-size", "13px")
        .attr("fill", "#333")
        .each(function(d) {
            const text = d3.select(this);
            const words = d.split(" ");
            if (words.length <= 1) {
            text.append("tspan")
                .attr("x", d => xScale(d) - 20)
                .attr("dy", "1em")
                .text(d);
            } else {
            words.forEach((word, i) => {
                text.append("tspan")
                .attr("x", xScale(d) - 20)
                .attr("dy", i === 0 ? "1em" : "1.1em")
                .text(word);
            });
            }
        });

    // Draw circles for each person at each place
    // Only show people from the selected dataset(s)
    let peopleSet = new Set();
    allSentiments.forEach(d => { 
        if (d.topic === topic_id && d.dataset === currentDataset) peopleSet.add(d.person); 
    });
    
    const people = Array.from(peopleSet);
    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(people);
    const circleX0 = 90, circleGap = 50;
    
    placeList.forEach((place, i) => {
        const x = xScale(place);
        let idx = 0;
        
        for (const person of people) {
            const count = (placePersonCounts[place] && placePersonCounts[place][person]) || 0;
            if (count > 0) {
                svg.append("circle")
                    .attr("cy", circleX0 + idx * circleGap)
                    .attr("cx", x)
                    .attr("r", 8 + 3 * Math.sqrt(count))
                    .attr("fill", color(person))
                    .attr("opacity", 0.7)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 1.2)
                    .on("mouseenter", function(event) {
                        d3.select("#tooltip")
                            .html(`<b>${person}</b><br>Visits: ${count}<br>Place: ${place}`)
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
                
                // Person label
                svg.append("text")
                    .attr("y", circleX0 + idx * circleGap)
                    .attr("x", x + 22)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "11px")
                    .attr("fill", "#555")
                    .text(person);
                
                idx++;
            }
        }
    });
} 