/**
 * Centralized Three.js mock module for testing
 * This provides a consistent set of mocks for Three.js classes and objects
 * to be used across all tests, preventing multiple Three.js instances.
 */
import { vi } from 'vitest';

// Type for event listeners
type EventListener = (event?: any) => void;

// Helper base class for event dispatching
class EventDispatcherMock {
  private _listeners: Map<string, EventListener[]> = new Map();

  addEventListener(type: string, listener: EventListener): void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    const listeners = this._listeners.get(type)!;
    if (!listeners.includes(listener)) {
      listeners.push(listener);
    }
  }

  hasEventListener(type: string, listener: EventListener): boolean {
    const listeners = this._listeners.get(type);
    return listeners !== undefined && listeners.includes(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._listeners.get(type);
    if (listeners !== undefined) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this._listeners.delete(type);
      }
    }
  }

  dispatchEvent(event: { type: string, [key: string]: any }): void {
    const listeners = this._listeners.get(event.type);
    if (listeners !== undefined) {
      // Make a copy to avoid issues if listeners are removed during dispatch
      const listenersCopy = [...listeners];
      for (const listener of listenersCopy) {
        listener(event);
      }
    }
  }
}

// Define types for mocks
type MockVector3 = {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => MockVector3;
  copy: (v: MockVector3) => MockVector3;
  clone: () => MockVector3;
  add: (v: MockVector3) => MockVector3;
  sub: (v: MockVector3) => MockVector3;
  multiplyScalar: (scalar: number) => MockVector3;
  normalize: () => MockVector3;
  length: () => number;
  lengthSq: () => number;
  distanceTo: (v: MockVector3) => number;
  distanceToSquared: (v: MockVector3) => number;
  fromArray: (array: number[], offset?: number) => MockVector3;
  toArray: (array?: number[], offset?: number) => number[];
  equals: (v: MockVector3) => boolean;
  applyQuaternion: (q: any) => MockVector3;
};

type MockQuaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
  set: (x: number, y: number, z: number, w: number) => MockQuaternion;
  copy: (q: MockQuaternion) => MockQuaternion;
  clone: () => MockQuaternion;
  setFromEuler: (euler: any) => MockQuaternion;
  multiply: (q: MockQuaternion) => MockQuaternion;
  equals: (q: MockQuaternion) => boolean;
};

type MockObject3D = {
  position: MockVector3;
  rotation: any;
  quaternion: MockQuaternion;
  scale: MockVector3;
  matrix: any;
  matrixWorld: any;
  children: MockObject3D[];
  parent: MockObject3D | null;
  visible: boolean;
  name: string;
  type: string;
  uuid: string;
  userData: Record<string, any>;
  add: (...objects: MockObject3D[]) => MockObject3D;
  remove: (...objects: MockObject3D[]) => MockObject3D;
  getObjectByName: (name: string) => MockObject3D | undefined;
  traverse: (callback: (object: MockObject3D) => void) => void;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatchEvent: (event: { type: string }) => void;
  updateMatrix: () => void;
  updateMatrixWorld: (force?: boolean) => void;
  lookAt: (vector: MockVector3) => void;
  clone: (recursive?: boolean) => MockObject3D;
};

// Create Object3D factory with event handling
const createObject3DMock = () => {
  const dispatcher = new EventDispatcherMock();
  
  return {
    position: {
      x: 0, y: 0, z: 0,
      set: vi.fn().mockReturnThis(),
      copy: vi.fn().mockReturnThis(),
      sub: vi.fn().mockReturnThis(),
    },
    rotation: { x: 0, y: 0, z: 0 },
    quaternion: {
      x: 0, y: 0, z: 0, w: 1,
      set: vi.fn().mockReturnThis(),
      copy: vi.fn().mockReturnThis(),
    },
    scale: { x: 1, y: 1, z: 1, set: vi.fn().mockReturnThis() },
    matrix: { elements: new Float32Array(16) },
    matrixWorld: { elements: new Float32Array(16) },
    children: [],
    parent: null,
    visible: true,
    name: '',
    type: 'Object3D',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    add: vi.fn().mockImplementation(function(...objects) {
      this.children.push(...objects);
      // Dispatch childadded event
      this.dispatchEvent({ type: 'childadded' });
      return this;
    }),
    remove: vi.fn().mockImplementation(function(...objects) {
      objects.forEach(object => {
        const index = this.children.indexOf(object);
        if (index !== -1) {
          this.children.splice(index, 1);
          // Dispatch childremoved event
          this.dispatchEvent({ type: 'childremoved' });
        }
      });
      return this;
    }),
    getObjectByName: vi.fn(),
    traverse: vi.fn().mockImplementation(function(callback) {
      callback(this);
      this.children.forEach(child => child.traverse?.(callback));
    }),
    addEventListener: vi.fn().mockImplementation((type, listener) => 
      dispatcher.addEventListener(type, listener)
    ),
    removeEventListener: vi.fn().mockImplementation((type, listener) => 
      dispatcher.removeEventListener(type, listener)
    ),
    dispatchEvent: vi.fn().mockImplementation((event) => 
      dispatcher.dispatchEvent(event)
    ),
    updateMatrix: vi.fn(),
    updateMatrixWorld: vi.fn(),
    lookAt: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    isMesh: false,
    isGroup: false,
    isObject3D: true,
  };
};

// Create Group factory with event handling
const createGroupMock = () => {
  const obj3D = createObject3DMock();
  return {
    ...obj3D,
    type: 'Group',
    isGroup: true,
  };
};

// Create Scene factory with event handling
const createSceneMock = () => {
  const obj3D = createObject3DMock();
  return {
    ...obj3D,
    type: 'Scene',
    name: 'Scene',
    background: null,
    environment: null,
    fog: null,
    backgroundBlurriness: 0,
    backgroundIntensity: 1,
    overrideMaterial: null,
    isScene: true,
  };
};

// Create mock implementations for the 15 required Three.js classes
const mockThree = {
  // === Core Classes ===
  
  // 1. Object3D - Base class for most 3D objects
  Object3D: vi.fn().mockImplementation(createObject3DMock),
  
  // 2. Group - Special Object3D container for grouping objects
  Group: vi.fn().mockImplementation(createGroupMock),
  
  // === Vector Math ===
  
  // 3. Vector3 - 3D vector
  Vector3: vi.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
    x, y, z,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockImplementation(function() {
      return { x: this.x, y: this.y, z: this.z, 
        clone: this.clone, 
        copy: this.copy,
        add: this.add,
        sub: this.sub,
        equals: this.equals,
        multiplyScalar: this.multiplyScalar,
        toArray: this.toArray,
        distanceToSquared: this.distanceToSquared,
        applyQuaternion: this.applyQuaternion
      };
    }),
    add: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    length: vi.fn().mockReturnValue(1),
    lengthSq: vi.fn().mockReturnValue(1),
    distanceTo: vi.fn().mockReturnValue(0),
    distanceToSquared: vi.fn().mockReturnValue(0),
    fromArray: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockReturnValue([x, y, z]),
    equals: vi.fn().mockImplementation(function(v) {
      return this.x === v.x && this.y === v.y && this.z === v.z;
    }),
    applyQuaternion: vi.fn().mockReturnThis(),
  })),
  
  // 4. Vector2 - 2D vector
  Vector2: vi.fn().mockImplementation((x = 0, y = 0) => ({
    x, y,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockImplementation(function() {
      return { x: this.x, y: this.y, clone: this.clone, copy: this.copy };
    }),
    add: vi.fn().mockReturnThis(),
    sub: vi.fn().mockReturnThis(),
    multiplyScalar: vi.fn().mockReturnThis(),
    normalize: vi.fn().mockReturnThis(),
    length: vi.fn().mockReturnValue(1),
    lengthSq: vi.fn().mockReturnValue(1),
    distanceTo: vi.fn().mockReturnValue(0),
    distanceToSquared: vi.fn().mockReturnValue(0),
    fromArray: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockReturnValue([x, y]),
    equals: vi.fn().mockReturnValue(true),
  })),
  
  // 5. Matrix4 - 4x4 transformation matrix
  Matrix4: vi.fn().mockImplementation(() => ({
    elements: new Float32Array(16).fill(0),
    set: vi.fn().mockReturnThis(),
    identity: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    makeRotationFromQuaternion: vi.fn().mockReturnThis(),
    lookAt: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    premultiply: vi.fn().mockReturnThis(),
    invert: vi.fn().mockReturnThis(),
    transpose: vi.fn().mockReturnThis(),
    scale: vi.fn().mockReturnThis(),
    getPosition: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    setPosition: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
  })),
  
  // 6. Quaternion - Rotation representation
  Quaternion: vi.fn().mockImplementation((x = 0, y = 0, z = 0, w = 1) => ({
    x, y, z, w,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockImplementation(function() {
      return { x: this.x, y: this.y, z: this.z, w: this.w, clone: this.clone };
    }),
    setFromEuler: vi.fn().mockReturnThis(),
    setFromAxisAngle: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    premultiply: vi.fn().mockReturnThis(),
    slerp: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnValue(true),
    fromArray: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockReturnValue([x, y, z, w]),
    inverse: vi.fn().mockReturnThis(),
    conjugate: vi.fn().mockReturnThis(),
  })),
  
  // 7. Euler - Rotation representation in Euler angles
  Euler: vi.fn().mockImplementation((x = 0, y = 0, z = 0, order = 'XYZ') => ({
    x, y, z, order,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockImplementation(function() {
      return { x: this.x, y: this.y, z: this.z, order: this.order, clone: this.clone };
    }),
    setFromQuaternion: vi.fn().mockReturnThis(),
    setFromVector3: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnValue(true),
    fromArray: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockReturnValue([x, y, z, order]),
  })),
  
  // === Geometry & Math Utility Classes ===
  
  // 8. Box3 - 3D bounding box
  Box3: vi.fn().mockImplementation((min, max) => ({
    min: min || { x: -1, y: -1, z: -1 },
    max: max || { x: 1, y: 1, z: 1 },
    set: vi.fn().mockReturnThis(),
    setFromObject: vi.fn().mockReturnThis(),
    setFromPoints: vi.fn().mockReturnThis(),
    getSize: vi.fn().mockReturnValue({ x: 2, y: 2, z: 2 }),
    getCenter: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    intersectsBox: vi.fn().mockReturnValue(true),
    containsBox: vi.fn().mockReturnValue(true),
    containsPoint: vi.fn().mockReturnValue(true),
    clampPoint: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    makeEmpty: vi.fn().mockReturnThis(),
    isEmpty: vi.fn().mockReturnValue(false),
    equals: vi.fn().mockReturnValue(true),
  })),
  
  // 9. Sphere - 3D sphere
  Sphere: vi.fn().mockImplementation((center, radius) => ({
    center: center || { x: 0, y: 0, z: 0 },
    radius: radius || 1,
    set: vi.fn().mockReturnThis(),
    setFromPoints: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    isEmpty: vi.fn().mockReturnValue(false),
    containsPoint: vi.fn().mockReturnValue(true),
    distanceToPoint: vi.fn().mockReturnValue(0),
    intersectsSphere: vi.fn().mockReturnValue(true),
    intersectsBox: vi.fn().mockReturnValue(true),
    getBoundingBox: vi.fn().mockReturnValue({}),
  })),
  
  // 10. Raycaster - Used for mouse picking and intersection testing
  Raycaster: vi.fn().mockImplementation((origin, direction, near, far) => ({
    ray: {
      origin: origin || { x: 0, y: 0, z: 0 },
      direction: direction || { x: 0, y: 0, z: -1 },
    },
    near: near || 0,
    far: far || Infinity,
    camera: null,
    params: {
      Mesh: {},
      Line: {},
      LOD: {},
      Points: {},
      Sprite: {},
    },
    setFromCamera: vi.fn(),
    set: vi.fn().mockReturnThis(),
    intersectObject: vi.fn().mockReturnValue([]),
    intersectObjects: vi.fn().mockReturnValue([]),
  })),
  
  // === Material Classes ===
  
  // 11. Material - Base material class
  Material: vi.fn().mockImplementation(() => ({
    name: '',
    type: 'Material',
    uuid: '00000000-0000-0000-0000-000000000000',
    transparent: false,
    opacity: 1,
    visible: true,
    side: 0, // FrontSide
    userData: {},
    needsUpdate: false,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isMaterial: true,
  })),
  
  // 12. MeshStandardMaterial - PBR material
  MeshStandardMaterial: vi.fn().mockImplementation(params => ({
    name: '',
    type: 'MeshStandardMaterial',
    uuid: '00000000-0000-0000-0000-000000000000',
    color: { r: 1, g: 1, b: 1, set: vi.fn() },
    roughness: (params && params.roughness) || 1,
    metalness: (params && params.metalness) || 0,
    map: null,
    normalMap: null,
    aoMap: null,
    emissive: { r: 0, g: 0, b: 0, set: vi.fn() },
    emissiveIntensity: 1,
    transparent: (params && params.transparent) || false,
    opacity: (params && params.opacity) || 1,
    side: (params && params.side) || 0, // FrontSide
    visible: true,
    userData: {},
    needsUpdate: false,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isMaterial: true,
    isMeshStandardMaterial: true,
  })),
  
  // === Scene & Rendering Classes ===
  
  // 13. Scene - Container for 3D objects
  Scene: vi.fn().mockImplementation(createSceneMock),
  
  // 14. PerspectiveCamera - Camera with perspective projection
  PerspectiveCamera: vi.fn().mockImplementation((fov = 75, aspect = 1, near = 0.1, far = 2000) => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      fov,
      aspect,
      near,
      far,
      zoom: 1,
      filmGauge: 35,
      filmOffset: 0,
      view: null,
      up: { x: 0, y: 1, z: 0 },
      projectionMatrix: { elements: new Float32Array(16) },
      projectionMatrixInverse: { elements: new Float32Array(16) },
      name: 'PerspectiveCamera',
      type: 'PerspectiveCamera',
      setFocalLength: vi.fn(),
      getFocalLength: vi.fn().mockReturnValue(50),
      getEffectiveFOV: vi.fn().mockReturnValue(fov),
      getFilmWidth: vi.fn().mockReturnValue(35),
      getFilmHeight: vi.fn().mockReturnValue(24),
      setViewOffset: vi.fn(),
      clearViewOffset: vi.fn(),
      updateProjectionMatrix: vi.fn(),
      isPerspectiveCamera: true,
      isCamera: true,
    };
  }),
  
  // 15. WebGLRenderer - Renderer for Three.js using WebGL
  WebGLRenderer: vi.fn().mockImplementation(params => ({
    domElement: document.createElement('canvas'),
    capabilities: {
      isWebGL2: true,
      precision: 'highp',
      logarithmicDepthBuffer: false,
      maxTextures: 16,
      maxVertexTextures: 16,
      maxTextureSize: 16384,
      maxCubemapSize: 16384,
    },
    outputEncoding: 3000, // sRGBEncoding
    toneMapping: 0, // NoToneMapping
    toneMappingExposure: 1,
    shadowMap: {
      enabled: false,
      type: 1, // PCFShadowMap
    },
    autoClear: true,
    autoClearColor: true,
    autoClearDepth: true,
    autoClearStencil: true,
    info: {
      render: { frame: 0, calls: 0, triangles: 0, points: 0, lines: 0 },
      memory: { geometries: 0, textures: 0 },
      programs: {},
    },
    setSize: vi.fn(),
    setViewport: vi.fn(),
    setScissor: vi.fn(),
    setScissorTest: vi.fn(),
    setClearColor: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),
    clearDepth: vi.fn(),
    clearStencil: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setPixelRatio: vi.fn(),
    getPixelRatio: vi.fn().mockReturnValue(1),
    getDrawingBufferSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    getSize: vi.fn().mockReturnValue({ width: 800, height: 600 }),
    setAnimationLoop: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      canvas: document.createElement('canvas'),
    }),
  })),
  
  // === Commonly Used Constants ===
  
  DoubleSide: 2,
  FrontSide: 0,
  BackSide: 1,
  
  NoBlending: 0,
  NormalBlending: 1,
  AdditiveBlending: 2,
  
  RepeatWrapping: 1000,
  ClampToEdgeWrapping: 1001,
  MirroredRepeatWrapping: 1002,
  
  UVMapping: 300,
  
  // === Mesh and Related Classes ===
  
  Mesh: vi.fn().mockImplementation((geometry, material) => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      geometry,
      material,
      type: 'Mesh',
      raycast: vi.fn(),
      isMesh: true,
      castShadow: false,
      receiveShadow: false,
    };
  }),
  
  Line: vi.fn().mockImplementation((geometry, material) => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      geometry,
      material,
      type: 'Line',
      isLine: true,
    };
  }),

  LineSegments: vi.fn().mockImplementation((geometry, material) => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      geometry,
      material,
      type: 'LineSegments',
      isLineSegments: true,
    };
  }),
  
  // === Geometry Classes ===
  
  BufferGeometry: vi.fn().mockImplementation(() => ({
    attributes: {},
    index: null,
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    name: '',
    type: 'BufferGeometry',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    setAttribute: vi.fn().mockReturnThis(),
    getAttribute: vi.fn(),
    deleteAttribute: vi.fn().mockReturnThis(),
    setIndex: vi.fn().mockReturnThis(),
    getIndex: vi.fn(),
    setDrawRange: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isBufferGeometry: true,
  })),
  
  BoxGeometry: vi.fn().mockImplementation(() => ({
    attributes: {
      position: { array: new Float32Array(24), count: 8, itemSize: 3 },
      normal: { array: new Float32Array(24), count: 8, itemSize: 3 },
      uv: { array: new Float32Array(16), count: 8, itemSize: 2 },
    },
    index: { array: new Uint16Array(36), count: 36 },
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    name: '',
    type: 'BoxGeometry',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    dispose: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    isBufferGeometry: true,
  })),
  
  SphereGeometry: vi.fn().mockImplementation(() => ({
    attributes: {
      position: { array: new Float32Array(240), count: 80, itemSize: 3 },
      normal: { array: new Float32Array(240), count: 80, itemSize: 3 },
      uv: { array: new Float32Array(160), count: 80, itemSize: 2 },
    },
    index: { array: new Uint16Array(240), count: 240 },
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    name: '',
    type: 'SphereGeometry',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    dispose: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    isBufferGeometry: true,
  })),
  
  PlaneGeometry: vi.fn().mockImplementation(() => ({
    attributes: {
      position: { array: new Float32Array(12), count: 4, itemSize: 3 },
      normal: { array: new Float32Array(12), count: 4, itemSize: 3 },
      uv: { array: new Float32Array(8), count: 4, itemSize: 2 },
    },
    index: { array: new Uint16Array(6), count: 6 },
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    name: '',
    type: 'PlaneGeometry',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    dispose: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    isBufferGeometry: true,
  })),

  EdgesGeometry: vi.fn().mockImplementation(() => ({
    attributes: {
      position: { array: new Float32Array(24), count: 8, itemSize: 3 },
    },
    index: { array: new Uint16Array(24), count: 24 },
    groups: [],
    boundingBox: null,
    boundingSphere: null,
    name: '',
    type: 'EdgesGeometry',
    uuid: '00000000-0000-0000-0000-000000000000',
    userData: {},
    dispose: vi.fn(),
    clone: vi.fn().mockReturnThis(),
    isBufferGeometry: true,
  })),
  
  // Additional utility classes and functions
  MathUtils: {
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    clamp: vi.fn((value, min, max) => Math.max(min, Math.min(max, value))),
    lerp: vi.fn((x, y, t) => (1 - t) * x + t * y),
    damp: vi.fn(),
    randInt: vi.fn((low, high) => Math.floor(Math.random() * (high - low + 1) + low)),
    randFloat: vi.fn((low, high) => Math.random() * (high - low) + low),
    randFloatSpread: vi.fn((range) => Math.random() * range - range / 2),
    generateUUID: vi.fn().mockReturnValue('00000000-0000-0000-0000-000000000000'),
  },
  
  Color: vi.fn().mockImplementation((r, g, b) => ({
    r: typeof r === 'number' ? r : 1,
    g: typeof g === 'number' ? g : 1,
    b: typeof b === 'number' ? b : 1,
    set: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    clone: vi.fn().mockReturnThis(),
    setRGB: vi.fn().mockReturnThis(),
    setHSL: vi.fn().mockReturnThis(),
    setHex: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
    getStyle: vi.fn().mockReturnValue('rgb(255,255,255)'),
    getHex: vi.fn().mockReturnValue(0xffffff),
    getHexString: vi.fn().mockReturnValue('ffffff'),
    toJSON: vi.fn().mockReturnValue(0xffffff),
    add: vi.fn().mockReturnThis(),
    multiply: vi.fn().mockReturnThis(),
    lerp: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnValue(true),
    isColor: true,
  })),

  // Line materials
  LineBasicMaterial: vi.fn().mockImplementation(params => ({
    name: '',
    type: 'LineBasicMaterial',
    color: { r: 1, g: 1, b: 1, set: vi.fn() },
    linewidth: 1,
    linecap: 'round',
    linejoin: 'round',
    transparent: (params && params.transparent) || false,
    opacity: (params && params.opacity) || 1,
    side: (params && params.side) || 0, // FrontSide
    visible: true,
    userData: {},
    needsUpdate: false,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isMaterial: true,
    isLineBasicMaterial: true,
  })),

  MeshBasicMaterial: vi.fn().mockImplementation(params => ({
    name: '',
    type: 'MeshBasicMaterial',
    color: { r: 1, g: 1, b: 1, set: vi.fn() },
    map: null,
    transparent: (params && params.transparent) || false,
    opacity: (params && params.opacity) || 1,
    side: (params && params.side) || 0, // FrontSide
    visible: true,
    userData: {},
    needsUpdate: false,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isMaterial: true,
    isMeshBasicMaterial: true,
  })),

  // Lights
  AmbientLight: vi.fn().mockImplementation(() => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      color: { r: 1, g: 1, b: 1, set: vi.fn() },
      intensity: 1,
      type: 'AmbientLight',
      isAmbientLight: true,
      isLight: true,
    };
  }),

  DirectionalLight: vi.fn().mockImplementation(() => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      color: { r: 1, g: 1, b: 1, set: vi.fn() },
      intensity: 1,
      target: createObject3DMock(),
      shadow: {
        camera: {
          left: -5,
          right: 5,
          top: 5,
          bottom: -5,
          near: 0.5,
          far: 500
        }
      },
      type: 'DirectionalLight',
      isDirectionalLight: true,
      isLight: true,
    };
  }),

  SpotLight: vi.fn().mockImplementation(() => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      color: { r: 1, g: 1, b: 1, set: vi.fn() },
      intensity: 1,
      distance: 0,
      angle: Math.PI / 3,
      penumbra: 0,
      decay: 2,
      target: createObject3DMock(),
      shadow: {
        camera: {
          fov: 50,
          near: 0.5,
          far: 500
        }
      },
      type: 'SpotLight',
      isSpotLight: true,
      isLight: true,
    };
  }),

  // Event related
  Event: vi.fn().mockImplementation((type) => ({
    type,
    target: null,
    stopPropagation: vi.fn(),
    preventDefault: vi.fn()
  })),

  // Additional exports that might be needed
  EventDispatcher: vi.fn().mockImplementation(() => new EventDispatcherMock()),

  // Add PointLight to the mock
  PointLight: vi.fn().mockImplementation(() => {
    const obj3D = createObject3DMock();
    return {
      ...obj3D,
      color: { r: 1, g: 1, b: 1, set: vi.fn() },
      intensity: 1,
      distance: 0,
      decay: 2,
      shadow: {
        camera: {
          near: 0.5,
          far: 500
        }
      },
      type: 'PointLight',
      isPointLight: true,
      isLight: true,
    };
  }),

  // Add LineDashedMaterial to the mock
  LineDashedMaterial: vi.fn().mockImplementation(params => ({
    name: '',
    type: 'LineDashedMaterial',
    color: { r: 1, g: 1, b: 1, set: vi.fn() },
    linewidth: 1,
    linecap: 'round',
    linejoin: 'round',
    dashSize: (params && params.dashSize) || 3,
    gapSize: (params && params.gapSize) || 1,
    scale: (params && params.scale) || 1,
    transparent: (params && params.transparent) || false,
    opacity: (params && params.opacity) || 1,
    side: (params && params.side) || 0, // FrontSide
    visible: true,
    userData: {},
    needsUpdate: false,
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    isMaterial: true,
    isLineDashedMaterial: true,
  })),

  // Add BufferAttribute to the mock
  BufferAttribute: vi.fn().mockImplementation((array, itemSize, normalized) => ({
    array: array,
    itemSize: itemSize,
    normalized: normalized || false,
    count: array.length / itemSize,
    usage: 0,
    updateRange: { offset: 0, count: -1 },
    version: 0,
    needsUpdate: false,
    name: '',
    clone: vi.fn().mockReturnThis(),
    copy: vi.fn().mockReturnThis(),
    copyAt: vi.fn().mockReturnThis(),
    copyArray: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    getX: vi.fn().mockReturnValue(0),
    setX: vi.fn().mockReturnThis(),
    getY: vi.fn().mockReturnValue(0),
    setY: vi.fn().mockReturnThis(),
    getZ: vi.fn().mockReturnValue(0),
    setZ: vi.fn().mockReturnThis(),
    getW: vi.fn().mockReturnValue(0),
    setW: vi.fn().mockReturnThis(),
    getComponent: vi.fn().mockReturnValue(0),
    setComponent: vi.fn().mockReturnThis(),
    setUsage: vi.fn().mockReturnThis(),
    applyMatrix3: vi.fn().mockReturnThis(),
    applyMatrix4: vi.fn().mockReturnThis(),
    applyNormalMatrix: vi.fn().mockReturnThis(),
    transformDirection: vi.fn().mockReturnThis(),
    onUpload: vi.fn(),
  })),
};

export default mockThree;