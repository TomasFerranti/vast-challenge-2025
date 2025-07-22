// Plot a d3 map using a geojson source on its boundary

let tripsData = null

const projection = d3.geoMercator()
const xScale = d3.scaleTime()

const updateTrips = () => {

    const selectedPerson = d3.select("#people .person.selected");
    const personName = selectedPerson.empty() ? null : selectedPerson.data()[0].name
    console.log("Updating trips. Selected person:", personName);
    if (!personName) {
        console.log("No person selected. (show all trips?)");
        return;
    }
    
    updateTimelinePoints(d3.select("#timeline-1").select("#timeline-points"), tripsData["TROUT"], personName);
    updateTimelinePoints(d3.select("#timeline-2").select("#timeline-points"), tripsData["FILAH"], personName);
    updateTimelinePoints(d3.select("#timeline-3").select("#timeline-points"), tripsData["journalist"], personName);

}



const set_hoover = (trip_id, is_hoovered) => {
    d3.selectAll('.timeline-point')
        .each(function(d) {
            if (d === trip_id) {
                if (is_hoovered) {
                    d3.select(this).raise(); // Move to top
                } else {
                    d3.select(this).lower(); // Move to bottom
                }
                d3.select(this).classed('hoovered', is_hoovered);
            }
        });
}

const createArrows = (trip) => {
    const arrows = d3.select("#geojson-map").select("#trips-arrows");
    arrows.selectAll("path").remove(); // Clear previous arrows

    const places = trip.locations
    if (places.length == 0) {

        // No places data

    } else if (places.length == 1) {
        const startPlace = tripsData["journalist"]["places"][places[0][0]];
        const startCoords = projection([startPlace.lat, startPlace.lon]);
        // Draw a round path (circle) at the location
        arrows.append("path")
            .attr("d", d3.arc()({
                innerRadius: 0,
                outerRadius: 5,
                startAngle: 0,
                endAngle: 2 * Math.PI
            }))
            .attr("transform", `translate(${startCoords[0]},${startCoords[1]})`)
    } else {
        for (let i = 0; i < places.length - 1; i++) {
            const startPlace = tripsData["journalist"]["places"][places[i][0]];
            const endPlace = tripsData["journalist"]["places"][places[i+1][0]];
            const startCoords = projection([startPlace.lat, startPlace.lon]);
            const endCoords = projection([endPlace.lat, endPlace.lon]);

            // Calculate arc parameters
            const dx = endCoords[0] - startCoords[0];
            const dy = endCoords[1] - startCoords[1];
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Arc radius

            arrows.append("path")
                .attr("d", `M ${startCoords[0]} ${startCoords[1]} A ${dr} ${dr} 0 0 1 ${endCoords[0]} ${endCoords[1]}`);
        }
    }

    d3.select("#travel-data") // TODO
}


const updateTimelinePoints = (timeline_points, dataset, personName) => {

    const trips = dataset["trips"][personName]
    const points = timeline_points.selectAll("circle")
        .data(trips || [], d => d); // use d as key if unique
    
    // EXIT old elements not present in new data
    points.exit().remove();
    
    // ENTER new elements
    points.enter().append("circle")
        .attr("cy", d => {
            const dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            const year = dateStr.split("-")[0]
            return year === "2040" ? 15 : 0;
        })
        .attr("cx", d => {
            let dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            let date = new Date(dateStr);
            if (date.getFullYear() === 40)
                date.setFullYear(2040);
            return xScale(date);
        })
        .attr("r", d => {
            const a = dataset["trips_info"][d]["locations"].length;
            if (a === 0) return 2;
            if (a === 1) return 4;
            if (a === 2) return 6;
            if (a === 3) return 8;
            return 10;
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
        .on("mouseover", function(event, d) {
            set_hoover(d, true);
            const trip = dataset["trips_info"][d];
            createArrows(trip);
            const dateStr = trip["date"].split("_")[0];
            d3.select("#tooltip")
                .html(`${d}<br>Date: ${dateStr}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("opacity", 1);
            //console.log(trip["locations"].map(l => dataset["places"][l[0]]["zone"] + (dataset["places"][l[0]]["zone_detail"] ? (", " + dataset["places"][l[0]]["zone_detail"]) : "")));
            console.log(trip["locations"].map(l => dataset["places"][l[0]]["zone"]))
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            set_hoover(d, false);
            d3.select("#tooltip").style("opacity", 0);
            d3.select("#geojson-map").select("#trips-arrows").selectAll("path").remove();
        })


}

const generateTimeline = (container) => {
    const margin = { top: 20, right: 20, bottom: 50, left: 20 };
    const width = 600 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    
    const timeline_group = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    xScale.domain([new Date(2040, 3, 1), new Date(2040, 7, 1)]) // Adjust the date range as needed
          .range([0, width]);
    
    const xAxis = d3.axisBottom(xScale).ticks(5);

    const xAxisGroup = timeline_group.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    // Rotate x-axis tick labels
    xAxisGroup.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    timeline_group.append("g")
        .attr("id", "timeline-points")
    
}

const generateMap = (container, geoData) => {

    const margin = { top: 70, right: 30, bottom: 70, left: 30 };
    const width = 500 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    
    const map_group = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    projection.fitExtent([[0, 0], [width, height]], geoData);
    
    const path = d3.geoPath().projection(projection);

    map_group.append("g")
        .attr("id", "map_polygons")
        .selectAll("path")
        .data(geoData.features)
        .enter().append("path")
        .attr("d", path)
        .attr("class", d => d.properties.Kind.replace(" ", "")) // Remove spaces from class

    map_group.append("g")
        .attr("id", "places-points");
        
    map_group.append("g")
        .attr("id", "trips-arrows");

}

// Load GeoJSON data
const promises = [
    d3.json("/data/vast_challenge_viz?file=oceanus_map"),
    d3.json("/data/vast_challenge_viz?file=trips_trout"),
    d3.json("/data/vast_challenge_viz?file=trips_filah"),
    d3.json("/data/vast_challenge_viz?file=trips_journalist")
];

Promise.all(promises).then(values => {
    const geoData = values[0];
    const tripsTrout = values[1];
    const tripsFilah = values[2];
    const tripsJournalist = values[3];

    // Reverse coordinates for the first few features
    geoData.features[0].geometry.coordinates[0].reverse();
    geoData.features[5].geometry.coordinates[0].reverse();
    geoData.features[6].geometry.coordinates[0].reverse();
    geoData.features[7].geometry.coordinates[0].reverse();
    geoData.features[8].geometry.coordinates[0].reverse();
    geoData.features[9].geometry.coordinates[0].reverse();

    // Filter geoData with just the polygons "Suna Island" and "Thalassa Retreat"
    geoData.features = geoData.features.filter(d => d.properties.Name === "Suna Island" || d.properties.Name === "Thalassa Retreat");

    generateMap(d3.select("#geojson-map"), geoData);
    generateTimeline(d3.select("#timeline-1"));
    generateTimeline(d3.select("#timeline-2"));
    generateTimeline(d3.select("#timeline-3"));

    // Add a point (circle) on each location from tripsData["places"]
    const places = Object.values(tripsJournalist["places"]);
    d3.selectAll("#places-points")
        .selectAll("circle")
        .data(places)
        .enter()
        .append("circle")
        .attr("cx", d => projection([d.lat, d.lon])[0])
        .attr("cy", d => projection([d.lat, d.lon])[1])
        .attr("r", 2)
        .attr("fill", "orange")
        .attr("class", "place-point")
        .on("mouseenter", function(event, d) {
            d3.select("#tooltip")
                .html((d.name ? d.name : d.id) + "<br>" + d.zone + (d.zone_detail ? (", " + d.zone_detail) : ""))
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

    tripsData = {
        "TROUT": tripsTrout,
        "FILAH": tripsFilah,
        "journalist": tripsJournalist
    };


}).catch(error => {
    console.error("Error loading data:", error);
});

window.renderMiniTimeline = function(datasetKey, personName, containerSelector) {
    // Ensure tripsData is loaded before accessing properties
    if (!tripsData) return;

    let dataset;
    if (datasetKey === "filah") dataset = tripsData["FILAH"];
    else if (datasetKey === "trout") dataset = tripsData["TROUT"];
    else dataset = tripsData["journalist"];
    if (!dataset) return;

    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    const width = 70, height = 24, margin = 2;
    const x = d3.scaleTime()
        .domain([new Date(2040, 3, 1), new Date(2040, 7, 1)])
        .range([margin, width - margin]);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const trips = (dataset.trips && dataset.trips[personName]) || [];
    svg.selectAll("circle")
        .data(trips)
        .enter()
        .append("circle")
        .attr("cy", height / 2)
        .attr("cx", d => {
            let dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            let date = new Date(dateStr);
            if (date.getFullYear() === 40)
                date.setFullYear(2040);
            return x(date);
        })
        .attr("r", 3)
        .attr("fill", "#888");
};

window.renderFullTimeline = function(datasetKey, personName, containerSelector) {
    let dataset;
    if (datasetKey === "filah") dataset = tripsData["FILAH"];
    else if (datasetKey === "trout") dataset = tripsData["TROUT"];
    else dataset = tripsData["journalist"];
    if (!dataset) return;

    const container = d3.select(containerSelector);
    container.selectAll("svg").remove();

    const width = 180, height = 40, margin = 10;
    const x = d3.scaleTime()
        .domain([new Date(2040, 3, 1), new Date(2040, 7, 1)])
        .range([margin, width - margin]);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height);

    const trips = (dataset.trips && dataset.trips[personName]) || [];
    svg.selectAll("circle")
        .data(trips)
        .enter()
        .append("circle")
        .attr("cy", height / 2)
        .attr("cx", d => {
            let dateStr = dataset["trips_info"][d]["date"].split("_")[0];
            let date = new Date(dateStr);
            if (date.getFullYear() === 40)
                date.setFullYear(2040);
            return x(date);
        })
        .attr("r", 6)
        .attr("fill", "#888");
}; 