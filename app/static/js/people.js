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
            })
        
    people.append("text")
        .attr("x", 0)
        .attr("y", size)
        .text(d => d.name)
    
    people.append("g").each(function(d, i) {
        // Updated path to use Flask's static file structure
        const svgUrl = `/static/svg/p${i}.svg`;
        d3.xml(svgUrl).then(data => {
            const importedNode = document.importNode(data.documentElement, true);
            importedNode.setAttribute("width", `${size}`);
            importedNode.setAttribute("height", `${size}`);
            d3.select(this)
                .attr("transform", `translate(${-size / 2}, ${-size / 2})`)
                .append(() => importedNode.cloneNode(true));
        }).catch(error => {
            console.warn(`Could not load SVG ${svgUrl}:`, error);
            // Add a fallback circle if SVG loading fails
            d3.select(this)
                .attr("transform", `translate(${-size / 2}, ${-size / 2})`)
                .append("circle")
                .attr("cx", size/2)
                .attr("cy", size/2)
                .attr("r", size/3)
                .attr("fill", d.type === "girl" ? "#ff69b4" : "#4169e1")
                .attr("opacity", 0.7);
        });
    });
}


createPeople() 