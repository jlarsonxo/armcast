let {scene, renderer, rayCaster, cameraPerspective, cameraOrthographic, controls} = createScene();

let cursorPoint = getSpherePoint(cursorRadius, cursorColor);
let cursorNormal = new THREE.Vector3(0, 0, 1);
scene.add(cursorPoint);
let cameras = [cameraPerspective, cameraOrthographic];
let activeCamera = cameraPerspective;
let controlsActive = false;

controls.addEventListener('start', () => {
    controlsActive = true;
});

controls.addEventListener('end', () => {
    controlsActive = false;
});

controlsActive = true;

const loader = new THREE.FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    // Create the text geometry once the font is loaded
    const fontSpecs = {
        font: font,
        size: 6,
        height: 0.1,
        curveSegments: 12,
        bevelEnabled: false,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelOffset: 0,
        bevelSegments: 5,
    };
    for (let i = 0; i < 10; i++) {
        const textGeometry = new THREE.TextGeometry(""+i, fontSpecs);
        const textMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.name = "TextMesh" + i;
        textMesh.visible = false;
        scene.add(textMesh);
    }
});

// Add axes to scene for reference
let axes = new THREE.AxesHelper(100);
scene.add(axes);
loadMesh('./data/default.ply', scene, 'model', false);