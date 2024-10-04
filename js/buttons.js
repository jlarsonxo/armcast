document.getElementById('buttonXY').addEventListener('click', () => {
    camerasToXY(cameras);
});
document.getElementById('buttonXZ').addEventListener('click', () => {
    camerasToXZ(cameras);
});
document.getElementById('buttonYZ').addEventListener('click', () => {
    camerasToYZ(cameras);
});

document.getElementById('buttonXYZ').addEventListener('click', () => {
    camerasToXYZ(cameras);
});
document.getElementById('buttonReflect').addEventListener('click', () => {
    reflectCameras(cameras);
});
document.getElementById('buttonFlip').addEventListener('click', () => {
    flipUpCameras(cameras);
});

document.getElementById('buttonPerspective').addEventListener('click', () => {
    activeCamera = cameraPerspective;
    controls.object = activeCamera;
    controls.update();
});
document.getElementById('buttonOrthographic').addEventListener('click', () => {
    activeCamera = cameraOrthographic;
    controls.object = activeCamera;
    controls.update();
});

let opacitySlider = document.getElementById('opacity');
mainMaterial.opacity = opacitySlider.value;
opacitySlider.addEventListener('input', function () {
    model = scene.getObjectByName(modelName);
    if (model) {
        mainMaterial.opacity = opacitySlider.value;
    }
});

document.getElementById('smooth').addEventListener('click', () => {
    model = scene.getObjectByName(modelName);
    if (model) {
        model.material = mainMaterial;
        mainMaterial.wireframe = false;
    }
});

document.getElementById('wireframe').addEventListener('click', () => {
    model = scene.getObjectByName(modelName);
    if (model) {
        mainMaterial.wireframe = true;
        model.material = mainMaterial;
    }
});
document.getElementById('xray').addEventListener('click', () => {
    model = scene.getObjectByName(modelName);
    if (model) {
        model.material = xrayMaterial;
    }
});


document.getElementById('uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    model = scene.getObjectByName(modelName);
    if (model) {
        scene.remove(model);
        scene.remove(scene.getObjectByName('BoundingBox'));
        modelLoaded = false;
        modelSentToServer = false;
    }
    if (file && file.name.endsWith('.ply')) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const content = event.target.result;
            const loader = new THREE.PLYLoader();
            const geometry = loader.parse(content);
            if (geometry.attributes.color === undefined) {
                geometry.attributes.color = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.array.length), 3);
                for (let i = 0; i < geometry.attributes.color.array.length; i += 3) {
                    geometry.attributes.color.array[i] = 0.5;
                    geometry.attributes.color.array[i + 1] = .5;
                    geometry.attributes.color.array[i + 2] = .5;
                }
            }
            geometry.center();
            let scale = 1000;
            geometry.scale(scale, scale, scale);
            geometry.computeVertexNormals();
            let mesh = new THREE.Mesh(geometry, mainMaterial);
            modelName = file.name.split('.').slice(0, -1).join('.');
            mesh.name = modelName;
            scene.add(mesh);
        };
        reader.readAsArrayBuffer(file); // Read the file as an array buffer
    } else {
        console.error('Please select a valid PLY file');
    }
});


function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], {type: 'application/octet-stream'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

document.getElementById("exportPLY").addEventListener('click', function () {
    model = scene.getObjectByName(modelName);
    if (model) {
        const exporter = new THREE.PLYExporter();
        model.geometry.computeVertexNormals();
        exporter.parse(model, (result) => {
            saveArrayBuffer(result, modelName + 'Exported.ply');
        }, {binary: true});
    }
});



function updateRegionFromFunction(ps, fs, values, level = 0.5) {
    for(let i = 0; i < modelSelectionFlags.length; i++)
    {
        modelSelectionFlags[i] = (values[i] >= level);
    }
    let edges = levelCurve(ps, fs, values, level);
    let curveOrganizer = new CurveOrganizer(edges);
    let curves = curveOrganizer.organizeCurve();
    curves3D.forEach(c => scene.remove(c));
    addCurvesToScene(curves, scene);
    setModelColorFromSelection(model, modelSelectionFlags, originalModelColors);
}


function setSelectionFunctionToUlnar()
{
    console.log('Creating ulnar model');
    console.log('9 points needed');
    console.log('points selected', pointsSelected.length);
    // get pointsSelected x and y values
    let xs = pointsSelected.map(p => p.position.x);
    let ys = pointsSelected.map(p => p.position.y);
    let spline = cubicSpline(ys,xs);
    console.log('spline', spline);

    /*
    let planes = [];
    let ops = '';
    for(let i = 0; i < pointsSelected.length-1; i++)
    {
        let splitPlane = getPlaneDataFromAxisAndPointInPlane(
            pointsSelected[i].position,
            pointsSelected[i].normal,
            pointsSelected[i+1].position
        )
        planes.push(splitPlane);
    }
    for(let i = 0; i < planes.length-1; i++)
    {
        let pl = planes[i];
        let plNext = planes[i+1];
        let n = pl.normal;
        let nNext = plNext.normal;
        let cross = n.clone().cross(nNext);
        if(cross.dot(up) > 0)
        {
            ops += '+';
        }
        else
        {
            ops += '*';
        }
    }
    console.log('ops', ops);
    let fs = planes.map(p => functionFromPlaneData(p, 0));
    let bf = blendFunction(fs, ops);
    selectionFunction = function(idx){
        return 1-bf(ps[idx])//*(1-sigmoid(splitHandVals[idx],currentK));
    }

     */
    selectionFunction = function(idx){
        let p = ps[idx];
        let y = p.y;
        let x = p.x;//evaluateSpline(spline, y);
        x = evaluateSpline(spline, y);
        return sigmoid(x-.025*y*y,currentK)//*(1-sigmoid(splitHandVals[idx],currentK));
    }
}

/*
document.getElementById("preview").addEventListener('click', function () {
    model = scene.getObjectByName(modelName);
    if (model) {
        let {points: ps, faces: fs, colors: cs, normals: ns} = getMeshData(model);
        if (modelSelectionFlags === null) {
            modelSelectionFlags = Array(ps.length).fill(true);
            originalModelColors = cs;
        }
        if(armCastSelection === ARM_CAST_TYPES.ULNAR_GUTTER)
        {
            setSelectionFunctionToUlnar();
            let values = evaluateFunction(selectionFunction, ps);
            updateRegionFromFunction(ps, fs, values);
        }
    }
});
});

 */
document.getElementById("createModel").addEventListener('click', function () {
    model = scene.getObjectByName(modelName);
    if (model) {
        console.log("Creating model");
        processModel();
    }
});

/*
document.getElementById("smoothingSlider").addEventListener('input', function () {
    model = scene.getObjectByName(modelName);
    if(model)
    {
        let {points: ps, faces: fs, colors: cs} = getMeshData(model);
        currentK = this.value;
        let values = evaluateFunction(selectionFunction, ps);
        updateRegionFromFunction(ps, fs, values)
    }
});

 */

/*
const contextMenu = document.getElementById('contextMenu');
let regions = {};
let ul = document.getElementById("menuContent")
const items = ul.getElementsByTagName('li');
for (let i = 0; i < items.length; i++) {
    regions[items[i].id] = [];
    items[i].addEventListener('click', function () {
        pointsSelected.forEach(p => {
            regions[this.id].push(p);
        });
        this.style.color = 'green';
        let points = regions[this.id];
        let object = new THREE.Object3D();
        object.name = this.id;
        points.forEach((p, idx) => {
            let p3d = getSpherePoint(cursorRadius, selectedColor);
            p3d.name = "point" + idx;
            p3d.visible = true;
            p3d.position.copy(p.position);
            p3d.normal = p.normal.clone();
            object.add(p3d);
        });
        let pointsJ = {};
        points.map((p, id) => {
            pointsJ["p" + id] = {x: p.position.x, y: p.position.y, z: p.position.z};
        });
        scene.add(object);
        pointsSelected = [];
        cursorPoint.visible = false;

    });

}
*/
document.getElementById('armCastType').addEventListener('change', function () {
    let armCastType = this.value;
    armCastSelection = parseInt(armCastType);
    let bImage = document.getElementById('bImage');
    let pImage = document.getElementById('pImage');
    // change src attribute of image
    console.log('type', armCastType);
    bImage.src = 'images/b' + armCastType + '.png';
    pImage.src = 'images/p' + armCastType + '.png'
});