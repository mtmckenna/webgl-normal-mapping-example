// Texutre from here:
// https://opengameart.org/node/45591

import { mat4, vec2, vec3 } from "gl-matrix";

import {
  compiledProgram,
  cacheAttributeLocations,
  cacheUniformLocations,
  setNormalsAttrib,
  setTangentsAttrib,
  setBitangentsAttrib,
  setPositionsAttrib,
  setTextureCoordsAttrib,
  loadTexture,
  ProgramCache,
} from "./helpers/webgl-helpers";

import SPRITE_FRAG_SHADER from "./shaders/sprite-fragment.glsl";
import SPRITE_VERT_SHADER from "./shaders/sprite-vertex.glsl";

const UNIFORM_NAMES = [
  "uModelMatrix",
  "uViewMatrix",
  "uProjectionMatrix",
  "uSpriteSampler",
  "uNormalSampler",
  "uNormals",
  "uTime",
  "uLightPos",
];

const ATTRIBUTE_NAMES = [
  "aVertexPosition",
  "aVertexNormal",
  "aVertexTangent",
  "aVertexBitangent",
  "aTextureCoord",
];

// prettier-ignore
const QUAD_POSITIONS = [
  -0.0, +1.0, 0.0,
  -0.0, -0.0, 0.0,
  +1.0, +1.0, 0.0,
  -0.0, -0.0, 0.0,
  +1.0, -0.0, 0.0,
  +1.0, +1.0, 0.0,
];

const T_TX_MIN = 0.0;
const T_TX_MAX = 0.5;
// prettier-ignore
const TEXTURE_COORDS = [
  T_TX_MIN, T_TX_MIN,
  T_TX_MIN, T_TX_MAX,
  T_TX_MAX, T_TX_MIN,
  T_TX_MIN, T_TX_MAX,
  T_TX_MAX, T_TX_MAX,
  T_TX_MAX, T_TX_MIN
];

const canvas = <HTMLCanvasElement>document.getElementById("game");
const gl = canvas.getContext("webgl");

const numTiles = 9;
const numTilesPerRow = 3;
const zNear = 0.1;
const zFar = 100.0;
const camera = { x: 1.5, y: 1.5, z: 3.0 };
const lightRadius = 1.5;
const fieldOfView = deg2rad(45);

let vertexPositions = [];
let textureCoords = [];

// Build up our 9x9 grid
for (let i = 0; i < numTiles; i++) {
  const quad = [...QUAD_POSITIONS];

  for (let j = 0; j < quad.length; j = j + 3) {
    quad[j + 0] += i % numTilesPerRow; // x
    quad[j + 1] += Math.floor(i / numTilesPerRow); // y
    quad[j + 2] += 0; // z (doesn't move)
  }

  textureCoords.push(...TEXTURE_COORDS);
  vertexPositions.push(...quad);
}

const tbn = generateTbn();

let vertexTangents = [];
let vertexBitangents = [];
let vertexNormals = [];

for (let i = 0; i < vertexPositions.length / 3; i++) {
  vertexTangents.push(...Array.from(tbn.tangent));
  vertexBitangents.push(...Array.from(tbn.bitangent));
  vertexNormals.push(...Array.from(tbn.normal));
}

const textureUrl = `/brick.png`;
const normalTextureUrl = `/brick-n.png`;
let texture = loadTexture(gl, textureUrl);
let normalTexture = loadTexture(gl, normalTextureUrl);

const projectionMatrix = mat4.create();
const modelMatrix = mat4.create();
const viewMatrix = mat4.create();

const buffers = {
  positions: gl.createBuffer(),
  normals: gl.createBuffer(),
  textureCoords: gl.createBuffer(),
  tangents: gl.createBuffer(),
  bitangents: gl.createBuffer(),
};

const programCache: ProgramCache = {
  attributes: {},
  uniforms: {},
};

const tileProgram = compiledProgram(gl, SPRITE_VERT_SHADER, SPRITE_FRAG_SHADER);

cacheAttributeLocations(gl, tileProgram, programCache, ATTRIBUTE_NAMES);
cacheUniformLocations(gl, tileProgram, programCache, UNIFORM_NAMES);

// https://learnopengl.com/Advanced-Lighting/Normal-Mapping
function generateTbn() {
  const pos1 = QUAD_POSITIONS.slice(0, 3) as vec3;
  const pos2 = QUAD_POSITIONS.slice(3, 6) as vec3;
  const pos3 = QUAD_POSITIONS.slice(6, 9) as vec3;

  const edge1 = vec3.create();
  const edge2 = vec3.create();

  vec3.subtract(edge1, pos2, pos1);
  vec3.subtract(edge2, pos3, pos1);

  const uv1 = textureCoords.slice(0, 2) as vec2;
  const uv2 = textureCoords.slice(2, 4) as vec2;
  const uv3 = textureCoords.slice(4, 6) as vec2;

  const deltaUv1 = vec2.create();
  const deltaUv2 = vec2.create();

  vec2.subtract(deltaUv1, uv2, uv1);
  vec2.subtract(deltaUv2, uv3, uv1);

  const f = 1 / (deltaUv1[0] * deltaUv2[1] - deltaUv2[0] * deltaUv1[1]);

  const tangent = vec3.create();
  vec3.set(
    tangent,
    deltaUv2[1] * edge1[0] - deltaUv1[1] * edge2[0],
    deltaUv2[1] * edge1[1] - deltaUv1[1] * edge2[1],
    deltaUv2[1] * edge1[2] - deltaUv1[1] * edge2[2]
  );

  vec3.scale(tangent, tangent, f);
  vec3.normalize(tangent, tangent);

  const bitangent = vec3.create();

  vec3.set(
    bitangent,
    -deltaUv2[0] * edge1[0] + deltaUv1[0] * edge2[0],
    -deltaUv2[0] * edge1[1] + deltaUv1[0] * edge2[1],
    -deltaUv2[0] * edge1[2] + deltaUv1[0] * edge2[2]
  );

  vec3.scale(bitangent, bitangent, f);
  vec3.normalize(bitangent, bitangent);

  const normal = vec3.create();
  vec3.set(normal, 0, 0, 1);

  return { normal, tangent, bitangent };
}

function render(time) {
  requestAnimationFrame(render);

  mat4.lookAt(
    viewMatrix,
    [camera.x, camera.y, camera.z],
    [camera.x, camera.y, 0],
    [0.0, 1.0, 0.0]
  );
  mat4.perspective(
    projectionMatrix,
    fieldOfView,
    getAspectRatio(gl.canvas),
    zNear,
    zFar
  );
  gl.useProgram(tileProgram);
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(
    programCache.uniforms.uProjectionMatrix,
    false,
    projectionMatrix
  );

  gl.uniformMatrix4fv(programCache.uniforms.uModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(programCache.uniforms.uViewMatrix, false, viewMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, normalTexture);

  gl.uniform1i(programCache.uniforms.uSpriteSampler, 0);
  gl.uniform1i(programCache.uniforms.uNormalSampler, 1);
  gl.uniform1f(programCache.uniforms.uTime, time / 1000);

  // Make light go in a cirlce
  const lightPos = [
    1 + lightRadius * Math.cos(time / 1000),
    1 + lightRadius * Math.sin(time / 1000),
    1,
  ];

  gl.uniform3fv(programCache.uniforms.uLightPos, lightPos);

  setNormalsAttrib(gl, programCache, buffers["normals"], vertexNormals);
  setTangentsAttrib(gl, programCache, buffers["tangents"], vertexTangents);
  setBitangentsAttrib(
    gl,
    programCache,
    buffers["bitangents"],
    vertexBitangents
  );
  setPositionsAttrib(gl, programCache, buffers["positions"], vertexPositions);
  setTextureCoordsAttrib(
    gl,
    programCache,
    buffers["textureCoords"],
    textureCoords
  );
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositions.length / 3);
}

requestAnimationFrame(render);

function getAspectRatio(canvas) {
  return canvas.clientWidth / canvas.clientHeight;
}

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}
