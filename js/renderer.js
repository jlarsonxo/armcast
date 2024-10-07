let model = null;
let ps = null;
let cs = null;
let ns = null;
let fs = null;
let modelLoaded = false;
let modelSentToServer = false;
let selectableObjects = null;
let modelName = 'default';
let pointsSelected = [];
let currentK = kDefault;
let modelSelectionFlags = null;
let originalModelColors = null;
let selectionFunction = null;
let curves3D = [];

let splitHandCurves = null;
let splitHandCurves3D = [];
let splitHandVals = [];
let currentOffset = 1.0;
let currentThickness = 2.0;
let up = new THREE.Vector3(0, 0, 1);

const ARM_CAST_TYPES = {
    ULNAR_GUTTER: 0,
    WRIST_SPLINT_PROXIMAL_NO_THUMB: 1,
    WRIST_SPLINT_DISTAL_NO_THUMB: 2,
    RESTING_HAND_SPLINT: 3,
    WRIST_SPLINT_PROXIMAL_THUMB: 4,
    WRIST_SPLINT_DISTAL_THUMB: 5,

    COCK_UP_SPLINT: 6
};

function sigmoid(x, k){
    return 1 / (1 + Math.exp(-x / k))
}

let armCastSelection = ARM_CAST_TYPES.ULNAR_GUTTER


function animate() {
    if (!modelLoaded) {
        model = scene.getObjectByName(modelName);
        if (model) {
            modelLoaded = true;
            let meshData = getMeshData(model);
            ps = meshData.points;
            ns = meshData.normals;
            cs = meshData.colors;
            fs = meshData.faces;
            let boundingBox = new THREE.Box3Helper(new THREE.Box3().setFromObject(model), 0xffff00)
            boundingBox.name = "BoundingBox";
            scene.add(boundingBox)
            selectableObjects = [model];
            //
            // Adding splitting curves
            //
            splitHandVals = ns.map(n => n.dot(up));
            let splitLevels = levelCurve(ps, fs, splitHandVals, 0)
            let curveOrganizer = new CurveOrganizer(splitLevels);
            splitHandCurves = curveOrganizer.organizeCurve()
            let smoothSteps = 10
            for(let i = 0; i < smoothSteps; i++)
            {
                splitHandCurves = splitHandCurves.map(c => {
                    let newCurve = [];
                    for (let i = 0; i < c.length; i++) {
                        let p = c[i];
                        let n = c[(i + 1) % c.length];
                        let m = c[(i - 1 + c.length) % c.length];
                        let newP = new THREE.Vector3().addVectors(p, n).add(m).divideScalar(3);
                        newCurve.push(newP);
                    }
                    return newCurve;
                });
            }
            addCurvesToScene(splitHandCurves, scene, splitHandCurves3D);
        }
    }
    //
    // Text stuff
    //
    for (let i = 0; i < 10; i++) {
        let textMesh = scene.getObjectByName("TextMesh" + i);
        if(textMesh){
            textMesh.lookAt(activeCamera.position);
        }

    }
    requestAnimationFrame(animate);
    renderer.render(scene, activeCamera);
    controls.update();
}

animate();
