// Timeline Visualization for VAST Challenge 2025 Mini-Challenge 2
document.addEventListener('DOMContentLoaded', function() {
    // Timeline visualization parameters
    const margin = {top: 60, right: 80, bottom: 80, left: 60};
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.bottom - margin.top;
    
    // Current state
    let currentData = null;
    let svg = null;
    let tooltip = null;
    
    // Initialize the visualization
    function initializeTimeline() {
        // Clear existing visualization
        d3.select("#timeline-viz").selectAll("*").remove();
        
        // Create SVG
        svg = d3.select("#timeline-viz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top);
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Create tooltip
        if (tooltip) tooltip.remove();
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "timeline-tooltip")
            .style("opacity", 0);
        
        // Add title
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text("Person Trip Timeline");
        
        // Add axis labels
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", height + margin.top + margin.bottom - 20)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("Date");
        
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height + margin.top) / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("Time of Day");
    }
    
    // Load persons for the selected dataset
    function loadPersons(dataset) {
        showLoading();
        
        fetch(`/data/timeline?dataset=${dataset}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                // Populate person dropdown
                const personSelect = document.getElementById('person-select');
                personSelect.innerHTML = '<option value="">Select a person...</option>';
                
                data.persons.forEach(person => {
                    const option = document.createElement('option');
                    option.value = person.id;
                    option.textContent = `${person.name} (${person.role})`;
                    personSelect.appendChild(option);
                });
                
                // Clear existing visualization
                clearVisualization();
            })
            .catch(error => {
                hideLoading();
                showError('Error loading persons: ' + error.message);
            });
    }
    
    // Load timeline data for the selected person
    function loadTimeline() {
        const dataset = document.getElementById('dataset-select').value;
        const person = document.getElementById('person-select').value;
        const fixDates = document.getElementById('fix-dates').checked;
        
        if (!person) {
            showError('Please select a person');
            return;
        }
        
        showLoading();
        
        const params = new URLSearchParams({
            dataset: dataset,
            person: person,
            fix_dates: fixDates
        });
        
        fetch(`/data/timeline?${params}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                currentData = data;
                drawTimeline(data);
                updateLegend(data);
                updateTripDetails(data);
                updateMeetingInfo(data);
            })
            .catch(error => {
                hideLoading();
                showError('Error loading timeline: ' + error.message);
            });
    }
    
    // Draw the timeline visualization
    function drawTimeline(data) {
        initializeTimeline();
        
        const g = svg.select("g");
        
        if (!data.trips || data.trips.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text("No trips found for this person");
            return;
        }
        
        // Parse dates and times
        const parseDate = d3.timeParse("%Y-%m-%d");
        const parseTime = d3.timeParse("%H:%M:%S");
        
        // Process trip data
        const processedTrips = data.trips.map(trip => {
            const tripDate = parseDate(trip.date);
            const places = trip.places.map(placeInfo => {
                const datetime = new Date(placeInfo.time);
                return {
                    ...placeInfo,
                    datetime: datetime,
                    date: new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate()),
                    hours: datetime.getHours() + datetime.getMinutes() / 60
                };
            });
            
            return {
                ...trip,
                tripDate: tripDate,
                places: places
            };
        }).filter(trip => trip.places.length > 0);
        
        if (processedTrips.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text("No valid trips with places found");
            return;
        }
        
        // Get date and time extents from trip data
        const allDates = processedTrips.flatMap(trip => trip.places.map(p => p.date));
        const allHours = processedTrips.flatMap(trip => trip.places.map(p => p.hours));
        
        // Calculate date extent from actual trip data, with some padding
        let dateExtent;
        if (allDates.length > 0) {
            const minDate = d3.min(allDates);
            const maxDate = d3.max(allDates);
            // Add 3 days padding on each side
            const padding = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
            dateExtent = [
                new Date(minDate.getTime() - padding),
                new Date(maxDate.getTime() + padding)
            ];
        } else {
            // Fallback to meeting date range if no trip data
            dateExtent = [
                new Date("2040-04-03"),
                new Date("2040-07-24")
            ];
        }
        
        const hourExtent = [0, 24]; // Always show full day
        
        // Create scales
        const xScale = d3.scaleTime()
            .domain(dateExtent)
            .range([0, width]);
        
        const yScale = d3.scaleLinear()
            .domain(hourExtent)
            .range([height, 0]);
        
        // Create axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%m/%d"));
        
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => d + ":00");
        
        // Add grid lines
        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-height)
                .tickFormat("")
            )
            .selectAll("line")
            .attr("class", "timeline-grid");
        
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
            )
            .selectAll("line")
            .attr("class", "timeline-grid");
        
        // Add axes
        g.append("g")
            .attr("class", "timeline-axis")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);
        
        g.append("g")
            .attr("class", "timeline-axis")
            .call(yAxis);
        
        // Add meeting markers
        if (data.meetings && data.meetings.length > 0) {
            const meetingDates = data.meetings.map(meeting => parseDate(meeting.date));
            
            // Add meeting vertical lines
            g.selectAll(".meeting-line")
                .data(meetingDates)
                .enter()
                .append("line")
                .attr("class", "meeting-line")
                .attr("x1", d => xScale(d))
                .attr("x2", d => xScale(d))
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "#ff6b6b")
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.7);
            
            // Add meeting labels
            g.selectAll(".meeting-label")
                .data(data.meetings)
                .enter()
                .append("text")
                .attr("class", "meeting-label")
                .attr("x", d => xScale(parseDate(d.date)))
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("fill", "#ff6b6b")
                .style("cursor", "pointer")
                .text(d => d.id.replace("Meeting_", "M"))
                .on("mouseover", function(event, d) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    
                    tooltip.html(`
                        <h5>${d.id.replace("Meeting_", "Meeting ")}</h5>
                        <p><strong>Date:</strong> ${d.date}</p>
                        <p><strong>Type:</strong> Committee Meeting</p>
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                    
                    tooltip.classed("show", true);
                })
                .on("mouseout", function() {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    
                    tooltip.classed("show", false);
                });
        }
        
        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.hours))
            .curve(d3.curveLinear);
        
        // Draw trips
        const tripGroups = g.selectAll(".timeline-trip-group")
            .data(processedTrips)
            .enter()
            .append("g")
            .attr("class", "timeline-trip-group");
        
        // Draw trip lines
        tripGroups.each(function(trip) {
            const tripGroup = d3.select(this);
            
            // Group places by city for consistent coloring
            const placesByCity = d3.group(trip.places, d => d.place.city);
            
            placesByCity.forEach((cityPlaces, city) => {
                const color = data.city_colors[city] || '#666';
                
                if (cityPlaces.length > 1) {
                    // Draw lines between consecutive places in the same city
                    for (let i = 0; i < cityPlaces.length - 1; i++) {
                        const place1 = cityPlaces[i];
                        const place2 = cityPlaces[i + 1];
                        
                        // Check if places are consecutive in the trip
                        const place1Index = trip.places.indexOf(place1);
                        const place2Index = trip.places.indexOf(place2);
                        
                        if (place2Index === place1Index + 1) {
                            tripGroup.append("line")
                                .attr("class", "timeline-trip-line")
                                .attr("x1", xScale(place1.date))
                                .attr("y1", yScale(place1.hours))
                                .attr("x2", xScale(place2.date))
                                .attr("y2", yScale(place2.hours))
                                .attr("stroke", color);
                        }
                    }
                }
            });
            
            // For general trip connectivity (between different cities)
            if (trip.places.length > 1) {
                for (let i = 0; i < trip.places.length - 1; i++) {
                    const place1 = trip.places[i];
                    const place2 = trip.places[i + 1];
                    
                    // Use a neutral color for inter-city connections
                    tripGroup.append("line")
                        .attr("class", "timeline-trip-line")
                        .attr("x1", xScale(place1.date))
                        .attr("y1", yScale(place1.hours))
                        .attr("x2", xScale(place2.date))
                        .attr("y2", yScale(place2.hours))
                        .attr("stroke", "#999")
                        .attr("stroke-width", 1)
                        .attr("stroke-dasharray", "3,3")
                        .attr("opacity", 0.5);
                }
            }
        });
        
        // Draw place points
        tripGroups.selectAll(".timeline-place-point")
            .data(trip => trip.places)
            .enter()
            .append("circle")
            .attr("class", "timeline-place-point")
            .attr("cx", d => xScale(d.date))
            .attr("cy", d => yScale(d.hours))
            .attr("r", 4)
            .attr("fill", d => data.city_colors[d.place.city] || '#666')
            .on("mouseover", function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                const formatTime = d3.timeFormat("%Y-%m-%d %H:%M");
                tooltip.html(`
                    <h5>${d.place.city || 'Unknown City'}</h5>
                    <p><strong>Place:</strong> ${d.place.name || 'Unnamed'}</p>
                    <p><strong>Time:</strong> ${formatTime(d.datetime)}</p>
                    <p><strong>Zone:</strong> ${d.place.zone || 'Unknown'}</p>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
                
                tooltip.classed("show", true);
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
                
                tooltip.classed("show", false);
            });
    }
    
    // Update city legend
    function updateLegend(data) {
        const legendContainer = document.getElementById('city-legend');
        legendContainer.innerHTML = '';
        
        if (data.cities.length === 0) {
            legendContainer.innerHTML = '<p>No cities found in trips</p>';
            return;
        }
        
        data.cities.forEach(city => {
            const legendItem = document.createElement('div');
            legendItem.className = 'city-legend-item';
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'city-legend-color';
            colorDiv.style.backgroundColor = data.city_colors[city] || '#666';
            
            const textDiv = document.createElement('div');
            textDiv.className = 'city-legend-text';
            textDiv.textContent = city || 'Unknown';
            
            legendItem.appendChild(colorDiv);
            legendItem.appendChild(textDiv);
            legendContainer.appendChild(legendItem);
        });
    }
    
    // Update trip details
    function updateTripDetails(data) {
        const tripDetailsContainer = document.getElementById('trip-details');
        tripDetailsContainer.innerHTML = '';
        
        if (data.trips.length === 0) {
            tripDetailsContainer.innerHTML = '<p>No trips found</p>';
            return;
        }
        
        data.trips.forEach(trip => {
            const tripItem = document.createElement('div');
            tripItem.className = 'trip-detail-item';
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'trip-detail-date';
            dateDiv.textContent = trip.date;
            
            const timeDiv = document.createElement('div');
            timeDiv.className = 'trip-detail-time';
            timeDiv.textContent = `${trip.start} - ${trip.end}`;
            
            const placesDiv = document.createElement('div');
            placesDiv.className = 'trip-detail-places';
            
            trip.places.forEach(placeInfo => {
                const placeSpan = document.createElement('span');
                placeSpan.className = 'trip-detail-place';
                placeSpan.textContent = placeInfo.place.city || 'Unknown';
                placeSpan.style.borderLeftColor = data.city_colors[placeInfo.place.city] || '#666';
                placesDiv.appendChild(placeSpan);
            });
            
            tripItem.appendChild(dateDiv);
            tripItem.appendChild(timeDiv);
            tripItem.appendChild(placesDiv);
            tripDetailsContainer.appendChild(tripItem);
        });
    }
    
    // Update meeting information
    function updateMeetingInfo(data) {
        // Find or create meeting info container
        let meetingContainer = document.getElementById('meeting-info');
        if (!meetingContainer) {
            meetingContainer = document.createElement('div');
            meetingContainer.id = 'meeting-info';
            meetingContainer.className = 'meeting-info';
            
            const meetingTitle = document.createElement('h4');
            meetingTitle.textContent = 'Meetings:';
            meetingContainer.appendChild(meetingTitle);
            
            // Insert after trip details
            const tripDetailsContainer = document.getElementById('trip-details').parentNode;
            tripDetailsContainer.appendChild(meetingContainer);
        } else {
            // Clear existing content except title
            const title = meetingContainer.querySelector('h4');
            meetingContainer.innerHTML = '';
            meetingContainer.appendChild(title);
        }
        
        if (!data.meetings || data.meetings.length === 0) {
            const noMeetings = document.createElement('p');
            noMeetings.textContent = 'No meetings found for this time period';
            meetingContainer.appendChild(noMeetings);
            return;
        }
        
        data.meetings.forEach(meeting => {
            const meetingItem = document.createElement('div');
            meetingItem.className = 'meeting-detail-item';
            
            const meetingDate = document.createElement('div');
            meetingDate.className = 'meeting-detail-date';
            meetingDate.textContent = meeting.id.replace('Meeting_', 'Meeting ');
            
            const meetingDateValue = document.createElement('div');
            meetingDateValue.className = 'meeting-detail-date-value';
            meetingDateValue.textContent = meeting.date;
            
            meetingItem.appendChild(meetingDate);
            meetingItem.appendChild(meetingDateValue);
            meetingContainer.appendChild(meetingItem);
        });
    }
    
    // Utility functions
    function showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('timeline-viz').style.display = 'none';
    }
    
    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('timeline-viz').style.display = 'block';
    }
    
    function showError(message) {
        const timelineContainer = document.querySelector('.timeline-container');
        let errorDiv = timelineContainer.querySelector('.error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            timelineContainer.insertBefore(errorDiv, timelineContainer.firstChild);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    function clearVisualization() {
        d3.select("#timeline-viz").selectAll("*").remove();
        document.getElementById('city-legend').innerHTML = '';
        document.getElementById('trip-details').innerHTML = '';
        
        // Clear meeting info if it exists
        const meetingInfo = document.getElementById('meeting-info');
        if (meetingInfo) {
            meetingInfo.innerHTML = '<h4>Meetings:</h4>';
        }
    }
    
    // Event listeners
    document.getElementById('dataset-select').addEventListener('change', function() {
        const selectedDataset = this.value;
        loadPersons(selectedDataset);
    });
    
    document.getElementById('load-timeline').addEventListener('click', loadTimeline);
    
    // Initialize with default dataset
    loadPersons('journalist');
}); 