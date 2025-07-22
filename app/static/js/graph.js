var gNodes = null;
var gLinks = null;
var gSimulation = null;

var gSelectedNode = null;

var gWidth = null;
var gHeight = null;

var gAllDatasets = null; // Store all three datasets
var gCurrentDataset = 0; // 0=journalist, 1=trout, 2=filah

const gTypeColor = d3.scaleOrdinal()
const gBackgroundColor = "#f3f3f3";

const promises = [
    d3.json("/data/visualization_2?file=journalist"),
    d3.json("/data/visualization_2?file=TROUT"),
    d3.json("/data/visualization_2?file=FILAH"),
];

const parameters = {
    "plan": [
        "industry",
        "plan_type"
    ],
    "discussion": [
        "industry"
    ],
    "entity.person": [
        "role"
    ],
    "topic": [
        "industry"
    ],
    "place": [
        "zone"
    ]
}

const processData = () => {

    // Set the type none if not defined
    gNodes.forEach(n => {
        if (!n.type) {
            if (n.lat) n.type = "place"
            else if (n.id === 10803677425) n.type = "place";
            else if (n.id === "Harbor Odyssey Tours") n.type = "entity.organization";
            else if (n.id === "Bay Harvest Corporation") n.type = "entity.organization";
            //else if (n.id === "name_harbor_area_Meeting_11_Harbor_Odyssey_Tours") n.type = "plan";
            //else if (n.id === "concert_Travel_Harborfront_Market") n.type = "plan";
            else n.type = "none";
        }
        n.adj = new Map(); // adjacency list
    });
        
    gLinks.forEach(l => {
        l.source = gNodes.find(n => n.id === l.source);
        l.target = gNodes.find(n => n.id === l.target);
    });

    // Remove links where source or target nodes don't exist (undefined)
    gLinks = gLinks.filter(l => l.source && l.target);

    // Remove the nodes with type trip
    gLinks = gLinks.filter(l => l.source.type !== "trip" && l.target.type !== "trip");
    gNodes = gNodes.filter(n => n.type !== "trip");

    // Set the nodes adjacency lists as a Map of type -> array of connected node ids
    gLinks.forEach(l => {
        // Add target to source's adj map by type
        if (!l.source.adj.has(l.target.type)) {
            l.source.adj.set(l.target.type, []);
        }
        l.source.adj.get(l.target.type).push(l.target);

        // Add source to target's adj map by type
        if (!l.target.adj.has(l.source.type)) {
            l.target.adj.set(l.source.type, []);
        }
        l.target.adj.get(l.source.type).push(l.source);
    });

    // Filter the nodes that have no connections
    gNodes = gNodes.filter(n => n.adj.size > 0);

    // Set the discussion and plan type based on its connection with entity.person
    gNodes.forEach(n => {
        if (n.type === "discussion" || n.type === "plan") {
            n.industry = "";
        }
    });
    gLinks.forEach(l => {
        if (l.source.type === "discussion" || l.source.type === "plan") {
            if (l.target.type === "entity.person" || l.target.type === "entity.organization") {
                l.source.industry = l.industry
                    ? l.industry.map(s => s.toLowerCase()).sort().join(", ")
                    : "";
            }
        }
    });

    // Set the topic industry based on connected discussions and plans
    gNodes.forEach(n => {
        if (n.type === "topic") {
            n.industry = "";
        }
    });
    
    gLinks.forEach(l => {
        if (l.role === "about" && l.target.type === "topic") {
            const sourceNode = l.source;
            if ((sourceNode.type === "discussion" || sourceNode.type === "plan") && sourceNode.industry) {
                // Collect industries from connected discussions/plans
                if (!l.target.industryList) {
                    l.target.industryList = [];
                }
                l.target.industryList.push(sourceNode.industry);
            }
        }
    });
    
    // Aggregate topic industries based on most frequent industry from connected discussions/plans
    gNodes.forEach(n => {
        if (n.type === "topic" && n.industryList && n.industryList.length > 0) {
            // Count frequency of each industry
            const industryCount = {};
            n.industryList.forEach(industry => {
                industryCount[industry] = (industryCount[industry] || 0) + 1;
            });
            
            // Find the most frequent industry
            let mostFrequentIndustry = "";
            let maxCount = 0;
            for (const [industry, count] of Object.entries(industryCount)) {
                if (count > maxCount) {
                    maxCount = count;
                    mostFrequentIndustry = industry;
                }
            }
            
            n.industry = mostFrequentIndustry;
            
            // Clean up temporary array
            delete n.industryList;
        }
    });

}


Promise.all(promises).then(values => {
    // Store all datasets
    gAllDatasets = values;
    
    // Initialize with journalist dataset (index 0)
    loadDataset(0);
});

function loadDataset(datasetIndex) {
    if (!gAllDatasets || datasetIndex < 0 || datasetIndex >= gAllDatasets.length) {
        console.error("Invalid dataset index:", datasetIndex);
        return;
    }
    
    gCurrentDataset = datasetIndex;
    
    // Load the selected dataset as the main graph (create deep copies to avoid modifying originals)
    gNodes = JSON.parse(JSON.stringify(gAllDatasets[datasetIndex].nodes));
    gLinks = JSON.parse(JSON.stringify(gAllDatasets[datasetIndex].links));

    // Store references to all datasets for highlighting
    const journalistNodes = gAllDatasets[0].nodes;
    const journalistLinks = gAllDatasets[0].links;
    const troutNodes = gAllDatasets[1].nodes;
    const troutLinks = gAllDatasets[1].links;
    const filahNodes = gAllDatasets[2].nodes;
    const filahLinks = gAllDatasets[2].links;

    // Mark nodes with dataset membership
    gNodes.forEach(n => {
        n.journalist = journalistNodes.some(m => m.id === n.id);
        n.trout = troutNodes.some(m => m.id === n.id);
        n.filah = filahNodes.some(m => m.id === n.id);
    });

    processData();

    // Mark links with dataset membership (after processData converts IDs to objects)
    let troutLinkCount = 0;
    let filahLinkCount = 0;
    
    gLinks.forEach(l => {
        if (l.source && l.target) {
            l.journalist = journalistLinks.some(m => ((m.source === l.source.id) && (m.target === l.target.id)));
            l.trout = troutLinks.some(m => ((m.source === l.source.id) && (m.target === l.target.id)));
            l.filah = filahLinks.some(m => ((m.source === l.source.id) && (m.target === l.target.id)));
            
            if (l.trout) troutLinkCount++;
            if (l.filah) filahLinkCount++;
        } else {
            l.journalist = false;
            l.trout = false;
            l.filah = false;
        }
    });
    
    console.log(`Dataset ${datasetIndex} loaded - Links with dataset membership:`, {
        total: gLinks.length,
        trout: troutLinkCount,
        filah: filahLinkCount
    });

    // Stop existing simulation if it exists
    if (gSimulation) {
        gSimulation.stop();
        gSimulation = null;
    }

    // Reset selected node state
    gSelectedNode = null;

    // Clear existing visualization and reset any applied styling
    d3.select("#graphContainer").selectAll("*").remove();
    d3.select("#legendContainer").selectAll("*").remove();

    // Setup color scale
    const uniqueTypes = [ "meeting", "entity.person", "entity.organization", "topic", "discussion", "plan", "place", "none", "trip" ];
    gTypeColor.domain(uniqueTypes)
              .range(d3.schemeTableau10.concat(d3.schemeSet3));

    drawGraph();
    updateHighlightButtons();
}

function updateHighlightButtons() {
    const datasetNames = ["journalist", "trout", "filah"];
    const currentName = datasetNames[gCurrentDataset];
    
    // Update dataset selector
    document.getElementById("datasetSelect").value = gCurrentDataset;
    
    // Show/hide highlight buttons based on current dataset
    const troutBtn = document.getElementById("highlightTrout");
    const filahBtn = document.getElementById("highlightFilah");
    const journalistBtn = document.getElementById("highlightJournalist");
    
    if (gCurrentDataset === 0) { // Journalist dataset
        troutBtn.style.display = "inline-block";
        filahBtn.style.display = "inline-block";
        journalistBtn.style.display = "none";
    } else if (gCurrentDataset === 1) { // TROUT dataset
        troutBtn.style.display = "none";
        filahBtn.style.display = "inline-block";
        journalistBtn.style.display = "inline-block";
    } else if (gCurrentDataset === 2) { // FILAH dataset
        troutBtn.style.display = "inline-block";
        filahBtn.style.display = "none";
        journalistBtn.style.display = "inline-block";
    }
}

// Create the graph visualization
function drawGraph () {
    const graphContainer = d3.select("#graphContainer");

    gWidth = graphContainer.node().clientWidth;
    gHeight = graphContainer.node().clientHeight;

    // Ensure container is clean (should already be cleared by loadDataset)
    graphContainer.selectAll("*").remove();

    const svg = graphContainer.append("svg")
        .attr("width", gWidth)
        .attr("height", gHeight);

    const graphGroup = svg.append("g")
        .attr("id", "graphGroup");

    

    // Draw edges (links)
    const link = graphGroup.selectAll("line")
        .data(gLinks)
        .enter().append("line")
        .attr("class", "layer-1")

    // Draw all nodes, style by type, and raise foreground nodes
    const node = graphGroup.selectAll("circle")
        .data(gNodes)
        .enter().append("circle")
        .attr("class", "layer-1")
        .attr("original-color", d => gTypeColor(d.type))
        .style("fill", d => blendColors(gTypeColor(d.type), gBackgroundColor, 0.5))
        .on("dblclick", (event, d) => {
            // Highlight the selected node
            gSelectedNode = d;
            highlightSelectedNodeAndNeighbors();
            console.log("Selected node:", d);
        })
        .call(
            d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) gSimulation.alphaTarget(0.2).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) gSimulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
        );

    // Add click event to unselect the node when clicking outside
    svg.on("click", (event) => {
        if (event.target.tagName !== "circle") {
            gSelectedNode = null;
            highlightSelectedNodeAndNeighbors();
        }
    });

    // Add tooltips/titles for all nodes
    node.append("title").text(d => d.id);

    // Add zoom behavior
    svg.call(
        d3.zoom()
            .scaleExtent([0.2, 5])
            .filter(event => event.type !== "dblclick")
            //.filter(event => event.type === "wheel") // only allow zoom
            .on("zoom", (event) => {
                graphGroup.attr("transform", event.transform);
            })
    );
            
    // Add force simulation
    gSimulation = d3.forceSimulation(gNodes)
        .force("link", d3.forceLink(gLinks).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(gWidth / 2, gHeight / 2));

    gSimulation.on("tick", () => {
        link.attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x)
            .attr("cy", d => d.y);
    });

}

// Set the layer for each node based on its distance to the nearest foreground node
function setLayer (foregroundTypes) {
    function isForeground (node) {
        return foregroundTypes.includes(node.type)
    }

    for (const n of gNodes) {
        if (isForeground(n)) {
            n.layer = 0;
        } else {
            // BFS
            let visited = new Set();
            let queue = [[n, 0]];
            let found = false;
            while (queue.length && !found) {
                const [curr, dist] = queue.shift();
                if (visited.has(curr)) continue;
                visited.add(curr);
                if (isForeground(curr)) {
                    n.layer = dist;
                    found = true;
                    break;
                }
                // Iterate over all adjacency lists (values) for the current node
                for (const neighbors of curr.adj.values()) {
                    for (const neighbor of neighbors) {
                        if (!visited.has(neighbor)) {
                            queue.push([neighbor, dist + 1]);
                        }
                    }
                }
            }
            if (!found) n.layer = 3;
        }
    }

    for (const l of gLinks) {
        l.layer = Math.max(l.source.layer, l.target.layer);
    }
}

function createOrbit (planetType, sunType, forceName = "orbit") {
    const orbits = []
    for (const n of gNodes) {
        if (n.type === planetType) {
            const suns = n.adj.get(sunType)
            // If it has just 1 sun, orbit it
            if (suns && suns.length === 1) {
                n.orbit = suns[0];
                orbits.push(n);
            }
        }
    }

    gSimulation.force(forceName, forceOrbit(orbits));
}

function updateLayer (foregroundTypes) {
    const graphGroup = d3.select("#graphGroup");

    const opacityDict = {
        0: 1,
        1: 0.3,
        2: 0.1,
        3: 0.05
    };

    graphGroup.selectAll(".label").remove();
    setLayer(foregroundTypes);

    // Update drawing order: sort by layer (lower layer drawn on top)
    graphGroup.selectAll("line, circle")
        .sort((a, b) => {
            // Reduce a small epsilon to circles so they are above lines of the same layer
            const getSortValue = d => d.layer - (d.adj ? 0.001 : 0);
            return getSortValue(b) - getSortValue(a);
        });

    if (foregroundTypes[2] === "") {
        // Count layer-0 connections for each node
        gNodes.forEach(n => {
            n.layer0Connections = 0;
            for (const neighbors of n.adj.values()) {
                n.layer0Connections += neighbors.filter(m => m.layer === 0).length;
            }
        });

        // Add labels showing number of connections
        const labl = graphGroup.selectAll(".label")
            .data(gNodes.filter(d => d.layer === 0))
            .enter().append("g")
            .attr("class", "label");

        // White border text
        labl.append("text")
            .attr("class", "label")
            .attr("font-size", "14px")
            .attr("fill", "#222")
            .attr("stroke", "#fff")
            .attr("stroke-width", 4)
            .attr("stroke-linejoin", "round")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text(d => d.layer0Connections)
            .style("pointer-events", "none")
            .style("opacity", document.getElementById('labelsToggle').checked ? 1 : 0); // set initial opacity

        // Foreground text
        labl.append("text")
            .attr("class", "label")
            .attr("font-size", "14px")
            .attr("fill", "#222")
            .attr("stroke-width", 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text(d => d.layer0Connections)
            .style("pointer-events", "none")
            .style("opacity", document.getElementById('labelsToggle').checked ? 1 : 0); // set initial opacity

        gSimulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            labl.attr("transform", d => `translate(${d.x - 15},${d.y - 10})`);
        });
    
        // Vertical align
        const leftNodes = gNodes.filter(d => d.type === foregroundTypes[0])
            .sort((a, b) => b.layer0Connections - a.layer0Connections);
        const rightNodes = gNodes.filter(d => d.type === foregroundTypes[1])
            .sort((a, b) => b.layer0Connections - a.layer0Connections);
        
        gSimulation.force("verticalAlign1", forceVerticalAlign(leftNodes, 0.2));
        gSimulation.force("verticalAlign2", forceVerticalAlign(rightNodes, 0.8));
        gSimulation.force("orbit", null);

    
    } else {

        // Orbit mode: add labels to foregroundTypes[1] nodes showing their id
        const orbitLabels = graphGroup.selectAll(".label")
            .data(gNodes.filter(d => d.type === foregroundTypes[1]))
            .enter().append("g")
            .attr("class", "label");

        // White border text
        orbitLabels.append("text")
            .attr("class", "label")
            .attr("font-size", "14px")
            .attr("fill", "#222")
            .attr("stroke", "#fff")
            .attr("stroke-width", 4)
            .attr("stroke-linejoin", "round")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text(d => d.id)
            .style("pointer-events", "none")
            .style("opacity", document.getElementById('labelsToggle').checked ? 1 : 0); // set initial opacity

        // Foreground text
        orbitLabels.append("text")
            .attr("class", "label")
            .attr("font-size", "14px")
            .attr("fill", "#222")
            .attr("stroke-width", 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text(d => d.id)
            .style("pointer-events", "none")
            .style("opacity", document.getElementById('labelsToggle').checked ? 1 : 0); // set initial opacity

        gSimulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);

            orbitLabels.attr("transform", d => `translate(${d.x - 15},${d.y - 10})`);
        });

        createOrbit(foregroundTypes[0], foregroundTypes[1])
        gSimulation.force("verticalAlign1", null);
        gSimulation.force("verticalAlign2", null);
    }

    gSimulation
        .force("link", d3.forceLink(gLinks).id(d => d.id).strength(d => {
            const srcLayer = d.source.layer;
            const tgtLayer = d.target.layer;
            switch (Math.max(srcLayer, tgtLayer)) {
                    case 0:
                        return 1.0;
                    case 1:
                        return 0.2;//.25;
                    case 2:
                        return 0.1;//.1;
                    default:
                        return 0.05;//.05;
                }
        }))
        .force("charge", d3.forceManyBody().strength(d => {
            switch (d.layer) {
                case 0:
                    return -150;
                case 1:
                    return -10;
                case 2:
                    return -5;
                default:
                    return -2;
            }
    }))


    /*const nodes1 = Array.from(gNodes.values().filter(d => d.type === foregroundTypes[0]));
    const nodes2 = Array.from(gNodes.values().filter(d => d.type === foregroundTypes[1]));
    const nodes3 = Array.from(gNodes.values().filter(d => d.type === foregroundTypes[2]));
    gSimulation.force("triangleAlign", forceTriangleAlign(nodes3, nodes1, nodes2));*/

    // Ensure simulation restarts after tick handler change
    // Update links class
    const link = graphGroup.selectAll("line")
        .attr("class", d => `layer-${d.layer}`)
        // Update links color
        .style("stroke", function (d) {
            const st = d.source.type;
            const tg = d.target.type;
            if ((st === "plan" || st === "discussion")  && (tg === "entity.person" || tg === "entity.organization") && d.layer === 0) {
                // sentiment is a value between -1 and 1, return a d3.scaleLinear color
                if (d.sentiment) {
                    const sentimentColor = d3.scaleLinear()
                        .domain([-1, 0, 1])
                        .range(["#ff0000", "#ffee00ff", "#00ff00"]);
                    return sentimentColor(d.sentiment);
                } else {
                    return "gray";
                }

            }
        });

    
    // Update nodes class and color
    const node = graphGroup.selectAll("circle")
        .attr("class", d => `layer-${d.layer}`)
        .style("fill", function (d) {
            const orig = d3.select(this).attr("original-color");
            return blendColors(orig, "#f3f3f3", opacityDict[d.layer]);
        })


    gSimulation.alpha(0.3).restart();
}



function colorNode(type, attribute) {
    //resetColors()

    const nodes = d3.select("#graphGroup").selectAll("circle").filter(d => d.type === type);

    const uniqueAttributes = Array.from(new Set(nodes.data().map(d => d[attribute]?.toLowerCase()))).sort()

    console.log(uniqueAttributes);
    
    // Custom industry color mapping
    const industryColorMap = {
        "tourism": "#ffd70e",
        "large vessel": "#06143b", 
        "small vessel": "#0effeb",
        "large vessel, small vessel": "#0e6eff",
        "small vessel, large vessel": "#0e6eff", // handle different ordering
        "": "#f5f0f0",
        "small vessel, tourism": "#3aff0e",
        "tourism, small vessel": "#3aff0e"
    };

    // Function to get color for an attribute
    const getColor = (attr) => {
        if (attribute === 'industry' && industryColorMap.hasOwnProperty(attr)) {
            return industryColorMap[attr];
        }
        // Fallback to d3 color scheme for non-industry attributes
        const colorScale = d3.scaleOrdinal()
            .domain(uniqueAttributes)
            .range(d3.schemeTableau10.concat(d3.schemeSet3));
        return colorScale(attr);
    };

    uniqueAttributes.forEach(attr => {
        console.log(`Attribute: ${attr}, Color: ${getColor(attr)}`);
    });

    nodes.style("stroke", d => getColor(d[attribute]?.toLowerCase() || ""))
         .style("stroke-width", 5);

    // Legend SVG
    const legendId = `legend-${type}`;
    d3.select(`#${legendId}`).remove(); // Remove previous legend if exists

    const legendWidth = 220;
    const legendHeight = 40 * uniqueAttributes.length;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = legendWidth - margin.left - margin.right;
    const innerHeight = legendHeight - margin.top - margin.bottom;

    const legendSvg = d3.select("#legendContainer")
        .append("svg")
        .attr("id", legendId)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("top", "10px")
        .style("left", "10px")
        .style("background", "#fff")
        .style("border", "1px solid #ccc")
        .style("z-index", 1000)
        .style("padding", "10px")
        .style("border-radius", "20px")
        .style("margin", "5px")

    // Add a group for margin
    const legendContent = legendSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add type name at the top
    legendContent.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#222")
        .text(type + " - " + attribute);

    const legendGroup = legendContent.selectAll("g")
        .data(uniqueAttributes)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0,${i * 30 + 30})`);

    legendGroup.append("circle")
        .attr("r", 10)
        .attr("cx", 0)
        .attr("cy", 0)
        .style("fill", d => gTypeColor(type))
        .style("stroke", d => getColor(d))
        .style("stroke-width", 5);

    legendGroup.append("text")
        .attr("x", 25)
        .attr("y", 5)
        .text(d => d)
        .attr("font-size", "14px")
        .attr("fill", "#222");
}

function resetColors () {
    d3.select("#graphGroup").selectAll("circle")
        .style("stroke-width", null)
        .style("stroke", null);

    // Remove all color legends
    d3.select("#legendContainer").selectAll("svg").remove();
}



const highlight = (type) => {
    console.log(`Highlighting dataset: ${type}`);
    
    const graphGroup = d3.select("#graphGroup");

    if (type === "all" || type === "journalist") {
        graphGroup.selectAll("circle")
            .style("opacity", null);

        graphGroup.selectAll("line")
            .style("stroke-opacity", null);

        console.log("Showing all elements");
        return;
    }

    // Count and highlight nodes
    let visibleNodes = 0;
    graphGroup.selectAll("circle")
        .style("opacity", d => {
            if (d[type]) {
                visibleNodes++;
                return null;
            }
            if (d.layer === 0) return 0.2; // layer 0 nodes are still visible
            return 0;
        });

    // Count and highlight links
    let visibleLinks = 0;
    graphGroup.selectAll("line")
        .style("stroke-opacity", d => {
            if (d[type]) {
                visibleLinks++;
                return null; // Show links that belong to highlighted dataset
            }
            return 0; // Hide links that don't belong to highlighted dataset
        });

    console.log(`Highlighted ${type}: ${visibleNodes} nodes, ${visibleLinks} links visible`);

};

function highlightSelectedNodeAndNeighbors() {
    resetColors()

    if (!gSelectedNode)
        return;

    const graphGroup = d3.select("#graphGroup");
    // Get neighbors (including selected node)
    const neighbors = new Set([gSelectedNode.id]);
    for (const arr of gSelectedNode.adj.values()) {
        arr.forEach(n => neighbors.add(n.id));
    }

    // Order layer-0 circles so highlighted (red) ones are drawn last (on top)
    /*graphGroup.selectAll("circle.layer-0")
        .sort(function(a, b) {
            // Red ones (neighbors) should be last
            const aIsRed = neighbors.has(a.id);
            const bIsRed = neighbors.has(b.id);
            if (aIsRed === bIsRed) return 0;
            return aIsRed ? 1 : -1;
        })*/
    // Highlight selected node and its neighbors
    graphGroup.selectAll("circle")
        .style("stroke-width", d => {
            if (d.layer === 0) return 5;
        })
        .style("stroke", d => {
            if (d.layer === 0) {
                if (neighbors.has(d.id)) {
                    return "#ec6565e7"; // Highlight color for selected node and neighbors
                } 
                return "#ffffffc7";
            }
        });


}

// Toggle label visibility with transition
function toggleLabels(show) {
    const labels = d3.select("#graphGroup").selectAll(".label text");
    labels.transition()
        .duration(400)
        .style("opacity", show ? 1 : 0);
}

window.addEventListener('DOMContentLoaded', function() {
    //document.getElementById('datasetSelect').value = 'journalist';
    // $('#labelsToggle').prop('checked', true);
}); 