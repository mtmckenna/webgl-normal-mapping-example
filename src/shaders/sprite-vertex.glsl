precision highp float;

attribute vec4 aVertexPosition;
attribute vec3 aVertexTangent;
attribute vec3 aVertexBitangent;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;

uniform vec3 uLightPos;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 vTextureCoord;
varying vec4 vBonusLight;
varying vec3 vVertexNormal;
varying mat3 vTbn;
varying vec4 vWorldPos;


void main(void) {
  vec4 worldPos = uModelMatrix * aVertexPosition;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
  
  vec3 t = normalize(vec3(uModelMatrix * vec4(aVertexTangent, 0.0)));
  vec3 b = normalize(vec3(uModelMatrix * vec4(aVertexBitangent, 0.0)));
  vec3 n = normalize(vec3(uModelMatrix * vec4(aVertexNormal, 0.0)));
  mat3 tbn = mat3(t, b, n);

  vTextureCoord = aTextureCoord;
  vVertexNormal = aVertexNormal;
  vTbn = tbn;
  vWorldPos = worldPos;
}