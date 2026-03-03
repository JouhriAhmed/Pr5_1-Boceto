import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const MODEL_PATH = './models/Studio.glb';
const BG_COLOR = 0x000000;
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
  Instagram: 'https://www.instagram.com/USERNAME',
  Linkedin: 'https://www.linkedin.com/in/USERNAME',
  whatsapp: 'https://wa.me/XXXXXXXXXXX'
};

const SOCIAL_HOVER = {
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 1.2
};

// =====================
// DEVICE CAMERA (REAL WEBCAM)
// =====================
const DEVICE_CAMERA_OBJ_NAME = 'Camera';

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
// Intro state
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
let pcObject = null;
let pcGlow = null;
let hoverPC = false;

// Camera glow
let deviceCamObj = null;
let camGlow = null;
let hoverCam = false;

// Social
let socialRoots = [];
let socialHoverName = null;
const socialMatBackup = new Map();

// PC Screen DOM
let pcDiv = null;

// =====================
// Smooth camera move
// =====================
let moving = false;
// ✅ open device camera after zoom finishes
let pendingOpenDeviceCam = false;
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
// Glow mesh
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

  cssRenderer.domElement.style.pointerEvents = 'auto';

  controls.enabled = false;
  controls.autoRotate = false;
  idleRotate = false;

  hoverPC = false;
  if (pcGlow) pcGlow.visible = false;

  hoverCam = false;
  if (camGlow) camGlow.visible = false;

  document.body.style.cursor = 'default';
}

function exitPCMode() {
  pcMode = false;
  if (screenCSS) screenCSS.visible = false;

  cssRenderer.domElement.style.pointerEvents = 'none';

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
// DEVICE CAMERA (Virtual Backgrounds + Captures strip)
// =====================
let deviceCamOpen = false;
let camStream = null;
let camOverlayEl = null;
let camVideoEl = null;
let camCanvasEl = null;
let camCanvasCtx = null;
let camImgEl = null;

// MediaPipe SelfieSegmentation
let selfieSegmentation = null;
let segRunning = false;
let segRafId = 0;

// ✅✅✅ Virtual backgrounds list (Fondo 0 first)
// Fondo 0 = GREEN (no image url)
const VBG_LIST = [
  { name: 'Fondo 0', url: null }, // ✅ nuevo (verde)
  { name: 'Fondo 1', url: new URL('./assets/bg1.jpg', window.location.href).toString() },
  { name: 'Fondo 2', url: new URL('./assets/bg2.webp', window.location.href).toString() },
  { name: 'Fondo 3', url: new URL('./assets/bg3.avif', window.location.href).toString() },
  { name: 'Fondo 4', url: new URL('./assets/bg4.avif', window.location.href).toString() },
];

let vbgIndex = 0;

// ✅ لا نحمل Image لـ Fondo 0 لأنه ليس ملف
const vbgImgs = VBG_LIST.map((b) => {
  if (!b.url) return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = b.url;
  return img;
});

function vbgReady(i) {
  // Fondo 0 always ready
  if (i === 0) return true;
  const img = vbgImgs[i];
  return img && img.complete && (img.naturalWidth > 0);
}

// ---- Captures strip ----
let shotsBarEl = null;
// ===== Gallery mode helpers =====
let galleryBackBtnEl = null;
let camActionsRowEl = null;   // row: Capturar / Repetir
let camBgRowEl = null;        // row: Fondos buttons

function setGalleryMode(on) {
  if (!camCanvasEl || !camImgEl || !camActionsRowEl || !camBgRowEl || !galleryBackBtnEl) return;

  if (on) {
    camImgEl.style.display = 'block';
    camCanvasEl.style.display = 'none';
    camActionsRowEl.style.display = 'none';
    camBgRowEl.style.display = 'none';
    galleryBackBtnEl.style.display = 'inline-flex';
  } else {
    camImgEl.style.display = 'none';
    camCanvasEl.style.display = 'block';
    camActionsRowEl.style.display = 'flex';
    camBgRowEl.style.display = 'flex';
    galleryBackBtnEl.style.display = 'none';
  }
}

function openGalleryImage(dataUrl) {
  if (!camImgEl) return;
  camImgEl.src = dataUrl;
  setGalleryMode(true);
}

function addShotThumbnail(dataUrl) {
  if (!shotsBarEl) return;

  const thumb = document.createElement('img');
  thumb.src = dataUrl;
  thumb.style.width = '110px';
  thumb.style.height = '70px';
  thumb.style.objectFit = 'cover';
  thumb.style.borderRadius = '10px';
  thumb.style.border = '1px solid rgba(255,255,255,.25)';
  thumb.style.cursor = 'pointer';

  thumb.addEventListener('click', () => openGalleryImage(dataUrl));

  shotsBarEl.prepend(thumb);
}

function initSelfieSegmentation() {
  if (selfieSegmentation) return;

  if (!window.SelfieSegmentation) {
    console.error('❌ SelfieSegmentation no está disponible. Revisa el script del CDN en index.html.');
    return;
  }

  selfieSegmentation = new window.SelfieSegmentation({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });

  selfieSegmentation.setOptions({
    modelSelection: 1,
  });

  selfieSegmentation.onResults((results) => {
    if (!camCanvasEl || !camCanvasCtx) return;

    const w = results.image.width;
    const h = results.image.height;

    if (camCanvasEl.width !== w) camCanvasEl.width = w;
    if (camCanvasEl.height !== h) camCanvasEl.height = h;

    const ctx = camCanvasCtx;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1) mask
    ctx.drawImage(results.segmentationMask, 0, 0, w, h);

    // 2) person only
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, w, h);

    // 3) background behind person
    ctx.globalCompositeOperation = 'destination-over';

    // ✅ Fondo 0 = GREEN
    if (vbgIndex === 0) {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, w, h);
    } else if (vbgReady(vbgIndex)) {
      const bg = vbgImgs[vbgIndex];
      const imgW = bg.naturalWidth || w;
      const imgH = bg.naturalHeight || h;

      // cover
      const scale = Math.max(w / imgW, h / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const dx = (w - drawW) / 2;
      const dy = (h - drawH) / 2;

      ctx.drawImage(bg, dx, dy, drawW, drawH);
    } else {
      // fallback green
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  });
}

async function startSegmentationLoop() {
  if (!selfieSegmentation || !camVideoEl) return;
  segRunning = true;

  const tick = async () => {
    if (!segRunning) return;

    try {
      if (camVideoEl.readyState >= 2) {
        await selfieSegmentation.send({ image: camVideoEl });
      }
    } catch (e) {
      console.error('Segmentation error:', e);
    }

    segRafId = requestAnimationFrame(tick);
  };

  tick();
}

function stopSegmentationLoop() {
  segRunning = false;
  if (segRafId) cancelAnimationFrame(segRafId);
  segRafId = 0;
}

function ensureDeviceCamOverlay() {
  if (camOverlayEl) return;

  const wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.zIndex = '10000';
  wrap.style.display = 'none';
  wrap.style.placeItems = 'center';
  wrap.style.background = 'rgba(0,0,0,0.65)';
  wrap.style.pointerEvents = 'auto';
  wrap.style.padding = '20px';

  const panel = document.createElement('div');
  panel.style.width = 'min(900px, 95vw)';
  panel.style.borderRadius = '18px';
  panel.style.overflow = 'hidden';
  panel.style.background = 'rgba(255,255,255,0.08)';
  panel.style.border = '1px solid rgba(255,255,255,0.18)';
  panel.style.backdropFilter = 'blur(10px)';
  panel.style.boxShadow = '0 18px 60px rgba(0,0,0,.35)';

  const top = document.createElement('div');
  top.style.display = 'flex';
  top.style.alignItems = 'center';
  top.style.justifyContent = 'space-between';
  top.style.padding = '12px 14px';
  top.style.color = '#fff';
  top.style.background = 'rgba(10, 20, 60, .65)';

  const title = document.createElement('div');
  title.textContent = 'Cámara del dispositivo';
  title.style.fontWeight = '700';

  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.width = '38px';
  close.style.height = '32px';
  close.style.border = 'none';
  close.style.borderRadius = '10px';
  close.style.background = '#ff4d4d';
  close.style.color = '#fff';
  close.style.cursor = 'pointer';

  top.appendChild(title);
  top.appendChild(close);

  const backBtn = document.createElement('button');
  backBtn.textContent = '← Volver a cámara';
  backBtn.style.display = 'none';
  backBtn.style.alignItems = 'center';
  backBtn.style.gap = '8px';
  backBtn.style.padding = '8px 12px';
  backBtn.style.borderRadius = '12px';
  backBtn.style.border = '1px solid rgba(255,255,255,.25)';
  backBtn.style.background = 'rgba(255,255,255,.12)';
  backBtn.style.color = '#fff';
  backBtn.style.cursor = 'pointer';

  top.insertBefore(backBtn, close);
  galleryBackBtnEl = backBtn;

  backBtn.addEventListener('click', () => {
    setGalleryMode(false);
  });

  const content = document.createElement('div');
  content.style.padding = '14px';
  content.style.display = 'grid';
  content.style.gap = '12px';

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.display = 'none';

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.borderRadius = '14px';
  canvas.style.background = '#000';
  canvas.style.display = 'block';

  const img = document.createElement('img');
  img.style.width = '100%';
  img.style.borderRadius = '14px';
  img.style.display = 'none';
  img.style.objectFit = 'contain';
  img.style.background = '#000';
  img.style.maxHeight = 'calc(90vh - 170px)';
  img.style.height = 'auto';

  const bgRow = document.createElement('div');
  camBgRowEl = bgRow;
  bgRow.style.display = 'flex';
  bgRow.style.gap = '8px';
  bgRow.style.flexWrap = 'wrap';

  const bgLabel = document.createElement('div');
  bgLabel.textContent = 'Fondos:';
  bgLabel.style.color = 'rgba(255,255,255,.85)';
  bgLabel.style.fontFamily = 'Arial';
  bgLabel.style.fontSize = '13px';
  bgLabel.style.marginRight = '6px';
  bgLabel.style.alignSelf = 'center';
  bgRow.appendChild(bgLabel);

  const bgBtns = [];
  function updateBgButtonsUI() {
    bgBtns.forEach((b, i) => {
      b.style.outline = (i === vbgIndex) ? '2px solid rgba(255,255,255,.9)' : 'none';
      b.style.background = (i === vbgIndex) ? 'rgba(255,255,255,.20)' : 'rgba(255,255,255,.12)';
    });
  }

  VBG_LIST.forEach((bg, i) => {
    const b = document.createElement('button');
    b.textContent = bg.name;
    b.style.padding = '10px 12px';
    b.style.borderRadius = '12px';
    b.style.border = '1px solid rgba(255,255,255,.25)';
    b.style.background = 'rgba(255,255,255,.12)';
    b.style.color = '#fff';
    b.style.cursor = 'pointer';
    b.addEventListener('click', () => {
      vbgIndex = i;
      updateBgButtonsUI();
    });
    bgBtns.push(b);
    bgRow.appendChild(b);
  });
  updateBgButtonsUI();

  const row = document.createElement('div');
  camActionsRowEl = row;
  row.style.display = 'flex';
  row.style.gap = '10px';
  row.style.flexWrap = 'wrap';

  const snap = document.createElement('button');
  snap.textContent = '📸 Capturar';
  snap.style.flex = '1';
  snap.style.minWidth = '160px';
  snap.style.padding = '12px 14px';
  snap.style.borderRadius = '14px';
  snap.style.border = '1px solid rgba(255,255,255,.25)';
  snap.style.background = 'rgba(255,255,255,.12)';
  snap.style.color = '#fff';
  snap.style.cursor = 'pointer';

  const retake = document.createElement('button');
  retake.textContent = '🔄 Repetir';
  retake.style.flex = '1';
  retake.style.minWidth = '160px';
  retake.style.padding = '12px 14px';
  retake.style.borderRadius = '14px';
  retake.style.border = '1px solid rgba(255,255,255,.25)';
  retake.style.background = 'rgba(255,255,255,.12)';
  retake.style.color = '#fff';
  retake.style.cursor = 'pointer';

  row.appendChild(snap);
  row.appendChild(retake);

  const shotsWrap = document.createElement('div');
  shotsWrap.style.display = 'grid';
  shotsWrap.style.gap = '10px';

  const shotsTitle = document.createElement('div');
  shotsTitle.textContent = 'Capturas';
  shotsTitle.style.color = 'rgba(255,255,255,.85)';
  shotsTitle.style.fontFamily = 'Arial';
  shotsTitle.style.fontSize = '13px';

  const shotsBar = document.createElement('div');
  shotsBar.style.display = 'flex';
  shotsBar.style.gap = '8px';
  shotsBar.style.overflowX = 'auto';
  shotsBar.style.paddingBottom = '6px';

  shotsWrap.appendChild(shotsTitle);
  shotsWrap.appendChild(shotsBar);

  const hint = document.createElement('div');
  hint.style.color = 'rgba(255,255,255,.85)';
  hint.style.fontFamily = 'Arial';
  hint.style.fontSize = '13px';

  content.appendChild(video);
  content.appendChild(canvas);
  content.appendChild(bgRow);
  content.appendChild(row);
  content.appendChild(shotsWrap);
  content.appendChild(img);
  content.appendChild(hint);

  panel.appendChild(top);
  panel.appendChild(content);
  wrap.appendChild(panel);
  document.body.appendChild(wrap);

  camOverlayEl = wrap;
  camVideoEl = video;
  camCanvasEl = canvas;
  camCanvasCtx = canvas.getContext('2d', { willReadFrequently: false });
  camImgEl = img;

  shotsBarEl = shotsBar;

  close.addEventListener('click', closeDeviceCamera);
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) closeDeviceCamera();
  });

  snap.addEventListener('click', () => {
    if (!camCanvasEl) return;

    const dataUrl = camCanvasEl.toDataURL('image/png');
    camImgEl.src = dataUrl;
    camImgEl.style.display = 'block';
    camCanvasEl.style.display = 'none';

    addShotThumbnail(dataUrl);
  });

  retake.addEventListener('click', () => {
    camImgEl.style.display = 'none';
    camCanvasEl.style.display = 'block';
  });
}

async function openDeviceCamera() {
  ensureDeviceCamOverlay();

  if (pcMode) exitPCMode();

  deviceCamOpen = true;

  controls.enabled = false;
  controls.autoRotate = false;
  idleRotate = false;

  hoverPC = false;
  if (pcGlow) pcGlow.visible = false;

  hoverCam = false;
  if (camGlow) camGlow.visible = false;

  camOverlayEl.style.display = 'grid';
  camImgEl.style.display = 'none';
  camCanvasEl.style.display = 'block';
  setGalleryMode(false);

  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });

    camVideoEl.srcObject = camStream;

    initSelfieSegmentation();
    await camVideoEl.play();

    stopSegmentationLoop();
    startSegmentationLoop();
  } catch (err) {
    console.error('getUserMedia error:', err);
    alert('No se pudo abrir la cámara. Verifica permisos y usa localhost/https.');
    closeDeviceCamera();
  }
}

function closeDeviceCamera() {
  deviceCamOpen = false;

  stopSegmentationLoop();

  if (camOverlayEl) camOverlayEl.style.display = 'none';

  if (camStream) {
    camStream.getTracks().forEach(t => t.stop());
    camStream = null;
  }
  if (camVideoEl) camVideoEl.srcObject = null;

  if (!introPlaying && !moving) {
    controls.enabled = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    idleRotate = true;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && deviceCamOpen) closeDeviceCamera();
});

// =====================
// Hover (mousemove) — PC glow + Camera glow + Social
// =====================
window.addEventListener('mousemove', (e) => {
  if (!studio) return;
  if (introPlaying) return;
  if (deviceCamOpen) return;

  setMouseFromEvent(e);

  // PC hover
  if (!pcMode && pcObject) {
    const hitsPC = raycaster.intersectObject(pcObject, true);
    const nowHoverPC = hitsPC.length > 0;

    if (nowHoverPC !== hoverPC) {
      hoverPC = nowHoverPC;
      if (pcGlow) pcGlow.visible = hoverPC;
    }
  } else {
    hoverPC = false;
    if (pcGlow) pcGlow.visible = false;
  }

  // Camera hover
  if (!pcMode && deviceCamObj) {
    const hitsCam = raycaster.intersectObject(deviceCamObj, true);
    const nowHoverCam = hitsCam.length > 0;

    if (nowHoverCam !== hoverCam) {
      hoverCam = nowHoverCam;
      if (camGlow) camGlow.visible = hoverCam;
    }
  } else {
    hoverCam = false;
    if (camGlow) camGlow.visible = false;
  }

  // Social hover
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
    }
  }

  // Cursor
  if (hoverPC || hoverCam || socialHoverName) {
    document.body.style.cursor = 'pointer';
  } else {
    document.body.style.cursor = 'default';
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
    deviceCamObj = studio.getObjectByName(DEVICE_CAMERA_OBJ_NAME);

    if (pcObject) {
      pcGlow = makeGlowFromMesh(pcObject);
      console.log('✅ Brillo (hover) del ordenador creado.');
    } else {
      console.warn('⚠️ No se encontró el objeto "Ordenador". Revisa el nombre en Blender.');
    }

    if (!pcScreen) {
      console.error('❌ No se encontró "PC_SCREEN". Revisa el nombre en Blender.');
      return;
    }

    if (deviceCamObj) {
      camGlow = makeGlowFromMesh(deviceCamObj);
      console.log(`✅ Objeto de cámara encontrado: ${DEVICE_CAMERA_OBJ_NAME}`);
      console.log('✅ Brillo (hover) de la cámara creado.');
    } else {
      console.warn(`⚠️ No se encontró el objeto de cámara: ${DEVICE_CAMERA_OBJ_NAME}`);
    }

    // Social objects
    socialRoots = [];
    Object.keys(SOCIAL_LINKS).forEach((name) => {
      const obj = studio.getObjectByName(name);
      if (!obj) {
        console.warn(`⚠️ No se encontró el objeto social: ${name}`);
        return;
      }
      socialRoots.push(obj);

      obj.traverse((m) => {
        if (!m.isMesh || !m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => cacheMaterial(mat));
      });
    });

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
// Click -> Device Camera OR Social OR PC
// =====================
window.addEventListener('click', (e) => {
  if (!studio || !pcScreen) return;
  if (moving) return;
  if (introPlaying) return;
  if (deviceCamOpen) return;

  if (isClickInsidePCScreen(e)) return;

  setMouseFromEvent(e);

  // 1) Device Camera click (Zoom then open)
  if (deviceCamObj) {
    const camHits = raycaster.intersectObject(deviceCamObj, true);
    if (camHits.length) {

      savedCamPos = camera.position.clone();
      savedTarget = controls.target.clone();

      const box = new THREE.Box3().setFromObject(deviceCamObj);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);

      const q = deviceCamObj.getWorldQuaternion(new THREE.Quaternion());
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize();

      const distance = Math.max(size.length() * 1.2, 1.2);
      const camPosZoom = center.clone().add(forward.multiplyScalar(distance));

      pendingOpenDeviceCam = true;

      startMove(camPosZoom, center, true);
      return;
    }
  }

  // 2) Social click
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

  if (pcMode) return;

  // 3) PC click
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

  if (introPlaying) {
    introTime += 1 / 60;
    const p = Math.min(introTime / INTRO_DURATION, 1);

    const aPos = easeOutCubic(p);
    const aScale = easeInOutCubic(p);

    world.scale.setScalar(START_SCALE + (1 - START_SCALE) * aScale);
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

      if (pendingOpenDeviceCam) {
        pendingOpenDeviceCam = false;
        openDeviceCamera();
        return;
      }

      if (!pcMode && !deviceCamOpen) controls.enabled = true;
    }
  }

  if (idleRotate && !pcMode && !moving && !introPlaying && !deviceCamOpen) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = IDLE_ROTATE_SPEED;
    controls.update();
  } else if (!pcMode && !moving && !introPlaying && !idleRotate && !deviceCamOpen) {
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