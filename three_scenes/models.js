import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// const loader = new GLTFLoader();

export function get_token(radius, color) {
    const tokenMaterial = new THREE.MeshPhongMaterial();
    tokenMaterial.color = color;
    const tokenMaterial2 = new THREE.MeshPhongMaterial();

    const tokenGeom = new THREE.CylinderGeometry(radius, radius, radius / 5, 32, 16);

    const token = new THREE.Mesh(tokenGeom, tokenMaterial);

    const tPart = new THREE.Mesh(new THREE.BoxGeometry(radius, radius / 2, radius / 5), tokenMaterial2);

    const tPart2 = tPart.clone()

    tPart.position.set(0, 0, -radius / 2 + radius / 10);
    tPart2.rotation.y = Math.PI / 2;
    tPart2.position.z = radius / 10;

    token.add(tPart, tPart2);

    return token;
}
export function get_laptop() {
    const laptopBodyMaterial = new THREE.MeshPhongMaterial({color: "#2f3036"})
    const laptopBodyGeom = new RoundedBoxGeometry(1.6, 0.05, 1)
    let laptopBodyMesh = new THREE.Mesh(laptopBodyGeom, laptopBodyMaterial);

    let screen = laptopBodyMesh.clone()

    screen.rotation.x = Math.PI/2
    screen.position.set(0,0.5,-0.5)
    let display = screen.clone();
    display.material = new THREE.MeshPhongMaterial({
        color: "white",
        emissive: "#e6e4ff"
    })
    display.scale.set(0.92, 0.92, 0.92);
    display.position.z+=0.01
    laptopBodyMesh.add(screen, display);

    const buttonMaterial = new THREE.MeshPhongMaterial({color: "#676767"})
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), buttonMaterial)

    for(let i = -7; i <= 7; i++)
    {
        let b1 = button.clone();
        b1.position.set(i*0.07, 0.02, -0.25);
        let b2 = b1.clone();
        b2.position.z+=0.1
        let b3 = b2.clone();
        b3.position.z+=0.1
        let b4 = b3.clone();
        b4.position.z+=0.1
        laptopBodyMesh.add(b1,b2,b3,b4);
    }

    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), buttonMaterial)
    trackpad.position.set(0,0.003,0.3)
    laptopBodyMesh.add(trackpad)

    return laptopBodyMesh;
}