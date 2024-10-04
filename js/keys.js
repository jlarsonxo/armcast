document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        cursorPoint.visible = false;
        //featuresSelections.push(new FeaturesSelection(pointsSelected.map(p => p.position)));
        //pointsSelected.forEach(p => scene.remove(p));
        //pointsSelected = [];
        //contextMenu.style.display = 'none';
    }
    if (event.key === 'x') {
        camerasToYZ(cameras);
    }
    if (event.key === 'w') {
        let model = scene.getObjectByName(modelName);
        model.material.wireframe = !model.material.wireframe;
    }
    if (event.key === 'y') {
        camerasToXZ(cameras);
    }
    if (event.key === 'z') {
        camerasToXY(cameras);
    }
    if (event.key === 'r') {
        reflectCameras(cameras);
    }
    if (event.key === 'u') {
        flipUpCameras(cameras);
    }
    if (event.key === 'p') {
        activeCamera = cameraPerspective;
        controls.object = activeCamera;
        controls.update();
    }
    if (event.key === 'o') {
        activeCamera = cameraOrthographic;
        controls.object = activeCamera;
        controls.update();
    }
    if (event.key === ' ') {
        camerasToXYZ(cameras);
    }
    if (event.key === 's') {
        cursorPoint.visible = true;
    }
}, false);
