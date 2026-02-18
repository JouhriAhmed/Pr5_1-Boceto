import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const MODEL_PATH = './models/Studio.glb';
const BG_COLOR = 0x87CEEB;

const IFRAME_W = 1024;
const IFRAME_H = 640;

const FLIP_IFRAME_Y = true;
const PUSH_MM = 0.005;

// ✅ Offset (قيمك)
const OFFSET_X = -2.8;
const OFFSET_Y = 3.65;
const OFFSET_Z = -0.07;

// =====================
// ✅✅ ANIMATION SETTINGS (تحكم هنا فقط)
// =====================

// موضع الاستقرار النهائي (قياساتك)
const HOME_CAM = new THREE.Vector3(10, 10, 20);
const HOME_TARGET = new THREE.Vector3(0, 1, 0);

// بداية الانترو (أبعد + "يأتي من العدم")
const START_CAM = new THREE.Vector3(22, 18, 45);
const START_SCALE = 0.01;

// مدة الانترو بالثواني
const INTRO_DURATION = 3.0;

// دوران السينمائي أثناء الانترو (يتغير تدريجياً)
const INTRO_ROTATE_MIN = 0.2;  // يبدأ ببطء
const INTRO_ROTATE_MAX = 1.4;  // يصل لأقصى سرعة قبل النهاية

// دوران خفيف مستمر بعد الانترو (idle)
const IDLE_ROTATE_SPEED = 0.15; // خفيف جداً (0.08..0.25)

// =====================
// Scene / Camera
// =====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG_COLOR);

// world group للـ scale intro
const world = new THREE.Group();
scene.add(world);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.copy(HOME_CAM);

// =====================
// Renderers
// =====================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.left = '0';
cssRenderer.domElement.style.zIndex = '10';
cssRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(cssRenderer.domElement);

// =====================
// Lights
// =====================
scene.add(new THREE.AmbientLight(0xffffff, 1));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 8, 5);
scene.add(sun);

// =====================
// Controls
// =====================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.copy(HOME_TARGET);
controls.update();

// =====================
// Enter screen logic
// =====================
const overlay = document.getElementById('introOverlay');
const enterBtn = document.getElementById('enterBtn');

// نخفي الرندر إلى أن يضغط Enter (اختياري)
if (overlay && enterBtn) {
  renderer.domElement.style.visibility = 'hidden';
  cssRenderer.domElement.style.visibility = 'hidden';
}

// =====================
// Intro animation state
// =====================
let introPlaying = false;
let introTime = 0;

// idle rotation after intro
let idleRotate = false;

// =====================
// Helpers (ease)
// =====================
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function startIntro() {
  introPlaying = true;
  introTime = 0;

  // بداية الكاميرا + الهدف
  camera.position.copy(START_CAM);
  controls.target.copy(HOME_TARGET);
  controls.update();

  // العالم يبدأ صغير
  world.scale.setScalar(START_SCALE);

  // دوران تلقائي أثناء الانترو (سرعته تتغير داخل animate)
  controls.autoRotate = true;
  controls.autoRotateSpeed = INTRO_ROTATE_MIN;

  // نوقف تحكم المستخدم أثناء الانترو
  controls.enabled = false;

  // نوقف idle أثناء الانترو
  idleRotate = false;
}

// =====================
// Raycaster
// =====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
  if (!studio || !pcObject) return;
  if (pcMode || introPlaying) return; // داخل PC أو أثناء intro لا نعمل hover

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(pcObject, true);
  const nowHover = hits.length > 0;

  if (nowHover !== hoverPC) {
    hoverPC = nowHover;

    // شغل/اطفئ اللمعة
    if (pcGlow) pcGlow.visible = hoverPC;

    // كيرسر اليد (اختياري)
    document.body.style.cursor = hoverPC ? 'pointer' : 'default';
  }
});


// =====================
// Refs
// =====================
let studio = null;
let pcScreen = null;
let screenCSS = null;
// =====================
// Hover highlight (PC glow)
// =====================
let pcObject = null;     // Ordenador (or parent group)
let pcGlow = null;       // glow mesh
let hoverPC = false;


let pcMode = false;

// =====================
// Smooth camera move (Zoom to PC)
// =====================
let moving = false;
let moveT = 0;
const camFrom = new THREE.Vector3();
const tarFrom = new THREE.Vector3();
const camTo = new THREE.Vector3();
const tarTo = new THREE.Vector3();

let savedCamPos = camera.position.clone();
let savedTarget = controls.target.clone();

function startMove(newCamPos, newTarget, saveState = true) {
  if (saveState) {
    savedCamPos = camera.position.clone();
    savedTarget = controls.target.clone();
  }

  moving = true;
  moveT = 0;
  camFrom.copy(camera.position);
  tarFrom.copy(controls.target);
  camTo.copy(newCamPos);
  tarTo.copy(newTarget);

  controls.enabled = false;
}

// =====================
// Create iframe (hidden by default)
// =====================
function createPCScreen() {
  const div = document.createElement('div');
  div.style.width = `${IFRAME_W}px`;
  div.style.height = `${IFRAME_H}px`;
  div.style.background = '#111';
  div.style.borderRadius = '12px';
  div.style.overflow = 'hidden';
  div.style.boxSizing = 'border-box';

  const iframe = document.createElement('iframe');
  iframe.src = new URL('./ui/pc/index.html', window.location.href).toString();
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';

  div.appendChild(iframe);

  const obj = new CSS3DObject(div);
  obj.visible = false;

  if (FLIP_IFRAME_Y) obj.rotateY(Math.PI);
  return obj;
}

function makeGlowFromMesh(meshOrGroup) {
  // نأخذ أول Mesh داخل المجموعة
  let baseMesh = null;
  meshOrGroup.traverse((o) => {
    if (!baseMesh && o.isMesh) baseMesh = o;
  });
  if (!baseMesh) return null;

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.58,      // قوة اللمعة (0.08 .. 0.35)
    depthWrite: false,
  });

  const glow = new THREE.Mesh(baseMesh.geometry.clone(), glowMat);
  glow.position.copy(baseMesh.position);
  glow.rotation.copy(baseMesh.rotation);
  glow.scale.copy(baseMesh.scale).multiplyScalar(1.0); // سمك الإطار (1.01 .. 1.05)

  // نخلي اللمعة تظهر دائماً فوق المجسم
  glow.renderOrder = 999;

  // لو baseMesh داخل parent، لازم نضيف glow لنفس الـ parent
  baseMesh.parent.add(glow);

  glow.visible = false;
  return glow;
}


// =====================
// Sync UI to PC_SCREEN
// =====================
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

function syncScreen() {
  if (!pcScreen || !screenCSS) return;

  pcScreen.updateWorldMatrix(true, false);
  pcScreen.matrixWorld.decompose(_pos, _quat, _scale);

  screenCSS.position.copy(_pos);
  screenCSS.quaternion.copy(_quat);

  screenCSS.position.x += OFFSET_X;
  screenCSS.position.y += OFFSET_Y;
  screenCSS.position.z += OFFSET_Z;

  const towardCam = camera.position.clone().sub(screenCSS.position).normalize();
  screenCSS.position.add(towardCam.multiplyScalar(PUSH_MM));

  const box = new THREE.Box3().setFromObject(pcScreen);
  const size = new THREE.Vector3();
  box.getSize(size);

  screenCSS.scale.set(size.x / IFRAME_W, size.y / IFRAME_H, 1);
}

// =====================
// Enter/Exit PC mode
// =====================
function enterPCMode() {
  pcMode = true;
  if (screenCSS) screenCSS.visible = true;

  cssRenderer.domElement.style.pointerEvents = 'auto';
  controls.enabled = false;

  // نوقف الدوران أثناء PC
  controls.autoRotate = false;
  idleRotate = false;
  if (pcGlow) pcGlow.visible = false;
document.body.style.cursor = 'default';

}


function exitPCMode() {
  pcMode = false;
  if (screenCSS) screenCSS.visible = false;

  cssRenderer.domElement.style.pointerEvents = 'none';

  startMove(savedCamPos, savedTarget, false);

  // بعد الخروج رجّع idle rotation
  if (!introPlaying) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    idleRotate = true;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pcMode) exitPCMode();
});

document.getElementById('homeBtn')?.addEventListener('click', () => {
  if (pcMode) exitPCMode();
  startMove(HOME_CAM, HOME_TARGET, true);
});

window.addEventListener('message', (event) => {
  if (event.data?.type === 'EXIT_PC' && pcMode) exitPCMode();
});

// =====================
// Load model
// =====================
new GLTFLoader().load(
  MODEL_PATH,
  (gltf) => {
    studio = gltf.scene;
    world.add(studio);

    pcScreen = studio.getObjectByName('PC_SCREEN');
    // 🔎 اسم الحاسوب عندك في Blender: Ordenador
pcObject = studio.getObjectByName('Ordenador');

// إذا اسمك مختلف، غيّر هذا السطر فقط.
if (pcObject) {
  pcGlow = makeGlowFromMesh(pcObject);
  console.log('✅ PC Glow created');
} else {
  console.warn('⚠️ لم أجد Ordenador. تأكد من الاسم في Blender.');
}

    if (!pcScreen) {
      console.error('PC_SCREEN غير موجود. تأكد من الاسم في Blender.');
      return;
    }

    screenCSS = createPCScreen();
    scene.add(screenCSS);

    controls.target.copy(HOME_TARGET);
    controls.update();
  },
  undefined,
  (err) => console.error('GLB load error:', err)
);

// =====================
// ENTER button click
// =====================
if (overlay && enterBtn) {
  enterBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    renderer.domElement.style.visibility = 'visible';
    cssRenderer.domElement.style.visibility = 'visible';
    startIntro();
  });
}

// =====================
// Click -> show UI immediately + Zoom
// =====================
window.addEventListener('click', (e) => {
  if (!studio || !pcScreen) return;
  if (moving) return;
  if (pcMode) return;
  if (introPlaying) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObject(studio, true);
  if (!hits.length) return;

  let cur = hits[0].object;
  let ok = false;
  while (cur) {
    if (cur.name === 'PC_SCREEN' || cur.name === 'Ordenador') {
      ok = true;
      break;
    }
    cur = cur.parent;
  }
  if (!ok) return;

  enterPCMode();

  const box = new THREE.Box3().setFromObject(pcScreen);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const q = pcScreen.getWorldQuaternion(new THREE.Quaternion());
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();

  const distance = Math.max(size.length() * 1.2, 1.6);
  const camPos2 = center.clone().add(forward.multiplyScalar(distance));

  startMove(camPos2, center, true);
});

// =====================
// Animate
// =====================
const _tmp = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  // Intro animation
  if (introPlaying) {
    introTime += 1 / 60;
    const p = Math.min(introTime / INTRO_DURATION, 1);

    // easing للحركة (سينمائي)
    const aPos = easeOutCubic(p);
    const aScale = easeInOutCubic(p);

    // scale من العدم إلى 1
    const s = START_SCALE + (1 - START_SCALE) * aScale;
    world.scale.setScalar(s);

    // الكاميرا تنتقل إلى HOME_CAM
    camera.position.lerpVectors(START_CAM, HOME_CAM, aPos);

    // ✅ دوران سينمائي: speed يتغير تدريجياً
    controls.autoRotateSpeed = INTRO_ROTATE_MIN + (INTRO_ROTATE_MAX - INTRO_ROTATE_MIN) * aPos;
    controls.update();

    if (p >= 1) {
      introPlaying = false;

      world.scale.setScalar(1);
      camera.position.copy(HOME_CAM);
      controls.target.copy(HOME_TARGET);
      controls.update();

      // ✅ بعد انتهاء الانترو: خلي دوران خفيف مستمر
      controls.autoRotate = true;
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
      controls.enabled = true;
      idleRotate = true;
    }
  }

  // Zoom move to PC
  if (moving) {
    moveT += 0.04;
    const a = Math.min(moveT, 1);

    camera.position.lerpVectors(camFrom, camTo, a);
    controls.target.lerpVectors(tarFrom, tarTo, a);

    if (a >= 1) {
      moving = false;
      camera.position.copy(camTo);
      controls.target.copy(tarTo);
      controls.update();
      if (!pcMode) controls.enabled = true;
    }
  }

  // Idle rotate after intro (إذا ليس PC ولا moving ولا intro)
  if (idleRotate && !pcMode && !moving && !introPlaying) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    controls.update();
  } else if (!pcMode && !moving && !introPlaying && !idleRotate) {
    controls.update();
  }

  syncScreen();

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);
}
animate();

// =====================
// Resize
// =====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
});
