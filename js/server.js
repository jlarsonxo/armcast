const hostName = window.location.hostname;

console.log("Host name:", hostName);

let servers_urls = {
    ares: 'wss://geometry-server.com/ws/',
    tlaloc: 'wss://geometrytools.com/ws/',
    local: 'ws://localhost:8765'
}

server_url = servers_urls.local;

if (hostName === 'valerocar.github.io' || hostName === 'align-tool.geometry-server.com') {
    console.log("Geometry Server on ares")
    server_url = servers_urls.ares;
}

console.log("Server URL:", server_url);

let geometryServer = new WebSocket(server_url);
let isGeometryServerOpen = false;

function sendMessage(msg) {
    if (geometryServer.readyState === WebSocket.OPEN) {
        let msgJSON = JSON.stringify(msg);
        geometryServer.send(msgJSON);
    }
}

geometryServer.onopen = function () {
    console.log('WebSocket connection opened at ' + server_url);
    isGeometryServerOpen = true;
};


let infoArea = document.getElementById('infoArea');
geometryServer.onmessage = function (event) {
    let data = JSON.parse(event.data);
    infoArea.innerHTML =  data['message'] + "<br>" + "Status: " + data['status'];
    if(data['status'] ==='error'){
        document.getElementById('spinner').classList.add('d-none');
        return;
    }
    const deformProcesses = ['rotate', 'translate']
    if (data['status'] === 'translating' || data['status'] === 'rotating') {
        awaitingAck = false;
    }
    if (data['process'] === 'session_warning') {
        alert(data['message']);
    }
    if (data['process'] === 'session_end') {
        alert(data['message']);
        //window.location.href = 'index.html';
    }
    if (model && deformProcesses.includes(data.process)) {
        let geometry = model.geometry;
        let xs = data.xs;
        let ys = data.ys;
        let zs = data.zs;
        if (xs) {
            let n = xs.length;
            for (let i = 0; i < n; i++) {
                geometry.attributes.position.setX(i, xs[i]);
                geometry.attributes.position.setY(i, ys[i]);
                geometry.attributes.position.setZ(i, zs[i]);
            }
            geometry.attributes.position.needsUpdate = true;
        }
    }
    if (data.process === 'create_arm_cast') {
        console.log("Thicken selection response", data);
        // get object by name
        let acm = scene.getObjectByName("armCastModel");
        if (acm) {
            scene.remove(acm);
        }
        let xs = data.xs;
        let ys = data.ys;
        let zs = data.zs;
        let fis = data.fis;
        let fjs = data.fjs;
        let fks = data.fks;
        let nxs = data.nxs;
        let nys = data.nys;
        let nzs = data.nzs;
        let geometry = new THREE.BufferGeometry();
        let positions = [];
        let normals = [];
        let indices = [];
        for (let n = 0; n < xs.length; n++) {
            positions.push(xs[n]);
            positions.push(ys[n]);
            positions.push(zs[n]);
        }
        for (let n = 0; n < nxs.length; n++) {
            normals.push(nxs[n]);
            normals.push(nys[n]);
            normals.push(nzs[n]);
        }
        for (let n = 0; n < fis.length; n++) {
            indices.push(fis[n]);
            indices.push(fjs[n]);
            indices.push(fks[n]);
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);

        let material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            flatShading: false,
            vertexColors: false,
            shininess: 1.0,
            wireframe: false,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            visible: true
        });
        let mesh = new THREE.Mesh(geometry, material);
        mesh.name = "armCastModel";
        scene.add(mesh);
        model.material = xrayMaterial;
        // remove elements in splitHandCurves3D from scene
        splitHandCurves3D.map(c => scene.remove(c));
        // set selected points to empty and remove them from scene
        //pointsSelected.map(p => scene.remove(p));
        //pointsSelected = [];
    }

};

function sendModelToServer() {
    if (isGeometryServerOpen && !modelSentToServer) {
        console.log("Geometry server is open");
        let msg = {
            process: "store_geometry",
            geometry: geometryToJSON(model.geometry),
        };
        sendMessage(msg);
        modelSentToServer = true;
    }
}

function processModel() {
    if (isGeometryServerOpen && !modelSentToServer) {
        let pointsData = [];
        pointsSelected.map(p => {
                let pointData = {
                    point: {
                        x: p.position.x,
                        y: p.position.y,
                        z: p.position.z,
                    },
                    normal: {
                        x: p.normal.x,
                        y: p.normal.y,
                        z: p.normal.z,
                    }
                };
                pointsData.push(pointData);
            }
        );
        console.log("Point selection", pointsData);
        let jsonGeometry = geometryToJSON(model.geometry)
        let msg = {
            process: "create_arm_cast",
            type: armCastSelection,
            smoothing: currentK,
            offset: currentOffset,
            thickness: currentThickness,
            selected_points: pointsData,
            geometry: jsonGeometry,
        };
        sendMessage(msg);
    }
}
