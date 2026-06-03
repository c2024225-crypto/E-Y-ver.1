// Basic 3D collection game using Three.js

let scene, camera, renderer;
let player, ground;
let collectibles = [];
let score = 0;
const COLLECTIBLE_COUNT = 12;
const COLLECTIBLE_DISTANCE = 1.2;
const worldSize = 40;

const keys = { forward:0, backward:0, left:0, right:0, jump:0 };
let velocity = new THREE.Vector3();
let canJump = true;

init();
spawnCollectibles();
animate();

function init() {
  // Scene and camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 8, 12);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  hemi.position.set(0, 50, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(-10, 20, 10);
  scene.add(dir);

  // Ground
  const gGeo = new THREE.PlaneGeometry(worldSize, worldSize);
  const gMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
  ground = new THREE.Mesh(gGeo, gMat);
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Player (cube)
  const pGeo = new THREE.BoxGeometry(1,1,1);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x3333ff });
  player = new THREE.Mesh(pGeo, pMat);
  player.position.set(0, 0.5, 0);
  scene.add(player);

  // Border visual (optional)
  const box = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(worldSize,1,worldSize)), 0x000000);
  box.position.y = 0.5;
  scene.add(box);

  // Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  document.getElementById('restartBtn').addEventListener('click', restartGame);
}

function spawnCollectibles() {
  // remove old
  collectibles.forEach(c => scene.remove(c.mesh));
  collectibles = [];
  score = 0;
  updateScore();

  const geo = new THREE.SphereGeometry(0.4, 16, 16);
  for (let i=0;i<COLLECTIBLE_COUNT;i++) {
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) });
    const mesh = new THREE.Mesh(geo, mat);
    const x = (Math.random()-0.5) * (worldSize - 4);
    const z = (Math.random()-0.5) * (worldSize - 4);
    mesh.position.set(x, 0.4, z);
    scene.add(mesh);
    collectibles.push({ mesh, collected:false });
  }
}

function updateScore() {
  document.getElementById('scoreValue').textContent = score;
}

function onWindowResize() {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': keys.forward = 1; break;
    case 'KeyS': case 'ArrowDown': keys.backward = 1; break;
    case 'KeyA': case 'ArrowLeft': keys.left = 1; break;
    case 'KeyD': case 'ArrowRight': keys.right = 1; break;
    case 'Space': if (canJump) { velocity.y = 8; canJump = false; } break;
  }
}

function onKeyUp(e) {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': keys.forward = 0; break;
    case 'KeyS': case 'ArrowDown': keys.backward = 0; break;
    case 'KeyA': case 'ArrowLeft': keys.left = 0; break;
    case 'KeyD': case 'ArrowRight': keys.right = 0; break;
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  // Movement input
  const speed = 6;
  const dir = new THREE.Vector3();
  if (keys.forward) dir.z -= 1;
  if (keys.backward) dir.z += 1;
  if (keys.left) dir.x -= 1;
  if (keys.right) dir.x += 1;
  if (dir.lengthSq() > 0) dir.normalize();

  // Apply horizontal movement
  velocity.x = dir.x * speed;
  velocity.z = dir.z * speed;

  // Gravity
  velocity.y -= 20 * dt;
  player.position.addScaledVector(velocity, dt);

  // Ground collision
  if (player.position.y <= 0.5) {
    player.position.y = 0.5;
    velocity.y = 0;
    canJump = true;
  }

  // Keep inside world bounds
  player.position.x = THREE.MathUtils.clamp(player.position.x, -worldSize/2 + 1, worldSize/2 - 1);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -worldSize/2 + 1, worldSize/2 - 1);

  // Simple rotation for visual
  player.rotation.y += dt * 1.5;

  // Camera follow (smooth)
  const camTarget = new THREE.Vector3(player.position.x, player.position.y + 4, player.position.z + 8);
  camera.position.lerp(camTarget, 0.08);
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

  // Check collectibles
  collectibles.forEach(item => {
    if (item.collected) return;
    const d = item.mesh.position.distanceTo(player.position);
    if (d < COLLECTIBLE_DISTANCE) {
      // collect
      item.collected = true;
      scene.remove(item.mesh);
      score += 1;
      updateScore();
      // small effect: spawn a new one after delay
      setTimeout(() => {
        const geo = new THREE.SphereGeometry(0.4, 16, 16);
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) });
        const mesh = new THREE.Mesh(geo, mat);
        const x = (Math.random()-0.5) * (worldSize - 4);
        const z = (Math.random()-0.5) * (worldSize - 4);
        mesh.position.set(x, 0.4, z);
        scene.add(mesh);
        item.mesh = mesh;
        item.collected = false;
      }, 800);
    }
  });

  renderer.render(scene, camera);
}
function restartGame() {
  // reset player
  player.position.set(0, 0.5, 0);
  velocity.set(0,0,0);
  spawnCollectibles();
}
