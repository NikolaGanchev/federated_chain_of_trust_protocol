import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as MODELS from './models.js'


const container = document.getElementById("scene-container");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, container.clientWidth / container.clientHeight, 0.1, 1000 );
camera.position.set(0,10,0)
camera.lookAt(0,0,0);

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

let token = MODELS.get_token(2, new THREE.Color("silver"));
scene.add( token );
token.position.x = 10


const laptop = MODELS.get_laptop();
laptop.scale.set(3,3,3)
scene.add(laptop)

//scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({color: "red"})))
        

camera.position.z = 5;

function animate( time ) {

  //token.rotation.x = time / 2000;
  //token.rotation.y = time / 1000;

  controls.update();
  renderer.render( scene, camera );

}