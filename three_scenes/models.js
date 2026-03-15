import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { gsap } from "gsap";

export function get_token(color) {
    const radius = 1;
    const tokenMaterial = new THREE.MeshPhongMaterial();
    tokenMaterial.color = color;
    const tokenMaterial2 = new THREE.MeshPhongMaterial();

    const tokenGeom = new THREE.CylinderGeometry(radius, radius, radius / 5, 32, 16);

    const token = new THREE.Mesh(tokenGeom, tokenMaterial);

    const tPart = new THREE.Mesh(new THREE.BoxGeometry(radius, 0.35, radius / 5), tokenMaterial2);

    const tPart2 = tPart.clone()

    tPart.position.set(0, 0, -radius / 2 + radius / 10);
    tPart2.rotation.y = Math.PI / 2;
    tPart2.position.z = radius / 10;

    token.add(tPart, tPart2);

    return token;
}

export function get_laptop() {
    const laptopBodyMaterial = new THREE.MeshPhongMaterial({ color: "#2f3036" })
    const laptopBodyGeom = new RoundedBoxGeometry(1.6, 0.05, 1)
    let laptopBodyMesh = new THREE.Mesh(laptopBodyGeom, laptopBodyMaterial);

    let screen = laptopBodyMesh.clone()

    screen.rotation.x = Math.PI / 2
    screen.position.set(0, 0.5, -0.5)
    let display = screen.clone();
    display.material = new THREE.MeshPhongMaterial({
        color: "white",
        emissive: "#e6e4ff"
    })
    display.scale.set(0.92, 0.92, 0.92);
    display.position.z += 0.01
    laptopBodyMesh.add(screen, display);

    const buttonMaterial = new THREE.MeshPhongMaterial({ color: "#676767" })
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), buttonMaterial)

    for (let i = -7; i <= 7; i++) {
        let b1 = button.clone();
        b1.position.set(i * 0.07, 0.02, -0.25);
        let b2 = b1.clone();
        b2.position.z += 0.1
        let b3 = b2.clone();
        b3.position.z += 0.1
        let b4 = b3.clone();
        b4.position.z += 0.1
        laptopBodyMesh.add(b1, b2, b3, b4);
    }

    const trackpad = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), buttonMaterial)
    trackpad.position.set(0, 0.003, 0.3)
    laptopBodyMesh.add(trackpad)

    return laptopBodyMesh;
}

export function get_cloud(font, txt) {
    const textGeometry = new TextGeometry(txt, {
        font: font,
        size: 1,
        depth: 0.25,
        curveSegments: 12
    });
    const textMaterial = new THREE.MeshBasicMaterial({
        color: "yellow"
    })
    const text = new THREE.Mesh(textGeometry, textMaterial);
    textGeometry.computeBoundingBox();
    const boundingBox = textGeometry.boundingBox;
    const width = boundingBox.max.x - boundingBox.min.x;
    text.position.set(-width / 2,-1.8,0.2);

    const cloudMaterial = new THREE.MeshPhongMaterial({
        color: "#e0f7ff",
        emissive: "#ffffff"
    })

    const result = new THREE.Group();
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(5, 1.4, 0.7), cloudMaterial);
    cloud.position.y = 0.2;
    const circlePart = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.7), cloudMaterial);
    circlePart.rotation.x = Math.PI / 2;
    circlePart.position.set(-2.5, 0.5, 0);

    const c2 = circlePart.clone();
    c2.scale.set(1.5, 1, 1.5);
    c2.position.set(2.5, 1, 0)

    const c3 = circlePart.clone()
    c3.scale.set(1.3, 1, 1.3);
    c3.position.set(1, 2, 0);

    const c4 = circlePart.clone()
    c4.scale.set(1.1, 1, 1.1);
    c4.position.set(-1.5, 1.3, 0);

    const c5 = circlePart.clone()
    c5.scale.set(1.25, 1, 1.25);
    c5.position.set(-0.5, 1.7, 0);

    result.add(circlePart, c2, c3, c4, c5, cloud)
    result.add(text);

    return result;
}

export function get_server_rack() {
    const serverMaterial1 = new THREE.MeshStandardMaterial({
        color: "grey",
        metalness: 0.9
    })
    const serverMaterial2 = new THREE.MeshPhongMaterial({
        color: "#222222"
    })
    const serverRack = new THREE.Mesh(new THREE.BoxGeometry(3, 6.5, 3), serverMaterial1);

    const piece = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 1), serverMaterial2)
    const serverLight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: "red" }));
    piece.add(serverLight);
    serverLight.position.set(1.15, 0.1, 0.5);

    for (let i = 0; i < 10; i++) {
        let p = piece.clone();
        p.position.set(0, 2.8 - i * 0.6, 1.05)
        serverRack.add(p);
    }

    return serverRack;
}

export function get_token_press() {
    const pressMaterial1 = new THREE.MeshPhongMaterial({
        color: "#898989"
    })
    const pressMaterial2 = new THREE.MeshPhongMaterial({
        color: "silver"
    })
    const pressMaterial3 = new THREE.MeshPhongMaterial({
        color: "#d5d5d5",
        shininess: 0.9,
        specular: "blue"
    })

    const tokenPress = new THREE.Group();

    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3), pressMaterial1);
    const base2 = base.clone();
    base2.rotation.x = Math.PI / 2;
    base2.position.set(-0.5, 2, -1.5);

    const base3 = base2.clone();
    base3.position.set(0.5, 2, 1.5);

    const base4 = base.clone();
    base4.rotation.z = Math.PI / 2;
    base4.position.set(1.5, 2, -0.5)

    const base5 = base.clone();
    base5.rotation.z = Math.PI / 2;
    base5.position.set(-1.5, 2, 0.5)

    base.scale.set(4 / 3, 1, 4 / 3);
    base.position.set(0, 0.5, 0)

    tokenPress.add(base, base2, base3, base4, base5)

    const plate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), pressMaterial2);
    plate.position.y = 3.5
    plate.name = "plate"
    tokenPress.add(plate)

    const pole1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.5), pressMaterial2)
    pole1.position.set(-2.25, 4.75, 1.5);
    const pole2 = pole1.clone();
    pole1.position.z = -1.5;
    tokenPress.add(pole1, pole2)

    const top = base.clone();
    top.position.y = 9
    tokenPress.add(top)

    const press = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2.5), pressMaterial3);
    press.position.y = 7.75
    press.name = "press"
    tokenPress.add(press)

    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), pressMaterial2);
    rod.position.y = 8.25
    rod.name = "rod"
    tokenPress.add(rod)

    const tokenColor = new THREE.Color("#897813")
    const token = get_token(tokenColor)
    token.position.y = 4.6
    token.name = "token"
    token.scale.set(0.9, 0.9, 0.9)
    tokenPress.add(token)

    const rawToken = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.36), new THREE.MeshPhongMaterial({ color: tokenColor }))
    rawToken.position.y = 4.6;
    rawToken.name = "rawToken"
    tokenPress.add(rawToken)


    return tokenPress;
}

export function animate_token_press(tokenPress) {
    let tl1 = gsap.timeline({
        repeat: -1
    });

    tl1.to(tokenPress.getObjectByName("press").position, { y: 4.9, duration: 1.2, ease: "sine.inOut" })
        .to(tokenPress.getObjectByName("rod").scale, { y: 6.75, duration: 1.2, ease: "sine.inOut" }, "0")
        .to(tokenPress.getObjectByName("rod").position, { y: 6.85, duration: 1.2, ease: "sine.inOut" }, "0")
        .to(tokenPress.getObjectByName("rawToken"), { visible: false })
        .add("lift", "+=0.1")
        .to(tokenPress.getObjectByName("press").position, { y: 7.75, duration: 1.2, ease: "sine.inOut" }, "lift")
        .to(tokenPress.getObjectByName("rod").scale, { y: 1, duration: 1.2, ease: "sine.inOut" }, "lift")
        .to(tokenPress.getObjectByName("rod").position, { y: 8.25, duration: 1.2, ease: "sine.inOut" }, "lift")
        .add("plateGoesDown", "-=0.75")
        .to(tokenPress.getObjectByName("plate").position, { y: 1.001, duration: 2, ease: "back.in" }, "plateGoesDown")
        .to(tokenPress.getObjectByName("token").position, { y: 1.8, duration: 2.24, ease: "back.in" }, "plateGoesDown")
        .to(tokenPress.getObjectByName("rawToken").position, { y: 1.8, duration: 2 }, "plateGoesDown")
        .to(tokenPress.getObjectByName("rawToken"), { visible: true })
        .to(tokenPress.getObjectByName("token"), { visible: false })
        .add("plateGoesUp")
        .to(tokenPress.getObjectByName("plate").position, { y: 3.5, duration: 1.3, ease: "back.out" }, "plateGoesUp")
        .to(tokenPress.getObjectByName("rawToken").position, { y: 4.6, duration: 1.3, ease: "back.out" }, "plateGoesUp+0.05")
}

export function get_cylinder_dotted_line(start, end, radius, gap, color) 
{
    const cylinderHeight = radius * 2;
    const stepDistance = cylinderHeight + gap;
    const totalDistance = start.distanceTo(end);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const dotCount = Math.floor(totalDistance / stepDistance) + 1;
    
    const geometry = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 16);
    // Base color must be white so the instance colors aren't tinted
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, dotCount);
    const dummy = new THREE.Object3D();
    
    const up = new THREE.Vector3(0, 1, 0);
    dummy.quaternion.setFromUnitVectors(up, direction);
    
    // Default color for the line when no signal is passing
    const defaultColor = color //new THREE.Color(0x222222); // Dark Gray
    
    for (let i = 0; i < dotCount; i++) {
        // 1. Serialize Position
        const currentDistance = i * stepDistance;
        dummy.position.copy(start).addScaledVector(direction, currentDistance);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        
        // 2. Serialize Color (Individually addressable)
        instancedMesh.setColorAt(i, defaultColor);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    // Tell Three.js we added instance colors
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true; 
    instancedMesh.computeBoundingSphere();
    
    return instancedMesh;
}

export function animateSignal(signalLine, baseColor, signalColor, repeat)
{
const dotCount = signalLine.count;
const tailLength = 10;
const tempColor = new THREE.Color();

// 3. Create a proxy object for GSAP to animate
const signalAnim = { headPosition: -tailLength };
let prevPosition = signalAnim.headPosition;

// 3. Create the Reversible GSAP Tween
const signalTween = gsap.to(signalAnim, {
    headPosition: dotCount + tailLength, // Travel entirely past the end
    duration: 2.0,
    ease: "none",
    repeat: repeat, 
    yoyo: true, 

    onUpdate: () => {
        const current = signalAnim.headPosition;
        
        // Determine direction: 1 for forward, -1 for backward
        const direction = current >= prevPosition ? 1 : -1;
        prevPosition = current;

        for (let i = 0; i < dotCount; i++) {
            // Flip the tail math based on direction
            // Forward: tail is at lower index. Backward: tail is at higher index.
            const distanceToHead = direction === 1 
                ? current - i 
                : i - current;
            
            if (distanceToHead >= 0 && distanceToHead < tailLength) {
                const intensity = 1.0 - (distanceToHead / tailLength);
                tempColor.copy(baseColor).lerp(signalColor, intensity);
            } else {
                tempColor.copy(baseColor);
            }
            
            signalLine.setColorAt(i, tempColor);
        }
        
        signalLine.instanceColor.needsUpdate = true;
    }
});

}