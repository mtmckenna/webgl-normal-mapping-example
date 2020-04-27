precision highp float;

varying mat3 vTbn;
varying vec2 vTextureCoord;
varying vec4 vBonusLight;
varying vec3 vVertexNormal;
varying vec4 vWorldPos;

uniform sampler2D uSpriteSampler;
uniform sampler2D uNormalSampler;
uniform vec3 uLightPos;
uniform float uTime;

void main(void) {
  vec3 lightColor = vec3(1.0, 1.0, 1.0);
  vec4 color = texture2D(uSpriteSampler, vTextureCoord);
  vec3 normalMap = texture2D(uNormalSampler, vTextureCoord.st).xyz * 2.0 - 1.0;
  normalMap = normalize(vTbn * normalMap);

  float light = dot(normalize(normalMap), normalize(uLightPos));

  float d = length(uLightPos - vWorldPos.xyz);
  float attenuation = clamp(0.5 / d + 0.5 / pow(d, 10.0), 0.0, 1.0);
  light = attenuation * light;

  gl_FragColor = color;
  gl_FragColor.rgb += light * lightColor; 

}
