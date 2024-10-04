document.addEventListener('mousemove', function (event) {
    if (controlsActive) {
        return;
    }
    let mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - canvas3d.offsetLeft) / canvas3d.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - canvas3d.offsetTop) / canvas3d.clientHeight) * 2 + 1;
    if (selectableObjects) {
        rayCaster.setFromCamera(mouse, activeCamera);
        let intersects = rayCaster.intersectObjects(selectableObjects, true);
        if (intersects.length > 0) {
            let point = intersects[0].point;
            let object = intersects[0].object;
            let normal = intersects[0].face.normal;
            let wM = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
            normal.applyMatrix3(wM).normalize();
            if (cursorPoint) {
                cursorPoint.position.copy(point);
                cursorNormal.copy(normal);
            }
        }
    }
}, false);


document.addEventListener('mousedown', function (event) {
        if (event.button === 0 && event.detail === 1) {
            console.log("Single click");
        }
        if (event.button === 0 && event.detail === 2) {
            if (cursorPoint.visible) {
                let color1 = new THREE.Color(0x0000ff);
                let color2 = new THREE.Color(0xff0000);
                let color = color1;
                if(cursorNormal.dot(up) > 0){
                    color = color2;
                }
                let p = getSpherePoint(cursorRadius, color);
                p.visible = true;
                p.position.copy(cursorPoint.position);
                p.normal = cursorNormal.clone();
                scene.add(p);
                pointsSelected.push(p);
                // Get text mesh
                let textMesh = scene.getObjectByName("TextMesh" + pointsSelected.length);
                let textPos = cursorPoint.position.clone();
                textPos.x -= 3.0;
                textPos.y += 2.5;
                textPos.z += 0;
                textMesh.position.copy(textPos);
                textMesh.visible = true;
            }
        }
    }
);

document.addEventListener('click', function(event) {
    /*
    if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = 'none';
    }
    else{
        cursorPoint.visible = false;
    }

     */
});


renderer.domElement.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const menuX = event.clientX - canvasRect.left;
    const menuY = event.clientY - canvasRect.top;
    /*
    contextMenu.style.top = `${menuY}px`;
    contextMenu.style.left = `${menuX}px`;
    contextMenu.style.display = 'block';

     */
});


