export interface ProgramCache {
  attributes: { [key: string]: number };
  uniforms: { [key: string]: WebGLUniformLocation | null };
}

export function compiledProgram(
  gl: WebGLRenderingContext,
  vertexShader: string,
  fragmentShader: string
) {
  const compiledVertexShader = compileShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShader
  );
  const compiledFragmentShader = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShader
  );
  const newProgram = linkShader(
    gl,
    compiledVertexShader,
    compiledFragmentShader
  );
  return newProgram;
}

// modified from https://nickdesaulniers.github.io/RawWebGL/#/51
export function configureBuffer(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  data: ArrayBuffer,
  elemPerVertex: number,
  attributeName: string
) {
  const attributeLocation = programCache.attributes[attributeName];
  if (attributeLocation === undefined)
    console.warn(`No attribute location for ${attributeName}!!`);

  gl.enableVertexAttribArray(attributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(
    attributeLocation,
    elemPerVertex,
    gl.FLOAT,
    false,
    0,
    0
  );
}

export function cacheUniformLocations(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  programCache: ProgramCache,
  uniformNames: string[]
) {
  uniformNames.forEach(function (name) {
    cacheUniformLocation(gl, program, programCache, name);
  });
}

export function cacheAttributeLocations(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  programCache: ProgramCache,
  attributeNames: string[]
) {
  attributeNames.forEach(function (name) {
    cacheAttributeLocation(gl, program, programCache, name);
  });
}

// http://mrdoob.com/projects/glsl_sandbox/
function cacheUniformLocation(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  programCache: ProgramCache,
  label: string
) {
  programCache.uniforms[label] = gl.getUniformLocation(program, label);
  if (programCache.attributes[label] === -1) {
    console.warn(
      `Uniform ${label} has a location of -1, so it's probably not going to work...`
    );
  }
}

function cacheAttributeLocation(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  programCache: ProgramCache,
  label: string
) {
  programCache.attributes[label] = gl.getAttribLocation(program, label);
  if (programCache.attributes[label] === -1) {
    console.warn(
      `Attribute ${label} has a location of -1, so it's probably not going to work...`
    );
  }
}

export function setNormalsAttrib(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  vertices: number[]
) {
  configureBuffer(
    gl,
    programCache,
    buffer,
    new Float32Array(vertices),
    3,
    "aVertexNormal"
  );
}

export function setTangentsAttrib(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  vertices: number[]
) {
  configureBuffer(
    gl,
    programCache,
    buffer,
    new Float32Array(vertices),
    3,
    "aVertexTangent"
  );
}

export function setBitangentsAttrib(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  vertices: number[]
) {
  configureBuffer(
    gl,
    programCache,
    buffer,
    new Float32Array(vertices),
    3,
    "aVertexBitangent"
  );
}

export function setPositionsAttrib(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  vertices: number[]
) {
  configureBuffer(
    gl,
    programCache,
    buffer,
    new Float32Array(vertices),
    3,
    "aVertexPosition"
  );
}

export function setTextureCoordsAttrib(
  gl: WebGLRenderingContext,
  programCache: ProgramCache,
  buffer: WebGLBuffer,
  textureCoords: number[]
) {
  configureBuffer(
    gl,
    programCache,
    buffer,
    new Float32Array(textureCoords),
    2,
    "aTextureCoord"
  );
}

// https://github.com/mdn/webgl-examples/blob/gh-pages/tutorial/sample6/webgl-demo.js
export function loadTexture(gl: WebGLRenderingContext, url: string) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texParameter
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  };
  image.src = url;

  return texture;
}

// https://nickdesaulniers.github.io/RawWebGL/#/40
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  shaderSrc: string
) {
  const shader = gl.createShader(type);
  if (!shader) throw Error(`Couldn't create shader...`);
  gl.shaderSource(shader, shaderSrc);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      gl.getShaderInfoLog(shader) || "Couldn't get program info..."
    );
  }

  return shader;
}

// https://nickdesaulniers.github.io/RawWebGL/#/41
function linkShader(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const newProgram = gl.createProgram();
  if (!newProgram) throw Error(`Couldn't create new program...`);
  gl.attachShader(newProgram, vertexShader);
  gl.attachShader(newProgram, fragmentShader);
  gl.linkProgram(newProgram);

  if (!gl.getProgramParameter(newProgram, gl.LINK_STATUS)) {
    throw new Error(
      gl.getProgramInfoLog(newProgram) || "Couldn't get program info..."
    );
  }

  return newProgram;
}
