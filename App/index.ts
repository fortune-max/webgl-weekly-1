import {
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  Scene,
  Mesh,
  TextureLoader,
  EquirectangularReflectionMapping,
  MeshStandardMaterial,
  SphereGeometry,
  Raycaster,
  Vector2,
  CameraHelper,
  PCFSoftShadowMap,
} from 'three';

import  Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GL = new GLTFLoader();
const TL = new TextureLoader();
const gui = new GUI();

export default class App {
  private _renderer: WebGLRenderer;
  private _camera: PerspectiveCamera;
  private _meshSarah: any;
  private _meshSpiderman: any;
  private _controls: OrbitControls;
  private _stats: Stats;
  private _scene: Scene;
  private _raycaster: Raycaster;
  private _mouse: Vector2;
  private _light: DirectionalLight;
  private _shadowCameraHelper: CameraHelper;
  private _swapCharacter: boolean = true;

  constructor() {
    this._scene = new Scene();
    this._stats = new Stats();
    this._raycaster = new Raycaster();
    this._mouse = new Vector2(-1000, -1000);
    document.body.appendChild(this._stats.dom);
    this._init();
  }

  _init() {
    this._renderer = new WebGLRenderer({
      canvas: document.getElementById('canvas') as HTMLCanvasElement,
    });
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = PCFSoftShadowMap;
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new PerspectiveCamera(70, aspect, 0.1, 100);

    this._camera.position.set(0, 0, 5);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);

    this._render();

    this._initEvents();
    this._initLights();
    this._initEnvironment();
    this._initFloor();
    this._createSarah();
    this._createSpiderman();
    this._initGui();
    this._animate();
  }

  _createSarah() {
    GL.load('/models/sarah/scene.gltf', (model) => {
      const sarah = model.scene;
      sarah.scale.setScalar(2.5);
      sarah.position.y -= 2;
      sarah.traverse((child) => {
        if (child instanceof Mesh) child.castShadow = true;
      });
      this._scene.add(sarah);
      this._meshSarah = sarah;
    })
  }

  _createSpiderman() {
    GL.load('/models/spiderverse_miles/scene.gltf', (model) => {
      const spidermen = model.scene.children[0].children[0].children[0].children;
      const spiderman = spidermen[1];
      spiderman.scale.setScalar(0.028);
      spiderman.position.y -= 2.05;
      spiderman.position.x -= 4.9;
      spiderman.visible = false;
      spiderman.traverse((child) => {
        if (child instanceof Mesh) child.castShadow = true;
      });
      this._scene.add(spiderman);
      this._meshSpiderman = spiderman;
    })
  }

  _initGui() {
    gui.add(this._light, 'intensity', 0, 20);
    gui.add(this._light.position, 'x', -10, 10);
    gui.add(this._light.position, 'y', -10, 10);
    gui.add(this._light.position, 'z', -10, 10);
    gui.add(this._shadowCameraHelper, 'visible');
    gui.add(this, '_swapCharacter');
  }

  _initEvents() {
    window.addEventListener('resize', this._onResize.bind(this));
    window.addEventListener('pointermove', this._onMouseMove.bind(this));
    window.addEventListener('click', this._onClick.bind(this));
  }

  _initLights() {
    const dl = new DirectionalLight(0xffffff, 10);
    dl.position.set(-5, 5, 4);
    dl.castShadow = true;
    this._light = dl;
    this._scene.add(dl);

    dl.shadow.mapSize.width = 200;
    dl.shadow.mapSize.height = 200;
    dl.shadow.camera.near = 0.5;
    dl.shadow.camera.far = 20;
  
    const dh = new CameraHelper(dl.shadow.camera);
    this._shadowCameraHelper = dh;
    this._scene.add(dh);
  }

  _initEnvironment() {
    TL.load('/envmaps/qin-zhi-jian-g-anime-2.jpg', (texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      this._scene.environment = texture;
      this._scene.background = texture;
    });
  }

  _initFloor() {
    const geo = new SphereGeometry(1);
    const map = TL.load('/floor/bark/Bark_007_BaseColor.jpg');
    const aoMap = TL.load('/floor/bark/Bark_007_AmbientOcclusion.jpg');
    const roughnessMap = TL.load('/floor/bark/Bark_007_Roughness.jpg');
    const normalMap = TL.load('/floor/bark/Bark_007_Normal.jpg');
    const mat = new MeshStandardMaterial({
      roughnessMap,
      normalMap,
      aoMap,
      map,
    });
    const mesh = new Mesh(geo, mat);
    mesh.scale.set(5, 5, 0.5);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.y = -2.5;
    mesh.receiveShadow = true;
    this._scene.add(mesh);
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _onClick() {
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const result = this._raycaster.intersectObjects([
      this._meshSarah,
      this._meshSpiderman,
    ]);

    if (result.length || !this._swapCharacter) {
      this._meshSpiderman.visible = !this._meshSpiderman.visible;
      this._meshSarah.visible = !this._meshSarah.visible;
      this._swapCharacter = true;
    }
  }

  _onMouseMove(e: MouseEvent) {
    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _render() {
    this._renderer.render(this._scene, this._camera);
  }

  _animate() {
    this._stats.begin();
    window.requestAnimationFrame(this._animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._stats.end();
  }
}
