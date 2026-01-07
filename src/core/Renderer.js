import TransformComponent from './TransformComponent.js';
import MeshRendererComponent from './MeshRendererComponent.js';
import CameraComponent from './CameraComponent.js'; // Import CameraComponent

export default class Renderer {
    constructor() {
        this.adapter = null;
        this.device = null;
        this.canvas = null;
        this.context = null;
        this.presentationFormat = null;
        this.pipeline = null;
        this.texture = null;
        this.sampler = null;
        this.textureBindGroup = null;
        this.depthTexture = null;
        this.depthTextureView = null;
        this.shaderModule = null; // Added
    }

    async init() {
        console.log("Renderer: Initializing WebGPU...");
        if (!navigator.gpu) throw new Error("WebGPU not supported.");
        console.log("Renderer: WebGPU supported.");

        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) throw new Error("No adapter found.");
        console.log("Renderer: Adapter found.", this.adapter);

        this.device = await this.adapter.requestDevice();
        console.log("Renderer: Device acquired.", this.device);

        // Add a 'lost' event listener for the device
        this.device.lost.then((info) => {
            console.error(`Renderer: WebGPU device was lost: ${info.message}`);
            // Attempt to re-initialize or inform the user
        });

        this.canvas = document.getElementById('webgpu-canvas');
        if (!this.canvas) throw new Error("Canvas element not found.");
        console.log("Renderer: Canvas acquired.", this.canvas);

        this.context = this.canvas.getContext('webgpu');
        if (!this.context) throw new Error("Failed to get WebGPU context.");
        console.log("Renderer: WebGPU context acquired.", this.context);

        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        console.log("Renderer: Presentation format:", this.presentationFormat);

        // Fetch shader code once
        const shaderCode = await (await fetch('./shaders/basic.wgsl')).text();
        this.shaderModule = this.device.createShaderModule({ code: shaderCode });
        console.log("Renderer: Shader module created.");
        
        // --- Moved createTexture before resize ---
        this.createTexture();
        console.log("Renderer: Texture created.");
        // --- End of moved block ---

        // Initial resize call to set up context and depth buffer
        await this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
        console.log("Renderer: Initial resize complete.");

        // createPipeline is called from resize now
        // await this.createPipeline(); 
        // console.log("Renderer: Pipeline created.");
    }
    
    async resize(width, height) { // Removed callback parameter
        if (!this.device || !this.context || !this.canvas) return;
        console.log(`Renderer: Resizing canvas to ${width}x${height}`);

        this.canvas.width = width;
        this.canvas.height = height;

        this.context.configure({
            device: this.device,
            format: this.presentationFormat,
            alphaMode: 'opaque',
            size: [width, height], // Set size for the context
        });

        // Recreate depth texture with new dimensions
        if (this.depthTexture) {
            this.depthTexture.destroy();
            console.log("Renderer: Old depth texture destroyed.");
        }
        this.depthTexture = this.device.createTexture({
            size: [width, height],
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.depthTextureView = this.depthTexture.createView();
        console.log("Renderer: New depth texture created.");

        // Recreate pipeline and bind groups as context may have changed
        await this.createPipeline(); // Call createPipeline after resize
        console.log("Renderer: Pipeline recreated after resize.");
    }

    createTexture() {
        // For a simple 2x2 placeholder texture, its size shouldn't depend on canvas size
        const textureSize = { width: 2, height: 2 }; 
        this.texture = this.device.createTexture({
            size: textureSize,
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        // Changed to all magenta for debugging black cube issue
        const smallTextureData = new Uint8Array([
            255, 0, 255, 255, // magenta
            255, 0, 255, 255, // magenta
            255, 0, 255, 255, // magenta
            255, 0, 255, 255, // magenta
        ]);
        
        this.device.queue.writeTexture(
            { texture: this.texture },
            smallTextureData,
            { bytesPerRow: 2 * 4 },
            { width: 2, height: 2 }
        );
        
        this.sampler = this.device.createSampler({
            magFilter: 'nearest',
            minFilter: 'nearest',
        });
    }

    async createPipeline() {
        console.log("Renderer: Creating pipeline...");
        // Define bind group layout for Group 0 (Scene uniforms)
        const bindGroupLayout0_descriptor = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            }],
        });

        // Define bind group layout for Group 1 (Object uniforms)
        const bindGroupLayout1_descriptor = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            }],
        });

        // Define bind group layout for Group 2 (Texture and Sampler)
        const bindGroupLayout2_descriptor = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'filtering' },
                },
            ],
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayout0_descriptor,
                bindGroupLayout1_descriptor,
                bindGroupLayout2_descriptor,
            ],
        });

        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout, // Use explicit layout
            vertex: {
                module: this.shaderModule,
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 8 * 4, // 8 floats per vertex (pos, norm, uv) * 4 bytes/float = 32 bytes
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' },     // Position (vec3f)
                        { shaderLocation: 1, offset: 3 * 4, format: 'float32x3' }, // Normal (vec3f)
                        { shaderLocation: 2, offset: (3 + 3) * 4, format: 'float32x2' }  // UV (vec2f)
                    ],
                }],
            },
            fragment: {
                module: this.shaderModule,
                entryPoint: 'fs_main',
                targets: [{ format: this.presentationFormat }],
            },
            primitive: { topology: 'triangle-list' },
            depthStencil: {
                format: 'depth24plus-stencil8',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
        });
        console.log("Renderer: Render pipeline created successfully.", this.pipeline);

        this.textureBindGroup = this.device.createBindGroup({
            layout: bindGroupLayout2_descriptor, // Use explicit layout descriptor
            entries: [
                { binding: 0, resource: this.texture.createView() },
                { binding: 1, resource: this.sampler },
            ],
        });
        console.log("Renderer: Texture bind group created.");
    }

    render(cameraGameObject, scene) { // Changed camera to cameraGameObject
        const cameraComponent = cameraGameObject.getComponent(CameraComponent);
        if (!cameraComponent || !scene || scene.length === 0) {
            console.warn("Renderer: No camera component or scene objects to render.");
            return;
        }

        // Prepare scene uniform buffer data
        const sceneUniformBufferData = new Float32Array(40);
        sceneUniformBufferData.set(cameraComponent.viewProjMatrix, 0);
        sceneUniformBufferData.set(cameraComponent.position, 16);
        sceneUniformBufferData.set(cameraComponent.lightPosition, 20);
        sceneUniformBufferData.set(cameraComponent.lightColor, 24);
        sceneUniformBufferData.set(cameraComponent.ambientLightColor, 28);
        sceneUniformBufferData.set(cameraComponent.specularColor, 32);
        sceneUniformBufferData[36] = cameraComponent.shininess;

        this.device.queue.writeBuffer(cameraComponent.uniformBuffer, 0, sceneUniformBufferData);
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        const renderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
            depthStencilAttachment: {
                view: this.depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store',
            },
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, cameraComponent.bindGroup); // Use cameraComponent.bindGroup
        passEncoder.setBindGroup(2, this.textureBindGroup);

        for (const gameObject of scene) {
            const meshRenderer = gameObject.getComponent(MeshRendererComponent);
            if (meshRenderer && meshRenderer.vertexBuffer && meshRenderer.uniformBuffer && meshRenderer.bindGroup) {
                meshRenderer.updateUniformBuffer(); // Update uniform buffer with model matrix and color
                passEncoder.setBindGroup(1, meshRenderer.bindGroup);
                passEncoder.setVertexBuffer(0, meshRenderer.vertexBuffer);
                passEncoder.draw(meshRenderer.vertices.length / 8, 1, 0, 0);
                console.log(`Renderer: Drawing GameObject "${gameObject.name}" with ${meshRenderer.vertices.length / 8} vertices.`);
            } else {
                console.warn(`Renderer: Skipping GameObject "${gameObject.name}" due to missing MeshRendererComponent or its buffers/bindGroup.`);
            }
        }
        passEncoder.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }
}