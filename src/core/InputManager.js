export default class InputManager {
    constructor() {
        this.keys = new Set();
        this.mouseSensitivity = 0.002; // Adjust as needed
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isMouseDown = false; // To track if mouse is being used for looking around

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
        });

        // Add mouse event listeners
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isMouseDown = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                // Request pointer lock for continuous mouse movement without hitting screen edges
                // document.body.requestPointerLock(); // This requires user interaction, better to do in Game.js
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isMouseDown = false;
                // document.exitPointerLock();
            }
        });

        window.addEventListener('mousemove', (e) => {
            // Only update delta if mouse is down (or pointer locked)
            if (this.isMouseDown) { // Or if pointer is locked
                this.mouseDeltaX += (e.clientX - this.lastMouseX) * this.mouseSensitivity;
                this.mouseDeltaY += (e.clientY - this.lastMouseY) * this.mouseSensitivity;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
            }
            // If pointer is locked, e.movementX/Y can be used
            // if (document.pointerLockElement === document.body) {
            //     this.mouseDeltaX += e.movementX * this.mouseSensitivity;
            //     this.mouseDeltaY += e.movementY * this.mouseSensitivity;
            // }
        });
    }

    isKeyDown(keyCode) {
        return this.keys.has(keyCode);
    }

    getMouseDelta() {
        const delta = [this.mouseDeltaX, this.mouseDeltaY];
        this.mouseDeltaX = 0; // Reset after reading
        this.mouseDeltaY = 0;
        return delta;
    }
}
