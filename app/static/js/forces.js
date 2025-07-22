function forceVerticalAlign (nodes, pos) {
    const spacing = gHeight / (nodes.length + 1);
    const targetX = gWidth * pos;

    return function (alpha) {
        let targetY = 0
        nodes.forEach(d => {
            targetY += spacing;
            d.vx += (targetX - d.x) * 1. * alpha;
            d.vy += (targetY - d.y) * 0.2 * alpha;
        });
    };
}

function forceOrbit(nodes) {
    let distance = 30;
    let repelStrength = 500;
    let maxRepel = 0.5;
    let externalForce = 0.5;

    // Group nodes by orbit
    const nodesByOrbit = new Map();
    nodes.forEach(n => {
        if (!nodesByOrbit.has(n.orbit)) {
            nodesByOrbit.set(n.orbit, []);
        }
        nodesByOrbit.get(n.orbit).push(n);
    });

    function force(alpha) {
        // Project nodes to their orbit and constrain velocity to tangent
        nodes.forEach(d => {
            const orbit_x = d.orbit.x;
            const orbit_y = d.orbit.y;
            const dx = d.x - orbit_x;
            const dy = d.y - orbit_y;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Project position to orbit
            d.x = orbit_x + (dx / len) * distance;
            d.y = orbit_y + (dy / len) * distance;
        
            // Project velocity to tangent of orbit
            // Tangent vector is (-dy, dx)
            /*const tx = -dy / len;
            const ty = dx / len;
            const vDotT = d.vx * tx + d.vy * ty;
            d.vx = vDotT * tx;
            d.vy = vDotT * ty;*/
            d.vx *= externalForce
            d.vy *= externalForce
        });

        // Repel nodes on the same orbit
        nodesByOrbit.forEach(group => {
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    const a = group[i];
                    const b = group[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distSq = dx * dx + dy * dy;
                    var strength = repelStrength * alpha / distSq;
                    if (strength > maxRepel)
                        strength = maxRepel;
                    a.vx -= dx * strength;
                    a.vy -= dy * strength;
                    b.vx += dx * strength;
                    b.vy += dy * strength;
                }
            }
        });
    }

    force.distance = function(val) {
        return arguments.length ? (distance = +val, force) : distance;
    };

    return force;
}

function forceTriangleAlign(nodes1, nodes2, nodes3) {
    const centerX = gWidth / 2;
    const topY = gHeight * 0.15;
    const leftX = gWidth * 0.2;
    const rightX = gWidth * 0.8;
    const bottomY = gHeight * 0.85;

    return function(alpha) {
        // Top (nodes1)
        const topSpacing = gWidth * 0.4 / (nodes1.length + 1);
        nodes1.forEach((d, i) => {
            const targetX = centerX - gWidth * 0.2 + topSpacing * (i + 1);
            const targetY = topY;
            d.vx += (targetX - d.x) * 0.5 * alpha;
            d.vy += (targetY - d.y) * 0.5 * alpha;
        });

        // Left bottom (nodes2)
        const leftSpacing = gHeight * 0.6 / (nodes2.length + 1);
        nodes2.forEach((d, i) => {
            const targetX = leftX;
            const targetY = gHeight * 0.35 + leftSpacing * (i + 1);
            d.vx += (targetX - d.x) * 0.5 * alpha;
            d.vy += (targetY - d.y) * 0.5 * alpha;
        });

        // Right bottom (nodes3)
        const rightSpacing = gHeight * 0.6 / (nodes3.length + 1);
        nodes3.forEach((d, i) => {
            const targetX = rightX;
            const targetY = gHeight * 0.35 + rightSpacing * (i + 1);
            d.vx += (targetX - d.x) * 0.5 * alpha;
            d.vy += (targetY - d.y) * 0.5 * alpha;
        });
    };
}


// Blend two colors by a factor [0,1]
function blendColors(fg, bg, factor) {
    const f = d3.color(fg), b = d3.color(bg);
    if (!f || !b) return fg;
    const r = Math.round(f.r * factor + b.r * (1 - factor));
    const g = Math.round(f.g * factor + b.g * (1 - factor));
    const bval = Math.round(f.b * factor + b.b * (1 - factor));
    return `rgb(${r},${g},${bval})`;
}