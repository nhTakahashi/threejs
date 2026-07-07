import './style.css'
import * as THREE from 'three'
// OrbitControlsはthree.jsのアドオンとして提供されているため、'three/addons/controls/OrbitControls.js'からインポートする必要があります。
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const canvas = document.querySelector('#c')

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.set(3, 3, 6)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// OrbitControlsのインスタンスを作成し、カメラとレンダラーのDOM要素を渡す
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true // 減衰を有効にして、カメラの動きを滑らかにする
controls.dampingFactor = 0.05 // 減衰の強さを設定
controls.target.set(0, 0.5, 0) // カメラの注視点を設定
controls.minDistance = 2 // カメラの最小距離を設定
controls.maxDistance = 16 // カメラの最大距離を設定

const loader = new THREE.TextureLoader()
const skyTexture = loader.load('/textures/sky_bg.png')
skyTexture.colorSpace = THREE.SRGBColorSpace
scene.background = skyTexture

const configureColorTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
}

const configureFloorTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 8)
}

let cubeTexture
cubeTexture = loader.load('/textures/wood_color.png')
configureColorTexture(cubeTexture)

let floorTexture
floorTexture = loader.load('/textures/wood_roughness.png')
configureFloorTexture(floorTexture)

const geometry = new THREE.BoxGeometry(1, 1, 1)
const cubes = [] // 配列を初期化して、後で作成する立方体を格納する
// 5つの立方体を作成して、シーンに追加する
for (let i = 0; i < 5; i += 1) {
  // 同じ立方体を5個コピーして、位置をずらして配置する
  const material = new THREE.MeshStandardMaterial({
    map: cubeTexture,
    roughness: 0.7,
    metalness: 0.1,
    emissive: 0x000000,
  })

  const cube = new THREE.Mesh(geometry, material)
  cube.castShadow = true
  cube.position.set((i - 2) * 1.6, 0.5, 0)
  cubes.push(cube)
  scene.add(cube)
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.9,
    metalness: 0.05,
  }),
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.001
floor.receiveShadow = true
scene.add(floor)

const ambient = new THREE.AmbientLight(0xffffff, 0.5)

const key = new THREE.DirectionalLight(0xffffff, 1.2)
key.position.set(5, 8, 6)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.near = 0.5
key.shadow.camera.far = 30
key.shadow.camera.left = -8
key.shadow.camera.right = 8
key.shadow.camera.top = 8
key.shadow.camera.bottom = -8

const fill = new THREE.DirectionalLight(0xffffff, 0.5)
fill.position.set(-5, 2, 4)

const back = new THREE.DirectionalLight(0xffffff, 0.6)
back.position.set(0, 5, -5)

scene.add(ambient, key, fill, back)

// RaycasterとPointerの初期化
const raycaster = new THREE.Raycaster() // レイキャスターを作成
const pointer = new THREE.Vector2() // ポインターの位置を格納するベクトルを作成

let hovered = null // 現在ホバーされている立方体を追跡する変数
let selected = null // 現在選択されている立方体を追跡する変数
// マウスが立方体の上にあるかどうかを判定するための関数
const resetEmissive = (mesh) => {
  if (!mesh) return
  mesh.material.emissive.setHex(0x000000)
}
// マウスが立方体の上にある場合、立方体の色を変更するための関数
const applyHighlight = (mesh) => {
  if (!mesh) return
  mesh.material.emissive.setHex(mesh === selected ? 0x22d3ee : 0x224466)
}
// マウスの位置を更新するための関数
const setPointerFromEvent = (event) => {
  const rect = renderer.domElement.getBoundingClientRect() // レンダラーのDOM要素の位置とサイズを取得
  // マウスの位置を正規化されたデバイス座標に変換する
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}
// レイキャスターを使用して、マウスの位置にある立方体を取得する関数
const pick = () => {
  // レイキャスターをマウスの位置に設定する
  raycaster.setFromCamera(pointer, camera)
  // レイキャスターを使用して、立方体の配列と交差するオブジェクトを取得する
  return raycaster.intersectObjects(cubes, false)[0]?.object ?? null
}
// マウスの動きに応じて、立方体のハイライトを更新するイベントリスナー
renderer.domElement.addEventListener('pointermove', (event) => {
  setPointerFromEvent(event) // マウスの位置を更新する
  const hit = pick() // マウスの位置にある立方体を取得する
  // 立方体がホバーされている場合、ハイライトを適用する
  if (hit !== hovered) {
    // 以前ホバーされていた立方体のハイライトをリセットする
    if (hovered && hovered !== selected) {
      resetEmissive(hovered) // 以前ホバーされていた立方体のハイライトをリセットする
    }
    // 現在ホバーされている立方体を更新する
    hovered = hit
    // 現在ホバーされている立方体と選択されている立方体が異なる場合、ハイライトを適用する
    if (hovered && hovered !== selected) {
      applyHighlight(hovered) // 現在ホバーされている立方体にハイライトを適用する
    }
  }
})
// マウスクリック時に、立方体の選択状態を更新するイベントリスナー
renderer.domElement.addEventListener('pointerdown', (event) => {
  setPointerFromEvent(event) // マウスの位置を更新する
  const hit = pick() // マウスの位置にある立方体を取得する
  // 以前選択されていた立方体のハイライトをリセットする
  if (selected && selected !== hit) {
    resetEmissive(selected) // 以前選択されていた立方体のハイライトをリセットする
    // 以前選択されていた立方体と現在ホバーされている立方体が同じ場合、ハイライトを適用する
    if (selected === hovered) {
      applyHighlight(selected) // 以前選択されていた立方体と現在ホバーされている立方体が同じ場合、ハイライトを適用する
    }
  }
  // 現在選択されている立方体を更新する
  selected = hit
  applyHighlight(selected) // 現在選択されている立方体にハイライトを適用する
})
// マウスがレンダラーのDOM要素から離れた場合、ホバー状態をリセットするイベントリスナー
renderer.domElement.addEventListener('pointerleave', () => {
  // 以前ホバーされていた立方体のハイライトをリセットする
  if (hovered && hovered !== selected) {
    resetEmissive(hovered) // 以前ホバーされていた立方体のハイライトをリセットする
  }
  hovered = null // 現在ホバーされている立方体をリセットする
})
// アニメーションループを開始する関数
function animate() {
  requestAnimationFrame(animate)

  controls.update() // OrbitControlsの更新を行う

  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

animate()
