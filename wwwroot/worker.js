importScripts('https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.min.js');
importScripts('ThreeBSP.js');


function buildComponentMesh(data) {
    const vertexArray = [];

    for (let idx = 0; idx < data.nbMeshes; ++idx) {
        const meshData = {
            positions: data['positions' + idx],
            indices: data['indices' + idx],
            stride: data['stride' + idx]
        };

        getMeshGeometry(meshData, vertexArray);
    }

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(vertexArray.length * 3);

    for (let i = 0; i < vertexArray.length; i++) {
        vertices[i * 3] = vertexArray[i].x;
        vertices[i * 3 + 1] = vertexArray[i].y;
        vertices[i * 3 + 2] = vertexArray[i].z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const matrixWorld = new THREE.Matrix4();
    if (data.matrixWorld) {
        matrixWorld.fromArray(data.matrixWorld);
    }

    const mesh = new THREE.Mesh(geometry);
    mesh.applyMatrix4(matrixWorld);

    // Initialize the properties
    mesh.vertices = [];
    mesh.floorDbIds = [];
    mesh.pathEdges = [];
    mesh.faces = [];

    mesh.boundingBox = data.boundingBox;
    mesh.bsp = new ThreeBSP(mesh);
    mesh.dbId = data.dbId;

    return mesh;
}


function getMeshGeometry(data, vertexArray) {
    const offsets = [{
        count: data.indices.length,
        index: 0,
        start: 0
    }];

    for (let oi = 0, ol = offsets.length; oi < ol; ++oi) {
        const start = offsets[oi].start;
        const count = offsets[oi].count;
        const index = offsets[oi].index;

        for (let i = start, il = start + count; i < il; i += 3) {
            const a = index + data.indices[i];
            const b = index + data.indices[i + 1];
            const c = index + data.indices[i + 2];

            const vA = new THREE.Vector3();
            const vB = new THREE.Vector3();
            const vC = new THREE.Vector3();

            vA.fromArray(data.positions, a * data.stride);
            vB.fromArray(data.positions, b * data.stride);
            vC.fromArray(data.positions, c * data.stride);

            vertexArray.push(vA);
            vertexArray.push(vB);
            vertexArray.push(vC);
        }
    }
}

function postWallMesh(mesh, opts) {
    const geometry = mesh.geometry;

    const msg = Object.assign({}, {
        matrixWorld: mesh.matrix.elements,
        vertices: geometry.vertices,
        floorDbIds: mesh.floorDbIds,
        pathEdges: mesh.pathEdges,
        msgId: 'MSG_ID_WALL_MESH',
        faces: geometry.faces,
        dbId: mesh.dbId
    }, opts);

    self.postMessage(msg);
}

self.onmessage = function(event) {
    // console.log('Worker received mesh data', event.data);

    const mesh = buildComponentMesh(event.data);
    postWallMesh(mesh);
};

// self.onmessage = function(event) {
//     console.log('---Worker received mesh data', event.data);
//     // TODO: Process the mesh data
// };