import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundManager } from '../utils/audio';
import { Employee } from '../types';
import { getDniDepartment } from '../utils/hondurasDni';
import { Eye, EyeOff, Sparkles, RefreshCw, Zap } from 'lucide-react';

interface BiometricTerminal3DProps {
  activeEmployee?: Employee | null;
  lastStatus?: string | null;
  isInObservation?: boolean;
  isScanning?: boolean;
  onTriggerScan?: () => void;
}

// Pre-allocated math objects to avoid Garbage Collection in the render loop
const _vec3 = new THREE.Vector3();
const _targetBadgePos = new THREE.Vector3(0, 1.35, 0.2);
const _badgeEuler = new THREE.Euler();

// Software WebGL detector
function checkSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

// Generate procedural badge face texture on 2D Canvas
function generateBadgeTexture(
  employee: Employee | null,
  statusText: string | null,
  inObs: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Background gradient: Navy to Deep Blue
  const bg = ctx.createLinearGradient(0, 0, 512, 320);
  bg.addColorStop(0, '#021024');
  bg.addColorStop(0.5, '#052659');
  bg.addColorStop(1, '#0b3558');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 320);

  // Outer border with glow
  ctx.strokeStyle = inObs ? '#f59e0b' : '#00e5ff';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 304);

  // Top Header Banner
  ctx.fillStyle = '#011627';
  ctx.fillRect(8, 8, 496, 56);

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('REPÚBLICA DE HONDURAS', 24, 38);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('CREDENCIAL BIOMÉTRICA DE ASISTENCIA', 24, 54);

  // 5 Stars of Honduras Flag
  ctx.fillStyle = '#00e5ff';
  const starCoords = [
    [440, 32],
    [425, 26],
    [455, 26],
    [425, 38],
    [455, 38]
  ];
  for (const [sx, sy] of starCoords) {
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Employee Photo or Avatar box
  ctx.fillStyle = '#011a38';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(24, 80, 100, 120, 8);
  ctx.fill();
  ctx.stroke();

  // Photo placeholder icon or Initials
  if (employee) {
    const initials = employee.full_name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(initials || 'HN', 74, 150);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ID', 74, 150);
    ctx.textAlign = 'left';
  }

  // Smart Security Microchip graphic
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.roundRect(24, 215, 45, 35, 4);
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 220, 37, 25);
  ctx.beginPath();
  ctx.moveTo(46, 215); ctx.lineTo(46, 250);
  ctx.stroke();

  // Employee Info Fields
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('COLABORADOR:', 140, 95);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  const name = employee ? employee.full_name : 'Escanee su DNI';
  ctx.fillText(name.slice(0, 22), 140, 122);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('CARGO / POSICIÓN:', 140, 148);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  const pos = employee ? employee.position : 'Terminal de Acceso';
  ctx.fillText(pos.slice(0, 26), 140, 168);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('DNI HONDURAS (13 DÍGITOS):', 140, 196);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 17px monospace';
  const dni = employee ? employee.dni : '0801-XXXX-XXXXX';
  ctx.fillText(dni, 140, 218);

  if (employee) {
    const loc = getDniDepartment(employee.dni);
    if (loc) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(`• ${loc.slice(0, 30)}`, 140, 234);
    }
  }

  // Status Badge banner at bottom
  const statusBg = inObs ? '#991b1b' : statusText ? '#065f46' : '#0f172a';
  ctx.fillStyle = statusBg;
  ctx.beginPath();
  ctx.roundRect(140, 245, 340, 48, 6);
  ctx.fill();

  ctx.fillStyle = inObs ? '#fca5a5' : statusText ? '#a7f3d0' : '#38bdf8';
  ctx.font = 'bold 14px system-ui, sans-serif';
  const statusLabel = statusText
    ? `ESTADO: ${statusText.toUpperCase()}${inObs ? ' (EN OBSERVACIÓN)' : ''}`
    : 'ESPERANDO LECTURA BIOMÉTRICA';
  ctx.fillText(statusLabel.slice(0, 36), 155, 270);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generate procedural fingerprint texture on 2D canvas
function generateFingerprintTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, 256, 256);

  // Concentric biometric fingerprint ridges
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (let r = 20; r <= 110; r += 14) {
    ctx.beginPath();
    ctx.ellipse(128, 128, r * 0.7, r, 0, 0.4, Math.PI * 1.85);
    ctx.stroke();
  }

  // Crosshairs
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(128, 10); ctx.lineTo(128, 246);
  ctx.moveTo(10, 128); ctx.lineTo(246, 128);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const BiometricTerminal3D: React.FC<BiometricTerminal3DProps> = ({
  activeEmployee = null,
  lastStatus = null,
  isInObservation = false,
  isScanning = false,
  onTriggerScan,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [viewPreset, setViewPreset] = useState<'front' | 'angled' | 'top'>('angled');

  // Three.js mutable references
  const stateRef = useRef({
    renderer: null as THREE.WebGLRenderer | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    terminalGroup: null as THREE.Group | null,
    badgeMesh: null as THREE.Mesh | null,
    badgeMaterial: null as THREE.MeshStandardMaterial | null,
    laserMesh: null as THREE.Mesh | null,
    haloLight: null as THREE.PointLight | null,
    statusRingMesh: null as THREE.Mesh | null,
    particles: null as THREE.Points | null,
    isSoftwareGl: false,
    frameId: 0,
    isPointerDown: false,
    pointerStartX: 0,
    pointerStartY: 0,
    rotationX: 0.15,
    rotationY: -0.4,
    targetRotationX: 0.15,
    targetRotationY: -0.4,
    scanProgress: 0,
    isScanningActive: false,
  });

  // Update badge texture whenever employee or status changes
  useEffect(() => {
    if (stateRef.current.badgeMaterial) {
      const oldTex = stateRef.current.badgeMaterial.map;
      const newTex = generateBadgeTexture(activeEmployee || null, lastStatus || null, isInObservation);
      stateRef.current.badgeMaterial.map = newTex;
      stateRef.current.badgeMaterial.needsUpdate = true;
      if (oldTex) oldTex.dispose();
    }

    // Update status halo color
    if (stateRef.current.haloLight && stateRef.current.statusRingMesh) {
      let targetColor = 0x00e5ff; // Cyan idle
      if (isInObservation) {
        targetColor = 0xf59e0b; // Amber observation
      } else if (lastStatus) {
        targetColor = 0x10b981; // Green punctual
      }

      stateRef.current.haloLight.color.setHex(targetColor);
      const ringMat = stateRef.current.statusRingMesh.material as THREE.MeshStandardMaterial;
      if (ringMat) {
        ringMat.color.setHex(targetColor);
        ringMat.emissive.setHex(targetColor);
      }
    }
  }, [activeEmployee, lastStatus, isInObservation]);

  // Trigger scan animation and sound
  useEffect(() => {
    if (isScanning) {
      stateRef.current.isScanningActive = true;
      stateRef.current.scanProgress = 0;
      soundManager.playScanSound();
    }
  }, [isScanning]);

  // Camera preset handler
  const setPreset = (preset: 'front' | 'angled' | 'top') => {
    setViewPreset(preset);
    soundManager.vibrate(10);
    if (preset === 'front') {
      stateRef.current.targetRotationX = 0.05;
      stateRef.current.targetRotationY = 0;
    } else if (preset === 'angled') {
      stateRef.current.targetRotationX = 0.18;
      stateRef.current.targetRotationY = -0.45;
    } else if (preset === 'top') {
      stateRef.current.targetRotationX = 0.6;
      stateRef.current.targetRotationY = 0;
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = checkSoftwareGl();
    stateRef.current.isSoftwareGl = isSoftwareGl;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.08);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 1.45, 3.4);
    camera.lookAt(0, 0.9, 0);
    stateRef.current.camera = camera;

    // 2. Renderer configuration
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    stateRef.current.renderer = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Lighting Rig
    // Warm Key Light
    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.2);
    keyLight.position.set(3, 5, 4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.camera.left = -2;
      keyLight.shadow.camera.right = 2;
      keyLight.shadow.camera.top = 2;
      keyLight.shadow.camera.bottom = -2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool Fill Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.85);
    scene.add(hemiLight);

    // Cyan Rim Light
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    rimLight.position.set(-3, 3, -2);
    scene.add(rimLight);

    // Active status halo point light
    const haloLight = new THREE.PointLight(0x00e5ff, 2.5, 4);
    haloLight.position.set(0, 1.1, 0.2);
    scene.add(haloLight);
    stateRef.current.haloLight = haloLight;

    // 5. Composite 3-12 Part Procedural Model: Biometric Terminal Group
    const terminalGroup = new THREE.Group();
    stateRef.current.terminalGroup = terminalGroup;
    scene.add(terminalGroup);

    // Shared materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.88,
      roughness: 0.22,
    });

    const brushedTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.28,
    });

    const cyanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x0073cf,
      emissiveIntensity: 0.7,
      metalness: 0.5,
      roughness: 0.2,
    });

    // Part 1: Heavy Pedestal Base Plate (Beveled)
    const baseGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 32);
    const baseMesh = new THREE.Mesh(baseGeo, darkMetalMat);
    baseMesh.position.y = 0.06;
    baseMesh.receiveShadow = true;
    terminalGroup.add(baseMesh);

    // Part 2: Inner Base Ring Trim
    const baseTrimGeo = new THREE.TorusGeometry(0.82, 0.02, 16, 32);
    baseTrimGeo.rotateX(Math.PI / 2);
    const baseTrimMesh = new THREE.Mesh(baseTrimGeo, cyanAccentMat);
    baseTrimMesh.position.y = 0.12;
    terminalGroup.add(baseTrimMesh);

    // Part 3: Central Stand Column
    const columnGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.75, 24);
    const columnMesh = new THREE.Mesh(columnGeo, brushedTitaniumMat);
    columnMesh.position.y = 0.495;
    columnMesh.castShadow = true;
    columnMesh.receiveShadow = true;
    terminalGroup.add(columnMesh);

    // Part 4: Terminal Console Angled Neck & Housing
    const housingGeo = new THREE.BoxGeometry(0.7, 0.45, 0.42);
    const housingMesh = new THREE.Mesh(housingGeo, darkMetalMat);
    housingMesh.position.set(0, 0.95, 0);
    housingMesh.rotation.x = 0.35; // Ergonomic 20° tilt for user inspection
    housingMesh.castShadow = true;
    housingMesh.receiveShadow = true;
    terminalGroup.add(housingMesh);

    // Part 5: Biometric Scanner Platen Glass
    const platenGeo = new THREE.BoxGeometry(0.52, 0.02, 0.3);
    const fingerprintTex = generateFingerprintTexture();
    fingerprintTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const platenMat = new THREE.MeshStandardMaterial({
      color: 0x001f3f,
      map: fingerprintTex,
      metalness: 0.4,
      roughness: 0.15,
      emissive: 0x003366,
      emissiveIntensity: 0.4,
    });
    const platenMesh = new THREE.Mesh(platenGeo, platenMat);
    platenMesh.position.set(0, 0.23, 0);
    housingMesh.add(platenMesh);

    // Part 6: LED Status Ring around scanner
    const statusRingGeo = new THREE.BoxGeometry(0.56, 0.025, 0.34);
    const statusRingMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.8,
    });
    const statusRingMesh = new THREE.Mesh(statusRingGeo, statusRingMat);
    statusRingMesh.position.set(0, 0.22, 0);
    housingMesh.add(statusRingMesh);
    stateRef.current.statusRingMesh = statusRingMesh;

    // Part 7: Sweeping Laser Beam Line (for biometric scan animation)
    const laserGeo = new THREE.BoxGeometry(0.52, 0.015, 0.025);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
    });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.position.set(0, 0.245, 0);
    platenMesh.add(laserMesh);
    stateRef.current.laserMesh = laserMesh;

    // Part 8: Floating Holographic 3D Employee Badge
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(0, 1.42, 0.15);
    terminalGroup.add(badgeGroup);

    const badgeGeo = new THREE.BoxGeometry(0.95, 0.6, 0.015);
    const initialBadgeTex = generateBadgeTexture(activeEmployee || null, lastStatus || null, isInObservation);
    initialBadgeTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const badgeMat = new THREE.MeshStandardMaterial({
      map: initialBadgeTex,
      metalness: 0.3,
      roughness: 0.25,
      emissive: 0x002244,
      emissiveIntensity: 0.25,
    });
    stateRef.current.badgeMaterial = badgeMat;

    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.castShadow = true;
    badgeGroup.add(badgeMesh);
    stateRef.current.badgeMesh = badgeMesh;

    // Badge frame edge
    const frameGeo = new THREE.BoxGeometry(0.98, 0.63, 0.018);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    badgeGroup.add(frameMesh);

    // Part 9: Floating Biometric Digital Aura Particles
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const radius = 0.5 + Math.random() * 0.4;
      const angle = Math.random() * Math.PI * 2;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = 0.9 + Math.random() * 0.8;
      particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    terminalGroup.add(particles);
    stateRef.current.particles = particles;

    // Part 10: Grounded Radial Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
    shadowGeo.rotateX(-Math.PI / 2);
    // Procedural radial alpha canvas
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.005;
    terminalGroup.add(shadowMesh);

    // 6. Interactive Touch & Pointer Controls for Samsung Galaxy S23 Ultra
    const onPointerDown = (e: PointerEvent) => {
      stateRef.current.isPointerDown = true;
      stateRef.current.pointerStartX = e.clientX;
      stateRef.current.pointerStartY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!stateRef.current.isPointerDown) return;
      const dx = e.clientX - stateRef.current.pointerStartX;
      const dy = e.clientY - stateRef.current.pointerStartY;
      stateRef.current.pointerStartX = e.clientX;
      stateRef.current.pointerStartY = e.clientY;

      stateRef.current.targetRotationY += dx * 0.008;
      stateRef.current.targetRotationX = THREE.MathUtils.clamp(
        stateRef.current.targetRotationX + dy * 0.006,
        -0.2,
        0.75
      );
    };

    const onPointerUp = () => {
      stateRef.current.isPointerDown = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // 7. Render Loop with Exponential Damping & Zero GC
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth exponential damping for turntable rotation
      const dampFactor = 1 - Math.exp(-8 * dt);
      stateRef.current.rotationX = THREE.MathUtils.lerp(
        stateRef.current.rotationX,
        stateRef.current.targetRotationX,
        dampFactor
      );
      stateRef.current.rotationY = THREE.MathUtils.lerp(
        stateRef.current.rotationY,
        stateRef.current.targetRotationY,
        dampFactor
      );

      if (terminalGroup) {
        terminalGroup.rotation.y = stateRef.current.rotationY;
        terminalGroup.rotation.x = stateRef.current.rotationX;
      }

      // Gentle badge hovering float
      if (badgeMesh) {
        const hover = Math.sin(now * 0.0025) * 0.035;
        badgeMesh.position.y = hover;
        badgeMesh.rotation.y = Math.sin(now * 0.0018) * 0.08;
        badgeMesh.rotation.z = Math.cos(now * 0.0015) * 0.02;
      }

      // Laser sweep animation when scanning
      if (laserMesh) {
        if (stateRef.current.isScanningActive) {
          stateRef.current.scanProgress += dt * 2.8;
          laserMesh.visible = true;
          laserMesh.position.z = Math.sin(stateRef.current.scanProgress * Math.PI) * 0.12;
          if (stateRef.current.scanProgress >= 2.0) {
            stateRef.current.isScanningActive = false;
          }
        } else {
          laserMesh.position.z = Math.sin(now * 0.0015) * 0.11;
        }
      }

      // Slowly rotate particle field
      if (particles) {
        particles.rotation.y = now * 0.0004;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        // Software WebGL pacing safeguard
        stateRef.current.frameId = window.setTimeout(() => {
          tick(performance.now());
        }, 60);
      } else {
        stateRef.current.frameId = requestAnimationFrame(tick);
      }
    };

    stateRef.current.frameId = requestAnimationFrame(tick);

    // 8. Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      if (stateRef.current.frameId) {
        cancelAnimationFrame(stateRef.current.frameId);
        clearTimeout(stateRef.current.frameId);
      }
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing touch-none relative"
        aria-label="Escáner Biométrico 3D de Honduras"
      />

      {/* Top HUD Header: Minimal title & Spec Badge */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 px-3 py-1.5 rounded-xl shadow-lg pointer-events-auto backdrop-blur-none">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            TERMINAL BIOMÉTRICA 3D
          </span>
          <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-cyan-800">
            S23 ULTRA
          </span>
        </div>

        <button
          onClick={() => setIsCinemaMode(!isCinemaMode)}
          className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 px-2.5 py-1.5 rounded-xl text-xs font-medium transition pointer-events-auto"
          title={isCinemaMode ? 'Mostrar Controles' : 'Modo Zen / Ocultar Controles'}
        >
          {isCinemaMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isCinemaMode ? 'Controles' : 'Modo Zen'}</span>
        </button>
      </div>

      {/* Unified Bottom Control Dock (Collapsible, Zero Viewport Occlusion) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-md transition-all duration-300 z-10 pointer-events-auto ${
          isCinemaMode ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-2xl flex items-center justify-between gap-2">
          {/* View presets */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPreset('angled')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                viewPreset === 'angled'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D
            </button>
            <button
              onClick={() => setPreset('front')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                viewPreset === 'front'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Frente
            </button>
            <button
              onClick={() => setPreset('top')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                viewPreset === 'top'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cenital
            </button>
          </div>

          {/* Action Button: Scan / Check In */}
          {onTriggerScan && (
            <button
              onClick={onTriggerScan}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs px-3.5 py-2 rounded-xl shadow-md transition active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-200" />
              <span>Simular Escaneo</span>
            </button>
          )}

          <div className="text-[11px] text-slate-400 hidden sm:block pr-1">
            Gira con el dedo o mouse
          </div>
        </div>
      </div>
    </div>
  );
};
