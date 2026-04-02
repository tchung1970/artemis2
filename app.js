// ============================================================
// Artemis II Mission Tracker — 3D Visualization
// ============================================================

// --- Configuration ---
const LAUNCH_DATE = new Date('2026-04-01T12:00:00Z');
const MISSION_DURATION_DAYS = 10;

// Scale: 1 unit = ~4000 km (artistic, not to true scale)
const EARTH_MOON_DIST = 96;
const EARTH_RADIUS = 5;
const MOON_RADIUS = 1.8;
const SUN_RADIUS = 12;

// Moon position on its orbit circle (consistent with orbit ring)
const MOON_ANGLE = Math.PI * 1.15; // position on the circular orbit
const MOON_POS = new THREE.Vector3(
    Math.cos(MOON_ANGLE) * EARTH_MOON_DIST,
    0,
    Math.sin(MOON_ANGLE) * EARTH_MOON_DIST
);

// Solar system planets (artistic scale, distances compressed)
const PLANETS = [
    { name: 'Mercury', color: 0xaaaaaa, emissive: 0x333333, radius: 0.8, dist: 250, speed: 0.004 },
    { name: 'Venus',   color: 0xe8c06a, emissive: 0x443311, radius: 1.5, dist: 350, speed: 0.003 },
    { name: 'Earth',   color: null, radius: null, dist: 500, speed: 0.002 }, // placeholder, Earth is at origin in mission view
    { name: 'Mars',    color: 0xcc5533, emissive: 0x441100, radius: 1.2, dist: 680, speed: 0.0015 },
    { name: 'Jupiter', color: 0xd4a46a, emissive: 0x332200, radius: 6,   dist: 1000, speed: 0.0007 },
    { name: 'Saturn',  color: 0xead6a6, emissive: 0x332200, radius: 5,   dist: 1350, speed: 0.0004 },
];

// Mission phases (hours from launch)
const PHASES = [
    { name: 'LAUNCH',               start: 0,       end: 12 },
    { name: 'TRANS-LUNAR INJECTION',start: 12,      end: 48 },
    { name: 'OUTBOUND COAST',       start: 48,      end: 120 },
    { name: 'LUNAR FLYBY',          start: 120,     end: 144 },
    { name: 'RETURN COAST',         start: 144,     end: 216 },
    { name: 'RE-ENTRY',             start: 216,     end: 240 },
];

// Day-by-day mission data (10-day mission) — source: NASA official agenda
const DAY_DATA = [
    { // Day 1 — Launch Day
        description: 'Liftoff on SLS. ICPS fires to raise orbit, then again for high-Earth orbit insertion. Crew checks Orion systems — water, toilet, CO₂ removal. Orion handling test, ICPS separation & proximity ops demo. ICPS disposal burn. TLI geometry engine firing. Deep Space Network emergency comms check.',
        phase: 'LAUNCH',
    },
    { // Day 2
        description: 'Wiseman and Glover set up flywheel exercise device and begin first workouts. Koch and Hansen exercise in the afternoon. Koch prepares for translunar injection (TLI) burn using Orion\'s main engine (6,000 lbs thrust). Post-TLI: crew acclimation time. First space-to-ground video communication.',
        phase: 'TRANS-LUNAR INJECTION',
    },
    { // Day 3
        description: 'Outbound trajectory correction burn after morning meal. Hansen prepares the burn. Glover, Koch, and Hansen perform CPR demonstrations in space. Wiseman and Glover check out the medical kit. Koch tests Deep Space Network emergency comms. Full crew rehearses choreography for scientific observations.',
        phase: 'OUTBOUND COAST',
    },
    { // Day 4
        description: 'Second outbound trajectory correction burn. Each crew member spends 1 hour reviewing geographic targets for lunar imagery. 20 minutes dedicated to photographing celestial bodies from Orion\'s windows.',
        phase: 'OUTBOUND COAST',
    },
    { // Day 5
        description: 'Orion enters the lunar sphere of influence. Morning: extensive spacesuit testing — donning, pressurization, seat installation while suited, eating and drinking through helmet port. Afternoon: final outbound trajectory correction burn before lunar flyby.',
        phase: 'OUTBOUND COAST',
    },
    { // Day 6
        description: 'Closest approach to the Moon — 4,000–6,000 miles from the lunar surface. Potential record distance from Earth. Crew spends the majority of the day photographing and filming the Moon\'s surface with real-time observation recording. 30–50 minute communications blackout behind the Moon.',
        phase: 'LUNAR FLYBY',
    },
    { // Day 7
        description: 'Orion exits the lunar sphere of influence. Scientists communicate with the crew to debrief observations. First of three return trajectory correction burns. Off-duty rest period for the crew.',
        phase: 'RETURN COAST',
    },
    { // Day 8
        description: 'Solar flare / radiation protection demonstration — crew builds an improvised shelter using onboard supplies. Manual piloting assessment: target centering, tail-to-Sun positioning, attitude maneuvers in six and three-degree-of-freedom modes.',
        phase: 'RETURN COAST',
    },
    { // Day 9
        description: 'Re-entry and splashdown procedure review. Return trajectory correction burn. Waste collection system demonstration. Orthostatic intolerance garment testing — body measurements, questionnaire, and fit assessment for future long-duration missions.',
        phase: 'RETURN COAST',
    },
    { // Day 10
        description: 'Final return trajectory correction burn. Cabin reconfigured — equipment stowed, seats installed, suits donned. Service module separation exposes the heat shield. Forward bay cover jettison. Drogue chutes, pilot chutes, then three main parachutes deploy. Splashdown in the Pacific at ~17 mph. NASA/Navy recovery teams retrieve Orion.',
        phase: 'RE-ENTRY / SPLASHDOWN',
    },
];

// --- Three.js Setup ---
let scene, camera, renderer, controls;
let earth, moon, sun, orion, orionGlow;
let planetMeshes = [];
let planetOrbitLines = [];
let trajectoryLine, trajectoryTraveled;
let earthOrbitLine, moonOrbitLine;
let labels = [];
let showLabels = true;
let showOrbits = true;
let selectedDay = null; // null = live/real-time, 1-11 = jump to that day
let simElapsedMs = null; // when a day is selected, holds the fixed elapsed time

const trajectoryPoints = [];
const totalTrajectorySegments = 2000;

init();
animate();

function init() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 120, 160);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0e17, 1);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 5000;
    controls.target.set(0, 0, 0);

    createStars();

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.6));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(200, 100, 150);
    scene.add(sunLight);

    createSun();
    createEarth();
    createMoon();
    createSolarSystemPlanets();
    computeTrajectory();
    createTrajectoryLine();
    createOrion();
    createOrbitRings();
    createLabels();

    window.addEventListener('resize', onResize);
    setupUI();

    // Dismiss loading screen after first render
    renderer.render(scene, camera);
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => loadingScreen.remove(), 800);
        }
    }, 1500);
}

// --- Stars ---
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 8000;
    const positions = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
        const r = 4000 + Math.random() * 6000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
        color: 0xccddff,
        size: 3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
    });

    scene.add(new THREE.Points(starsGeometry, starsMaterial));

    // A second layer of brighter, sparser stars
    const brightStarsGeo = new THREE.BufferGeometry();
    const brightCount = 500;
    const brightPositions = new Float32Array(brightCount * 3);
    for (let i = 0; i < brightCount; i++) {
        const r = 3500 + Math.random() * 5000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        brightPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        brightPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        brightPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    brightStarsGeo.setAttribute('position', new THREE.BufferAttribute(brightPositions, 3));
    const brightMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1,
    });
    scene.add(new THREE.Points(brightStarsGeo, brightMat));
}

// --- Sun ---
function createSun() {
    const sunGeo = new THREE.SphereGeometry(SUN_RADIUS, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffdd44,
    });
    sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(500, 50, 400);
    scene.add(sun);

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(SUN_RADIUS * 2.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffaa22,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(sun.position);
    scene.add(glow);

    // Point light from Sun
    const sunPointLight = new THREE.PointLight(0xffeedd, 0.8, 3000);
    sunPointLight.position.copy(sun.position);
    scene.add(sunPointLight);
}

// --- Earth ---
function createEarth() {
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const loader = new THREE.TextureLoader();

    // Start with a decent-looking procedural base, then upgrade with texture
    const earthMat = new THREE.MeshPhongMaterial({
        color: 0x2244aa,
        emissive: 0x112244,
        shininess: 25,
    });
    earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.set(0, 0, 0);
    scene.add(earth);

    // Load real Earth texture (NASA Blue Marble)
    loader.load(
        'https://unpkg.com/three-globe@2.34.0/example/img/earth-blue-marble.jpg',
        (texture) => {
            earth.material = new THREE.MeshPhongMaterial({
                map: texture,
                shininess: 15,
                specular: new THREE.Color(0x333333),
            });
        }
    );

    // Load bump map for terrain relief
    loader.load(
        'https://unpkg.com/three-globe@2.34.0/example/img/earth-topology.png',
        (bumpTex) => {
            if (earth.material.map) {
                earth.material.bumpMap = bumpTex;
                earth.material.bumpScale = 0.3;
                earth.material.needsUpdate = true;
            }
        }
    );

    // Cloud layer
    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.01, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeo, cloudMat);
    clouds.name = 'clouds';
    scene.add(clouds);

    // Load cloud texture
    loader.load(
        'https://unpkg.com/three-globe@2.34.0/example/img/earth-clouds.png',
        (cloudTex) => {
            clouds.material.alphaMap = cloudTex;
            clouds.material.map = cloudTex;
            clouds.material.needsUpdate = true;
        }
    );

    // Atmosphere glow — multiple layers for realistic Fresnel-like effect
    const glowColors = [
        { radius: 1.04, opacity: 0.15, color: 0x4488ff },
        { radius: 1.08, opacity: 0.10, color: 0x3377ee },
        { radius: 1.14, opacity: 0.06, color: 0x2266dd },
        { radius: 1.22, opacity: 0.03, color: 0x1155cc },
    ];
    glowColors.forEach(g => {
        const geo = new THREE.SphereGeometry(EARTH_RADIUS * g.radius, 64, 64);
        const mat = new THREE.MeshBasicMaterial({
            color: g.color,
            transparent: true,
            opacity: g.opacity,
            side: THREE.BackSide,
        });
        scene.add(new THREE.Mesh(geo, mat));
    });
}

// --- Moon ---
function createMoon() {
    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 64, 64);

    // Generate procedural Moon textures (color + bump)
    const { colorTex, bumpTex } = generateMoonTextures();

    const moonMat = new THREE.MeshPhongMaterial({
        map: colorTex,
        bumpMap: bumpTex,
        bumpScale: 0.15,
        shininess: 3,
        specular: new THREE.Color(0x111111),
    });
    moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.copy(MOON_POS);
    scene.add(moon);

    // Multi-layer subtle glow (like the reference)
    [
        { r: 1.03, opacity: 0.08, color: 0xcccccc },
        { r: 1.07, opacity: 0.04, color: 0xaaaaaa },
        { r: 1.12, opacity: 0.02, color: 0x888888 },
    ].forEach(g => {
        const geo = new THREE.SphereGeometry(MOON_RADIUS * g.r, 48, 48);
        const mat = new THREE.MeshBasicMaterial({
            color: g.color,
            transparent: true,
            opacity: g.opacity,
            side: THREE.BackSide,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(MOON_POS);
        scene.add(m);
    });
}

function generateMoonTextures() {
    const size = 2048;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d');

    // --- Noise helper ---
    // Simple seeded value noise for terrain
    function hash(x, y) {
        let h = x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
    }

    function smoothNoise(x, y) {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = hash(ix, iy), b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }

    function fbm(x, y, octaves) {
        let val = 0, amp = 0.5, freq = 1;
        for (let i = 0; i < octaves; i++) {
            val += amp * smoothNoise(x * freq, y * freq);
            amp *= 0.5;
            freq *= 2.1;
        }
        return val;
    }

    // --- Maria (dark regions) ---
    // Approximate positions of major lunar maria (in UV space 0-1)
    const maria = [
        { cx: 0.35, cy: 0.42, rx: 0.12, ry: 0.10, dark: 0.55 },  // Mare Imbrium
        { cx: 0.42, cy: 0.55, rx: 0.10, ry: 0.08, dark: 0.50 },  // Mare Serenitatis
        { cx: 0.50, cy: 0.52, rx: 0.08, ry: 0.12, dark: 0.52 },  // Mare Tranquillitatis
        { cx: 0.38, cy: 0.62, rx: 0.06, ry: 0.05, dark: 0.48 },  // Mare Vaporum
        { cx: 0.55, cy: 0.60, rx: 0.09, ry: 0.07, dark: 0.50 },  // Mare Fecunditatis
        { cx: 0.30, cy: 0.55, rx: 0.07, ry: 0.09, dark: 0.53 },  // Mare Humorum
        { cx: 0.28, cy: 0.48, rx: 0.06, ry: 0.07, dark: 0.50 },  // Oceanus Procellarum (part)
        { cx: 0.22, cy: 0.42, rx: 0.08, ry: 0.12, dark: 0.52 },  // Oceanus Procellarum (part 2)
        { cx: 0.45, cy: 0.45, rx: 0.05, ry: 0.04, dark: 0.48 },  // Mare Frigoris fragment
        { cx: 0.40, cy: 0.30, rx: 0.15, ry: 0.05, dark: 0.55 },  // Mare Frigoris
        { cx: 0.58, cy: 0.45, rx: 0.06, ry: 0.08, dark: 0.50 },  // Mare Crisium
        { cx: 0.48, cy: 0.65, rx: 0.07, ry: 0.05, dark: 0.52 },  // Mare Nectaris
    ];

    function mariaInfluence(u, v) {
        let influence = 0;
        for (const m of maria) {
            const du = (u - m.cx) / m.rx;
            const dv = (v - m.cy) / m.ry;
            const dist2 = du * du + dv * dv;
            if (dist2 < 4) {
                const f = Math.exp(-dist2 * 1.2);
                influence = Math.max(influence, f * m.dark);
            }
        }
        return influence;
    }

    // --- Craters ---
    // Pre-generate random craters
    const craters = [];
    // Large craters
    for (let i = 0; i < 40; i++) {
        craters.push({
            cx: Math.random(), cy: Math.random(),
            r: 0.015 + Math.random() * 0.025,
            depth: 0.6 + Math.random() * 0.4,
            rimBright: 0.15 + Math.random() * 0.1,
        });
    }
    // Medium craters
    for (let i = 0; i < 150; i++) {
        craters.push({
            cx: Math.random(), cy: Math.random(),
            r: 0.005 + Math.random() * 0.012,
            depth: 0.4 + Math.random() * 0.4,
            rimBright: 0.08 + Math.random() * 0.08,
        });
    }
    // Small craters
    for (let i = 0; i < 500; i++) {
        craters.push({
            cx: Math.random(), cy: Math.random(),
            r: 0.001 + Math.random() * 0.005,
            depth: 0.3 + Math.random() * 0.3,
            rimBright: 0.04 + Math.random() * 0.06,
        });
    }

    // Ray craters (bright streaks radiating outward, like Tycho and Copernicus)
    const rayCraters = [
        { cx: 0.38, cy: 0.78, r: 0.018, rays: 12, rayLen: 0.15, brightness: 0.25 },  // Tycho-like
        { cx: 0.28, cy: 0.48, r: 0.015, rays: 8, rayLen: 0.08, brightness: 0.15 },   // Copernicus-like
        { cx: 0.55, cy: 0.35, r: 0.012, rays: 6, rayLen: 0.06, brightness: 0.12 },   // Aristarchus-like
    ];

    // --- Render pixel by pixel ---
    const colorData = ctx.createImageData(size, size);
    const bumpData = bctx.createImageData(size, size);

    for (let py = 0; py < size; py++) {
        const v = py / size;
        for (let px = 0; px < size; px++) {
            const u = px / size;
            const idx = (py * size + px) * 4;

            // Base highland brightness with multi-octave noise
            let brightness = 0.62 + fbm(u * 30, v * 30, 6) * 0.22;

            // Fine grain noise for surface texture
            brightness += (fbm(u * 120, v * 120, 4) - 0.5) * 0.06;
            brightness += (fbm(u * 250, v * 250, 3) - 0.5) * 0.03;

            // Maria darkening
            const mf = mariaInfluence(u, v);
            if (mf > 0) {
                // Add noise variation within maria
                const mariaNoiseVal = fbm(u * 40 + 100, v * 40 + 100, 4);
                brightness -= mf * (0.7 + mariaNoiseVal * 0.3);
                brightness = Math.max(0.18, brightness);
            }

            // Bump value starts matching brightness
            let bump = brightness;

            // Craters
            for (const c of craters) {
                let du = u - c.cx, dv = v - c.cy;
                // Wrap around texture edges
                if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
                if (dv > 0.5) dv -= 1; if (dv < -0.5) dv += 1;
                const dist = Math.sqrt(du * du + dv * dv);
                if (dist < c.r * 2) {
                    const t = dist / c.r;
                    if (t < 0.85) {
                        // Interior — darker, lower
                        const interior = 1 - Math.pow(1 - t / 0.85, 2);
                        brightness -= c.depth * 0.12 * (1 - interior * 0.5);
                        bump -= c.depth * 0.15 * (1 - t / 0.85);
                    } else if (t < 1.1) {
                        // Rim — brighter, raised
                        const rimT = (t - 0.85) / 0.25;
                        const rimShape = Math.sin(rimT * Math.PI);
                        brightness += c.rimBright * rimShape;
                        bump += c.depth * 0.12 * rimShape;
                    } else if (t < 1.8) {
                        // Ejecta blanket — slight brightness variation
                        const ejectaT = (t - 1.1) / 0.7;
                        brightness += c.rimBright * 0.3 * (1 - ejectaT);
                    }
                }
            }

            // Ray crater streaks
            for (const rc of rayCraters) {
                let du = u - rc.cx, dv = v - rc.cy;
                if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
                if (dv > 0.5) dv -= 1; if (dv < -0.5) dv += 1;
                const dist = Math.sqrt(du * du + dv * dv);
                if (dist < rc.r) {
                    brightness += rc.brightness;
                    bump += 0.05;
                } else if (dist < rc.rayLen) {
                    const angle = Math.atan2(dv, du);
                    const rayMatch = Math.pow(Math.cos(angle * rc.rays * 0.5), 2);
                    const fade = 1 - (dist - rc.r) / (rc.rayLen - rc.r);
                    const rayWidth = 0.4 + 0.6 * fade;
                    if (rayMatch > rayWidth) {
                        brightness += rc.brightness * fade * 0.5 * (rayMatch - rayWidth) / (1 - rayWidth);
                    }
                }
            }

            // Slight warm/cool color variation
            brightness = Math.max(0.08, Math.min(1, brightness));
            const warmth = fbm(u * 15 + 50, v * 15 + 50, 3);

            const r = Math.floor(brightness * (210 + warmth * 20));
            const g = Math.floor(brightness * (205 + warmth * 10));
            const b = Math.floor(brightness * (195 + warmth * 5));

            colorData.data[idx]     = Math.min(255, r);
            colorData.data[idx + 1] = Math.min(255, g);
            colorData.data[idx + 2] = Math.min(255, b);
            colorData.data[idx + 3] = 255;

            bump = Math.max(0, Math.min(1, bump));
            const bv = Math.floor(bump * 255);
            bumpData.data[idx]     = bv;
            bumpData.data[idx + 1] = bv;
            bumpData.data[idx + 2] = bv;
            bumpData.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(colorData, 0, 0);
    bctx.putImageData(bumpData, 0, 0);

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.wrapS = THREE.RepeatWrapping;
    colorTex.wrapT = THREE.ClampToEdgeWrapping;

    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.ClampToEdgeWrapping;

    return { colorTex, bumpTex };
}

// --- Solar System Planets ---
function createSolarSystemPlanets() {
    PLANETS.forEach(p => {
        if (!p.color) return; // skip Earth placeholder

        // Planet mesh
        const geo = new THREE.SphereGeometry(p.radius, 24, 24);
        const mat = new THREE.MeshPhongMaterial({
            color: p.color,
            emissive: p.emissive || 0x000000,
            shininess: 10,
        });
        const mesh = new THREE.Mesh(geo, mat);
        const angle = Math.random() * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * p.dist, 0, Math.sin(angle) * p.dist);
        mesh.userData = { dist: p.dist, speed: p.speed, angle: angle, name: p.name };
        scene.add(mesh);
        planetMeshes.push(mesh);

        // Saturn's rings
        if (p.name === 'Saturn') {
            const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.2, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xddcc88,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2.5;
            mesh.add(ring);
        }

        // Orbit ring
        const orbitGeo = new THREE.BufferGeometry();
        const orbitPts = [];
        for (let i = 0; i <= 128; i++) {
            const a = (i / 128) * Math.PI * 2;
            orbitPts.push(new THREE.Vector3(Math.cos(a) * p.dist, 0, Math.sin(a) * p.dist));
        }
        orbitGeo.setFromPoints(orbitPts);
        const orbitMat = new THREE.LineDashedMaterial({
            color: 0x1a2a3a,
            dashSize: 8,
            gapSize: 6,
            transparent: true,
            opacity: 0.15,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orbitLine.computeLineDistances();
        scene.add(orbitLine);
        planetOrbitLines.push(orbitLine);
    });
}

// --- Trajectory ---
function computeTrajectory() {
    const LEO_RADIUS = EARTH_RADIUS + 1.5;

    // 1. Launch day — Earth orbit, ICPS ops, TLI prep (~10% of mission)
    const orbitSegments = Math.floor(totalTrajectorySegments * 0.10);
    for (let i = 0; i <= orbitSegments; i++) {
        const t = i / orbitSegments;
        const angle = t * Math.PI * 4; // several orbits on Day 1
        trajectoryPoints.push(new THREE.Vector3(
            Math.cos(angle) * LEO_RADIUS,
            Math.sin(angle) * 0.3,
            Math.sin(angle) * LEO_RADIUS
        ));
    }

    // 2. TLI + outbound coast to Moon — Days 2–5 (~40%)
    const lastOrbitPt = trajectoryPoints[trajectoryPoints.length - 1];
    const coastSegments = Math.floor(totalTrajectorySegments * 0.40);

    const cp1 = new THREE.Vector3(
        lastOrbitPt.x + 15,
        3,
        lastOrbitPt.z - 30
    );
    const cp2 = new THREE.Vector3(
        MOON_POS.x + 30,
        5,
        MOON_POS.z + 35
    );

    for (let i = 1; i <= coastSegments; i++) {
        const t = i / coastSegments;
        const pt = cubicBezier(lastOrbitPt, cp1, cp2, MOON_POS.clone().add(new THREE.Vector3(5, 2, 8)), t);
        trajectoryPoints.push(pt);
    }

    // 3. Lunar flyby — Day 6 (~10%, closest approach 4,000–6,000 mi)
    const flybySegments = Math.floor(totalTrajectorySegments * 0.10);
    const flybyRadius = MOON_RADIUS + 2;

    for (let i = 1; i <= flybySegments; i++) {
        const t = i / flybySegments;
        const angle = -Math.PI * 0.3 + t * Math.PI * 1.1;
        trajectoryPoints.push(new THREE.Vector3(
            MOON_POS.x + Math.cos(angle) * flybyRadius * (1 + t * 0.5),
            MOON_POS.y + Math.sin(t * Math.PI) * 3,
            MOON_POS.z + Math.sin(angle) * flybyRadius * (1 + t * 0.3)
        ));
    }

    // 4. Return coast — Days 7–10 (~40%)
    const returnStart = trajectoryPoints[trajectoryPoints.length - 1];
    const returnSegments = Math.floor(totalTrajectorySegments * 0.40);
    const earthReturn = new THREE.Vector3(EARTH_RADIUS + 0.5, -1, 2);

    const rcp1 = new THREE.Vector3(returnStart.x - 20, -4, returnStart.z + 40);
    const rcp2 = new THREE.Vector3(-15, -6, 30);

    for (let i = 1; i <= returnSegments; i++) {
        const t = i / returnSegments;
        trajectoryPoints.push(cubicBezier(returnStart, rcp1, rcp2, earthReturn, t));
    }
}

function cubicBezier(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return new THREE.Vector3(
        mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
        mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y,
        mt*mt*mt*p0.z + 3*mt*mt*t*p1.z + 3*mt*t*t*p2.z + t*t*t*p3.z
    );
}

function createTrajectoryLine() {
    // Full planned trajectory (dashed, dim)
    const fullGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
    const fullMat = new THREE.LineDashedMaterial({
        color: 0x1a4a6a,
        dashSize: 1.5,
        gapSize: 0.8,
        transparent: true,
        opacity: 0.4,
    });
    trajectoryLine = new THREE.Line(fullGeo, fullMat);
    trajectoryLine.computeLineDistances();
    scene.add(trajectoryLine);

    // Traveled trajectory (solid, bright cyan)
    const traveledGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints.slice(0, 1));
    const traveledMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.9,
        linewidth: 2,
    });
    trajectoryTraveled = new THREE.Line(traveledGeo, traveledMat);
    scene.add(trajectoryTraveled);
}

// --- Orion Spacecraft ---
function createOrion() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(0.5, 1.2, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xdddddd, emissive: 0x333333, shininess: 60 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI;
    group.add(body);

    const smGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 8);
    const smMat = new THREE.MeshPhongMaterial({ color: 0xbbbbbb, emissive: 0x222222 });
    const sm = new THREE.Mesh(smGeo, smMat);
    sm.position.y = -1;
    group.add(sm);

    const panelGeo = new THREE.BoxGeometry(3.5, 0.05, 0.8);
    const panelMat = new THREE.MeshPhongMaterial({ color: 0x1a3a6a, emissive: 0x0a1a3a, shininess: 100 });
    const panel1 = new THREE.Mesh(panelGeo, panelMat);
    panel1.position.set(0, -1, 0);
    group.add(panel1);

    const frameGeo = new THREE.BoxGeometry(3.6, 0.08, 0.05);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const frame1 = new THREE.Mesh(frameGeo, frameMat);
    frame1.position.set(0, -1, 0.4);
    group.add(frame1);
    const frame2 = frame1.clone();
    frame2.position.z = -0.4;
    group.add(frame2);

    group.scale.set(0.8, 0.8, 0.8);
    orion = group;
    scene.add(orion);

    const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15 });
    orionGlow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(orionGlow);
}

// --- Orbit Rings ---
function createOrbitRings() {
    // LEO ring
    const leoRadius = EARTH_RADIUS + 1.5;
    const leoGeo = new THREE.RingGeometry(leoRadius - 0.03, leoRadius + 0.03, 128);
    const leoMat = new THREE.MeshBasicMaterial({
        color: 0x2a4a6a, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    earthOrbitLine = new THREE.Mesh(leoGeo, leoMat);
    earthOrbitLine.rotation.x = -Math.PI / 2;
    scene.add(earthOrbitLine);

    // Moon's orbital path
    const moonOrbitGeo = new THREE.BufferGeometry();
    const moonOrbitPts = [];
    for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        moonOrbitPts.push(new THREE.Vector3(
            Math.cos(a) * EARTH_MOON_DIST,
            0,
            Math.sin(a) * EARTH_MOON_DIST
        ));
    }
    moonOrbitGeo.setFromPoints(moonOrbitPts);
    const moonOrbitMat = new THREE.LineDashedMaterial({
        color: 0x2a3a4a, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.25,
    });
    moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    moonOrbitLine.computeLineDistances();
    scene.add(moonOrbitLine);
}

// --- Labels ---
function createLabels() {
    const labelContainer = document.createElement('div');
    labelContainer.id = 'label-container';
    labelContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    document.body.appendChild(labelContainer);

    const labelData = [
        { name: 'Earth', obj: earth, offset: new THREE.Vector3(0, EARTH_RADIUS + 2, 0) },
        { name: 'Moon', obj: moon, offset: new THREE.Vector3(0, MOON_RADIUS + 1.5, 0) },
        { name: 'Orion', obj: null, offset: new THREE.Vector3(0, 2.5, 0), isOrion: true },
        { name: 'Sun', obj: sun, offset: new THREE.Vector3(0, SUN_RADIUS + 4, 0) },
    ];

    // Add planet labels
    planetMeshes.forEach(mesh => {
        labelData.push({
            name: mesh.userData.name,
            obj: mesh,
            offset: new THREE.Vector3(0, mesh.geometry.parameters.radius + 2, 0),
        });
    });

    labelData.forEach(data => {
        const el = document.createElement('div');
        el.textContent = data.name;
        el.style.cssText = `
            position: absolute;
            color: #8ba4bc;
            font-family: 'SF Mono', 'Fira Code', monospace;
            font-size: 11px;
            letter-spacing: 1px;
            text-shadow: 0 0 8px rgba(0,0,0,0.8);
            pointer-events: none;
            white-space: nowrap;
        `;
        if (data.isOrion) {
            el.style.color = '#00e5ff';
            el.style.fontWeight = '600';
        }
        labelContainer.appendChild(el);
        labels.push({ el, ...data });
    });
}

function updateLabels() {
    labels.forEach(label => {
        if (!showLabels) {
            label.el.style.display = 'none';
            return;
        }
        label.el.style.display = '';

        let worldPos;
        if (label.isOrion && orion) {
            worldPos = orion.position.clone().add(label.offset);
        } else if (label.obj) {
            worldPos = label.obj.position.clone().add(label.offset);
        } else {
            return;
        }

        const screenPos = worldPos.clone().project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

        if (screenPos.z > 1) {
            label.el.style.display = 'none';
            return;
        }

        label.el.style.left = x + 'px';
        label.el.style.top = y + 'px';
    });
}

// --- Mission Simulation ---
function getMissionProgress() {
    let elapsed;
    if (simElapsedMs !== null) {
        // Day selector active — use fixed time (middle of that day)
        elapsed = simElapsedMs;
    } else {
        // Real-time mode
        elapsed = Date.now() - LAUNCH_DATE.getTime();
    }
    elapsed = Math.max(0, elapsed);
    const elapsedHours = elapsed / 3600000;
    const totalHours = MISSION_DURATION_DAYS * 24;
    const progress = Math.min(1, Math.max(0, elapsedHours / totalHours));
    return { elapsedHours, progress, elapsedMs: elapsed };
}

function getCurrentPhase(elapsedHours) {
    for (let i = PHASES.length - 1; i >= 0; i--) {
        if (elapsedHours >= PHASES[i].start) return PHASES[i];
    }
    return PHASES[0];
}

function formatMET(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function updateMissionInfo(progress, elapsedHours, elapsedMs) {
    document.getElementById('met').textContent = formatMET(elapsedMs);

    const phase = getCurrentPhase(elapsedHours);
    const dayIndex = Math.min(Math.floor(elapsedHours / 24), DAY_DATA.length - 1);
    const dayData = DAY_DATA[dayIndex];

    // Use day-specific phase label if available, otherwise fall back to computed phase
    document.getElementById('mission-phase').textContent = dayData ? dayData.phase : phase.name;

    const idx = Math.min(Math.floor(progress * trajectoryPoints.length), trajectoryPoints.length - 1);
    const pos = trajectoryPoints[idx] || trajectoryPoints[0];

    const distEarth = pos.length() * 4000;
    const distMoon = pos.distanceTo(moon.position) * 4000;

    document.getElementById('dist-earth').textContent =
        distEarth < 1000 ? `${Math.round(distEarth)} km` : `${(distEarth / 1000).toFixed(1)}k km`;
    document.getElementById('dist-moon').textContent =
        distMoon < 1000 ? `${Math.round(distMoon)} km` : `${(distMoon / 1000).toFixed(1)}k km`;

    let velocity = 0;
    if (idx > 0 && idx < trajectoryPoints.length - 1) {
        const prev = trajectoryPoints[idx - 1];
        const next = trajectoryPoints[idx + 1];
        const segDist = prev.distanceTo(next) * 4000;
        const segTime = (2 * MISSION_DURATION_DAYS * 24 * 3600) / trajectoryPoints.length;
        velocity = segDist / segTime;
    }
    document.getElementById('velocity').textContent = `${velocity.toFixed(2)} km/s`;

    // Update day description
    if (dayData) {
        document.getElementById('day-description').textContent = dayData.description;
    }

    updateTimeline(elapsedHours);
}

function updateTimeline(elapsedHours) {
    const items = document.querySelectorAll('.timeline-item');
    // launch, TLI, outbound, lunar flyby, return, reentry/splashdown
    const phaseThresholds = [0, 12, 48, 120, 144, 216];

    items.forEach((item, i) => {
        const threshold = phaseThresholds[i] || 0;
        const nextThreshold = phaseThresholds[i + 1] || Infinity;
        item.classList.remove('active', 'completed');
        if (elapsedHours >= nextThreshold) {
            item.classList.add('completed');
        } else if (elapsedHours >= threshold) {
            item.classList.add('active');
        }
    });
}

function updateSpacecraft(progress) {
    const idx = Math.min(Math.floor(progress * (trajectoryPoints.length - 1)), trajectoryPoints.length - 1);
    const pos = trajectoryPoints[idx];

    if (orion && pos) {
        orion.position.copy(pos);
        orionGlow.position.copy(pos);

        if (idx < trajectoryPoints.length - 2) {
            const next = trajectoryPoints[idx + 1];
            orion.lookAt(pos.clone().add(next.clone().sub(pos).normalize()));
        }

        const traveledPts = trajectoryPoints.slice(0, idx + 1);
        if (traveledPts.length > 1) {
            trajectoryTraveled.geometry.dispose();
            trajectoryTraveled.geometry = new THREE.BufferGeometry().setFromPoints(traveledPts);
        }
    }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const { progress, elapsedHours, elapsedMs } = getMissionProgress();

    updateSpacecraft(progress);

    // Rotate Earth and clouds
    if (earth) earth.rotation.y += 0.002;
    const clouds = scene.getObjectByName('clouds');
    if (clouds) clouds.rotation.y += 0.0025; // clouds drift slightly faster

    // Slowly orbit planets
    planetMeshes.forEach(mesh => {
        const d = mesh.userData;
        d.angle += d.speed * 0.1;
        mesh.position.set(Math.cos(d.angle) * d.dist, 0, Math.sin(d.angle) * d.dist);
        mesh.rotation.y += 0.01;
    });

    // Orbit visibility
    if (earthOrbitLine) earthOrbitLine.visible = showOrbits;
    if (moonOrbitLine) moonOrbitLine.visible = showOrbits;
    if (trajectoryLine) trajectoryLine.visible = showOrbits;
    planetOrbitLines.forEach(l => l.visible = showOrbits);

    updateLabels();

    // Throttled info update
    if (Math.floor(Date.now() / 200) !== animate._lastUpdate) {
        animate._lastUpdate = Math.floor(Date.now() / 200);
        updateMissionInfo(progress, elapsedHours, elapsedMs);
    }

    controls.update();
    renderer.render(scene, camera);
}

// --- UI ---
function setupUI() {
    // Day buttons
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = parseInt(btn.dataset.day);
            selectedDay = day;
            // Jump to the middle of that day (day 1 = 12h into mission, day 2 = 36h, etc.)
            simElapsedMs = ((day - 1) * 24 + 12) * 3600000;
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Immediately update day description
            const dayData = DAY_DATA[day - 1];
            if (dayData) {
                document.getElementById('day-description').textContent = dayData.description;
                document.getElementById('mission-phase').textContent = dayData.phase;
            }

            // Auto-follow spacecraft to the new position
            setTimeout(() => followSpacecraft(), 100);
        });
    });

    // Camera presets
    document.getElementById('nav-earth').addEventListener('click', () => {
        flyTo(new THREE.Vector3(0, 15, 20), new THREE.Vector3(0, 0, 0));
        setActiveNav('nav-earth');
    });

    document.getElementById('nav-moon').addEventListener('click', () => {
        const mp = moon.position;
        flyTo(new THREE.Vector3(mp.x + 5, mp.y + 10, mp.z + 15), mp.clone());
        setActiveNav('nav-moon');
    });

    document.getElementById('nav-spacecraft').addEventListener('click', () => {
        setActiveNav('nav-spacecraft');
        followSpacecraft();
    });

    document.getElementById('nav-solar').addEventListener('click', () => {
        flyTo(new THREE.Vector3(0, 1200, 1500), new THREE.Vector3(0, 0, 0));
        setActiveNav('nav-solar');
    });

    // Toggles
    document.getElementById('nav-labels').addEventListener('click', () => {
        showLabels = !showLabels;
        const toggle = document.querySelector('#nav-labels .toggle');
        toggle.textContent = showLabels ? 'ON' : 'OFF';
        toggle.className = 'toggle ' + (showLabels ? 'on' : 'off');
    });

}

function setActiveNav(id) {
    document.querySelectorAll('.nav-btn').forEach(b => {
        if (!b.classList.contains('toggle-btn')) b.classList.remove('active');
    });
    document.getElementById(id).classList.add('active');
}

function flyTo(targetPos, lookAt, duration = 1500) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = Date.now();

    function animateFly() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startTarget, lookAt, ease);
        if (t < 1) requestAnimationFrame(animateFly);
    }
    animateFly();
}

function followSpacecraft() {
    if (!orion) return;
    const pos = orion.position.clone();
    flyTo(pos.clone().add(new THREE.Vector3(8, 12, 15)), pos);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
