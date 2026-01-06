import { create, perspective, lookAt, multiply } from '../math/mat4.js';
import { create as vec3_create, normalize as vec3_normalize, add as vec3_add, subtract as vec3_subtract, scale as vec3_scale, cross as vec3_cross, set as vec3_set } from '../math/vec3.js';

export default class Camera {
    constructor(canvas) {
        this.projectionMatrix = create();
        this.fovY = Math.PI / 4; // 45 degrees in radians
        this.zNear = 0.1;
        this.zFar = 100;
        const aspectRatio = canvas.width / canvas.height;
        perspective(this.projectionMatrix, this.fovY, aspectRatio, this.zNear, this.zFar);

        this.viewMatrix = create();
        this.position = [0, 0, 3]; // Camera position
        this.target = [0, 0, 0];   // Target remains at origin for now
        this.up = [0, 1, 0];

        this.yaw = -Math.PI / 2; // Y-axis rotation (left/right) - looking along -Z
        this.pitch = 0;          // X-axis rotation (up/down)
        
        this.forward = vec3_create();
        this.right = vec3_create();

        // Lighting parameters
        this.lightPosition = [1.0, 1.0, 1.0];
        this.lightColor = [1.0, 1.0, 1.0]; // White light
        this.ambientLightColor = [0.1, 0.1, 0.1]; // Dark ambient
        this.specularColor = [1.0, 1.0, 1.0]; // White specular highlights
        this.shininess = 32.0;               // Typical shininess value

        this.viewProjMatrix = create();

        this.uniformBuffer = null;
        this.bindGroup = null;
    }

    createBuffers(device, pipeline) {
        // Store device for later bindGroup recreation if needed
        this.device = device; 

        // Uniform buffer size: view_proj_matrix (mat4) + camera_position (vec3 padded to vec4) +
        // light_position (vec3 padded to vec4) + light_color (vec3 padded to vec4) +
        // ambient_light_color (vec3 padded to vec4) + specular_color (vec3 padded to vec4) +
        // shininess (f32 padded to vec4)
        // 16*4 bytes (mat4) + 6 * 4*4 bytes (for each vec3 padded to vec4, and f32 padded to vec4) = 64 + 6*16 = 64 + 96 = 160 bytes
        this.uniformBuffer = device.createBuffer({
            size: 16 * 4 + 6 * 4 * 4, // 160 bytes
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.recreateBindGroup(pipeline); // Call the new method
    }

    recreateBindGroup(pipeline) {
        if (!this.device || !pipeline) {
            console.error("Camera: Cannot recreate bind group. Device or pipeline is missing.");
            return;
        }
        this.bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [ { binding: 0, resource: { buffer: this.uniformBuffer } } ],
        });
    }

    updateViewProjMatrix() {
        // Recalculate target based on pitch and yaw for 3D camera control
        const x_target = Math.cos(this.yaw) * Math.cos(this.pitch);
        const y_target = Math.sin(this.pitch);
        const z_target = Math.sin(this.yaw) * Math.cos(this.pitch);

        this.target[0] = this.position[0] + x_target;
        this.target[1] = this.position[1] + y_target;
        this.target[2] = this.position[2] + z_target;

        // Calculate forward and right vectors
        vec3_normalize(this.forward, vec3_subtract(vec3_create(), this.target, this.position));
        vec3_normalize(this.right, vec3_cross(vec3_create(), this.forward, this.up)); // Re-normalize up vector after cross
        vec3_normalize(this.up, vec3_cross(vec3_create(), this.right, this.forward));


        lookAt(this.viewMatrix, this.position, this.target, this.up);
        multiply(this.viewProjMatrix, this.projectionMatrix, this.viewMatrix);

        // Data for uniform buffer is now prepared in Renderer.js
    }
}
