let pointsMaterial = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    visible: true,
});


let mainMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: false,
    vertexColors: true,
    shininess: 1.0,
    wireframe: false,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    visible: true
});


let vertexShader =
    "uniform float c;\n" +
    "        uniform float p;\n" +
    "        varying float intensity;\n" +
    "        void main()\n" +
    "        {\n" +
    "            vec3 vNormal = normalize( normalMatrix * normal );\n" +
    "            intensity = pow( c - dot(vNormal, vec3(0.,0.0, 1.0)), p );\n" +
    "            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n" +
    "        }";

let fragmentShader =
    "uniform vec3 glowColor;\n" +
    "        varying float intensity;\n" +
    "        void main()\n" +
    "        {\n" +
    "            vec3 glow = glowColor * intensity;\n" +
    "            gl_FragColor = vec4( glow, 1.0 );\n" +
    "        }\n";

let xrayMaterial = new THREE.ShaderMaterial({
    uniforms: {
        c: {type: "f", value: 1.0},
        p: {type: "f", value: 3},
        glowColor: {type: "c", value: new THREE.Color(0x84ccff)},
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
});

const planeMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
});

function getPaletteColor(index) {
    let colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff, 0xffa500, 0x800080, 0x008080];
    return colors[index % colors.length];
}