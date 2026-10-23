/**
 * Cửa ngõ duy nhất vào Babylon.js. Mọi tệp nhập Babylon từ đây, không nhập thẳng "@babylonjs/core".
 *
 * Lý do: `import { … } from "@babylonjs/core"` kéo theo toàn bộ engine (~7 MB chưa nén) vì index của gói có side-effect.
 * Nhập theo đường dẫn sâu thì Vite chỉ đóng gói phần dùng tới. Đổi lại, những tính năng Babylon gắn thêm vào Scene /
 * Engine / Mesh lúc chạy (pickWithRay, va chạm, bóng đổ, hậu kỳ, hạt, thin instance, DynamicTexture) phải được nhập
 * side-effect ở đây — thiếu cái nào thì Babylon báo lỗi "...needs to be imported before..." lúc chạy.
 */

// ---------------------------------------------------------------- side effect (đăng ký tính năng vào Scene/Engine/Mesh)
import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent";
import "@babylonjs/core/Particles/particleSystemComponent";
import "@babylonjs/core/Meshes/thinInstanceMesh";
import "@babylonjs/core/Engines/Extensions/engine.dynamicTexture";

// ---------------------------------------------------------------- lớp dùng trong game
export { Engine } from "@babylonjs/core/Engines/engine";
export { Scene } from "@babylonjs/core/scene";
export { Logger } from "@babylonjs/core/Misc/logger";
export { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
export { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
// Nhập Ray từ bản có side effect: đăng ký scene.pickWithRay.
export { Ray } from "@babylonjs/core/Culling/ray";
export { Node } from "@babylonjs/core/node";
export { TransformNode } from "@babylonjs/core/Meshes/transformNode";
export { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
export { Mesh } from "@babylonjs/core/Meshes/mesh";
export { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
export { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
export { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
export { Light } from "@babylonjs/core/Lights/light";
export { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
export { PointLight } from "@babylonjs/core/Lights/pointLight";
export { SpotLight } from "@babylonjs/core/Lights/spotLight";
export { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
export { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
export { Material } from "@babylonjs/core/Materials/material";
export { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
export { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
export { Texture } from "@babylonjs/core/Materials/Textures/texture";
export { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
export { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
export { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
