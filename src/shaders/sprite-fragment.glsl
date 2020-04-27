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
uniform bool uNormalMapOn;

void main(void) {
  vec3 lightColor = vec3(1.0, 1.0, 1.0);
  vec4 color = texture2D(uSpriteSampler, vTextureCoord);
  vec3 normalMap = texture2D(uNormalSampler, vTextureCoord.st).xyz * 2.0 - 1.0;
  normalMap = normalize(vTbn * normalMap);

  float light = dot(normalize(normalMap), normalize(uLightPos));

  // http://learnwebgl.brown37.net/09_lights/lights_attenuation.html
  float d = length(uLightPos - vWorldPos.xyz);
  float attenuation = clamp(.5 / d + .5 / pow(d, 20.0), 0.0, 1.0);
  light = attenuation * light;

  gl_FragColor = color;

  if (uNormalMapOn) {
    gl_FragColor.rgb += light * lightColor; 
  } else {
    gl_FragColor.rgb += .5 * attenuation * lightColor; 
  }
}
