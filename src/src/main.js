import './style.css'
import * as THREE from 'three'

const canvas = document.querySelector('#c')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xdbeafe)

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
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({
  color: 0x3b82f6,
  roughness: 0.4,
  metalness: 0.6,
})
const cube = new THREE.Mesh(geometry, material)
cube.castShadow = true
cube.position.y = 0.5
scene.add(cube)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.95,
    metalness: 0.05,
  }),
)
floor.rotation.x = -Math.PI / 2
floor.position.y = -0.001
floor.receiveShadow = true
scene.add(floor)

const ambient = new THREE.AmbientLight(0xffffff, 0.35)

const key = new THREE.DirectionalLight(0xffffff, 1.0)
key.position.set(5, 8, 6)
key.castShadow = true
key.shadow.mapSize.set(2048, 2048)
key.shadow.camera.near = 0.5
key.shadow.camera.far = 30
key.shadow.camera.left = -8
key.shadow.camera.right = 8
key.shadow.camera.top = 8
key.shadow.camera.bottom = -8

const fill = new THREE.DirectionalLight(0xffffff, 0.4)
fill.position.set(-5, 2, 4)

const back = new THREE.DirectionalLight(0xffffff, 0.6)
back.position.set(0, 5, -5)

scene.add(ambient, key, fill, back)

function animate() {
  requestAnimationFrame(animate)

  cube.rotation.x += 0.01
  cube.rotation.y += 0.015

  renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

animate()
