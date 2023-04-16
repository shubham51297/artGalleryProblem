document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");
    let points = [];
    let complete = false;
    let triangulatedFeatures = null;
    let artGallaryPromblemRan = false;
    let vertexColorMap = new Map();
    let polygonVertex = null;
    const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
    const appendAlert = (message, type) => {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = [
          `<div class="alert alert-${type} alert-dismissible" role="alert">`,
          `   <div>${message}</div>`,
          '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
          '</div>'
        ].join('')
      
        alertPlaceholder.append(wrapper)
      }
    canvas.addEventListener("click", (e) => {
        if (complete) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const point = {
            x,
            y
        };

        if (points.length > 0) {
            const lastPoint = points[points.length - 1];
            if (!lineIntersectsPolygon(lastPoint, point, points, true)) {
                points.push(point);
                drawLine(lastPoint, point);
                drawPoint(point);
            } else{
                appendAlert('Line intersect with the polygon!', 'danger');
            }
        } else {
            points.push(point);
            drawPoint(point);
        }
    });

    document.getElementById("triangulate").addEventListener("click", () => {
        if (!complete) {
            // alert("Please complete the polygon first.");
            appendAlert('Please complete the polygon first!', 'danger');
            return;
        }

        const polygonCoordinates = points.map((point) => [point.x, point.y]);
        polygonCoordinates.push(polygonCoordinates[0]);
        const polygon = turf.polygon([polygonCoordinates]);
        const triangles = turf.tesselate(polygon);

        triangles.features.forEach((feature) => {
            const triangleCoords = feature.geometry.coordinates[0];
            const trianglePoints = triangleCoords
                .slice(0, 3)
                .map((coord) => ({
                    x: coord[0],
                    y: coord[1]
                }));
            drawTriangle(trianglePoints);
        });
        triangulatedFeatures = triangles.features;
    });

    function drawTriangle(triangle) {
        ctx.beginPath();
        ctx.moveTo(triangle[0].x, triangle[0].y);
        ctx.lineTo(triangle[1].x, triangle[1].y);
        ctx.lineTo(triangle[2].x, triangle[2].y);
        ctx.closePath();
        ctx.stroke();

    }

    document.getElementById("completePloy").addEventListener("click", () => {
        if (points.length < 3) {
            appendAlert('Please add at least 3 points to form a polygon!', 'danger');
            return;
        }
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        if (!lineIntersectsPolygon(firstPoint, lastPoint, points, false)) {
            drawLine(firstPoint, lastPoint);
            complete = true;
        } else {
            appendAlert('Cannot complete the polygon: the connecting line intersects with another line!', 'danger');
        }
    });


    document.getElementById('runAGP').addEventListener('click', () => {
        if (!triangulatedFeatures || triangulatedFeatures.length === 0) {
            appendAlert('Please triangulate the polygon first!', 'danger');
            return;
        }

        const triangulatedCoords = triangulatedFeatures.flatMap(
            feature => feature.geometry.coordinates[0].slice(0, 3)
        );

        const vertices = triangulatedCoords.map(coords => ({
            x: coords[0],
            y: coords[1]
        }));

        const coloredVertices = threeColorGraph(triangulatedFeatures);
        //redrawPolygon();
        vertices.forEach(vertex => {
            drawColoredPoint(vertex, coloredVertices);
        });

        artGallaryPromblemRan = true;
        vertexColorMap = coloredVertices;
        polygonVertex = vertices;
    });

    document.getElementById('gaurd').addEventListener('click', () => {
        if (!artGallaryPromblemRan) {
            appendAlert('Please run Art Gallary Algorithm!', 'danger');
            return;
        }

        let minkey = 0;
        const counts = new Map();

        for (let value of vertexColorMap.values()) {
            counts[value] = counts[value] ? counts[value] + 1 : 1;
          }

        const minValue = Math.min(...Object.values(counts));

        for (let [key,value] of Object.entries(counts)){
            if (minValue === value ){
                minkey = key;
                break;
            }
        }

        redrawPolygon();

        polygonVertex.forEach(vertex => {
            const currentColor = vertexColorMap.get(JSON.stringify([vertex.x, vertex.y]));
            if (currentColor == minkey){
                drawColoredPoint(vertex, vertexColorMap);
            }
            
        });
     
    });

    function redrawPolygon() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        for (let i = 0; i < points.length - 1; i++) {
            drawLine(points[i], points[i + 1]);
            drawPoint(points[i]);
        }
        drawLine(points[0], points[points.length - 1]);
        drawPoint(points[points.length - 1]);
    }
    
    
    function threeColorGraph(triangulatedFeatures) {
        const coloredVertices = new Map();

        function getDifferentColor(color1, color2) {
            const colors = [1, 2, 3];
            return colors.find(color => color !== color1 && color !== color2);
        }

        for (const feature of triangulatedFeatures) {
            const triangle = feature.geometry.coordinates[0].slice(0, 3);

            for (const [i, vertex] of triangle.entries()) {
                const vertexKey = JSON.stringify(vertex);

                if (!coloredVertices.has(vertexKey)) {
                    const neighbor1 = triangle[(i + 1) % 3];
                    const neighbor2 = triangle[(i + 2) % 3];
                    const color1 = coloredVertices.get(JSON.stringify(neighbor1));
                    const color2 = coloredVertices.get(JSON.stringify(neighbor2));

                    const vertexColor = getDifferentColor(color1, color2);

                    coloredVertices.set(vertexKey, vertexColor);

                }
            }
        }

        return coloredVertices;
    }

    function isTriangleAdjacent(triangle1, triangle2) {
        const sharedVertices = triangle1.filter(vertex1 =>
            triangle2.some(vertex2 => vertex1[0] === vertex2[0] && vertex1[1] === vertex2[1])
        );
        return sharedVertices.length === 2;
    }


    function drawPoint(point) {
        const radius = 2;
        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }

    function drawLine(p1, p2) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    function lineIntersectsPolygon(p1, p2, polygon, ignoreLast = false) {
        const numSegments = ignoreLast ? polygon.length - 2 : polygon.length - 1;

        for (let i = 0; i < numSegments; i++) {
            const a = polygon[i];
            const b = polygon[i + 1];

            if ((a === p1 && b === p2) || (a === p2 && b === p1)) continue;

            if (lineIntersectsLine(p1, p2, a, b)) {
                return true;
            }
        }
        return false;
    }

    function lineIntersectsLine(a, b, c, d) {
        const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);

        if (denominator === 0) return false;

        const numerator1 = (a.y - c.y) * (d.x - c.x) - (a.x - c.x) * (d.y - c.y);
        const numerator2 = (a.y - c.y) * (b.x - a.x) - (a.x - c.x) * (b.y - a.y);
        const r = numerator1 / denominator;
        const s = numerator2 / denominator;

        // Exclude the case when the lines are colinear and overlapping
        if (r === 0 || r === 1 || s === 0 || s === 1) return false;

        return r > 0 && r < 1 && s > 0 && s < 1;
    }

    function drawColoredPoint(point, coloredVertices) {

        const color = coloredVertices.get(JSON.stringify([point.x, point.y]));

        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);

        if (color === 1) {
            ctx.fillStyle = "red";
        } else if (color === 2) {
            ctx.fillStyle = "green";
        } else if (color === 3) {
            ctx.fillStyle = "blue";
        } else {
            ctx.fillStyle = "black";
        }

        ctx.fill();
    }

});