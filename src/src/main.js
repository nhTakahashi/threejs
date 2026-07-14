import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const canvas = document.querySelector('#c')

// 3D空間（シーン）を作る
const scene = new THREE.Scene()

// カメラを作り、少し斜め上から原点を見る
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.set(3, 3, 6)
camera.lookAt(0, 0, 0)

// 描画エンジン（レンダラー）の設定
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// マウスで視点を回転・ズームできるようにする
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 1, 0)
controls.minDistance = 2
controls.maxDistance = 16

const loader = new THREE.TextureLoader()
const skyTexture = loader.load('/textures/sky_bg.png')
skyTexture.colorSpace = THREE.SRGBColorSpace
scene.background = skyTexture

// 床テクスチャは繰り返して貼る
const configureFloorTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 8)
}

let floorTexture
floorTexture = loader.load('/textures/wood_roughness.png')
configureFloorTexture(floorTexture)

// 影を受ける床
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

// ライトをまとめてシーンへ追加
scene.add(ambient, key, fill, back)

// 読み込んだモデルを入れるコンテナ
const modelRoot = new THREE.Group()
scene.add(modelRoot)

// クリック判定（レイキャスト）用の準備
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pickTargets = []

let hovered = null
let selected = null

// マテリアルを配列/単体どちらでも扱えるようにする
const getMaterials = (mesh) => {
  if (!mesh?.material) return []
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
}

// 発光色を「元の色」に戻す
const resetMaterialEmissive = (material) => {
  if (!material?.emissive?.isColor) return
  const base = material.userData?.baseEmissive
  material.emissive.setHex(typeof base === 'number' ? base : 0x000000)
}

// 発光色を設定する（初回だけ元の色を保存しておく）
const setMaterialEmissive = (material, color) => {
  if (!material?.emissive?.isColor) return
  if (typeof material.userData.baseEmissive !== 'number') {
    material.userData.baseEmissive = material.emissive.getHex()
  }
  material.emissive.setHex(color)
}

// メッシュ全体のハイライトを解除
const resetEmissive = (mesh) => {
  if (!mesh) return
  const materials = getMaterials(mesh)
  materials.forEach(resetMaterialEmissive)
}

// メッシュ全体をハイライト（選択中とホバー中で色を変える）
const applyHighlight = (mesh) => {
  if (!mesh) return
  const color = mesh === selected ? 0x22d3ee : 0x224466
  const materials = getMaterials(mesh)
  materials.forEach((material) => setMaterialEmissive(material, color))
}

const setPointerFromEvent = (event) => {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

// マウス位置から「どのメッシュに当たっているか」を取得
const pick = () => {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObjects(pickTargets, false)[0]?.object ?? null
}

// マウス移動時: ホバー対象を更新し、必要ならハイライトを切り替える
renderer.domElement.addEventListener('pointermove', (event) => {
  setPointerFromEvent(event)
  const hit = pick()

  if (hit !== hovered) {
    if (hovered && hovered !== selected) {
      resetEmissive(hovered)
    }

    hovered = hit

    if (hovered && hovered !== selected) {
      applyHighlight(hovered)
    }
  }
})

// クリック時: 選択対象を確定し、選択色でハイライトする
renderer.domElement.addEventListener('pointerdown', (event) => {
  setPointerFromEvent(event)
  const hit = pick()

  if (selected && selected !== hit) {
    resetEmissive(selected)
    if (selected === hovered) {
      applyHighlight(selected)
    }
  }

  selected = hit
  applyHighlight(selected)
})

// キャンバス外にポインタが出たとき: ホバー表示だけ解除する
renderer.domElement.addEventListener('pointerleave', () => {
  if (hovered && hovered !== selected) {
    resetEmissive(hovered)
  }
  hovered = null
})

// モデルの中心を原点へ寄せ、床に接地させる
const fitModelAtOrigin = (model, options = {}) => {
  const { targetSize = 2.6, offsetX = 0 } = options

  // モデルのバウンディングボックスを計算して原点に寄せる
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)

  // サイズを正規化して視認性を揃える
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const scale = targetSize / maxAxis
  model.scale.setScalar(scale)

  // 位置オフセットを適用（複数モデル配置用）
  model.position.x += offsetX

  // 再計算して床に接地させる
  box.setFromObject(model)
  model.position.y -= box.min.y
}

// クリック対象メッシュを登録し、影設定も合わせて行う
const registerPickTargets = (root) => {
  root.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    pickTargets.push(child)
  })
}

const resetInteractionState = () => {
  hovered = null
  selected = null
}

const gltfLoader = new GLTFLoader()

const loadModel = ({ url, offsetX = 0 }) => {
  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene

      resetInteractionState()
      fitModelAtOrigin(model, { offsetX })
      modelRoot.add(model)
      registerPickTargets(model)
    },
    undefined,
    (error) => {
      console.error(`Failed to load model: ${url}`, error)
    },
  )
}

// 複数モデルを同じ処理で読み込む
pickTargets.length = 0
loadModel({ url: '/models/Table.glb' })
loadModel({ url: '/models/Altar01_Art.glb', offsetX: 2.5 })


// 毎フレームの描画処理
function animate() {
  requestAnimationFrame(animate)

  // 毎フレーム少しずつ回転
  modelRoot.rotation.y += 0.000
  controls.update()

  renderer.render(scene, camera)
}
// ウィンドウサイズが変わったらカメラとレンダラーを更新
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

animate()
