// Plot a d3 map using a geojson source on its boundary

let tripsData = null;

let xScaleMap = null;
let yScaleMap = null;

let xScale = null;
let yScale = null; // Declare yScale as a global variable

const updateTrips = () => {

    const selectedPerson = d3.select("#people .person.selected");
    const personName = selectedPerson.empty() ? null : selectedPerson.data()[0].name
    if (personName) {
        updateTimelinePoints("#timeline-1", dataTrout, personName);
        updateTimelinePoints("#timeline-2", dataFilah, personName);
        updateTimelinePoints("#timeline-3", dataJournalist, personName);
    }
}



const set_hoover = (trip_id, is_hoovered) => {
    d3.selectAll('.timeline-point')
        .each(function(d) {
            if (d.id === trip_id) {
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
    arrows.selectAll("text").remove(); // Clear previous time labels

    const places = trip.locations.map(l => l[0]) // l[1] is the date
    const times = trip.locations.map(l => l[1]) // l[1] is the date-time string

    if (places.length == 0) {

        // No places data

    } else if (places.length == 1) {
        const startPlace = places[0];
        const timeStr = times[0];
        // Draw a round path (circle) at the location
        arrows.append("path")
            .attr("d", d3.arc()({
                innerRadius: 0,
                outerRadius: 5,
                startAngle: 0,
                endAngle: 2 * Math.PI
            }))
            .attr("transform", `translate(${xScaleMap(startPlace.x)}, ${yScaleMap(startPlace.y)})`);
        // Add time label
        arrows.append("text")
            .attr("x", xScaleMap(startPlace.x) + 1)
            .attr("y", yScaleMap(startPlace.y) - 1)
            .attr("font-size", "7px")
            .attr("fill", "#333")
            .style("opacity", 0.7)
            .style("pointer-events", "none")
            .text(timeStr.split(" ")[1].slice(0, 5)); // HH:MM
    } else {
        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            const timeStr = times[i];
            // Add time label at each point
            arrows.append("text")
                .attr("x", xScaleMap(place.x) + 1)
                .attr("y", yScaleMap(place.y) - 1)
                .attr("font-size", "7px")
                .attr("fill", "#333")
                .style("opacity", 0.7)
                .style("pointer-events", "none")
                .text(timeStr.split(" ")[1].slice(0, 5)); // HH:MM
        }
        for (let i = 0; i < places.length - 1; i++) {
            const startPlace = places[i];
            const endPlace = places[i + 1];

            // Calculate arc parameters
            const dx = xScaleMap(endPlace.x) - xScaleMap(startPlace.x);
            const dy = yScaleMap(endPlace.y) - yScaleMap(startPlace.y);
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Arc radius

            //arrows.append("path")
            //    .attr("d", `M ${xScaleMap(startPlace.x)} ${yScaleMap(startPlace.y)} A ${dr} ${dr} 0 0 1 ${xScaleMap(endPlace.x)} ${yScaleMap(endPlace.y)}`);
            
            // Create a simple path instead of an arc
            arrows.append("path")
                  .attr("d", `M ${xScaleMap(startPlace.x)} ${yScaleMap(startPlace.y)} L ${xScaleMap(endPlace.x)} ${yScaleMap(endPlace.y)}`)
        }
    }
}


const generateTimeline = (container) => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
    
    const timeline_group = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const weeks = d3.range(18); // Weeks from April to July
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Apr", "May", "Jun", "Jul"]; // Abbreviated month names

    xScale = d3.scaleBand()
        .domain(weeks)
        .range([0, width])
        .padding(0.1);

    yScale = d3.scaleBand()
        .domain(weekdays)
        .range([0, height])
        .padding(0.1);

    // Add gray squares behind all days
    timeline_group.selectAll(".day-background")
        .data(weeks.flatMap(week => weekdays.map(day => ({ week, day }))))
        .enter()
        .append("rect")
        .attr("class", "day-background")
        .attr("x", d => xScale(d.week) - xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.day) - yScale.bandwidth() / 2)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", "#fafafa")

    // Add week labels (month names)
    timeline_group.selectAll(".month-label")
        .data(months)
        .enter()
        .append("text")
        .attr("class", "month-label")
        .attr("x", (d, i) => xScale(i * 4 + 1) + xScale.bandwidth() / 2) // Position at the start of each month
        .attr("y", -10) // Above the timeline
        .style("text-anchor", "middle")
        .text(d => d);

    // Add weekday labels
    timeline_group.selectAll(".weekday-label")
        .data(weekdays)
        .enter()
        .append("text")
        .attr("class", "weekday-label")
        .attr("x", -10) // Left of the timeline
        .attr("y", d => yScale(d) + yScale.bandwidth() / 2)
        .style("text-anchor", "end")
        .text(d => d);

    timeline_group.append("g")
        .attr("id", "timeline-points");
};

const updateTimelinePoints = (container, dataset, personName) => {
    const person = dataset.find(d => d.name === personName);
    const trips = person ? person.trips : [];

    const points = d3.select(container).select("#timeline-points")
        .selectAll("circle")
        .data(trips, d => d.id);
    
    // EXIT old elements not present in new data
    points.exit()
        .transition()
        .duration(300)
        .attr("r", 0)
        .remove();
    
    // ENTER new elements
    points.enter().append("circle")
        .attr("cy", d => {
            const dateStr = d.date.split("-")
            const date = new Date(2040, dateStr[1] - 1, dateStr[2]); // Month is 0-indexed
            const weekday = date.toLocaleString("en-US", { weekday: "short" })
            return yScale(weekday);
        })
        .attr("cx", d => {
            const dateStr = d.date.split("-")
            const date = new Date(2040, dateStr[1] - 1, dateStr[2]); // Month is 0-indexed
            const weekNumber = Math.floor((date - new Date(2040, 3, 1)) / (7 * 24 * 60 * 60 * 1000));
            return xScale(weekNumber);
        })
        .attr("r", 0)
        .attr("fill", d => {
            const year = d.date.split("-")[0];
            if (year === "0040")
                return "red";
            return "blue";
        })
        .style("cursor", "pointer")
        .attr("class", "timeline-point")
        .on("click", function(event, d) {
            d3.selectAll('.timeline-point')
                .classed('hoovered', false);
            d3.select(this).classed('hoovered', true);
            d3.select(this).lower()
            console.log(d)
            createArrows(d);
        })
        .on("mouseover", function(event, d) {
            d3.select("#tooltip")
                .html(`${d.id}<br>Date: ${d.date}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("opacity", 1);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            //set_hoover(d.id, false);
            d3.select("#tooltip").style("opacity", 0);
            /*d3.select("#geojson-map").select("#trips-arrows").selectAll("path").remove();
            d3.select("#geojson-map").select("#trips-arrows").selectAll("text").remove();*/
        })
        .transition()
        .duration(300)
        .attr("r", d => {
            switch (d.locations.length) {
                case 0: return 2;
                case 1: return 4;
                case 2: return 6;
                case 3: return 8;
                default: return 10;
            }
        });
}

const generateMap = (container) => {
    const margin = { top: 70, right: 30, bottom: 70, left: 30 };
    const width = 700 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("border", "2px solid rgba(128,128,128,0.3)") // More transparent border
        .style("border-radius", "16px"); // Rounded corners

    const map_group = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    xScaleMap = d3.scaleLinear()
        .domain(d3.extent(uMap, d => d.x))
        .range([0, width]);
    
    yScaleMap = d3.scaleLinear()
        .domain(d3.extent(uMap, d => d.y))
        .range([height, 0]);

    map_group.append("g")
        .attr("id", "places-points");
        
    map_group.append("g")
        .attr("id", "trips-arrows");

    // Add zoom interaction
    const zoom = d3.zoom()
        .scaleExtent([1, 10]) // Set zoom scale limits
        .on("zoom", (event) => {
            map_group.attr("transform", event.transform);
        });

    svg.call(zoom);
};

// Load data using Flask API endpoints
const promises = [
    d3.json("/data/visualization_3?file=journalist"),
    d3.json("/data/visualization_3?file=TROUT"),
    d3.json("/data/visualization_3?file=FILAH"),
    d3.json("/data/visualization_3?file=umap"),
];

let uMap = null;

let dataJournalist = null;
let dataTrout = null;
let dataFilah = null;

const generateTripsData = (data) => {
    const people = data.nodes.filter(n => n.type === "entity.person");
    people.forEach(person => {
        person.trips = [];
    });
    
    const tripsNodes = data.nodes.filter(n => n.type === "trip");
    tripsNodes.forEach(trip => {
        const links = data.links.filter(l => l.source === trip.id);

        const person = links.find(l => !("time" in l));
        people.find(p => p.id === person.target).trips.push(trip);

        const places = links.filter(l => "time" in l).map(l => [uMap.find(p => p.id === l.target), l.time]);
        // Sort places by time before assigning to trip.locations
        trip.locations = places.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    })

    data = people
}

Promise.all(promises).then(values => {
    // Check if any requests failed
    if (values.some(v => v && v.error)) {
        console.error("Error loading data:", values.filter(v => v && v.error));
        return;
    }

    uMap = values[3]["umap"];

    dataJournalist = values[0];
    dataTrout = values[1];
    dataFilah = values[2];

    uMap.forEach(d => {
        d.journalist = dataJournalist.nodes.find(n => n.id === d.id) || null;
    })

    generateTripsData(dataJournalist);
    generateTripsData(dataTrout);
    generateTripsData(dataFilah);

    dataJournalist = dataJournalist.nodes.filter(n => n.type === "entity.person");
    dataTrout = dataTrout.nodes.filter(n => n.type === "entity.person");
    dataFilah = dataFilah.nodes.filter(n => n.type === "entity.person");

    generateMap(d3.select("#geojson-map"));
    generateTimeline(d3.select("#timeline-1"));
    generateTimeline(d3.select("#timeline-2"));
    generateTimeline(d3.select("#timeline-3"));

    const uinqueCities = new Set(uMap.map(d => d.city_name));
    const scaleCity = d3.scaleOrdinal()
        .domain(Array.from(uinqueCities))
        .range(d3.schemeCategory10);

    d3.selectAll("#places-points")
        .selectAll("circle")
        .data(uMap)
        .enter()
        .append("circle")
        .attr("cx", d => xScaleMap(d.x))
        .attr("cy", d => yScaleMap(d.y))
        .attr("r", d => {
            if (d.journalist) {
                return 3; // Journalist points
            }
            return 1; // Other points
        })
        .attr("fill", d => scaleCity(d.city_name))
        .style("opacity", 0.3)
        .attr("class", "place-point")
        .style("pointer-events", d => d.journalist ? "auto" : "none") // Only allow hover on journalist points
        .on("mouseenter", function(event, d) {
            d3.select("#tooltip")
                .html((d.journalist.name ? d.journalist.name : d.id) + "<br>" + d.zone + (d.zone_detail ? (", " + d.zone_detail) : ""))
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("opacity", 1);

            d3.select(this)
                .attr("fill", d3.color(scaleCity(d.city_name)).darker(1))
                .style("opacity", 1);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseleave", function() {
            d3.select("#tooltip").style("opacity", 0);

            d3.select(this)
                .attr("fill", d => scaleCity(d.city_name))
                .style("opacity", 0.3);
        });

}).catch(error => {
    console.error("Error loading data:", error);
}); 