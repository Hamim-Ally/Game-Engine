import Renderer from './Renderer.js';
import GameObject from './GameObject.js';
import CameraComponent from './CameraComponent.js'; // Import the new CameraComponent
import InputManager from './InputManager.js';
import TransformComponent from './TransformComponent.js';
import MeshRendererComponent from './MeshRendererComponent.js';
import { create as vec3_create, add as vec3_add, scale as vec3_scale } from '../math/vec3.js';
import { perspective } from '../math/mat4.js';

// Define common cube vertex data here for now, could be moved to a Mesh utility later
const CUBE_VERTICES = new Float32Array([
    // Front face
    -0.5, -0.5, 0.5,  0.0,  0.0,  1.0,  0.0, 1.0,
     0.5, -0.5, 0.5,  0.0,  0.0,  1.0,  1.0, 1.0,
     0.5,  0.5, 0.5,  0.0,  0.0,  1.0,  1.0, 0.0,
    -0.5, -0.5, 0.5,  0.0,  0.0,  1.0,  0.0, 1.0,
     0.5,  0.5, 0.5,  0.0,  0.0,  1.0,  1.0, 0.0,
    -0.5,  0.5, 0.5,  0.0,  0.0,  1.0,  0.0, 0.0,

    // Back face
    -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  1.0, 1.0,
     0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0, 1.0,
     0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  0.0, 0.0,
    -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  1.0, 1.0,
     0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  0.0, 0.0,
    -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0, 0.0,

    // Top face
    -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0, 1.0,
     0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0, 1.0,
     0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0, 0.0,
    -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0, 1.0,
     0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0, 0.0,
    -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  0.0, 0.0,

    // Bottom face
    -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0, 1.0,
     0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  1.0, 1.0,
     0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0, 0.0,
    -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0, 1.0,
     0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0, 0.0,
    -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  0.0, 0.0,

    // Right face
     0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0, 1.0,
     0.5,  0.5, -0.5,  1.0,  0.0,  0.0,  1.0, 1.0,
     0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0, 0.0,
     0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0, 1.0,
     0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0, 0.0,
     0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  0.0, 0.0,

    // Left face
    -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  0.0, 1.0,
    -0.5,  0.5, -0.5, -1.0,  0.0,  0.0,  1.0, 1.0,
    -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  1.0, 0.0,
    -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  0.0, 1.0,
    -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  1.0, 0.0,
    -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,  0.0, 0.0,
]);

export default class Game {
    constructor() {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.cameraGameObject = null; // Renamed to clearly indicate it's a GameObject
        this.scene = [];
        this.lastTime = 0;
    }

    async init() {
        console.log("Game.init() started.");
        await this.renderer.init();
        console.log("Game.init(): Renderer initialized.");
        
        // Create camera GameObject and add CameraComponent
        this.cameraGameObject = new GameObject("MainCamera");
        this.cameraGameObject.addComponent(new CameraComponent(this.cameraGameObject, this.renderer.canvas));
        console.log("Game.init(): Camera GameObject created with CameraComponent.");

        // Create game objects with components
        const obj1 = new GameObject("Cube1");
        const transform1 = obj1.getComponent(TransformComponent);
        transform1.setPosition(-1.0, 0.0, 0.0);
        obj1.addComponent(new MeshRendererComponent(obj1, CUBE_VERTICES, [1, 0, 0, 1]));

        const obj2 = new GameObject("Cube2");
        const transform2 = obj2.getComponent(TransformComponent);
        transform2.setPosition(1.0, 0.0, 0.0);
        obj2.addComponent(new MeshRendererComponent(obj2, CUBE_VERTICES, [0, 1, 0, 1]));

        const obj3 = new GameObject("Cube3");
        const transform3 = obj3.getComponent(TransformComponent);
        transform3.setPosition(0.0, 0.0, -1.0);
        obj3.addComponent(new MeshRendererComponent(obj3, CUBE_VERTICES, [0, 0, 1, 1]));

        this.scene.push(obj1, obj2, obj3);
        console.log("Game.init(): GameObjects created with components and added to scene.");

        // Call start on all game objects and their components
        this.cameraGameObject.start(); // Start camera GameObject
        for (const obj of this.scene) {
            obj.start();
        }

        // Initial call to recreate bind groups after renderer init and scene population
        this.recreateBindGroups(this.renderer.device, this.renderer.pipeline);
        console.log("Game.init(): Initial bind groups recreated.");
    }

    recreateBindGroups(device, pipeline) {
        const cameraComponent = this.cameraGameObject.getComponent(CameraComponent);
        if (cameraComponent) {
            if (!cameraComponent.uniformBuffer) {
                cameraComponent.createBuffers(device, pipeline);
            } else {
                cameraComponent.recreateBindGroup(pipeline);
            }
        }
        
        for(const obj of this.scene) {
            const meshRenderer = obj.getComponent(MeshRendererComponent);
            if (meshRenderer) {
                if (!meshRenderer.vertexBuffer) {
                    meshRenderer.createBuffers(device, pipeline);
                } else {
                    meshRenderer.recreateBindGroup(pipeline);
                }
            }
        }
        console.log("Game: All bind groups recreated.");
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.resize(width, height);

        const cameraComponent = this.cameraGameObject.getComponent(CameraComponent);
        if (cameraComponent) {
            // Update camera aspect ratio
            const aspectRatio = width / height;
            perspective(cameraComponent.projectionMatrix, cameraComponent.fovY, aspectRatio, cameraComponent.zNear, cameraComponent.zFar);
        }

        // Recreate bind groups with the new pipeline from the resized renderer
        this.recreateBindGroups(this.renderer.device, this.renderer.pipeline);
    }

    start() {
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000.0;
        this.lastTime = now;

        this.update(deltaTime, now);
        this.renderer.render(this.cameraGameObject, this.scene); // Pass camera GameObject
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime, now) {
        const cameraComponent = this.cameraGameObject.getComponent(CameraComponent);
        if (!cameraComponent) return;

        // Handle input to move camera
        const cameraSpeed = 2.0 * deltaTime;
        const tempVec3 = vec3_create();

        if (this.inputManager.isKeyDown('KeyW')) { // Move forward
            vec3_scale(tempVec3, cameraComponent.forward, cameraSpeed);
            vec3_add(cameraComponent.position, cameraComponent.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyS')) { // Move backward
            vec3_scale(tempVec3, cameraComponent.forward, -cameraSpeed);
            vec3_add(cameraComponent.position, cameraComponent.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyA')) { // Strafe left
            vec3_scale(tempVec3, cameraComponent.right, -cameraSpeed);
            vec3_add(cameraComponent.position, cameraComponent.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyD')) { // Strafe right
            vec3_scale(tempVec3, cameraComponent.right, cameraSpeed);
            vec3_add(cameraComponent.position, cameraComponent.position, tempVec3);
        }
        // Add Q and E for up/down movement
        if (this.inputManager.isKeyDown('KeyQ')) { // Move up
            cameraComponent.position[1] += cameraSpeed;
        }
        if (this.inputManager.isKeyDown('KeyE')) { // Move down
            cameraComponent.position[1] -= cameraSpeed;
        }

        // Handle mouse input for camera rotation
        const mouseDelta = this.inputManager.getMouseDelta();
        cameraComponent.yaw += mouseDelta[0];
        cameraComponent.pitch -= mouseDelta[1];

        // Clamp pitch to prevent camera flip
        const halfPI = Math.PI / 2 - 0.01;
        if (cameraComponent.pitch > halfPI) cameraComponent.pitch = halfPI;
        if (cameraComponent.pitch < -halfPI) cameraComponent.pitch = -halfPI;

        // Call update on all game objects and their components, including the camera
        this.cameraGameObject.update(deltaTime);
        for (const obj of this.scene) {
            obj.update(deltaTime);
        }

        // Animate objects using TransformComponent
        const timeFactor = now / 1000;
        
        const obj1Transform = this.scene[0].getComponent(TransformComponent);
        if (obj1Transform) {
            obj1Transform.setRotation(obj1Transform.rotation[0], timeFactor, obj1Transform.rotation[2]);
        }

        const obj2Transform = this.scene[1].getComponent(TransformComponent);
        if (obj2Transform) {
            obj2Transform.setRotation(timeFactor / 0.7, obj2Transform.rotation[1], obj2Transform.rotation[2]);
        }

        const obj3Transform = this.scene[2].getComponent(TransformComponent);
        if (obj3Transform) {
            obj3Transform.setRotation(obj3Transform.rotation[0], obj3Transform.rotation[1], timeFactor / 1.2);
        }
    }
}
