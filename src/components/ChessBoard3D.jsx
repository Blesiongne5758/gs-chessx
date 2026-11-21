import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { resolveChessSkin } from '../lib/chessSkins';

const FILES = 'abcdefgh';

function makePiece(type, color, skin = 'holy', customization, performance = {}) {
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

export default function ChessBoard3D({ board, selectedSquare, validTargets = [], lastMove, kingInCheck, onSquareClick, skin = 'holy', customization }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const objectsRef = useRef([]);
  const animatedEffectsRef = useRef([]);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const skinSet = resolveChessSkin(skin);
    const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frameInterval = isMobile ? 1000 / 30 : 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171411);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(10.8, 12.6, 14.2);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' });
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

    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const light = (row + col) % 2 === 0;
      const color = light ? skinSet.board.light : skinSet.board.dark;
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.52, metalness: light ? 0.08 : 0.12 });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.995, 0.12, 0.995), mat);
      tile.position.set(col - 3.5, 0.015, row - 3.5);
      tile.receiveShadow = true;
      tile.castShadow = true;
      scene.add(tile);
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
      const isRecent = lastMove && (lastMove.from === square || lastMove.to === square);
      const isCheck = kingInCheck === square;
      if (isSelected || isRecent || isCheck) {
        const color = isCheck ? 0xc52f3b : isSelected ? 0xd5ad48 : 0x81a96a;
        const highlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.94, 0.025, 0.94),
          new THREE.MeshStandardMaterial({ color, transparent: true, opacity: isSelected || isCheck ? 0.8 : 0.56, roughness: 0.65 }),
        );
        highlight.position.set(col - 3.5, 0.087, row - 3.5);
        scene.add(highlight);
        objectsRef.current.push(highlight);
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

  return (
    <div className="relative isolate aspect-square w-full overflow-hidden rounded-xl border-4 border-[#6b4423] bg-[#171411] shadow-2xl" aria-label="Three-dimensional chessboard">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="absolute inset-0 z-10 grid grid-cols-8 grid-rows-8" role="grid" aria-label="Chess board">
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
          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              aria-label={`${square}: ${pieceName}${status ? `, ${status}` : ''}`}
              aria-pressed={selected}
              onClick={() => onSquareClick?.(square)}
              className={`relative flex min-h-0 min-w-0 items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f4d36f] ${selected ? 'ring-2 ring-inset ring-[#f4d36f]' : ''} ${checked ? 'bg-red-600/20' : ''} ${recent && !checked ? 'bg-amber-300/15' : ''}`}
            >
              {valid && <span aria-hidden="true" className={`pointer-events-none absolute ${piece ? 'inset-1 rounded-sm border-2 border-emerald-300/80' : 'h-3 w-3 rounded-full bg-emerald-200/80 shadow-[0_0_8px_2px_rgba(110,231,183,.45)]'}`} />}
              {(row === 7 || col === 0) && <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 right-1 text-[9px] font-semibold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">{row === 7 ? FILES[col] : ''}{col === 0 ? ` ${8 - row}` : ''}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
