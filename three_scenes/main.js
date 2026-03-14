import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MODELS from './models.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { gsap } from "gsap";


const container = document.getElementById("scene-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, container.clientWidth / container.clientHeight, 0.1, 1000 );
camera.position.set(0,15,0)
//camera.lookAt(0,15,5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( container.clientWidth , container.clientHeight );
renderer.setAnimationLoop( animate );
container.appendChild( renderer.domElement );
scene.background = new THREE.Color("#07033f")

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

const ambientLight = new THREE.AmbientLight('white')
scene.add(ambientLight)

const light = new THREE.PointLight('white', 1200);
light.position.set(-15, 10, 5);
scene.add(light);

let token = MODELS.get_token(new THREE.Color("silver"));
scene.add( token );
token.position.x = 10


const laptop = MODELS.get_laptop();
laptop.scale.set(3,3,3)
laptop.position.z = -10
scene.add(laptop)

const loader = new FontLoader();
const font = await loader.loadAsync('resource/Roboto_SemiCondensed_SemiBold_Regular.json');
const cloud = MODELS.get_cloud(font, "Hello, world");
scene.add(cloud);
cloud.position.set(-7,0,0)

let serverRack = MODELS.get_server_rack()
serverRack.position.set(-15,0,0);
scene.add(serverRack)

let press = MODELS.get_token_press();
// press.position.set(0,0,5)
// press.rotation.x = -Math.PI/2
MODELS.animate_token_press(press)
scene.add(press)

       

camera.position.z = 5;

function animate( time ) {

  controls.update();
  renderer.render( scene, camera );

}