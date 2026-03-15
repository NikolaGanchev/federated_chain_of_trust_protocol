import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MODELS from './models.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { gsap } from "gsap";
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


const container = document.getElementById("visual1");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight);
camera.position.set(10, 12, 25)
camera.lookAt(10,5,-5);


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setAnimationLoop(animate);
container.appendChild(renderer.domElement);
scene.background = new THREE.Color("#134b67")

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = 5;
controls.maxDistance = 30;
controls.enablePan = false;
controls.target.set(10,5,-5);
controls.update();

const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }
});

const ambientLight = new THREE.AmbientLight('white')
scene.add(ambientLight)

const light = new THREE.PointLight('white', 800);
light.add
light.position.set(6, 12, -5);
//light.add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial()))
scene.add(light);

const loader = new FontLoader();
const font = await loader.loadAsync('resource/Roboto_SemiCondensed_SemiBold_Regular.json');
const textMaterial = new THREE.MeshBasicMaterial({
  color: "yellow"
})

const laptop = MODELS.get_laptop();
laptop.scale.set(3, 3, 3)
laptop.position.set(30, 0, 0)
scene.add(laptop)

const textLaptopGeometry = new TextGeometry("User", {
  font: font,
  size: 2 / 3,
  depth: 0.2,
  curveSegments: 12
});

const textLaptop = new THREE.Mesh(textLaptopGeometry, textMaterial);
laptop.add(textLaptop)
textLaptopGeometry.computeBoundingBox();
const boundingLaptopBox = textLaptopGeometry.boundingBox;
const widthLaptopText = boundingLaptopBox.max.x - boundingLaptopBox.min.x;
textLaptop.position.set(-widthLaptopText / 2, -1, 0.2);

let press = MODELS.get_token_press();
press.position.set(-10, 0, 0)
MODELS.animate_token_press(press)
scene.add(press)

const textPressGeometry = new TextGeometry("Local issuer", {
  font: font,
  size: 1.5,
  depth: 0.2,
  curveSegments: 12
});

const textPress = new THREE.Mesh(textPressGeometry, textMaterial);
press.add(textPress)
textPressGeometry.computeBoundingBox();
const boundingBoxPress = textPressGeometry.boundingBox;
const widthPress = boundingBoxPress.max.x - boundingBoxPress.min.x;
textPress.position.set(-widthPress / 2, -1.8, 1);

let serverRack = MODELS.get_server_rack()
serverRack.scale.set(1.5, 1.5, 1.5)
serverRack.position.set(20, 4.5, -20);
scene.add(serverRack)

const textServerRackGeometry = new TextGeometry("Backend", {
  font: font,
  size: 1,
  depth: 0.2,
  curveSegments: 12
});

const textServerRack = new THREE.Mesh(textServerRackGeometry, textMaterial);
serverRack.add(textServerRack)
textServerRackGeometry.computeBoundingBox();
const boundingBoxServerRack = textServerRackGeometry.boundingBox;
const widthServerRack = boundingBoxServerRack.max.x - boundingBoxServerRack.min.x;
textServerRack.position.set(-widthServerRack / 2, -5, 1);

const cloud = MODELS.get_cloud(font, "Top issuer");
cloud.scale.set(2, 2, 2)
scene.add(cloud);
cloud.position.set(0, 5, -20)

const pressLaptopLine = MODELS.get_cylinder_dotted_line(new THREE.Vector3(-8,2,0), new THREE.Vector3(27.5,0,0), 0.2 , 0.5, new THREE.Color("#fff"));
const laptopServerRackLine = MODELS.get_cylinder_dotted_line(new THREE.Vector3(29,1,-1.8), new THREE.Vector3(20, 4.5, -20), 0.2 , 0.5, new THREE.Color("#fff"));
const serverRackCloudLine = MODELS.get_cylinder_dotted_line(new THREE.Vector3(0,8,-20), new THREE.Vector3(20, 4.5, -20), 0.2 , 0.5, new THREE.Color("#fff"));
const pressCloudLine = MODELS.get_cylinder_dotted_line(new THREE.Vector3(-2,6,-20), new THREE.Vector3(-10, 2, 0), 0.2 , 0.5, new THREE.Color("#fff"));
scene.add(pressLaptopLine, laptopServerRackLine, serverRackCloudLine, pressCloudLine)

MODELS.animateSignal(pressLaptopLine, new THREE.Color("#a2a2a2"), new THREE.Color("#fff"), -1, true)
MODELS.animateSignal(laptopServerRackLine, new THREE.Color("#a2a2a2"), new THREE.Color("#fff"), -1, true)
MODELS.animateSignal(serverRackCloudLine, new THREE.Color("#a2a2a2"), new THREE.Color("#fff"), -1, true)
MODELS.animateSignal(pressCloudLine, new THREE.Color("#a2a2a2"), new THREE.Color("#fff"), -1, true)

// let pi = {value: 0};
// gsap.to(pi, {
//   duration: 6, 
//   value: 2*Math.PI,
//   repeat: -1,
//   onUpdate: () => {
//   //light.position.set(5 + 20*Math.cos(pi.value),10,-5 + 20*Math.sin(pi.value))
//   }})

function animate(time) {

  controls.update();
  renderer.render(scene, camera);

}

