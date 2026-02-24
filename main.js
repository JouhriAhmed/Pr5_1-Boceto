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
// SOCIAL LINKS + HOVER STYLE
// =====================
const SOCIAL_LINKS = {
  Instagram: 'https://www.instagram.com/jouhri.1/',
  Linkedin: 'https://ma.linkedin.com/in/ahmed-jouhri-27427a250', // ✅ تأكد من الاسم مثل Blender
  whatsapp: 'https://wa.me/+346772277197' // مثال: 2126xxxxxx بدون +
};

const SOCIAL_HOVER = {
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.2
};

// =====================
// ✅✅ ANIMATION SETTINGS
// =====================
const HOME_CAM = new THREE.Vector3(10, 10, 20);
const HOME_TARGET = new THREE.Vector3(0, 1, 0);

const START_CAM = new THREE.Vector3(22, 18, 45);
const START_SCALE = 0.01;

const INTRO_DURATION = 3.0;

const INTRO_ROTATE_MIN = 0.2;
const INTRO_ROTATE_MAX = 1.4;

const IDLE_ROTATE_SPEED = 0.15;

// =====================
// Scene / Camera
// =====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG_COLOR);

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
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';
document.body.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.inset = '0';
cssRenderer.domElement.style.zIndex = '1';
// ✅ مهم: لا تلتقط الماوس أبداً على مستوى الـ CSS3D كله
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
// Enter overlay
// =====================
const overlay = document.getElementById('introOverlay');
const enterBtn = document.getElementById('enterBtn');

// ✅ ضمان أن overlay فوق كل شيء وقابل للنقر
if (overlay) {
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'auto';
}

if (overlay && enterBtn) {
  renderer.domElement.style.visibility = 'hidden';
  cssRenderer.domElement.style.visibility = 'hidden';
}

// =====================
// Intro animation state
// =====================
let introPlaying = false;
let introTime = 0;
let idleRotate = false;

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function startIntro() {
  introPlaying = true;
  introTime = 0;

  camera.position.copy(START_CAM);
  controls.target.copy(HOME_TARGET);
  controls.update();

  world.scale.setScalar(START_SCALE);

  controls.autoRotate = true;
  controls.autoRotateSpeed = INTRO_ROTATE_MIN;

  controls.enabled = false;
  idleRotate = false;
}

// =====================
// Raycaster + mouse
// =====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function setMouseFromEvent(e) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
}

// =====================
// Refs
// =====================
let studio = null;
let pcScreen = null;
let screenCSS = null;

let pcMode = false;

// PC glow
let pcObject = null; // Ordenador
let pcGlow = null;
let hoverPC = false;

// Social
let socialRoots = [];
let socialHoverName = null;
const socialMatBackup = new Map();

// PC Screen DOM ref (عشان نعرف هل النقرة داخل الشاشة)
let pcDiv = null;

// =====================
// Smooth camera move
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
// Create PC Screen (CSS3D)
// =====================
function createPCScreen() {
  const div = document.createElement('div');
  pcDiv = div;

  div.style.width = `${IFRAME_W}px`;
  div.style.height = `${IFRAME_H}px`;
  div.style.background = '#111';
  div.style.borderRadius = '12px';
  div.style.overflow = 'hidden';
  div.style.boxSizing = 'border-box';

  // ✅ فقط هذا العنصر يلتقط الماوس (وليس الـ cssRenderer كله)
  div.style.pointerEvents = 'auto';

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

// =====================
// PC Glow mesh
// =====================
function makeGlowFromMesh(meshOrGroup) {
  let baseMesh = null;
  meshOrGroup.traverse((o) => {
    if (!baseMesh && o.isMesh) baseMesh = o;
  });
  if (!baseMesh) return null;

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  const glow = new THREE.Mesh(baseMesh.geometry.clone(), glowMat);
  glow.position.copy(baseMesh.position);
  glow.rotation.copy(baseMesh.rotation);
  glow.scale.copy(baseMesh.scale).multiplyScalar(1.0);
  glow.renderOrder = 999;

  baseMesh.parent.add(glow);
  glow.visible = false;
  return glow;
}

// =====================
// Social hover helpers
// =====================
function cacheMaterial(mat) {
  if (!mat || socialMatBackup.has(mat.uuid)) return;
  socialMatBackup.set(mat.uuid, {
    color: mat.color ? mat.color.clone() : null,
    emissive: mat.emissive ? mat.emissive.clone() : null,
    emissiveIntensity: mat.emissiveIntensity ?? 0
  });
}

function applySocialHoverToObject(obj, isOn) {
  if (!obj) return;

  obj.traverse((m) => {
    if (!m.isMesh || !m.material) return;

    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat) => {
      if (!mat) return;

      cacheMaterial(mat);
      const saved = socialMatBackup.get(mat.uuid);
      if (!saved) return;

      if (isOn) {
        if (mat.color) mat.color.setHex(SOCIAL_HOVER.color);
        if ('emissive' in mat && mat.emissive) {
          mat.emissive.setHex(SOCIAL_HOVER.emissive);
          mat.emissiveIntensity = SOCIAL_HOVER.emissiveIntensity;
        }
      } else {
        if (saved.color && mat.color) mat.color.copy(saved.color);
        if ('emissive' in mat && mat.emissive && saved.emissive) {
          mat.emissive.copy(saved.emissive);
          mat.emissiveIntensity = saved.emissiveIntensity;
        }
      }

      mat.needsUpdate = true;
    });
  });
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
// PC Mode
// =====================
function enterPCMode() {
  pcMode = true;
  if (screenCSS) screenCSS.visible = true;

  controls.enabled = false;
  controls.autoRotate = false;
  idleRotate = false;

  // ✅ لا لمعة للكمبيوتر أثناء pcMode
  hoverPC = false;
  if (pcGlow) pcGlow.visible = false;

  document.body.style.cursor = 'default';
}

function exitPCMode() {
  pcMode = false;
  if (screenCSS) screenCSS.visible = false;

  startMove(savedCamPos, savedTarget, false);

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
// Hover (mousemove) — PC glow + Social
// =====================
window.addEventListener('mousemove', (e) => {
  if (!studio) return;
  if (introPlaying) return;

  setMouseFromEvent(e);

  // ---- PC hover (لكن لا تعمل أثناء pcMode)
  if (!pcMode && pcObject) {
    const hitsPC = raycaster.intersectObject(pcObject, true);
    const nowHoverPC = hitsPC.length > 0;

    if (nowHoverPC !== hoverPC) {
      hoverPC = nowHoverPC;
      if (pcGlow) pcGlow.visible = hoverPC;
      document.body.style.cursor = hoverPC ? 'pointer' : 'default';
    }
  } else {
    // أثناء pcMode تأكد أنها مطفأة
    hoverPC = false;
    if (pcGlow) pcGlow.visible = false;
  }

  // ---- Social hover (يعمل حتى أثناء pcMode)
  if (socialRoots.length) {
    const socialHits = raycaster.intersectObjects(socialRoots, true);

    let newName = null;
    if (socialHits.length) {
      let cur = socialHits[0].object;
      while (cur) {
        if (SOCIAL_LINKS[cur.name]) {
          newName = cur.name;
          break;
        }
        cur = cur.parent;
      }
    }

    if (newName !== socialHoverName) {
      if (socialHoverName) {
        const oldObj = studio.getObjectByName(socialHoverName);
        applySocialHoverToObject(oldObj, false);
      }

      socialHoverName = newName;

      if (socialHoverName) {
        const newObj = studio.getObjectByName(socialHoverName);
        applySocialHoverToObject(newObj, true);
      }

      // Cursor: لا نخرب كيرسر الكمبيوتر
      if (!hoverPC) document.body.style.cursor = socialHoverName ? 'pointer' : 'default';
    }
  }
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
    pcObject = studio.getObjectByName('Ordenador');

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

    // Social objects
    socialRoots = [];
    Object.keys(SOCIAL_LINKS).forEach((name) => {
      const obj = studio.getObjectByName(name);
      if (!obj) {
        console.warn(`⚠️ لم أجد عنصر Social باسم: ${name}`);
        return;
      }
      socialRoots.push(obj);

      obj.traverse((m) => {
        if (!m.isMesh || !m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => cacheMaterial(mat));
      });
    });
    console.log('✅ Social roots:', socialRoots.map(o => o.name));

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
// Helper: is click inside PC screen DOM?
// =====================
function isClickInsidePCScreen(e) {
  if (!pcMode) return false;
  if (!pcDiv) return false;
  if (!screenCSS || !screenCSS.visible) return false;

  const r = pcDiv.getBoundingClientRect();
  return (
    e.clientX >= r.left && e.clientX <= r.right &&
    e.clientY >= r.top && e.clientY <= r.bottom
  );
}

// =====================
// Click -> Social link OR PC zoom / open UI
// =====================
window.addEventListener('click', (e) => {
  if (!studio || !pcScreen) return;
  if (moving) return;
  if (introPlaying) return;

  // إذا النقرة داخل شاشة الكمبيوتر (iframe) نتركها للـ iframe
  if (isClickInsidePCScreen(e)) return;

  setMouseFromEvent(e);

  // Social click (يعمل حتى أثناء pcMode)
  if (socialRoots.length) {
    const sHits = raycaster.intersectObjects(socialRoots, true);
    if (sHits.length) {
      let curS = sHits[0].object;
      while (curS) {
        if (SOCIAL_LINKS[curS.name]) {
          window.open(SOCIAL_LINKS[curS.name], '_blank', 'noopener,noreferrer');
          return;
        }
        curS = curS.parent;
      }
    }
  }

  // إذا نحن داخل pcMode: لا نعيد فتح الكمبيوتر مرة ثانية
  if (pcMode) return;

  // PC click
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
function animate() {
  requestAnimationFrame(animate);

  // Intro animation
  if (introPlaying) {
    introTime += 1 / 60;
    const p = Math.min(introTime / INTRO_DURATION, 1);

    const aPos = easeOutCubic(p);
    const aScale = easeInOutCubic(p);

    const s = START_SCALE + (1 - START_SCALE) * aScale;
    world.scale.setScalar(s);

    camera.position.lerpVectors(START_CAM, HOME_CAM, aPos);

    controls.autoRotateSpeed = INTRO_ROTATE_MIN + (INTRO_ROTATE_MAX - INTRO_ROTATE_MIN) * aPos;
    controls.update();

    if (p >= 1) {
      introPlaying = false;

      world.scale.setScalar(1);
      camera.position.copy(HOME_CAM);
      controls.target.copy(HOME_TARGET);
      controls.update();

      controls.autoRotate = true;
      controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
      controls.enabled = true;
      idleRotate = true;
    }
  }

  // Move animation (zoom)
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

  // Idle rotate
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