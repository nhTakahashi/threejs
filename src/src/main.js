import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import gsap from 'gsap'

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

// フレーム間の経過時間を測り、端末ごとの描画速度の差を吸収する
const clock = new THREE.Clock()
// GLB ごとのアニメーション再生管理を保存する配列
const mixers = []

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

// GLB に動きのデータが含まれていれば、先頭のクリップを再生する
const playModelAnimation = (gltf) => {
  if (gltf.animations.length === 0) return

  // AnimationMixer はモデルに含まれるキーフレームアニメーションの再生役
  const mixer = new THREE.AnimationMixer(gltf.scene)
  mixer.clipAction(gltf.animations[0]).play()
  mixers.push(mixer)
}

// GSAP を使い、モデルを小さく・透明な状態から登場させる
const revealModel = (model, delay) => {
  // 本来の位置より下、かつ 1% の大きさからアニメーションを開始する
  model.position.y -= 1.2
  model.scale.multiplyScalar(0.01)

  // 不透明度を変えられるよう、すべてのメッシュを透明描画にする
  model.traverse((child) => {
    if (!child.isMesh) return
    const materials = getMaterials(child)
    materials.forEach((material) => {
      material.transparent = true
      material.opacity = 0
    })
  })

  // timeline に動きを並べると、時間差や同時実行を整理できる
  const timeline = gsap.timeline({ delay })
  // 下から上へ移動し、最後はゆっくり減速して止まる
  timeline.to(model.position, {
    y: `+=1.2`,
    duration: 1.2,
    ease: 'power3.out',
  })
  // '<' は直前のアニメーションと同じ時刻に開始する指定
  timeline.to(
    model.scale,
    {
      x: model.scale.x * 100,
      y: model.scale.y * 100,
      z: model.scale.z * 100,
      duration: 1,
      ease: 'back.out(1.5)',
    },
    '<',
  )
  // 移動と同時に、タイムラインの進行度を不透明度として使う
  timeline.to(
    model,
    {
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        model.traverse((child) => {
          if (!child.isMesh) return
          getMaterials(child).forEach((material) => {
            material.opacity = timeline.progress()
          })
        })
      },
    },
    '<',
  )
}

const loadModel = ({ url, offsetX = 0 }) => {
  // 非同期で GLB を読み込み、成功時だけシーンに追加する
  gltfLoader.load(
    url,
    (gltf) => {
      const model = gltf.scene

      resetInteractionState()
      fitModelAtOrigin(model, { offsetX })
      modelRoot.add(model)
      registerPickTargets(model)
      // モデルに含まれる動きと、コードで作る登場演出を重ねる
      playModelAnimation(gltf)
      revealModel(model, offsetX === 0 ? 0.2 : 0.5)
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
loadModel({ url: '/models/untitled.glb', offsetX: 2.5 })

// カメラを近い位置から通常位置へ動かし、シーン全体を見せる
gsap.fromTo(
  camera.position,
  { x: 1.5, y: 2, z: 3.5 },
  { x: 3, y: 3, z: 6, duration: 1.8, ease: 'power2.out' },
)

// 毎フレームの描画処理
function animate() {
  requestAnimationFrame(animate)

  // delta は前フレームからの秒数、elapsed は開始からの合計秒数
  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // GLB 内のアニメーションには、毎フレーム delta を渡して進める
  mixers.forEach((mixer) => mixer.update(delta))
  // delta を掛けると、フレームレートが違っても回転速度を一定にできる
  modelRoot.rotation.y += 0.15 * delta
  // sin / cos で、繰り返し浮遊する動きと光の移動を作る
  modelRoot.position.y = Math.sin(elapsed * 1.5) * 0.06
  key.position.x = Math.cos(elapsed * 0.7) * 5
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
