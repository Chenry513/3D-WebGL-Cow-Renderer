//variables
let gl;
let canvas;
let program;
let cow_points = [];
let indexs = [];
let cow_array = [];
let normals_array = []; 
let angle = 0;
let angle2 = 0;
let scale1;
let trans1;
let trans2;
let status;
let spotX = 0;
let spotY = 6;
let spotZ = 6;
let spotDirectionX = 0;
let spotDirectionY = -1;
let spotDirectionZ = -1;
let spotPos = vec3(0, 6, 6);
let spotDirection = vec3(0, 0, -1);
let rotation1;
let rotation2;
let point_x = 0;
let copy_lx = 0;
let point_y = 0;
let stop_light_rotate = false;
let stop_light_pan = false;
let angleSpot = 0;
let anglePan = 0;

window.onload = function init() {
  
  function generateWireVertices(radius, height, segments) {
    const vertices = [];
    const indexs = [];
  
    const halfHeight = height * 0.5;
    vertices.push(vec3(0, 0, halfHeight)); 
  
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      vertices.push(vec3(x, y, -halfHeight));
    }
  
    for (let i = 1; i <= segments; i++) {
      indexs.push(0, i, i % segments + 1);
    }
  
    return { vertices, indexs };
  }

  const coneRad = 1.5;
  const coneHeight = 3;
  const coneSegs = 30;

  const { vertices: coneVertices, indexs: coneIndices } = generateWireVertices(
    coneRad,
    coneHeight,
    coneSegs
  );

  const cowVertices = get_vertices();
  const cowIndices = get_faces();
  cowVertices.push(...coneVertices);
  cowIndices.push(...coneIndices.map(i => i + cowVertices.length));

  scale1 = document.getElementById("scale1");
  trans1 = document.getElementById("trans1");
  trans2 = document.getElementById("trans2");
  status = document.getElementById("status");
  rotation1 = document.getElementById("rotation1");
  rotation2 = document.getElementById("rotation2");

  canvas = document.getElementById("gl-canvas");
  canvas.focus();
  let dragging = false;
  let dragStart;
  let dragEnd;

  canvas.addEventListener("wheel", ({ deltaY }) => {
    if (deltaY < 0) {
      scale1.value = parseFloat(scale1.value) + 0.05;
    } else if (deltaY > 0) {
      scale1.value = parseFloat(scale1.value) - 0.05;
    }
  });

  canvas.addEventListener("mousedown", ({ which, pageX, pageY }) => {
    switch (which) {
      case 1:
      case 3:
        dragStart = {
          x: pageX,
          y: pageY
        };
        dragging = true;
        break;
    }
  });

  canvas.addEventListener("mouseup", event => {
    dragging = false;
  });

  window.addEventListener("keydown", ({ keyCode }) => {
    switch (keyCode) {
      case 37:
        trans1.value = (parseFloat(trans1.value) - 0.05).toFixed(2);
        break;
      case 39:
        trans1.value = (parseFloat(trans1.value) + 0.05).toFixed(2);
        break;
      case 82:
        rotation1.value = 0;
        rotation2.value = 0;
        break;
    }
  });

  window.addEventListener("keypress", ({ which }) => {
    switch (which) {
      case 114:
        rotation1.value = 0;
        rotation2.value = 0;
        scale1.value = 0.15;
        trans1.value = -0.1;
        trans2.value = 0.1;
        break;
      case 112:
        stop_light_rotate = !stop_light_rotate;
        angle2 = angle;

        break;
      case 115:
        stop_light_pan = !stop_light_pan;
        copy_lx = point_x;
        break;
    }
  });

  canvas.addEventListener("mousemove", ({ which, clientX, clientY }) => {
    switch (which) {
      case 1:
        point_x = (2 * clientX) / canvas.width - 1;
        point_y = (2 * (canvas.height - clientY)) / canvas.height - 1;
        if (dragging) {
          dragEnd = {
            x: point_x,
            y: point_y
          };
          trans1.value = point_x.toFixed(2);
          trans2.value = point_y.toFixed(2);
          dragStart = dragEnd;
        }
        break;
      case 3:
        point_x = (2 * clientX) / canvas.width - 1;
        point_y = (2 * (canvas.height - clientY)) / canvas.height - 1;

        if (dragging) {
          dragEnd = {
            x: point_x * 180,
            y: point_y * 180
          };
          rotation1.value = dragEnd.x.toFixed(2);
          rotation2.value = dragEnd.y.toFixed(2);
          dragStart = dragEnd;
        }

        break;
    }
  });

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  indexs = get_faces();
  cow_points = get_vertices();

  for (let i = 0; i < indexs.length; i++) {
    for (let j = 0; j < 3; j++) {
      cow_array.push(cow_points[indexs[i][j] - 1]);
    }
  }

  computeVertexNormals();

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  const vertexNormal = gl.getAttribLocation(program, "vNormal");
  const vertexPosition = gl.getAttribLocation(program, "vPosition");

  const normBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(normals_array), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vertexNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexNormal);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(cow_array), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexPosition);

  window.requestAnimationFrame(render);
};

function setUniform3f(prog, name, x, y, z) {
  const position = gl.getUniformLocation(prog, name);
  gl.uniform3f(position, x, y, z);
}
function computeVertexNormals() {

  normals_array = [];

  const vertexNormals = new Array(cow_points.length).fill(vec3(0, 0, 0));

  for (let i = 0; i < indexs.length; i++) {
    const v1Index = indexs[i][0] - 1;
    const v2Index = indexs[i][1] - 1;
    const v3Index = indexs[i][2] - 1;

    const v1 = vec3(cow_array[i * 3]);
    const v2 = vec3(cow_array[i * 3 + 1]);
    const v3 = vec3(cow_array[i * 3 + 2]);

    const e1 = subtract(v2, v1);
    const e2 = subtract(v3, v1);
    const faceNormal = normalize(cross(e1, e2));

    vertexNormals[v1Index] = add(vertexNormals[v1Index], faceNormal);
    vertexNormals[v2Index] = add(vertexNormals[v2Index], faceNormal);
    vertexNormals[v3Index] = add(vertexNormals[v3Index], faceNormal);
  }

  for (let i = 0; i < vertexNormals.length; i++) {
    vertexNormals[i] = normalize(vertexNormals[i]);
  }

  for (let i = 0; i < indexs.length; i++) {
    const v1Index = indexs[i][0] - 1;
    const v2Index = indexs[i][1] - 1;
    const v3Index = indexs[i][2] - 1;

    const v1Normal = vertexNormals[v1Index];
    const v2Normal = vertexNormals[v2Index];
    const v3Normal = vertexNormals[v3Index];

    normals_array.push(v1Normal);
    normals_array.push(v2Normal);
    normals_array.push(v3Normal);
  }
}


function render() {
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (stop_light_rotate) {
    anglePan = angle2;
  } else {
    anglePan += 0.2; 
  }


  if (!stop_light_pan) {

    const oscillationRangeX = 45;
    const oscillationRangeY = 30;
    const spotlightAngleX = oscillationRangeX * Math.sin((angleSpot * Math.PI) / 180);
    const spotlightAngleY = oscillationRangeY * Math.sin((angleSpot * Math.PI) / 180);

    spotX = 6 * Math.sin((spotlightAngleX * Math.PI) / 180); 
    spotZ = 6 * Math.cos((spotlightAngleY * Math.PI) / 180);

    spotlightX = -spotX;
    spotDirectionY = spotY - 6;
    spotDirectionZ = -spotZ;

    spotY = -8;

    angleSpot += 0.2; 
  }
  

  const rotate1 = rotateX(rotation1.value);
  const rotate2 = rotateY(rotation2.value);
  const s1 = scalem(scale1.value, scale1.value, scale1.value);
  const trans = translate(trans1.value, trans2.value, 0);
  const mat = mult(trans, mult(s1, mult(rotate2, rotate1)));

  const normalMatrix = inverse(transpose(mat3(mat)));

  const position = gl.getUniformLocation(program, "mat");
  gl.uniformMatrix4fv(position, false, flatten(mat));

  const normMatrix = gl.getUniformLocation(program, "normalMatrix");
  gl.uniformMatrix3fv(normMatrix, false, flatten(normalMatrix));

  const rotationSpeedConstant = 10;

  const x = Math.cos((Math.PI * anglePan * rotationSpeedConstant) / 180.0);
  const y = Math.sin((Math.PI * anglePan * rotationSpeedConstant) / 180.0);

  const gx = Math.cos((Math.PI * point_x * rotationSpeedConstant) / 180.0);

  spotPos = vec3(spotX, spotY, spotZ);
  setUniform3f(program, "panning_spotlightDir", spotlightX, spotDirectionY, spotDirectionZ);
  setUniform3f(program, "lightPos", spotX, spotY, spotZ);
  setUniform3f(program, "lightDir", x, y, 0.0);
  setUniform3f(program, "lightColorMat", 0.4, 0.6, 0.5);
  setUniform3f(program, "lightColor", 0.8, 0.5, 0.3);
  setUniform3f(program, "ambientColor", 0.18, 0.22, 0.25);
  setUniform3f(program, "surfaceSpec", 0.2, 0.2, 0.2);
  setUniform3f(program, "surfaceSpecMat", 0.8, 0.8, 0.8);
  setUniform3f(program, "surfaceDiffuse", 0.8, 0.6, 0.4);

  
  gl.drawArrays(gl.TRIANGLES, 0, cow_array.length);

  window.requestAnimationFrame(render);
}
