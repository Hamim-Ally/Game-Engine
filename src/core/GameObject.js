import { create, identity, translate, scale as mScale, rotateX, rotateY, rotateZ } from '../math/mat4.js';

export default class GameObject {
    constructor(position = [0, 0, 0], color = [1, 1, 1]) {
        this.vertices = new Float32Array([
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

        this.position = position;
        this.rotationX = 0; // X-axis rotation in radians
        this.rotationY = 0; // Y-axis rotation in radians
        this.rotationZ = 0; // Z-axis rotation in radians
        this.scale = [1, 1, 1];
        this.color = new Float32Array([...color, 1.0]);
        
        this.modelMatrix = create();
        this.updateModelMatrix();

        this.vertexBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
    }

    createBuffers(device, pipeline) {
        // Store device for later bindGroup recreation if needed
        this.device = device;

        this.vertexBuffer = device.createBuffer({
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertices);
        this.vertexBuffer.unmap();

        this.uniformBuffer = device.createBuffer({
            size: 16 * 4 + 4 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.recreateBindGroup(pipeline); // Call the new method
    }

    recreateBindGroup(pipeline) {
        if (!this.device || !pipeline) {
            console.error("GameObject: Cannot recreate bind group. Device or pipeline is missing.");
            return;
        }
        this.bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
        });
    }

    updateModelMatrix() {
        identity(this.modelMatrix); // Start with identity
        translate(this.modelMatrix, this.modelMatrix, this.position); // Apply translation
        rotateY(this.modelMatrix, this.modelMatrix, this.rotationY); // Apply Y-rotation
        rotateX(this.modelMatrix, this.modelMatrix, this.rotationX); // Apply X-rotation
        rotateZ(this.modelMatrix, this.modelMatrix, this.rotationZ); // Apply Z-rotation
        mScale(this.modelMatrix, this.modelMatrix, this.scale);     // Apply scale
    }
}