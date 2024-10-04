function levelCurve(ps, fs, vals, level) {
    if (fs[0].length !== 3) throw new Error("fs must have 3 columns");

    const law = [
        [[2, 0], [2, 1]],
        [[1, 2], [1, 0]],
        [[0, 2], [0, 1]],
        [[0, 1], [0, 2]],
        [[1, 0], [1, 2]],
        [[2, 1], [2, 0]]
    ];

    let cnt = 0;
    let es = []; // Store edges as pairs of Vector3 objects

    for (let i = 0; i < fs.length; i++) {
        const fvs = fs[i]; // Face vertices
        const valsFvs = fvs.map(v => vals[v] > level);

        const ss = valsFvs[2] * 1 + valsFvs[1] * 2 + valsFvs[0] * 4;

        if (ss > 0 && ss < 7) {  // Intersection occurs
            const [ea, eb] = law[ss - 1];
            const [a1, a2] = [fvs[ea[0]], fvs[ea[1]]];
            const [b1, b2] = [fvs[eb[0]], fvs[eb[1]]];

            const [valA1, valA2] = [vals[a1], vals[a2]];
            const [valB1, valB2] = [vals[b1], vals[b2]];

            const la = (level - valA1) / (valA2 - valA1);
            const lb = (level - valB1) / (valB2 - valB1);

            // Interpolate between points a1, a2 and b1, b2
            const pa = ps[a1].clone().lerp(ps[a2], la);  // THREE.Vector3 lerp function
            const pb = ps[b1].clone().lerp(ps[b2], lb);  // THREE.Vector3 lerp function
            es.push([pa, pb]);  // Store the pair of points (pa, pb)
            cnt++;
        }
    }
    return es; // Return the array of edge pairs
}


function getPlaneDataFromPoints(points,  sign = 1) {
    if (points.length === 3) {
        let p1 = points[0];
        let p2 = points[1];
        let p3 = points[2];
        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const v2 = new THREE.Vector3().subVectors(p3, p1);
        const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
        if (sign < 0) normal.negate();
        return {point: p1, normal: normal};
    }
    if (points.length === 2) {
        let p1 = points[0];
        let p2 = points[1];
        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const normal = v1.clone().normalize();
        if (sign < 0) normal.negate();
        return {point: p1, normal: normal};
    }
}

function getPlaneDataFromAxisAndDirection(axisCenter, axisDirection, planeDirection, sign = 1) {
    const d = axisDirection.clone().cross(planeDirection).normalize();
    const normal = d.clone().cross(axisDirection).normalize();
    if (sign < 0) normal.negate();
    return {point: axisCenter, normal: normal};
}

function getPlaneDataFromAxisAndDirectionPoint(axisCenter, axisDirection, point, sign = 1) {
    const pointDirection = new THREE.Vector3().subVectors(point, axisCenter).normalize();
    return getPlaneDataFromAxisAndDirection(axisCenter, axisDirection, pointDirection, sign);
}

function getPlaneDataFromAxisAndPointInPlane(axisCenter, axisDirection, point,sign = 1) {
    const d = new THREE.Vector3().subVectors(point, axisCenter).normalize();
    const normal = axisDirection.cross(d).normalize();
    if (sign < 0) normal.negate();
    return {point: axisCenter, normal: normal};

}

function distanceToPlane(p, planeData, offset = 0) {
    const {point, normal} = planeData;
    return normal.dot(p) - normal.dot(point) - offset;
}

///////////////////////////

class CurveOrganizer {
    constructor(segments) {
        // Segments should be an array of arrays where each element is an array of two THREE.Vector3 objects.
        this.segments = segments;
        this.connectivity = new Map();
        this.visited = new Set();
        this.endpoints = [];
    }

    // Utility function to convert a THREE.Vector3 to a string (to use as a key)
    pointKey(p) {
        return `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
    }

    // Step 1: Build connectivity map using string keys
    buildConnectivityMap() {
        this.segments.forEach(([p1, p2]) => {
            const key1 = this.pointKey(p1);
            const key2 = this.pointKey(p2);

            if (!this.connectivity.has(key1)) this.connectivity.set(key1, []);
            if (!this.connectivity.has(key2)) this.connectivity.set(key2, []);

            this.connectivity.get(key1).push(p2);
            this.connectivity.get(key2).push(p1);
        });
    }

    // Step 2: Find endpoints (for open curves, endpoints will have only one neighbor)
    findEndpoints() {
        this.connectivity.forEach((neighbors, pointKey) => {
            if (neighbors.length === 1) {
                this.endpoints.push(pointKey);
            }
        });
    }

    // Step 3: Traverse a single curve component
    traverseCurve(startPoint) {
        let orderedPoints = [];
        let currentPoint = startPoint;
        let previousPoint = null;

        while (currentPoint && !this.visited.has(currentPoint)) {
            const currentKey = this.pointKey(currentPoint);
            orderedPoints.push(currentPoint);
            this.visited.add(currentKey); // Mark this point as visited

            let neighbors = this.connectivity.get(currentKey);

            // If previousPoint is null (i.e., first iteration), we take the first neighbor
            let nextPoint = neighbors.filter((p) => previousPoint === null || (!this.visited.has(this.pointKey(p))));

            if (nextPoint.length === 0) {
                break;
            }

            previousPoint = currentPoint;
            currentPoint = nextPoint[0]; // Move to the next point
        }

        return orderedPoints;
    }

    // Step 4: Organize multiple connected components
    organizeCurve() {
        this.buildConnectivityMap();
        this.findEndpoints();

        let orderedComponents = [];

        // Traverse each connected component
        this.connectivity.forEach((_, pointKey) => {
            if (!this.visited.has(pointKey)) {
                let startPoint = this.connectivity.get(pointKey)[0];

                // Find an endpoint to start if possible (for open curves), otherwise start with any point
                let endpointKey = this.endpoints.find(pKey => !this.visited.has(pKey));
                if (endpointKey) {
                    startPoint = this.connectivity.get(endpointKey)[0];
                }

                let orderedVertices = this.traverseCurve(startPoint);
                if (orderedVertices.length > 0) {
                    orderedComponents.push(orderedVertices);
                }
            }
        });

        return orderedComponents;
    }
}

function blendFunction(fs, ops){

    function fOut(p)
    {
        let value = 1.0;
        fs.forEach((f, idx) => {
            const fp = f(p);
            let sfp = sigmoid(fp, currentK);
            if(idx === 0)
            {
                value = sfp;
            }
            else if(ops[idx-1] === '*')
            {
                value *= sfp;
            }
            else if(ops[idx-1] === '-')
            {
                value *= (1-sfp);
            }
            else if(ops[idx-1] === '+')
            {
                value += (1-value)*sfp;
            }
        });
        return value;
    }
    return fOut;
}

function evaluateFunction(f, ps, callBack = null) {
    let values = [];
    ps.forEach((p,idx) => {
        const value = f(idx);
        if(callBack){
            callBack(idx, value);
        }
        values.push(value);
    });
    return values;
}

function functionFromPlaneData(planeData, offset) {
    return function (p) {
        return distanceToPlane(p, planeData, offset);
    }
}

//
// Spline interpolation (cubic)
//
function cubicSpline(x, y) {
    let n = x.length - 1;
    let h = Array(n).fill(0).map((_, i) => x[i+1] - x[i]);

    // Initialize matrix A, vector b, and the second derivatives M
    let A = Array(n+1).fill(0).map(() => Array(n+1).fill(0));
    let b = Array(n+1).fill(0);
    let M = Array(n+1).fill(0);

    for (let i = 1; i < n; i++) {
        A[i][i-1] = h[i-1];
        A[i][i] = 2 * (h[i-1] + h[i]);
        A[i][i+1] = h[i];
        b[i] = 6 * ((y[i+1] - y[i]) / h[i] - (y[i] - y[i-1]) / h[i-1]);
    }

    // Natural spline boundary conditions
    A[0][0] = 1;
    A[n][n] = 1;

    // Solve the system of linear equations A * M = b
    M = math.lusolve(A, b).map(val => val[0]);

    // Now compute the cubic spline coefficients
    let splineCoeffs = [];
    for (let i = 0; i < n; i++) {
        let a = y[i];
        let b = (y[i+1] - y[i]) / h[i] - (h[i] * (M[i+1] + 2 * M[i])) / 6;
        let c = M[i] / 2;
        let d = (M[i+1] - M[i]) / (6 * h[i]);

        splineCoeffs.push({ a, b, c, d, x0: x[i] });
    }
    return splineCoeffs;
}

// Evaluate the spline
function evaluateSplineOld(spline, xVal) {
  let coeff;
  for (let i = 0; i < spline.length; i++) {
    if (xVal >= spline[i].x0 && xVal <= spline[i].x0 + 1) {
      coeff = spline[i];
      break;
    }
  }
  let dx = xVal - coeff.x0;
  return coeff.a + coeff.b * dx + coeff.c * dx * dx + coeff.d * dx * dx * dx;
}

function evaluateSpline(spline, xVal) {
    let coeff;

    // Handle left-side extrapolation: Use the first spline segment
    if (xVal < spline[0].x0) {
        coeff = spline[0];
    }
    // Handle right-side extrapolation: Use the last spline segment
    else if (xVal > spline[spline.length - 1].x0) {
        coeff = spline[spline.length - 1];
    }
    // Standard interpolation within bounds
    else {
        for (let i = 0; i < spline.length; i++) {
            // Find the correct segment
            if (xVal >= spline[i].x0 && xVal <= (spline[i + 1]?.x0 || Infinity)) {
                coeff = spline[i];
                break;
            }
        }
    }

    // Perform interpolation or extrapolation using the chosen segment
    let dx = xVal - coeff.x0;
    return coeff.a + coeff.b * dx + coeff.c * dx * dx + coeff.d * dx * dx * dx;
}











