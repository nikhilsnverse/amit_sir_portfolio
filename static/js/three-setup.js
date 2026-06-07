const HeroScene = (function () {
  let scene, camera, renderer;
  let particles, particlePositions, targetPositions;
  let ringParticles;
  let time = 0;
  const container = document.getElementById('three-container');

  function init() {
    if (!container) return;

    scene = new THREE.Scene();

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.z = 22;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    createParticles();
    createRings();
    createScanLines();

    animate();
    window.addEventListener('resize', onResize);
  }

  function createParticles() {
    const count = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    targetPositions = new Float32Array(count * 3);

    const colorPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x1E88E5),
      new THREE.Color(0x1565C0),
      new THREE.Color(0x42A5F5),
      new THREE.Color(0x2E7D32),
      new THREE.Color(0x43A047),
    ];

    for (let i = 0; i < count; i++) {
      const radius = 5 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const i3 = i * 3;
      const shape = Math.random();

      if (shape < 0.5) {
        const r = 3 + Math.random() * 7;
        const a = Math.random() * Math.PI * 2;
        const b = Math.random() * Math.PI * 2;
        targetPositions[i3] = Math.sin(a) * Math.cos(b) * r;
        targetPositions[i3 + 1] = Math.sin(b) * r * 0.6;
        targetPositions[i3 + 2] = Math.cos(a) * Math.cos(b) * r;
      } else {
        targetPositions[i3] = Math.sin(theta) * Math.cos(phi) * radius;
        targetPositions[i3 + 1] = Math.sin(phi) * radius * 0.5;
        targetPositions[i3 + 2] = Math.cos(theta) * Math.cos(phi) * radius;
      }

      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;

      sizes[i] = 0.03 + Math.random() * 0.08;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlePositions = geometry.attributes.position.array;
  }

  function createRings() {
    const count = 3;
    ringParticles = [];

    for (let r = 0; r < count; r++) {
      const numPoints = 120;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(numPoints * 3);
      const radius = 6 + r * 2.5;
      const phase = (r / count) * Math.PI * 2;

      const ringColors = [0x1E88E5, 0x1565C0, 0x2E7D32];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const i3 = i * 3;
        positions[i3] = Math.cos(angle + phase) * radius;
        positions[i3 + 1] = Math.sin(angle * 2 + phase) * 1.2;
        positions[i3 + 2] = Math.sin(angle + phase) * radius;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: ringColors[r],
        transparent: true,
        opacity: 0.15 - r * 0.02,
      });

      const ring = new THREE.Line(geometry, material);
      scene.add(ring);
      ringParticles.push(ring);
    }
  }

  function createScanLines() {
    const geometry = new THREE.BufferGeometry();
    const numLines = 50;
    const positions = new Float32Array(numLines * 6);

    for (let i = 0; i < numLines; i++) {
      const i6 = i * 6;
      const x = (Math.random() - 0.5) * 24;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 24;
      const len = 0.5 + Math.random() * 1.5;
      const dir = Math.random() * Math.PI * 2;

      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;
      positions[i6 + 3] = x + Math.cos(dir) * len;
      positions[i6 + 4] = y + Math.sin(dir) * len * 0.5;
      positions[i6 + 5] = z + Math.sin(dir) * len;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
    });

    const lines = new THREE.LineSegments(geometry, material);
    scene.add(lines);
  }

  let targetOpacity = 1;

  function show() { targetOpacity = 1; }
  function hide() { targetOpacity = 0; }

  function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    if (!particles) return;

    const pos = particlePositions;
    const count = pos.length / 3;

    const currentOpacity = particles.material.opacity;
    particles.material.opacity += (targetOpacity - currentOpacity) * 0.03;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] += (targetPositions[i3] - pos[i3]) * 0.008;
      pos[i3 + 1] += (targetPositions[i3 + 1] - pos[i3 + 1]) * 0.008;
      pos[i3 + 2] += (targetPositions[i3 + 2] - pos[i3 + 2]) * 0.008;
    }

    particles.geometry.attributes.position.needsUpdate = true;

    camera.position.x = 0;
    camera.position.y = 0;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return { init, show, hide };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => HeroScene.init(), 100);
});
