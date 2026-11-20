import * as THREE from 'three';

/**
 * Simplified yet geographically recognizable continent polygons [lon, lat] in degrees.
 */
export const CONTINENT_POLYGONS: [number, number][][] = [
  // North America
  [
    [-168, 65], [-162, 70], [-140, 70], [-125, 72], [-110, 74], [-95, 74],
    [-82, 70], [-78, 62], [-64, 60], [-55, 52], [-60, 46], [-70, 42],
    [-76, 35], [-81, 25], [-83, 29], [-90, 29], [-97, 26], [-96, 19],
    [-87, 21], [-88, 16], [-83, 10], [-78, 8], [-80, 9], [-85, 11],
    [-92, 15], [-105, 20], [-110, 24], [-114, 31], [-118, 33], [-123, 38],
    [-125, 48], [-132, 54], [-145, 60], [-160, 56], [-166, 60],
  ],
  // Greenland
  [
    [-52, 60], [-42, 60], [-32, 68], [-20, 76], [-28, 82], [-50, 82],
    [-68, 77], [-56, 70],
  ],
  // South America
  [
    [-78, 9], [-72, 12], [-62, 10], [-50, 2], [-35, -6], [-38, -14],
    [-40, -22], [-48, -28], [-53, -34], [-62, -40], [-66, -48], [-68, -54],
    [-74, -52], [-74, -42], [-72, -32], [-70, -18], [-77, -12], [-81, -5],
    [-79, 2],
  ],
  // Europe (incl. Scandinavia)
  [
    [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 54], [8, 58],
    [5, 61], [14, 68], [26, 71], [32, 69], [28, 60], [22, 60], [18, 59],
    [13, 55], [19, 54], [24, 56], [28, 59], [36, 55], [40, 47], [30, 46],
    [28, 41], [23, 38], [18, 40], [15, 38], [12, 42], [9, 44], [4, 43],
    [0, 39], [-5, 36],
  ],
  // UK & Ireland
  [
    [-6, 50], [-5, 55], [-2, 58], [1, 53], [1, 51],
  ],
  // Africa
  [
    [-17, 15], [-16, 21], [-12, 28], [-6, 36], [10, 37], [12, 33],
    [25, 32], [32, 31], [35, 26], [43, 12], [51, 12], [45, 2],
    [40, -10], [35, -24], [28, -33], [18, -35], [15, -26], [12, -16],
    [12, -5], [9, 4], [2, 6], [-8, 5], [-14, 10],
  ],
  // Madagascar
  [
    [44, -25], [47, -25], [50, -15], [48, -13], [44, -18],
  ],
  // Asia + Middle East + India + SE Asia
  [
    [28, 41], [36, 37], [35, 31], [39, 21], [44, 13], [54, 17],
    [59, 22], [52, 26], [56, 27], [62, 25], [68, 23], [73, 18],
    [77, 8], [81, 15], [88, 22], [92, 21], [97, 16], [100, 12],
    [104, 2], [104, 10], [109, 13], [108, 21], [116, 23], [121, 25],
    [122, 31], [120, 36], [124, 39], [129, 36], [129, 41], [135, 44],
    [141, 52], [138, 57], [150, 60], [162, 60], [172, 65], [178, 67],
    [160, 70], [135, 72], [105, 76], [85, 73], [68, 70], [58, 68],
    [42, 66], [36, 55], [40, 47], [46, 43], [52, 41], [42, 41],
  ],
  // Japan
  [
    [130, 32], [136, 34], [141, 38], [145, 44], [141, 45], [138, 39], [133, 35],
  ],
  // Indonesia / Borneo / Sumatra
  [
    [96, 5], [105, -6], [106, -3], [100, 2],
  ],
  [
    [109, -3], [118, -3], [118, 5], [112, 3],
  ],
  // Australia
  [
    [114, -22], [122, -17], [131, -12], [136, -12], [142, -11], [146, -18],
    [153, -26], [151, -34], [146, -38], [138, -35], [130, -32], [122, -34],
    [115, -34], [114, -27],
  ],
  // New Zealand
  [
    [167, -46], [173, -41], [178, -37], [175, -42], [170, -46],
  ],
];

/**
 * Convert latitude & longitude (degrees) into a 3D Cartesian coordinate on a sphere of radius R.
 * Standard equirectangular UV alignment for Three.js SphereGeometry:
 * lon = -180..180, lat = -90..90
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);

  target.x = -radius * Math.sin(phi) * Math.cos(theta);
  target.y = radius * Math.cos(phi);
  target.z = radius * Math.sin(phi) * Math.sin(theta);
  return target;
}

/**
 * Procedurally generate crisp equirectangular Albedo + Roughness/Landmask CanvasTextures
 * for the 3D globe (Zero external image URLs / zero 404s).
 */
export function createWorldGlobeTextures(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 2048;
  const height = 1024;

  // 1. Albedo Canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0c1c30');
  oceanGrad.addColorStop(0.5, '#091526');
  oceanGrad.addColorStop(1, '#0c1c30');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  const lonToX = (lon: number) => ((lon + 180) / 360) * width;
  const latToY = (lat: number) => ((90 - lat) / 180) * height;

  // Subtle lat/lon graticule lines
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.11)';
  ctx.lineWidth = 1;
  for (let lon = -165; lon <= 180; lon += 15) {
    const x = lonToX(lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = latToY(lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Equator highlight
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, latToY(0));
  ctx.lineTo(width, latToY(0));
  ctx.stroke();

  // Draw continents with crisp coastlines
  ctx.save();
  for (const poly of CONTINENT_POLYGONS) {
    ctx.beginPath();
    poly.forEach(([lon, lat], idx) => {
      const x = lonToX(lon);
      const y = latToY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    // Elevated slate-emerald land tone
    ctx.fillStyle = '#1e334d';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  ctx.restore();

  // Subtle dot grid across landmasses for cartographic texture
  ctx.save();
  ctx.beginPath();
  for (const poly of CONTINENT_POLYGONS) {
    poly.forEach(([lon, lat], idx) => {
      const x = lonToX(lon);
      const y = latToY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  }
  ctx.clip();
  ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
  for (let x = 0; x < width; x += 14) {
    for (let y = 0; y < height; y += 14) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.restore();

  // 2. Roughness & Bump Canvas (ocean = low roughness/glossy, continents = matte & raised)
  const dataCanvas = document.createElement('canvas');
  dataCanvas.width = 1024;
  dataCanvas.height = 512;
  const dctx = dataCanvas.getContext('2d')!;
  // Ocean base: dark grey (low bump, glossy)
  dctx.fillStyle = '#404040';
  dctx.fillRect(0, 0, 1024, 512);

  for (const poly of CONTINENT_POLYGONS) {
    dctx.beginPath();
    poly.forEach(([lon, lat], idx) => {
      const x = ((lon + 180) / 360) * 1024;
      const y = ((90 - lat) / 180) * 512;
      if (idx === 0) dctx.moveTo(x, y);
      else dctx.lineTo(x, y);
    });
    dctx.closePath();
    dctx.fillStyle = '#d8d8d8';
    dctx.fill();
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(dataCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(dataCanvas);
  bumpMap.anisotropy = maxAnisotropy;

  return { colorMap, roughnessMap, bumpMap };
}
