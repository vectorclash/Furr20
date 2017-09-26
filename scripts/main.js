var container;
var camera, scene, renderer, directionalLight1, directionalLight2;
var geometry, material;
var clock = new THREE.Clock();
var shapes, rings;
var containerShape1, containerShape2;
var shapeNum = 20;
var shapeSize = 0.2;
var resetting = false;
var deformationRange = 0.1;
var texture, innerSphereTexture;
var innerSphere;

// sound reactivity

var soundReactive = false;
var context;
var source, sourceJs;
var microphone;
var analyser;
var buffer;
var byteArray = new Array();
var total;

function init() {

  container = document.querySelector('.three-container');

  renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 1;
  scene = new THREE.Scene();

  var lightColor1 = tinycolor.random();
  var lightColor2 = lightColor1.complement();

  directionalLight1 = new THREE.DirectionalLight( lightColor1.toHexString(), 1 );
  directionalLight1.position.set( 200, 350, 100 );
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  directionalLight2 = new THREE.DirectionalLight( lightColor2.toHexString(), 1 );
  directionalLight2.position.set( -200, -350, -100 );
  directionalLight2.castShadow = true;
  scene.add(directionalLight2);

  shapes = new THREE.Object3D();
  scene.add(shapes);

  var urls = [
  'textures/pos-x.png',
  'textures/neg-x.png',
  'textures/pos-y.png',
  'textures/neg-y.png',
  'textures/pos-z.png',
  'textures/neg-z.png'
  ];
  texture = new THREE.CubeTextureLoader().load(urls);
  // texture.mapping = THREE.CubeRefractionMapping;
  texture.format = THREE.RGBFormat;
  // console.log(texture);

  var hue = 0;
  var hueIncrement = 360 / shapeNum;

  for(var s = 0; s < shapeNum; s++) {
    // geometry = new THREE.SphereGeometry(shapeSize, 5, 5);
    // geometry = new THREE.BoxGeometry(shapeSize, shapeSize, shapeSize, 8, 8, 8);
    // geometry = new THREE.TorusKnotGeometry( shapeSize, 3, 42, 12, 3, 11 );
    // geometry = new THREE.TetrahedronGeometry(shapeSize, 2);
    geometry = new THREE.IcosahedronGeometry(shapeSize, 1);
    // geometry = new THREE.DodecahedronGeometry(shapeSize, 1);

    hue += hueIncrement;
    var hslColor = tinycolor({ h: hue, s: 0, l: 1 });

    material = new THREE.MeshPhongMaterial( { color: tinycolor.random().toHexString(), emissive: 0xFFFFFF, reflectivity: 0.9, flatShading: true, needsUpdate: true, envMap: texture });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = s * 20;
    mesh.rotation.y = s * 20;
    mesh.rotation.z = s * 20;
    //mesh.scale.x = 1 + s * 0.01;
    //mesh.scale.y = 1 + s * 0.01;
    //mesh.scale.z = 1 + s * 0.01;
    mesh.verticesOrigin = new Array();
    mesh.ranRotation = 0.0009;
    mesh.ranSize = 100 + Math.random() * 400;

    //mesh.position.y = s;

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    shapes.add(mesh);
    for ( var i = 0; i < geometry.vertices.length; i ++ ) {
      mesh.verticesOrigin.push({x:mesh.geometry.vertices[i].x, y:mesh.geometry.vertices[i].y, z:mesh.geometry.vertices[i].z});
  	}
  }

  containerShapeGeometry = new THREE.DodecahedronGeometry(50, 2);
  containerShapeMaterial = new THREE.MeshPhongMaterial( { color: 0xFFFFFF, specular: 0xFFFFFF, emissive: 0xFFFFFF, reflectivity: 1, shininess: 50, flatShading: true, needsUpdate: true, envMap: texture, side: THREE.BackSide });
  containerShape1 = new THREE.Mesh(containerShapeGeometry, containerShapeMaterial);
  containerShape2 = new THREE.Mesh(containerShapeGeometry, containerShapeMaterial);
  // containerShape.position.y = 0.5;
  scene.add(containerShape1);
  scene.add(containerShape2);

  var innerSphereTextureLoader = new THREE.TextureLoader();
  innerSphereTextureLoader.load(
    'textures/space-texture-one.png',
    function(texture) {
      var innerSphereMaterial = new THREE.MeshBasicMaterial({transparent: true, side: THREE.DoubleSide, map: texture, opacity: 0.7});
      var innerSphereGeometry = new THREE.SphereGeometry(49, 64, 64);
      innerSphere = new THREE.Mesh(innerSphereGeometry, innerSphereMaterial);
      scene.add(innerSphere);
    }
  );



  container.appendChild(renderer.domElement);

  // init sound reactivity

  navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
  if(navigator.getUserMedia) {
    navigator.getUserMedia({
        audio: true,
        video: false
      },
      function(mediaStream) {
        context = new AudioContext();
        microphone = context.createMediaStreamSource(mediaStream);
        if(microphone) {
          soundReactive = true;
        }

        sourceJs = context.createScriptProcessor(2048, 1, 1);
        sourceJs.connect(context.destination);
        analyser = context.createAnalyser();
        analyser.smoothingTimeConstant = 0.5;
        analyser.fftSize = 128;

        microphone.connect(analyser);
        analyser.connect(sourceJs);
        sourceJs.connect(context.destination);

        sourceJs.onaudioprocess = function(e) {
            byteArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(byteArray);
            total = 0;
            for (var i = 0; i < byteArray.length; i++) {
              total += byteArray[i];
            }
        };
      },
      function(error) {
        console.log("There was an error when getting microphone input: " + error);
      }
    );
  }

  window.addEventListener('click', onClick);
  window.addEventListener('resize', onWindowResize, false);
  renderer.animate(render);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
  var delta1 = clock.getDelta(), time1 = clock.getElapsedTime() * 0.05;
  var delta2 = clock.getDelta(), time2 = clock.getElapsedTime() * 1.45;
  var delta3 = clock.getDelta(), time3 = clock.getElapsedTime() * 1.6;

  for(var s = 0; s < shapes.children.length; s++) {
    var shape = shapes.children[s];
    shape.material.reflectivity = 0.8 + noise.perlin3(time1, s+1, total * 0.0005) * (total * 0.0002);

    if(!resetting) {
      for (var i = 0; i < shape.geometry.vertices.length; i ++) {
        shape.geometry.vertices[i].x =  shape.verticesOrigin[i].x * ((1-deformationRange) + noise.perlin3(shape.verticesOrigin[i].x / s+1, i+1, noise.perlin3(time1, s+1, total * 0.0005)) * (byteArray[i] * 0.004));
        shape.geometry.vertices[i].y = shape.verticesOrigin[i].y * ((1-deformationRange) + noise.perlin3(shape.verticesOrigin[i].y / s+1, i+1, noise.perlin3(time2, s+1, total * 0.0005)) * (byteArray[i+1] * 0.004));
        shape.geometry.vertices[i].z = shape.verticesOrigin[i].z * ((1-deformationRange) + noise.perlin3(shape.verticesOrigin[i].z / s+1, i+1, noise.perlin3(time3, s+1, total * 0.0005)) * (byteArray[i+2] * 0.004));
    	}
    }

    shape.geometry.verticesNeedUpdate = true;

    shape.rotation.x += shape.ranRotation;
    shape.rotation.y += shape.ranRotation;
    shape.rotation.z += shape.ranRotation;
  }

  if(innerSphere) {
    // innerSphere.rotation.x += byteArray[0] * 0.00001;
    // innerSphere.rotation.y += byteArray[30] * 0.00001;
    // innerSphere.rotation.z += byteArray[byteArray.length-1] * 0.00001;

    innerSphere.rotation.x += total * 0.000001;
    innerSphere.rotation.y += total * 0.000001;
    innerSphere.rotation.z += total * 0.000001;
  }

  containerShape1.rotation.y += 0.002;
  containerShape2.rotation.y -= 0.0015;
	renderer.render( scene, camera );
}

function changeColor() {
  var lightColor1 = tinycolor.random();
  var lightColor2 = lightColor1.complement();

  TweenMax.to(directionalLight1.color, 1, {r:lightColor1.toRgb().r / 256.0, g:lightColor1.toRgb().g / 256.0, b:lightColor1.toRgb().b / 256.0, ease:Elastic.easeOut, delay: 0.5});
  TweenMax.to(directionalLight2.color, 1, {r:lightColor2.toRgb().r / 256.0, g:lightColor2.toRgb().g / 256.0, b:lightColor2.toRgb().b / 256.0, ease:Elastic.easeOut, delay: 0.6});
  TweenMax.to(this, 0.4, {deformationRange:1.0, ease:Expo.easeIn});
  TweenMax.to(this, 1.2, {deformationRange:0.1, ease:Elastic.easeOut, delay: 0.41});
}

function onClick(e) {
  changeColor();
}

window.addEventListener('load', init);
