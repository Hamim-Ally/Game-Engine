// Scene uniforms
struct Scene {
    view_proj_matrix: mat4x4<f32>,
    camera_position: vec3<f32>,
    light_position: vec3<f32>,
    light_color: vec3<f32>,
    ambient_light_color: vec3<f32>,
    specular_color: vec3<f32>, // Added specular color
    shininess: f32,            // Added shininess
};
@group(0) @binding(0) var<uniform> scene: Scene;

// Object uniforms
struct Object { model_matrix: mat4x4<f32>, color: vec4<f32>, };
@group(1) @binding(0) var<uniform> object: Object;

// Texture and Sampler
@group(2) @binding(0) var t_diffuse: texture_2d<f32>;
@group(2) @binding(1) var s_diffuse: sampler;


// Vertex shader output
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
    @location(3) world_position: vec3<f32>,
};

// Vertex shader
@vertex
fn vs_main(
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>
) -> VertexOutput {
    var out: VertexOutput;
    let world_position_vec4 = object.model_matrix * vec4<f32>(position, 1.0);
    out.world_position = world_position_vec4.xyz;
    out.position = scene.view_proj_matrix * world_position_vec4;
    out.color = object.color;
    // Transform normal to world space (assuming no non-uniform scaling)
    out.normal = normalize((object.model_matrix * vec4<f32>(normal, 0.0)).xyz);
    out.uv = uv;
    return out;
}

// Fragment shader
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // let tex_color = textureSample(t_diffuse, s_diffuse, in.uv); // Sample texture but might not use its color directly for now
    
    let N = normalize(in.normal);
    let L = normalize(scene.light_position - in.world_position);
    let V = normalize(scene.camera_position - in.world_position);
    let H = normalize(L + V);

    let ambient_component = scene.ambient_light_color;
    let diffuse_component = scene.light_color * max(dot(N, L), 0.0);
    let specular_component = scene.specular_color * pow(max(dot(N, H), 0.0), scene.shininess);

    let final_light_color = ambient_component + diffuse_component + specular_component;
    
    // Use in.color as the primary object color, apply lighting
    let final_object_color = final_light_color * in.color.rgb; 

    return vec4<f32>(final_object_color, in.color.a); // Use in.color.a for final alpha
}