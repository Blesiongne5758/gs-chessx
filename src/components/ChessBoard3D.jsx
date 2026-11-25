import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { resolveChessSkin } from '../lib/chessSkins';

const FILES = 'abcdefgh';

function makePiece(type, color, skin = 'classic', customization, performance = {}) {
  const group = new THREE.Group();
  const white = color === 'w';
  const skinSet = resolveChessSkin(skin, customization);
  const palette = white ? skinSet.white : skinSet.black;
  const materials = {
    body: new THREE.MeshStandardMaterial({ color: palette.body, roughness: skin === 'neon' ? 0.22 : 0.42, metalness: skin === 'neon' ? 0.42 : 0.2 }),
    trim: new THREE.MeshStandardMaterial({ color: palette.accent, roughness: skin === 'neon' ? 0.18 : 0.3, metalness: skin === 'neon' ? 0.82 : 0.58 }),
  };
  const add = (geometry, material, y, x = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cyl = (rTop, rBottom, height, y, material = materials.body, segments = 8) =>
    add(new THREE.CylinderGeometry(rTop, rBottom, height, segments), material, y);
  const box = (w, h, d, x, y, z, material = materials.body) =>
    add(new THREE.BoxGeometry(w, h, d), material, y, x, z);

  cyl(0.29, 0.34, 0.12, 0.09, materials.trim, 8);
  cyl(0.24, 0.29, 0.16, 0.22, materials.body, 8);
  // A faction mark makes the skin readable even at board scale: cross for Holy,
  // diagonal X for Anarchy. It sits on the front face like the reference sprites.
  const markY = 0.40;
  if (white) {
    box(0.055, 0.20, 0.028, 0, markY, 0.20, materials.trim);
    box(0.16, 0.055, 0.028, 0, markY, 0.20, materials.trim);
  } else {
    const markA = box(0.045, 0.25, 0.028, 0, markY, 0.20, materials.trim);
    markA.rotation.z = Math.PI / 4;
    const markB = box(0.045, 0.25, 0.028, 0, markY, 0.20, materials.trim);
    markB.rotation.z = -Math.PI / 4;
  }
  switch (type) {
    case 'p':
      cyl(0.15, 0.21, 0.22, 0.40);
      add(new THREE.SphereGeometry(0.16, 8, 6), materials.body, 0.61);
      break;
    case 'r':
      cyl(0.20, 0.24, 0.24, 0.42);
      box(0.42, 0.10, 0.42, 0, 0.59, 0, materials.trim);
      for (let i = -1; i <= 1; i++) if (i !== 0) {
        box(0.10, 0.14, 0.10, i * 0.14, 0.70, i === 1 ? -0.14 : 0.14);
      }
      box(0.10, 0.14, 0.10, 0.14, 0.70, 0.14);
      box(0.10, 0.14, 0.10, -0.14, 0.70, -0.14);
      break;
    case 'b':
      cyl(0.14, 0.20, 0.24, 0.42);
      add(new THREE.OctahedronGeometry(0.22, 0), materials.trim, 0.66);
      box(0.09, 0.42, 0.09, 0, 0.67, 0, materials.body);
      break;
    case 'n':
      cyl(0.16, 0.22, 0.20, 0.42);
      box(0.26, 0.24, 0.22, 0, 0.62, 0);
      box(0.20, 0.25, 0.20, 0.04, 0.82, -0.04, materials.trim);
      box(0.16, 0.14, 0.18, 0.08, 0.96, -0.08);
      box(0.20, 0.07, 0.08, 0.10, 0.87, -0.18);
      box(0.06, 0.06, 0.06, 0.14, 0.99, -0.16, materials.trim);
      break;
    case 'q':
      cyl(0.18, 0.23, 0.28, 0.44);
      cyl(0.24, 0.16, 0.10, 0.63, materials.trim);
      cyl(0.11, 0.17, 0.20, 0.77);
      add(new THREE.SphereGeometry(0.11, 8, 6), materials.trim, 0.92);
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        add(new THREE.SphereGeometry(0.045, 6, 4), materials.trim, 0.69, Math.cos(angle) * 0.21, Math.sin(angle) * 0.21);
      }
      break;
    case 'k':
      cyl(0.18, 0.24, 0.28, 0.44);
      cyl(0.22, 0.16, 0.10, 0.63, materials.trim);
      cyl(0.12, 0.16, 0.20, 0.77);
      box(0.09, 0.31, 0.09, 0, 1.01, 0, materials.trim);
      box(0.23, 0.08, 0.09, 0, 1.05, 0, materials.trim);
      break;
    default:
      return null;
  }
  if ((skin === 'anime' || skin === 'custom') && (type === 'k' || type === 'q') && customization?.aura !== false) {
    const requestedParticleCount = customization?.particleCount ?? 12;
    const particleCount = Math.min(requestedParticleCount, performance.maxParticles ?? requestedParticleCount);
    const particleSize = customization?.particleSize ?? 0.035;
    const particleSpeed = customization?.particleSpeed ?? 1;
    const fx = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.72 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(type === 'k' ? 0.27 : 0.23, 0.018, 6, 16), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = type === 'k' ? 1.12 : 1.02;
    fx.add(ring);
    const particleGeometry = new THREE.BoxGeometry(particleSize, particleSize, particleSize);
    const primaryParticleMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.88, depthWrite: false });
    const secondaryParticleMaterial = new THREE.MeshBasicMaterial({ color: palette.accentDark, transparent: true, opacity: 0.88, depthWrite: false });
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const particle = new THREE.Mesh(particleGeometry, i % 2 ? primaryParticleMaterial : secondaryParticleMaterial);
      particle.userData.orbit = { angle, radius: 0.24 + (i % 3) * 0.04, speed: (0.65 + (i % 4) * 0.14) * particleSpeed, y: 0.76 + (i % 4) * 0.1 };
      fx.add(particle);
    }
    fx.userData.cyberFx = true;
    group.add(fx);
  }
  return group;
}

function squareName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

export default function ChessBoard3D({ board, selectedSquare, validTargets = [], lastMove, kingInCheck, onSquareClick, skin = 'classic', customization, whiteName = 'White', blackName = 'Black', capturedByWhite = [], capturedByBlack = [], playerSide = 'w' }) {
  const hostRef = useRef(null);
  const boardRef = useRef(null);
  const sceneRef = useRef(null);
  const objectsRef = useRef([]);
  const interactionMeshesRef = useRef([]);
  const animatedEffectsRef = useRef([]);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const onSquareClickRef = useRef(onSquareClick);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [yaw, setYaw] = useState(playerSide === 'b' ? 180 : 0);
  const [pitch, setPitch] = useState(24);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gardenBackdrop, setGardenBackdrop] = useState(true);

  useEffect(() => {
    setYaw(playerSide === 'b' ? 180 : 0);
  }, [playerSide]);

  useEffect(() => {
    onSquareClickRef.current = onSquareClick;
  }, [onSquareClick]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const skinSet = resolveChessSkin(skin);
    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frameInterval = isMobile ? 1000 / 30 : 0;
    const scene = new THREE.Scene();
    scene.background = (isFullscreen && gardenBackdrop) ? null : new THREE.Color(0x171411);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 15, 0.01);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf5e9d2, 0x31221a, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffe2a8, 3.1);
    keyLight.position.set(-5, 12, 7);
    keyLight.castShadow = !isMobile;
    keyLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe0e9ff, 1.1);
    fillLight.position.set(8, 7, -6);
    scene.add(fillLight);

    let animationFrame;
    let lastFrame = 0;
    const animate = (time) => {
      animationFrame = requestAnimationFrame(animate);
      if (frameInterval && time - lastFrame < frameInterval) return;
      const delta = lastFrame ? Math.min((time - lastFrame) / 16.67, 2) : 1;
      lastFrame = time;
      animatedEffectsRef.current.forEach((effect) => {
        effect.rotation.y += 0.008 * delta;
        effect.children.forEach((child) => {
          const orbit = child.userData?.orbit;
          if (!orbit) return;
          orbit.angle += orbit.speed * 0.01 * delta;
          child.position.set(Math.cos(orbit.angle) * orbit.radius, orbit.y + Math.sin(orbit.angle * 1.7) * 0.06, Math.sin(orbit.angle) * orbit.radius);
          child.rotation.x += 0.025 * delta;
          child.rotation.z += 0.03 * delta;
        });
      });
      renderer.render(scene, camera);
    };
    if (!reducedMotion) animationFrame = requestAnimationFrame(animate);

    const wood = new THREE.MeshStandardMaterial({ color: skinSet.board.frame, roughness: 0.42, metalness: skin === 'fancy' ? 0.3 : 0.12 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.55, 0.38, 8.55), wood);
    frame.position.y = -0.22;
    frame.receiveShadow = true;
    frame.castShadow = true;
    scene.add(frame);
    const darkWood = new THREE.MeshStandardMaterial({ color: skinSet.board.rim, roughness: 0.35, metalness: skin === 'fancy' ? 0.34 : 0.2 });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(8.68, 0.12, 8.68), darkWood);
    rim.position.y = -0.45;
    scene.add(rim);

    interactionMeshesRef.current = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const light = (row + col) % 2 === 0;
      const color = light ? skinSet.board.light : skinSet.board.dark;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: light ? 0.08 : 0.12 });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.995, 0.12, 0.995), mat);
      tile.position.set(col - 3.5, 0.015, row - 3.5);
      tile.receiveShadow = true;
      tile.castShadow = true;
      scene.add(tile);

      const interaction = new THREE.Mesh(
        new THREE.PlaneGeometry(0.995, 0.995),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      interaction.rotation.x = -Math.PI / 2;
      interaction.position.set(col - 3.5, 0.09, row - 3.5);
      interaction.userData.square = squareName(row, col);
      scene.add(interaction);
      interactionMeshesRef.current.push(interaction);
    }
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      animatedEffectsRef.current = [];
      interactionMeshesRef.current = [];
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [skin]);

  useEffect(() => {
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!camera || !renderer || !scene) return;
    const distance = 15 / zoom;
    const yawRadians = THREE.MathUtils.degToRad(yaw);
    const pitchRadians = THREE.MathUtils.degToRad(pitch);
    camera.position.set(
      Math.sin(yawRadians) * Math.sin(pitchRadians) * distance,
      Math.cos(pitchRadians) * distance,
      Math.cos(yawRadians) * Math.sin(pitchRadians) * distance,
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }, [zoom, yaw, pitch]);

  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return undefined;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const activePointers = new Map();
    const gesture = { startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false, pinchDistance: 0, pinchZoom: 1 };
    const clampZoom = (value) => Math.min(1.2, Math.max(0.4, Number(value.toFixed(2))));
    const clampPitch = (value) => Math.min(64, Math.max(6, Number(value.toFixed(1))));
    const pointerDistance = () => {
      const points = Array.from(activePointers.values());
      if (points.length < 2) return 0;
      return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    };
    const updatePointer = (event) => activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const selectSquareAt = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);
      const hit = raycaster.intersectObjects(interactionMeshesRef.current, false)[0];
      if (hit?.object?.userData?.square) onSquareClickRef.current?.(hit.object.userData.square);
    };
    const onPointerDown = (event) => {
      canvas.setPointerCapture?.(event.pointerId);
      updatePointer(event);
      if (activePointers.size === 1) {
        gesture.startX = event.clientX;
        gesture.startY = event.clientY;
        gesture.lastX = event.clientX;
        gesture.lastY = event.clientY;
        gesture.moved = false;
        canvas.style.cursor = 'grabbing';
      } else if (activePointers.size === 2) {
        gesture.pinchDistance = pointerDistance();
        gesture.pinchZoom = zoomRef.current;
        gesture.moved = true;
      }
    };
    const onPointerMove = (event) => {
      if (!activePointers.has(event.pointerId)) return;
      updatePointer(event);
      if (activePointers.size >= 2) {
        const distance = pointerDistance();
        if (gesture.pinchDistance > 0 && distance > 0) setZoom(clampZoom(gesture.pinchZoom * (distance / gesture.pinchDistance)));
        gesture.moved = true;
        event.preventDefault();
        return;
      }
      const dx = event.clientX - gesture.lastX;
      const dy = event.clientY - gesture.lastY;
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 5) gesture.moved = true;
      if (gesture.moved) {
        setYaw((value) => Number((value + dx * 0.55).toFixed(1)));
        setPitch((value) => clampPitch(value + dy * 0.35));
        event.preventDefault();
      }
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
    };
    const onPointerUp = (event) => {
      const wasTap = activePointers.size === 1 && !gesture.moved;
      activePointers.delete(event.pointerId);
      if (wasTap) selectSquareAt(event);
      if (activePointers.size === 0) {
        gesture.pinchDistance = 0;
        canvas.style.cursor = 'grab';
      } else if (activePointers.size === 1) {
        const remaining = Array.from(activePointers.values())[0];
        gesture.lastX = remaining.x;
        gesture.lastY = remaining.y;
        gesture.moved = true;
      }
    };
    const onPointerCancel = (event) => {
      activePointers.delete(event.pointerId);
      if (activePointers.size === 0) canvas.style.cursor = 'grab';
    };
    const onWheel = (event) => {
      event.preventDefault();
      setZoom((value) => clampZoom(value - event.deltaY * 0.001));
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === boardRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    if (isFullscreen && gardenBackdrop) {
      sceneRef.current.background = null;
    } else {
      sceneRef.current.background = new THREE.Color(0x171411);
    }
    rendererRef.current?.render(sceneRef.current, cameraRef.current);
  }, [isFullscreen, gardenBackdrop]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === boardRef.current) await document.exitFullscreen();
      else await boardRef.current?.requestFullscreen();
    } catch {
      // Fullscreen can be denied by the browser; the board remains usable normally.
    }
  }

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const object of objectsRef.current) {
      scene.remove(object);
      object.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
        }
      });
    }
    objectsRef.current = [];
    animatedEffectsRef.current = [];
    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const square = squareName(row, col);
      const isSelected = selectedSquare === square;
      const isValid = validTargets.includes(square);
      const isRecent = lastMove && (lastMove.from === square || lastMove.to === square);
      const isCheck = kingInCheck === square;
      if (isSelected || isValid || isRecent || isCheck) {
        const color = isCheck ? 0xc52f3b : isSelected ? 0xd5ad48 : isValid ? 0x4ade80 : 0x81a96a;
        const highlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.94, 0.025, 0.94),
          new THREE.MeshStandardMaterial({ color, transparent: true, opacity: isSelected || isCheck ? 0.8 : isValid ? 0.32 : 0.56, roughness: 0.65 }),
        );
        highlight.position.set(col - 3.5, 0.087, row - 3.5);
        scene.add(highlight);
        objectsRef.current.push(highlight);
        if (isValid && !isSelected) {
          const marker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.13, 0.035, 16),
            new THREE.MeshBasicMaterial({ color: 0xbbf7d0, transparent: true, opacity: 0.84 }),
          );
          marker.position.set(col - 3.5, 0.12, row - 3.5);
          scene.add(marker);
          objectsRef.current.push(marker);
        }
      }
      const piece = board?.[row]?.[col];
      if (piece) {
        const model = makePiece(piece.type, piece.color, skin, customization, { maxParticles: isMobile ? 6 : undefined });
        if (model) {
          model.position.set(col - 3.5, 0.085, row - 3.5);
          scene.add(model);
          objectsRef.current.push(model);
          model.traverse((child) => {
            if (child.userData?.cyberFx) animatedEffectsRef.current.push(child);
          });
        }
      }
    }
    rendererRef.current?.render(scene, cameraRef.current);
  }, [board, selectedSquare, validTargets, lastMove, kingInCheck, skin, customization]);

  function adjustZoom(amount) {
    setZoom((value) => Math.min(1.2, Math.max(0.4, Number((value + amount).toFixed(2)))));
  }

  function adjustYaw(amount) {
    setYaw((value) => Number((value + amount).toFixed(1)));
  }

  function adjustPitch(amount) {
    setPitch((value) => Math.min(64, Math.max(6, Number((value + amount).toFixed(1)))));
  }

  function resetCamera() {
    setZoom(1);
    setYaw(playerSide === 'b' ? 180 : 0);
    setPitch(24);
  }

  return (
    <>
      <div
        ref={boardRef}
        className={`relative isolate aspect-square w-full overflow-hidden rounded-xl border-4 border-[#6b4423] shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'h-screen max-h-screen rounded-none border-0' : 'bg-[#171411]'
        }`}
        style={
          isFullscreen && gardenBackdrop
            ? {
                backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.45)), url(/garden-background.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
        aria-label="Three-dimensional chessboard"
      >
        <div ref={hostRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-between gap-2 text-[10px] sm:text-xs">
          <div className="max-w-[48%] rounded-lg border border-white/15 bg-black/65 px-2 py-1 text-white backdrop-blur"><span className="font-semibold text-gold">♚ {blackName}</span><div className="truncate text-gray-300">Captured: {capturedByBlack.join('') || '—'}</div></div>
          <div className="max-w-[48%] rounded-lg border border-white/15 bg-black/65 px-2 py-1 text-right text-white backdrop-blur"><span className="font-semibold text-gold">♔ {whiteName}</span><div className="truncate text-gray-300">Captured: {capturedByWhite.join('') || '—'}</div></div>
        </div>
        {isFullscreen && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-gold/40 bg-black/75 px-3 py-1 text-xs backdrop-blur">
            <span className="text-gold font-bold">🌿 Royal Garden View</span>
            <button
              type="button"
              onClick={() => setGardenBackdrop((prev) => !prev)}
              className="text-[11px] underline text-gray-300 hover:text-white"
            >
              {gardenBackdrop ? 'Hide Garden' : 'Show Garden'}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-[11px] bg-white/15 px-2 py-0.5 rounded text-gray-200 hover:bg-white/25"
            >
              Exit Fullscreen
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] text-gray-300 backdrop-blur">Drag to rotate · Pinch to zoom</div>
        <div className="sr-only" role="grid" aria-label="Chess board keyboard access">
          {Array.from({ length: 64 }, (_, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const square = squareName(row, col);
            const piece = board?.[row]?.[col];
            const selected = selectedSquare === square;
            const valid = validTargets.includes(square);
            const recent = lastMove && (lastMove.from === square || lastMove.to === square);
            const checked = kingInCheck === square;
            const status = [selected && 'selected', valid && 'legal move target', recent && 'last move', checked && 'king in check'].filter(Boolean).join(', ');
            const pieceName = piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${({ k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' })[piece.type] || piece.type}` : 'empty';
            return <button key={square} type="button" role="gridcell" aria-label={`${square}: ${pieceName}${status ? `, ${status}` : ''}`} aria-pressed={selected} onClick={() => onSquareClick?.(square)}>{square}</button>;
          })}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-gold/20 bg-graphite p-3" aria-label="3D board perspective controls">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80">Perspective controls</p>
            <p className="mt-1 text-[11px] text-gray-400">Adjust angle from outside the board for a clearer view.</p>
          </div>
          <span className="font-mono text-sm font-bold text-gold">{Math.round(zoom * 100)}%</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:max-w-[15rem]" aria-label="Rotate board">
          <button type="button" onClick={() => adjustYaw(-15)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Rotate board left">↶ <span className="sr-only">Left</span></button>
          <button type="button" onClick={() => adjustPitch(-8)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Tilt board up">↟ <span className="sr-only">Up</span></button>
          <button type="button" onClick={() => adjustPitch(8)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Tilt board down">↡ <span className="sr-only">Down</span></button>
          <button type="button" onClick={() => adjustYaw(15)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 transition hover:border-gold/60 hover:text-gold" aria-label="Rotate board right">↷ <span className="sr-only">Right</span></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => adjustZoom(-0.1)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label="Zoom out">−</button>
          <input type="range" min="0.4" max="1.2" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="min-w-[10rem] flex-1 accent-gold" aria-label="Board zoom from 40 to 120 percent" />
          <button type="button" onClick={() => adjustZoom(0.1)} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label="Zoom in">+</button>
          <button type="button" onClick={resetCamera} className="rounded-lg border border-gold/30 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10">Reset</button>
          <button type="button" onClick={() => setGardenBackdrop((prev) => !prev)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${gardenBackdrop ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-obsidian text-gray-400'}`} title="Toggle Royal Garden backdrop in fullscreen 3D">🌿 Garden</button>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg border border-white/10 bg-obsidian px-3 py-2 text-sm text-gray-200 hover:border-gold/60 hover:text-gold" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{isFullscreen ? '×' : '⛶'}</button>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-gray-500"><span>40%</span><span>Board zoom</span><span>120%</span></div>
      </div>
    </>
  );
}
