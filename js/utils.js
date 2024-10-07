function loadMesh(file, scene, name, onLoadCallback = undefined) {
    const loader = new THREE.PLYLoader();
    console.log("Loading mesh from file", file);
    loader.load(file, function (geometry) {
        if (geometry.attributes.color === undefined) {
            geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.array.length), 3));
            for (let i = 0; i < geometry.attributes.color.array.length; i += 3) {
                geometry.attributes.color.array[i] = 0.5;
                geometry.attributes.color.array[i + 1] = .5;
                geometry.attributes.color.array[i + 2] = .5;
            }
        }
        // Compute eigenvectors of covariance matrix of geometry positions
        const positions = geometry.attributes.position.array;
        const numPoints = positions.length / 3;
        
        // Calculate mean position
        const mean = [0, 0, 0];
        for (let i = 0; i < positions.length; i += 3) {
            mean[0] += positions[i];
            mean[1] += positions[i + 1];
            mean[2] += positions[i + 2];
        }
        mean[0] /= numPoints;
        mean[1] /= numPoints;
        mean[2] /= numPoints;
    

        // Calculate covariance matrix
        let covariance = math.zeros(3, 3);
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i] - mean[0];
            const y = positions[i + 1] - mean[1];
            const z = positions[i + 2] - mean[2];
            covariance = math.add(covariance, math.matrix([
                [x * x, x * y, x * z],
                [x * y, y * y, y * z],
                [x * z, y * z, z * z]
            ]));
        }
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                covariance.set([i, j], covariance.get([i, j]) / (numPoints - 1));
            }
        }

        // Compute eigenvectors
        const { eigenvectors } = math.eigs(covariance);
        let e0 = eigenvectors[1].vector;
        let e1 = eigenvectors[2].vector;
        let e2 = eigenvectors[0].vector;

        
        console.log("Eigenvectorss:", e0, e1, e2);

        
        const transformMatrix = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(e0._data[0], e0._data[1], e0._data[2]),
            new THREE.Vector3(e1._data[0], e1._data[1], e1._data[2]),
            new THREE.Vector3(e2._data[0], e2._data[1], e2._data[2])
        );
        // Transpose the matrix
        transformMatrix.transpose();
        console.log("Transform matrix:", transformMatrix);

        // Apply transformation to positions
        
        for (let i = 0; i < positions.length; i += 3) {
            const point = new THREE.Vector3(
                positions[i] - mean[0],
                positions[i + 1] - mean[1],
                positions[i + 2] - mean[2]
            );
            point.applyMatrix4(transformMatrix);

            positions[i] = point.x;
            positions[i + 1] = point.y;
            positions[i + 2] = point.z;
        }

        // Update the geometry
        geometry.attributes.position.needsUpdate = true;

        console.log("Eigenvectors:", eigenvectors);
        
        //geometry.center();
        let scale = 1000;
        geometry.scale(scale, scale, scale);
        geometry.computeVertexNormals();
        let mesh = new THREE.Mesh(geometry, mainMaterial);
        mesh.name = modelName;
        scene.add(mesh);
        if (onLoadCallback !== undefined) {
            setTimeout(onLoadCallback)
        }
    });
}

function deepCopyMesh(originalMesh) {
    const clonedGeometry = originalMesh.geometry.clone();
    for (let attributeName in originalMesh.geometry.attributes) {
        clonedGeometry.attributes[attributeName] = originalMesh.geometry.attributes[attributeName].clone();
    }
    if (originalMesh.geometry.index) {
        clonedGeometry.setIndex(originalMesh.geometry.index.clone());
    }
    let clonedMaterial;
    if (Array.isArray(originalMesh.material)) {
        clonedMaterial = originalMesh.material.map(mat => mat.clone());
    } else {
        clonedMaterial = originalMesh.material.clone();
    }
    const clonedMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
    originalMesh.children.forEach(child => {
        clonedMesh.add(deepCopyMesh(child)); // Recursively deep copy children
    });
    return clonedMesh;
}

function getDimensions(element) {
    let rect = element.getBoundingClientRect();
    let width = rect.right - rect.left;
    let height = rect.bottom - rect.top;
    return {width, height};
}

function getOverlay(canvas3d) {
    let overlay = document.getElementById("overlay");
    let {width, height} = getDimensions(canvas3d);
    overlay.width = width;
    overlay.height = height;
    overlay.style.top = canvas3d.offsetTop + "px";
    overlay.style.left = canvas3d.offsetLeft + "px";
    overlay.style.pointerEvents = "none";
    return overlay;
}

function addLights(scene) {
    // Create directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, -1); // Adjust the light's position as needed
    scene.add(directionalLight);

    // add another light
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-1, 1, 1); // Adjust the light's position as needed
    scene.add(directionalLight2);

    // Add an ambient light to illuminate the scene
    const ambientLight = new THREE.AmbientLight(0x999999); // Soft white light
    scene.add(ambientLight);
}


function createLine(x, y, z, dx, dy, dz, color, scale = 2000) {
    let lineDirection = new THREE.Vector3(scale * dx, scale * dy, scale * dz);
    let lineCenter = new THREE.Vector3(x, y, z);
    const material = new THREE.LineBasicMaterial({color: color});
    const points = [];
    points.push(lineCenter.clone().sub(lineDirection));
    points.push(lineCenter.clone().add(lineDirection));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    let line = new THREE.Line(geometry, material);
    line.visible = false;
    return line;
}

function getPointsCount(obj3d) {
    return obj3d.geometry.attributes.position.count;
}


// JSON stuff

function geometryToJSON(geometry) {
    let jsonOut = {};
    let attributes = geometry.attributes;
    if (attributes.position) {
        let positions = attributes.position.array;
        let x = [];
        let y = [];
        let z = [];
        for (let n = 0; n < positions.length; n += 3) {
            x.push(positions[n]);
            y.push(positions[n + 1]);
            z.push(positions[n + 2]);
        }
        jsonOut['x'] = x;
        jsonOut['y'] = y;
        jsonOut['z'] = z;
    }
    if (attributes.normal) {
        let normals = attributes.normal.array;
        let nx = [];
        let ny = [];
        let nz = [];
        for (let n = 0; n < normals.length; n += 3) {
            nx.push(normals[n]);
            ny.push(normals[n + 1]);
            nz.push(normals[n + 2]);
        }
        jsonOut['nx'] = nx;
        jsonOut['ny'] = ny;
        jsonOut['nz'] = nz;
    }
    if (attributes.color) {
        let colors = attributes.color.array;
        let r = [];
        let g = [];
        let b = [];
        for (let n = 0; n < colors.length; n += 3) {
            r.push(colors[n]);
            g.push(colors[n + 1]);
            b.push(colors[n + 2]);
        }
        jsonOut['r'] = r;
        jsonOut['g'] = g;
        jsonOut['b'] = b;
    }
    if (geometry.index) {
        let indices = geometry.index.array;
        let i = [];
        let j = [];
        let k = [];
        for (let n = 0; n < indices.length; n += 3) {
            i.push(indices[n]);
            j.push(indices[n + 1]);
            k.push(indices[n + 2]);
        }
        jsonOut['i'] = i;
        jsonOut['j'] = j;
        jsonOut['k'] = k;
    }
    return jsonOut;
}

function jsonToGeometry(json) {
    let keys = Object.keys(json);
    if (keys.length === 0) {
        return null;
    }
    let geometry = new THREE.BufferGeometry();
    // check if keys have x
    if (keys.includes('x')) {
        // set geometry positions
        let x = json['x'];
        let y = json['y'];
        let z = json['z'];
        let positions = [];
        for (let n = 0; n < x.length; n++) {
            positions.push(x[n]);
            positions.push(y[n]);
            positions.push(z[n]);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    }
    if (keys.includes('nx')) {
        let nx = json['nx'];
        let ny = json['ny'];
        let nz = json['nz'];
        let normals = [];
        for (let n = 0; n < nx.length; n++) {
            normals.push(nx[n]);
            normals.push(ny[n]);
            normals.push(nz[n]);
        }
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    if (keys.includes('r')) {
        let r = json['r'];
        let g = json['g'];
        let b = json['b'];
        let colors = [];
        for (let n = 0; n < r.length; n++) {
            colors.push(r[n]);
            colors.push(g[n]);
            colors.push(b[n]);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }

    if (keys.includes('i')) {
        let indices = [];
        for (let n = 0; n < json['i'].length; n++) {
            indices.push(json['i'][n]);
            indices.push(json['j'][n]);
            indices.push(json['k'][n]);
        }
        geometry.setIndex(indices);
    }
    return geometry;
}

function getSpherePoint(radius, color) {
    let sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    let sphereMaterial = new THREE.MeshBasicMaterial({color: color});
    let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.visible = false;
    return sphere;
}

function addCoordinatePlanes(scene, boundingBox, opacity = 0.1) {
    let geometry = new THREE.PlaneGeometry(boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y);
    let material = new THREE.MeshBasicMaterial({color: 0x0000ff, side: THREE.DoubleSide});
    material.transparent = true;
    material.opacity = opacity;
    let plane = new THREE.Mesh(geometry, material);
    plane.position.z = boundingBox.min.z;
    plane.name = 'planeXY';
    plane.visible = true;
    scene.add(plane);

    geometry = new THREE.PlaneGeometry(boundingBox.max.x - boundingBox.min.x, boundingBox.max.z - boundingBox.min.z);
    material = new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide});
    material.transparent = true;
    material.opacity = opacity;
    plane = new THREE.Mesh(geometry, material);
    plane.position.y = boundingBox.min.y;
    plane.rotation.x = Math.PI / 2;
    plane.name = 'planeXZ';
    plane.visible = true;
    scene.add(plane);

    geometry = new THREE.PlaneGeometry(boundingBox.max.z - boundingBox.min.z, boundingBox.max.y - boundingBox.min.y);
    material = new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide});
    material.transparent = true;
    material.opacity = opacity;
    plane = new THREE.Mesh(geometry, material);
    plane.position.x = boundingBox.min.x;
    plane.rotation.y = Math.PI / 2;
    plane.name = 'planeYZ';
    plane.visible = true;
    scene.add(plane);
}

function camerasToXYZ(cameras) {
    const dst = 500 / Math.sqrt(3);
    cameras.forEach(camera => {
        camera.position.set(dst, dst, dst);
    })
}

function camerasToXY(cameras) {
    cameras.forEach(camera => {
        camera.position.set(0, 0, 500);
    })
}

function camerasToXZ(cameras) {
    cameras.forEach(camera => {
        camera.position.set(0, 500, 0);
    })
}

function camerasToYZ(cameras) {
    cameras.forEach(camera => {
        camera.position.set(500, 0, 0);
    })
}

function reflectCameras(cameras) {
    cameras.forEach(camera => {
        camera.position.set(-camera.position.x, -camera.position.y, -camera.position.z);
    })
}

function flipUpCameras(cameras, angle) {
    cameras.forEach(camera => {
        camera.up.set(0, -camera.up.y, 0);
    })
}

function setColor(model, i, r, g, b) {
    model.geometry.attributes.color.setX(i, r);
    model.geometry.attributes.color.setY(i, g);
    model.geometry.attributes.color.setZ(i, b);
}

function getColor(model, i) {
    return {
        r: model.geometry.attributes.color.getX(i),
        g: model.geometry.attributes.color.getY(i),
        b: model.geometry.attributes.color.getZ(i)
    };
}

function updateCylinderGeometry(cylinder, p1, p2, radius = 2) {
    let direction = new THREE.Vector3().subVectors(p2, p1);
    let length = direction.length();
    const orientation = new THREE.Vector3(0, 1, 0).normalize();
    direction.normalize();
    cylinder.geometry = new THREE.CylinderGeometry(radius, radius, .99 * length, 32);
    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    cylinder.position.x = midpoint.x;
    cylinder.position.y = midpoint.y;
    cylinder.position.z = midpoint.z;
    cylinder.quaternion.setFromUnitVectors(orientation, direction);
}

function drawTextWithNewlines(context, text, x, y, lineHeight = 26) {
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        context.fillText(line, x, y + index * lineHeight);
    });
}


function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const canvas3d = document.getElementById('canvas3d');
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
    canvas3d.appendChild(renderer.domElement);
    const rayCaster = new THREE.Raycaster();
    let d = 300
    const dst = d / Math.sqrt(3);
    let aspect = canvas3d.clientWidth / canvas3d.clientHeight;
    let cameraOrthographic = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    const cameraPerspective = new THREE.PerspectiveCamera(75, canvas3d.clientWidth / canvas3d.clientHeight, 0.1, 2500);
    cameraPerspective.position.set(dst, dst, dst);
    cameraOrthographic.position.set(dst, dst, dst);
    const controls = new THREE.OrbitControls(cameraPerspective, renderer.domElement);
    addLights(scene);

    window.addEventListener('resize', () => {
        renderer.setSize(canvas3d.clientWidth, canvas3d.clientHeight);
        let aspect = canvas3d.clientWidth / canvas3d.clientHeight;
        cameraPerspective.aspect = aspect;
        cameraPerspective.updateProjectionMatrix();
        cameraOrthographic.left = -dst * aspect;
        cameraOrthographic.right = dst * aspect;
        cameraOrthographic.top = dst;
        cameraOrthographic.bottom = -dst;
        cameraOrthographic.updateProjectionMatrix();
    });
    return {
        scene: scene,
        renderer: renderer,
        rayCaster: rayCaster,
        cameraPerspective: cameraPerspective,
        cameraOrthographic: cameraOrthographic,
        controls: controls
    };
}


// Now create the function that will create a curve from a collection of points (joining them with line segments)
function createCurve(points, color = 0x00ff00) {
    const material = new THREE.LineBasicMaterial({color: color});
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, material);
}

function getMeshData(model) {
    let ps = [];
    let fs = [];
    let cs = [];
    let ns = [];
    if (model) {
        let geometry = model.geometry;
        let vertices = geometry.attributes.position.array;
        let faces = geometry.index.array;
        let colors = geometry.attributes.color.array;
        let normals = geometry.attributes.normal.array;
        for (let i = 0; i < vertices.length; i += 3) {
            ps.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
        }
        for (let i = 0; i < faces.length; i += 3) {
            fs.push([faces[i], faces[i + 1], faces[i + 2]]);
        }
        for (let i = 0; i < colors.length; i += 3) {
            cs.push(new THREE.Color(colors[i], colors[i + 1], colors[i + 2]));
        }
        for (let i = 0; i < normals.length; i += 3) {
            ns.push(new THREE.Vector3(normals[i], normals[i + 1], normals[i + 2]));
        }
    }
    return {points: ps, faces: fs, colors: cs, normals: ns};
}

function addCurvesToScene(curves, scene, curvesCol = curves3D) {
    curves.forEach((curve, index) => {
        let curveGeometry = new THREE.BufferGeometry().setFromPoints(curve);
        let curveMaterial = new THREE.LineBasicMaterial({
            color: getPaletteColor(index),
            linewidth: 3
        });
        let curveObject = new THREE.Line(curveGeometry, curveMaterial);
        scene.add(curveObject);
        curvesCol.push(curveObject);
    });
}

function setModelColorFromSelection(model, modelSelectionFlags, originalModelColors) {
    let color = new THREE.Color();
    let colorArray = [];
    for (let i = 0; i < modelSelectionFlags.length; i++) {
        let c = originalModelColors[i];
        if (modelSelectionFlags[i]) {
            let lmd = 0.75;
            let r = c.r;
            let g = c.g + lmd * (1 - c.g);
            let b = c.b;
            color.setRGB(r, g, b);
            colorArray.push(color.r, color.g, color.b);
        } else {

            color.setRGB(c.r, c.g, c.b);
            colorArray.push(color.r, color.g, color.b);
        }
    }
    model.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    model.geometry.attributes.color.needsUpdate = true;
}

function findClosestCurve(point, curves) {
    let closestCurve = null;
    let closestDistance = Number.MAX_VALUE;
    for (let i = 0; i < curves.length; i++) {
        let curve = curves[i];
        let distance = Number.MAX_VALUE;
        for (let j = 0; j < curve.length; j++) {
            let p = curve[j];
            let d = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2) + Math.pow(p.z - point.z, 2));
            if (d < distance) {
                distance = d;
            }
        }
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCurve = curve;
        }
    }
    return closestCurve;
}

function getPlaneLevelCurves(points) {
    let f = getPlaneDataFromPoints(points);
    let vals = [];
    let model = scene.getObjectByName(modelName);
    let {points: ps, faces: fs} = getMeshData(model);
    if (model) {
        for (let i = 0; i < ps.length; i++) {
            let val = f(ps[i]);
            vals.push(val);
        }
    }
    let edges = levelCurve(ps, fs, vals, 0);
    let curveOrganizer = new CurveOrganizer(edges);
    return {curves: curveOrganizer.organizeCurve(), levelFunction: f}
}










