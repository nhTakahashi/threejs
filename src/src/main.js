import './style.css'
import * as THREE from 'three'
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

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.target.set(0, 0.5, 0)
controls.minDistance = 2
controls.maxDistance = 16

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
const cubes = []

for (let i = 0; i < 5; i += 1) {
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

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

let hovered = null
let selected = null

const resetEmissive = (mesh) => {
  if (!mesh) return
  mesh.material.emissive.setHex(0x000000)
}

const applyHighlight = (mesh) => {
  if (!mesh) return
  mesh.material.emissive.setHex(mesh === selected ? 0x22d3ee : 0x224466)
}

const setPointerFromEvent = (event) => {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

const pick = () => {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObjects(cubes, false)[0]?.object ?? null
}

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

renderer.domElement.addEventListener('pointerleave', () => {
  if (hovered && hovered !== selected) {
    resetEmissive(hovered)
  }
  hovered = null
})

function animate() {
  requestAnimationFrame(animate)

  controls.update()

  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

animate()
