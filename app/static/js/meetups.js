// Meetups Visualization for VAST Challenge 2025 Mini-Challenge 2
document.addEventListener('DOMContentLoaded', function() {
    // Meetups visualization parameters
    const margin = {top: 60, right: 80, bottom: 80, left: 60};
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.bottom - margin.top;
    
    // Current state
    let currentData = null;
    let svg = null;
    let tooltip = null;
    
    // Initialize the visualization
    function initializeMeetups() {
        // Clear existing visualization
        d3.select("#meetups-viz").selectAll("*").remove();
        
        // Create SVG
        svg = d3.select("#meetups-viz")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top);
        
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Create tooltip
        if (tooltip) tooltip.remove();
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "meetups-tooltip")
            .style("opacity", 0);
        
        // Add title
        svg.append("text")
            .attr("x", (width + margin.left + margin.right) / 2)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text("People Meetups Timeline");
        
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
    
    // Load meetups data
    function loadMeetups() {
        const dataset = document.getElementById('dataset-select').value;
        const fixDates = document.getElementById('fix-dates').checked;
        
        showLoading();
        
        const params = new URLSearchParams({
            dataset: dataset,
            fix_dates: fixDates
        });
        
        fetch(`/data/meetups?${params}`)
            .then(response => response.json())
            .then(data => {
                hideLoading();
                
                if (data.error) {
                    showError(data.error);
                    return;
                }
                
                currentData = data;
                drawMeetups(data);
                updateLegend(data);
                updateStats(data);
                updatePeopleList(data);
                updateDatasetInfo(data);
            })
            .catch(error => {
                hideLoading();
                showError('Error loading meetups: ' + error.message);
            });
    }
    
    // Draw the meetups visualization
    function drawMeetups(data) {
        initializeMeetups();
        
        const g = svg.select("g");
        
        if (!data.meetups || data.meetups.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text("No meetups found in this dataset");
            return;
        }
        
        // Parse dates
        const parseDate = d3.timeParse("%Y-%m-%d");
        
        // Process meetup data
        const processedMeetups = data.meetups.map(meetup => {
            return {
                ...meetup,
                datetime: parseDate(meetup.date),
                hours: meetup.hour
            };
        });
        
        // Get date and time extents from meetup data
        const allDates = processedMeetups.map(m => m.datetime);
        const hourExtent = [0, 24]; // Always show full day
        
        // Calculate date extent from actual meetup data, with some padding
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
            // Fallback to meeting date range if no meetup data
            dateExtent = [
                new Date("2040-04-03"),
                new Date("2040-07-24")
            ];
        }
        
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
            .attr("class", "meetups-grid");
        
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat("")
            )
            .selectAll("line")
            .attr("class", "meetups-grid");
        
        // Add axes
        g.append("g")
            .attr("class", "meetups-axis")
            .attr("transform", `translate(0,${height})`)
            .call(xAxis);
        
        g.append("g")
            .attr("class", "meetups-axis")
            .call(yAxis);
        
        // Add meeting markers (same as timeline)
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
        
        // Handle overlapping points by adding jitter
        const processedMeetupsWithJitter = processedMeetups.map((meetup, index) => {
            // Group points by exact same position
            const samePositionPoints = processedMeetups.filter(m => 
                m.datetime.getTime() === meetup.datetime.getTime() && m.hours === meetup.hours
            );
            
            let jitterX = 0;
            let jitterY = 0;
            
            if (samePositionPoints.length > 1) {
                // Find the index of this point within the same-position group
                const indexInGroup = samePositionPoints.findIndex(m => 
                    m.place.id === meetup.place.id && 
                    m.person_count === meetup.person_count
                );
                
                // Create a circular arrangement for overlapping points
                const angle = (indexInGroup / samePositionPoints.length) * 2 * Math.PI;
                const radius = Math.min(15, 5 + indexInGroup * 3); // Increase radius for more points
                jitterX = Math.cos(angle) * radius;
                jitterY = Math.sin(angle) * radius;
            }
            
            return {
                ...meetup,
                jitterX: jitterX,
                jitterY: jitterY
            };
        });
        
        // Draw meetup points
        g.selectAll(".meetup-point")
            .data(processedMeetupsWithJitter)
            .enter()
            .append("circle")
            .attr("class", d => {
                let sizeClass = "size-2";
                if (d.person_count >= 6) sizeClass = "size-6plus";
                else if (d.person_count >= 5) sizeClass = "size-5";
                else if (d.person_count >= 4) sizeClass = "size-4";
                else if (d.person_count >= 3) sizeClass = "size-3";
                return `meetup-point ${sizeClass}`;
            })
            .attr("cx", d => xScale(d.datetime) + d.jitterX)
            .attr("cy", d => yScale(d.hours) + d.jitterY)
            .attr("r", d => {
                if (d.person_count >= 6) return 14;
                else if (d.person_count >= 5) return 12;
                else if (d.person_count >= 4) return 10;
                else if (d.person_count >= 3) return 8;
                else return 6;
            })
            .attr("fill", d => data.city_colors[d.place.city] || '#666')
            .on("mouseover", function(event, d) {
                // Highlight the current point
                d3.select(this).attr("stroke-width", 4);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                const formatTime = d3.timeFormat("%Y-%m-%d");
                const peopleList = d.people.map(p => 
                    `<span class="person-item">${p.name}</span>`
                ).join('');
                
                tooltip.html(`
                    <h5>Meetup at ${d.place.city || 'Unknown City'}</h5>
                    <p><strong>Date:</strong> ${formatTime(d.datetime)}</p>
                    <p><strong>Time:</strong> ${d.hour}:00</p>
                    <p><strong>Location:</strong> ${d.place.name || 'Unnamed'}</p>
                    <p><strong>Zone:</strong> ${d.place.zone || 'Unknown'}</p>
                    <p><strong>People Count:</strong> ${d.person_count}</p>
                    <div class="people-list">
                        <strong>Present:</strong><br>
                        ${peopleList}
                    </div>
                `);
                
                // Position tooltip to avoid cursor interference
                const tooltipNode = tooltip.node();
                const tooltipRect = tooltipNode.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                let left = event.pageX + 15;
                let top = event.pageY - 15;
                
                // Adjust if tooltip would go off-screen
                if (left + tooltipRect.width > windowWidth) {
                    left = event.pageX - tooltipRect.width - 15;
                }
                if (top + tooltipRect.height > windowHeight) {
                    top = event.pageY - tooltipRect.height - 15;
                }
                
                tooltip.style("left", left + "px")
                    .style("top", top + "px");
                
                tooltip.classed("show", true);
            })
            .on("mouseout", function() {
                // Reset highlight
                d3.select(this).attr("stroke-width", 2);
                
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 0);
                
                tooltip.classed("show", false);
            });
    }
    
    // Update city legend
    function updateLegend(data) {
        const legendContainer = document.getElementById('city-legend');
        legendContainer.innerHTML = '';
        
        if (data.cities.length === 0) {
            legendContainer.innerHTML = '<p>No cities found in meetups</p>';
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
    
    // Update statistics
    function updateStats(data) {
        const statsContainer = document.getElementById('meetup-stats');
        statsContainer.innerHTML = '';
        
        if (!data.meetups || data.meetups.length === 0) {
            statsContainer.innerHTML = '<p>No meetup statistics available</p>';
            return;
        }
        
        // Calculate statistics
        const totalMeetups = data.meetups.length;
        const totalPeople = data.people.length;
        const avgPeoplePerMeetup = (data.meetups.reduce((sum, m) => sum + m.person_count, 0) / totalMeetups).toFixed(1);
        const maxPeopleInMeetup = Math.max(...data.meetups.map(m => m.person_count));
        const citiesWithMeetups = data.cities.length;
        
        const stats = [
            { label: 'Total Meetups', value: totalMeetups },
            { label: 'People in Dataset', value: totalPeople },
            { label: 'Avg People per Meetup', value: avgPeoplePerMeetup },
            { label: 'Max People in Meetup', value: maxPeopleInMeetup },
            { label: 'Cities with Meetups', value: citiesWithMeetups }
        ];
        
        stats.forEach(stat => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'stat-label';
            labelDiv.textContent = stat.label;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'stat-value';
            valueDiv.textContent = stat.value;
            
            statItem.appendChild(labelDiv);
            statItem.appendChild(valueDiv);
            statsContainer.appendChild(statItem);
        });
    }
    
    // Update people list
    function updatePeopleList(data) {
        const peopleContainer = document.getElementById('people-list');
        peopleContainer.innerHTML = '';
        
        if (!data.people || data.people.length === 0) {
            peopleContainer.innerHTML = '<p>No people found</p>';
            return;
        }
        
        data.people.forEach(person => {
            const personItem = document.createElement('div');
            personItem.className = 'person-item';
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'person-name';
            nameDiv.textContent = person.name;
            
            const roleDiv = document.createElement('div');
            roleDiv.className = 'person-role';
            roleDiv.textContent = person.role;
            
            personItem.appendChild(nameDiv);
            personItem.appendChild(roleDiv);
            peopleContainer.appendChild(personItem);
        });
    }
    
    // Update dataset info
    function updateDatasetInfo(data) {
        const datasetContainer = document.getElementById('dataset-details');
        datasetContainer.innerHTML = '';
        
        const info = [
            { label: 'Dataset', value: data.dataset.toUpperCase() },
            { label: 'Date Fix Applied', value: data.fix_dates ? 'Yes' : 'No' }
        ];
        
        info.forEach(item => {
            const infoItem = document.createElement('div');
            infoItem.className = 'stat-item';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'stat-label';
            labelDiv.textContent = item.label;
            
            const valueDiv = document.createElement('div');
            valueDiv.className = 'stat-value';
            valueDiv.textContent = item.value;
            
            infoItem.appendChild(labelDiv);
            infoItem.appendChild(valueDiv);
            datasetContainer.appendChild(infoItem);
        });
    }
    
    // Utility functions
    function showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('meetups-viz').style.display = 'none';
    }
    
    function hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('meetups-viz').style.display = 'block';
    }
    
    function showError(message) {
        const meetupsContainer = document.querySelector('.meetups-container');
        let errorDiv = meetupsContainer.querySelector('.error-message');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            meetupsContainer.insertBefore(errorDiv, meetupsContainer.firstChild);
        }
        
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    function clearVisualization() {
        d3.select("#meetups-viz").selectAll("*").remove();
        document.getElementById('city-legend').innerHTML = '';
        document.getElementById('meetup-stats').innerHTML = '';
        document.getElementById('people-list').innerHTML = '';
        document.getElementById('dataset-details').innerHTML = '';
    }
    
    // Event listeners
    document.getElementById('dataset-select').addEventListener('change', function() {
        clearVisualization();
    });
    
    document.getElementById('load-meetups').addEventListener('click', loadMeetups);
    
    // Initialize with default dataset
    loadMeetups();
}); 