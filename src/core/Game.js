import Renderer from './Renderer.js';
import GameObject from './GameObject.js';
import Camera from './Camera.js';
import InputManager from './InputManager.js';
import { create as vec3_create, add as vec3_add, scale as vec3_scale } from '../math/vec3.js';
import { perspective } from '../math/mat4.js'; // Added perspective import

export default class Game {
    constructor() {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.camera = null;
        this.scene = [];
        this.lastTime = 0;
    }

    async init() {
        console.log("Game.init() started.");
        await this.renderer.init(); // No callback passed here
        console.log("Game.init(): Renderer initialized.");
        
        this.camera = new Camera(this.renderer.canvas);
        console.log("Game.init(): Camera created.");

        const obj1 = new GameObject([-1.0, 0.0, 0.0], [1, 0, 0]);
        const obj2 = new GameObject([1.0, 0.0, 0.0], [0, 1, 0]);
        const obj3 = new GameObject([0.0, 0.0, -1.0], [0, 0, 1]);

        this.scene.push(obj1, obj2, obj3);
        console.log("Game.init(): GameObjects created and added to scene.");

        // Initial call to recreate bind groups after renderer init and scene population
        this.recreateBindGroups(this.renderer.device, this.renderer.pipeline);
        console.log("Game.init(): Initial bind groups recreated.");
    }

    recreateBindGroups(device, pipeline) {
        if (!this.camera.uniformBuffer) { // Only create buffers once for camera
            this.camera.createBuffers(device, pipeline);
        } else { // Recreate bind group if buffers already exist
            this.camera.recreateBindGroup(pipeline);
        }
        
        for(const obj of this.scene) {
            if (!obj.vertexBuffer) { // Only create buffers once for game objects
                obj.createBuffers(device, pipeline);
            } else { // Recreate bind group if buffers already exist
                obj.recreateBindGroup(pipeline);
            }
        }
        console.log("Game: All bind groups recreated.");
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.resize(width, height);

        // Update camera aspect ratio
        const aspectRatio = width / height;
        perspective(this.camera.projectionMatrix, this.camera.fovY, aspectRatio, this.camera.zNear, this.camera.zFar);

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
        this.renderer.render(this.camera, this.scene);

        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime, now) {
        // Handle input to move camera
        const cameraSpeed = 2.0 * deltaTime; // Increased speed for better movement
        const tempVec3 = vec3_create();

        if (this.inputManager.isKeyDown('KeyW')) { // Move forward
            vec3_scale(tempVec3, this.camera.forward, cameraSpeed);
            vec3_add(this.camera.position, this.camera.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyS')) { // Move backward
            vec3_scale(tempVec3, this.camera.forward, -cameraSpeed);
            vec3_add(this.camera.position, this.camera.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyA')) { // Strafe left
            vec3_scale(tempVec3, this.camera.right, -cameraSpeed);
            vec3_add(this.camera.position, this.camera.position, tempVec3);
        }
        if (this.inputManager.isKeyDown('KeyD')) { // Strafe right
            vec3_scale(tempVec3, this.camera.right, cameraSpeed);
            vec3_add(this.camera.position, this.camera.position, tempVec3);
        }
        // Add Q and E for up/down movement
        if (this.inputManager.isKeyDown('KeyQ')) { // Move up
            this.camera.position[1] += cameraSpeed; // Use global Y for up/down for now
        }
        if (this.inputManager.isKeyDown('KeyE')) { // Move down
            this.camera.position[1] -= cameraSpeed; // Use global Y for up/down for now
        }

        // Handle mouse input for camera rotation
        const mouseDelta = this.inputManager.getMouseDelta();
        this.camera.yaw += mouseDelta[0];
        this.camera.pitch -= mouseDelta[1]; // Invert Y for intuitive mouse movement

        // Clamp pitch to prevent camera flip
        const halfPI = Math.PI / 2 - 0.01; // Small epsilon to avoid issues at exactly PI/2
        if (this.camera.pitch > halfPI) this.camera.pitch = halfPI;
        if (this.camera.pitch < -halfPI) this.camera.pitch = -halfPI;

        this.camera.updateViewProjMatrix();

        // Animate objects
        this.scene[0].rotationY = now / 1000; // Animate Y rotation
        this.scene[1].rotationX = now / 700; // Animate X rotation
        this.scene[2].rotationZ = now / 1200; // Animate Z rotation

        for (const obj of this.scene) {
            obj.updateModelMatrix();
        }
    }
}
