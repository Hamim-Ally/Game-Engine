import Component from "./Component.js";
import Mesh from "./Mesh.js"; // Import the Mesh class

export default class MeshRendererComponent extends Component {
    constructor(gameObject, mesh, color = [1, 1, 1, 1]) {
        super(gameObject);
        if (!(mesh instanceof Mesh)) {
            console.error("MeshRendererComponent constructor expects a Mesh object for the 'mesh' argument.");
            throw new Error("Invalid mesh provided to MeshRendererComponent.");
        }
        this.mesh = mesh;
        this.color = new Float32Array(color); // RGBA color

        // WebGPU related resources
        this.vertexBuffer = null;
        this.uniformBuffer = null;
        this.bindGroup = null;
        this.device = null; // Stored for bind group recreation

        // Flag to indicate if buffers need to be re-created/updated
        this.buffersDirty = true;
    }

    /**
     * Initializes WebGPU buffers for the mesh.
     * @param {GPUDevice} device The WebGPU device.
     * @param {GPURenderPipeline} pipeline The render pipeline used for this mesh.
     */
    createBuffers(device, pipeline) {
        if (!device || !pipeline) {
            console.error("MeshRendererComponent: Cannot create buffers. Device or pipeline is missing.");
            return;
        }
        this.device = device;

        // Vertex buffer
        this.vertexBuffer = device.createBuffer({
            size: this.mesh.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(this.mesh.vertices);
        this.vertexBuffer.unmap();

        // Uniform buffer for model matrix and color
        // 16 floats for model matrix (mat4) + 4 floats for color (vec4)
        this.uniformBuffer = device.createBuffer({
            size: 16 * 4 + 4 * 4, // 16 * 4 bytes for mat4, 4 * 4 bytes for vec4
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.recreateBindGroup(pipeline);
        this.buffersDirty = false;
    }

    /**
     * Recreates the bind group if the pipeline changes or for other reasons.
     * @param {GPURenderPipeline} pipeline The render pipeline used for this mesh.
     */
    recreateBindGroup(pipeline) {
        if (!this.device || !pipeline) {
            console.error("MeshRendererComponent: Cannot recreate bind group. Device or pipeline is missing.");
            return;
        }
        this.bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1), // Assuming bind group 1 for object-specific uniforms
            entries: [{ binding: 0, resource: { buffer: this.uniformBuffer } }],
        });
    }

    /**
     * Updates the uniform buffer with the latest model matrix and color.
     * This should be called every frame before rendering.
     */
    updateUniformBuffer() {
        if (!this.uniformBuffer || !this.gameObject) {
            return;
        }

        const transform = this.gameObject.getComponent(this.gameObject.TransformComponent); // Will fix this later
        if (!transform) {
             console.error("MeshRendererComponent requires a TransformComponent on its GameObject.");
             return;
        }

        const uniformArray = new Float32Array(20); // 16 for mat4, 4 for vec4
        uniformArray.set(transform.modelMatrix);
        uniformArray.set(this.color, 16); // Color starts at offset 16

        this.device.queue.writeBuffer(
            this.uniformBuffer,
            0,
            uniformArray.buffer,
            uniformArray.byteOffset,
            uniformArray.byteLength
        );
    }

    onDestroy() {
        // Clean up WebGPU resources when the component is destroyed
        if (this.vertexBuffer) this.vertexBuffer.destroy();
        if (this.uniformBuffer) this.uniformBuffer.destroy();
        // Bind groups are implicitly destroyed when the device is destroyed,
        // or can be garbage collected if no longer referenced.
    }
}