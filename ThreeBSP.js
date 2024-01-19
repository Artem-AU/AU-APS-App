/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS202: Simplify dynamic range loops
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const EPSILON = 1e-5;
const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

// Call the callback with no arguments
// then return the first value.
// Used to construct chainable
// callbacks
const returning = function(value, fn) {
  fn();
  return value;
};

class Timelimit {
  constructor(timeout, progress) { this.check = this.check.bind(this);   this.start = this.start.bind(this);   this.finish = this.finish.bind(this);   this.doTask = this.doTask.bind(this);   this.timeout = timeout; this.progress = progress; "NOTHING"; }

  check() {
    let elapsed;
    if (this.started == null) { return; }
    return returning((elapsed = (Date.now() - this.started)), () => {
      let left;
      if ((left = elapsed >= this.timeout) != null ? left : Infinity) {
        throw new Error(`Timeout reached: ${elapsed}/${this.timeout}, ${this.tasks != null ? this.tasks : 0} tasks unfinished ${this.done != null ? this.done : 0} finished.`);
      }
    });
  }

  start() {
    if (this.started == null) { this.started = Date.now(); }
    if (this.tasks == null) { this.tasks = 0; }
    if (this.total == null) { this.total = 0; }
    this.total += 1;
    this.tasks += 1;
    return (this.check)();
  }

  finish() {
    if ((this.tasks != null) && (this.tasks < 1)) { throw new Error("Finished more tasks than started"); }
    this.tasks -= 1;
    const elapsed = this.check();
    if (this.done == null) { this.done = 0; }
    this.done += 1;
    if (this.progress != null) { this.progress(this.done, this.total); }
    if (this.tasks === 0) {
      `Finished ${this.done} tasks in ${elapsed}/${this.timeout} ms`;
      return this.started = (this.done = (this.total = undefined));
    }
  }

  doTask(block) {
    (this.start)();
    const result = block();
    (this.finish)();
    return result;
  }
}


//#
//# ThreBSP Driver
//
// Can be instantiated with THREE.Geometry,
// THREE.Mesh or a ThreeBSP.Node
window.ThreeBSP = class ThreeBSP {
  constructor(treeIsh, matrix, options) {
    this.withTimer = this.withTimer.bind(this);
    this.toTree = this.toTree.bind(this);
    this.toMesh = this.toMesh.bind(this);
    this.toGeometry = this.toGeometry.bind(this);
    this.subtract = this.subtract.bind(this);
    this.union = this.union.bind(this);
    this.intersect = this.intersect.bind(this);
    this.matrix = matrix;
    if (options == null) { options = {}; }
    this.options = options;
    if ((this.matrix != null) && !(this.matrix instanceof THREE.Matrix4)) {
      this.options = this.matrix;
      this.matrix = undefined;
    }

    if (this.options == null) { this.options = {}; }
    if (this.matrix == null) { this.matrix = new THREE.Matrix4(); }

    // Start a timer if one wasn't passed
    if (this.options.timer == null) { this.options.timer = new Timelimit(
      (this.options.timer != null ? this.options.timer.timeout : undefined) != null ? (this.options.timer != null ? this.options.timer.timeout : undefined) : this.options.timeout,
      (this.options.timer != null ? this.options.timer.progress : undefined) != null ? (this.options.timer != null ? this.options.timer.progress : undefined) : this.options.progress
    ); }

    this.tree   = this.toTree(treeIsh);
  }

  // Evaluate block after replacing @timer with new_timer
  // then put @timer back after block returns
  withTimer(new_timer, block) {
    const old_timer = this.options.timer;
    try {
      this.options.timer = new_timer;
      return block();
    } finally {
      this.options.timer = old_timer;
    }
  }

  toTree(treeIsh) {
    if (treeIsh instanceof ThreeBSP.Node) { return treeIsh; }
    const polygons = [];
    const geometry =
      (() => {
      if (treeIsh instanceof THREE.Geometry) {
        return treeIsh;
      } else if (treeIsh instanceof THREE.Mesh) {
        treeIsh.updateMatrix();
        this.matrix = treeIsh.matrix.clone();
        return treeIsh.geometry;
      }
    })();

    for (let i = 0; i < geometry.faces.length; i++) {
      const face = geometry.faces[i];
      ((face, i) => {
        let faceVertexUvs = geometry.faceVertexUvs != null ? geometry.faceVertexUvs[0][i] : undefined;
        if (faceVertexUvs == null) { faceVertexUvs = [new THREE.Vector2(), new THREE.Vector2(),
                          new THREE.Vector2(), new THREE.Vector2()]; }
        const polygon = new ThreeBSP.Polygon();
        const iterable = ['a', 'b', 'c', 'd'];
        for (let vIndex = 0; vIndex < iterable.length; vIndex++) {
          var idx;
          const vName = iterable[vIndex];
          if ((idx = face[vName]) != null) {
            let vertex = geometry.vertices[idx];
            vertex = new ThreeBSP.Vertex(vertex.x, vertex.y, vertex.z,
              face.vertexNormals[0],
              new THREE.Vector2(faceVertexUvs[vIndex].x, faceVertexUvs[vIndex].y));
            vertex.applyMatrix4(this.matrix);
            polygon.vertices.push(vertex);
          }
        }
        return polygons.push(polygon.calculateProperties());
      })(face, i);
    }
    return new ThreeBSP.Node(polygons, this.options);
  }

  // Converters/Exporters
  toMesh(material) { if (material == null) { material = new THREE.MeshNormalMaterial(); } return this.options.timer.doTask(() => {
    let mesh;
    const geometry = this.toGeometry();
    return returning((mesh = new THREE.Mesh(geometry, material)), () => {
      mesh.position.getPositionFromMatrix(this.matrix);
      return mesh.rotation.setEulerFromRotationMatrix(this.matrix);
    });
  }); }

  toGeometry() { return this.options.timer.doTask(() => {
    let geometry;
    const matrix = new THREE.Matrix4().getInverse(this.matrix);

    return returning((geometry = new THREE.Geometry()), () => {
      return Array.from(this.tree.allPolygons()).map((polygon) =>
        this.options.timer.doTask(() => {
          let v;
          const polyVerts = ((() => {
            const result = [];
            for (v of Array.from(polygon.vertices)) {               result.push(v.clone().applyMatrix4(matrix));
            }
            return result;
          })());
          return (() => {
            const result1 = [];
            for (let idx = 2, end = polyVerts.length, asc = 2 <= end; asc ? idx < end : idx > end; asc ? idx++ : idx--) {
              var verts = [polyVerts[0], polyVerts[idx-1], polyVerts[idx]];
              const vertUvs = ((() => {
                const result2 = [];
                for (v of Array.from(verts)) {                   result2.push(new THREE.Vector2(v.uv != null ? v.uv.x : undefined, v.uv != null ? v.uv.y : undefined));
                }
                return result2;
              })());

              const face = new THREE.Face3(...Array.from((((() => {
                const result3 = [];
                for (v of Array.from(verts)) {                   result3.push(geometry.vertices.push(v) - 1);
                }
                return result3;
              })()))), polygon.normal.clone());
              geometry.faces.push(face);
              result1.push(geometry.faceVertexUvs[0].push(vertUvs));
            }
            return result1;
          })();
        }));
    });
  }); }

  // CSG Operations
  subtract(other) { return this.options.timer.doTask(() => { return other.withTimer(this.options.timer, () => {
    const [us, them] = Array.from([this.tree.clone(), other.tree.clone()]);
    us
      .invert()
      .clipTo(them);
    them
      .clipTo(us)
      .invert()
      .clipTo(us)
      .invert();
    return new ThreeBSP(us.build(them.allPolygons()).invert(), this.matrix, this.options);
  });
   }); }

  union(other) { return this.options.timer.doTask(() => { return other.withTimer(this.options.timer, () => {
    const [us, them] = Array.from([this.tree.clone(), other.tree.clone()]);
    us.clipTo(them);
    them
      .clipTo(us)
      .invert()
      .clipTo(us)
      .invert();
    return new ThreeBSP(us.build(them.allPolygons()), this.matrix, this.options);
  });
   }); }

  intersect(other) { return this.options.timer.doTask(() => { return other.withTimer(this.options.timer, () => {
    const [us, them] = Array.from([this.tree.clone(), other.tree.clone()]);
    them
      .clipTo(us.invert())
      .invert()
      .clipTo(us.clipTo(them));
    return new ThreeBSP(us.build(them.allPolygons()).invert(), this.matrix, this.options);
  });
   }); }
};


//#
//# ThreeBSP.Vertex
ThreeBSP.Vertex = class Vertex extends THREE.Vector3 {
  constructor(x, y, z, normal, uv) {
    this.lerp = this.lerp.bind(this);
    this.interpolate = this.interpolate.bind(this);
    if (normal == null) { normal = new THREE.Vector3(); }
    this.normal = normal;
    if (uv == null) { uv = new THREE.Vector2(); }
    this.uv = uv;
    super(x, y, z);
  }

  clone() {
    return new ThreeBSP.Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
  }

  lerp(v, alpha) { return returning(super.lerp(...arguments), () => {
    // @uv is a V2 instead of V3, so we perform the lerp by hand
    this.uv.add(v.uv.clone().sub(this.uv).multiplyScalar(alpha));
    return this.normal.lerp(v, alpha);
  }); }

  interpolate(...args) {
    return this.clone().lerp(...Array.from(args || []));
  }
};

//#
//# ThreeBSP.Polygon
ThreeBSP.Polygon = class Polygon {
  constructor(vertices, normal, w) {
    this.calculateProperties = this.calculateProperties.bind(this);
    this.clone = this.clone.bind(this);
    this.invert = this.invert.bind(this);
    this.classifyVertex = this.classifyVertex.bind(this);
    this.classifySide = this.classifySide.bind(this);
    this.tessellate = this.tessellate.bind(this);
    this.subdivide = this.subdivide.bind(this);
    if (vertices == null) { vertices = []; }
    this.vertices = vertices;
    this.normal = normal;
    this.w = w;
    if (this.vertices.length) { this.calculateProperties(); }
  }

  calculateProperties() { return returning(this, () => {
    const [a, b, c] = Array.from(this.vertices);
    this.normal = b.clone().sub(a).cross(
      c.clone().sub(a)
    ).normalize();
    return this.w = this.normal.clone().dot(a);
  }); }

  clone() {
    return new ThreeBSP.Polygon(
      (Array.from(this.vertices).map((v) => v.clone())),
      this.normal.clone(),
      this.w
    );
  }

  invert() { return returning(this, () => {
    this.normal.multiplyScalar(-1);
    this.w *= -1;
    return this.vertices.reverse();
  }); }

  classifyVertex(vertex) {
    const side = this.normal.dot(vertex) - this.w;
    switch (false) {
      case !(side < -EPSILON): return BACK;
      case !(side > EPSILON): return FRONT;
      default: return COPLANAR;
    }
  }

  classifySide(polygon) {
    let [front, back] = Array.from([0, 0]);
    const tally = v => { switch (this.classifyVertex(v)) {
      case FRONT: return front += 1;
      case BACK:  return back += 1;
    } };
    for (let v of Array.from(polygon.vertices)) { tally(v); }
    if ((front > 0)  && (back === 0)) { return FRONT; }
    if ((front === 0) && (back > 0)) { return BACK; }
    if (front === back && back === 0) { return COPLANAR; }
    return SPANNING;
  }

  // Return a list of polygons from `poly` such
  // that no polygons span the plane defined by
  // `this`. Should be a list of one or two Polygons
  tessellate(poly) {
    let polys;
    let v;
    const {f, b, count} = {f: [], b: [], count: poly.vertices.length};

    if (this.classifySide(poly) !== SPANNING) { return [poly]; }
    // vi and vj are the current and next Vertex
    // i  and j  are the indexes of vi and vj
    // ti and tj are the classifications of vi and vj
    for (let i = 0; i < poly.vertices.length; i++) {
      var j;
      var vi = poly.vertices[i];
      var vj = poly.vertices[(j = (i + 1) % count)];
      const [ti, tj] = Array.from(((() => {
        const result = [];
        for (v of [vi, vj]) {           result.push(this.classifyVertex(v));
        }
        return result;
      })()));
      if (ti !== BACK) { f.push(vi); }
      if (ti !== FRONT) { b.push(vi); }
      if ((ti | tj) === SPANNING) {
        const t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().sub(vi));
        v = vi.interpolate(vj, t);
        f.push(v);
        b.push(v);
      }
    }

    return returning((polys = []), () => {
      if (f.length >= 3) { polys.push(new ThreeBSP.Polygon(f)); }
      if (b.length >= 3) { return polys.push(new ThreeBSP.Polygon(b)); }
    });
  }


  subdivide(polygon, coplanar_front, coplanar_back, front, back) {
    return (() => {
      const result = [];
      for (let poly of Array.from(this.tessellate(polygon))) {
        const side = this.classifySide(poly);
        switch (side) {
          case FRONT: result.push(front.push(poly)); break;
          case BACK:  result.push(back.push(poly)); break;
          case COPLANAR:
            if (this.normal.dot(poly.normal) > 0) {
              result.push(coplanar_front.push(poly));
            } else {
              result.push(coplanar_back.push(poly));
            }
            break;
          default:
            throw new Error(`BUG: Polygon of classification ${side} in subdivision`);
        }
      }
      return result;
    })();
  }
};

//#
//# ThreeBSP.Node
ThreeBSP.Node = class Node {
  clone() { let node;
  return returning((node = new ThreeBSP.Node(this.options)), () => {
    node.divider  = this.divider != null ? this.divider.clone() : undefined;
    node.polygons = this.options.timer.doTask(() => (Array.from(this.polygons).map((p) => p.clone())));
    node.front    = this.options.timer.doTask(() => (this.front != null ? this.front.clone() : undefined));
    return node.back     = this.options.timer.doTask(() => (this.back != null ? this.back.clone() : undefined));
  }); }

  constructor(polygons, options) {
    this.clone = this.clone.bind(this);
    this.build = this.build.bind(this);
    this.isConvex = this.isConvex.bind(this);
    this.allPolygons = this.allPolygons.bind(this);
    this.invert = this.invert.bind(this);
    this.clipPolygons = this.clipPolygons.bind(this);
    this.clipTo = this.clipTo.bind(this);
    if (options == null) { options = {}; }
    this.options = options;
    if ((polygons != null) && !(polygons instanceof Array)) {
      this.options = polygons;
      polygons = undefined;
    }

    this.polygons = [];
    this.options.timer.doTask(() => {
      if ((polygons != null) && polygons.length) { return this.build(polygons); }
    });
  }

  build(polygons) { return returning(this, () => {
    const sides = {front: [], back: []};
    if (this.divider == null) { this.divider = polygons[0].clone(); }

    this.options.timer.doTask(() => {
      return Array.from(polygons).map((poly) =>
        this.options.timer.doTask(() => {
          return this.divider.subdivide(poly, this.polygons, this.polygons, sides.front, sides.back);
        }));
    });

    return (() => {
      const result = [];
      for (let side of Object.keys(sides || {})) {
        const polys = sides[side];
        if (polys.length) {
          if (this[side] == null) { this[side] = new ThreeBSP.Node(this.options); }
          result.push(this[side].build(polys));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  }); }

  isConvex(polys) {
    for (let inner of Array.from(polys)) {
      for (let outer of Array.from(polys)) {
        if ((inner !== outer) && (outer.classifySide(inner) !== BACK)) { return false; }
      }
    }
    return true;
  }

  allPolygons() { return this.options.timer.doTask(() => {
    return this.polygons.slice()
      .concat((this.front != null ? this.front.allPolygons() : undefined) || [])
      .concat((this.back != null ? this.back.allPolygons() : undefined) || []);
  }); }

  invert() { return returning(this, () => { return this.options.timer.doTask(() => {
    let ref;
    for (var poly of Array.from(this.polygons)) {
      this.options.timer.doTask(() => (poly.invert)());
    }
    for (var flipper of [this.divider, this.front, this.back]) {
      this.options.timer.doTask(() => (flipper != null ? flipper.invert() : undefined));
    }
    return [this.front, this.back] = Array.from(ref = [this.back, this.front]), ref;
}); }); }

  clipPolygons(polygons) { return this.options.timer.doTask(() => {
    if (!this.divider) { return polygons.slice(); }
    let front = [];
    let back = [];

    for (var poly of Array.from(polygons)) {
      this.options.timer.doTask(() => {
        return this.divider.subdivide(poly, front, back, front, back);
      });
    }

    if (this.front) { front = this.front.clipPolygons(front); }
    if (this.back) { back  = this.back.clipPolygons(back); }

    if (this.back) {
      return front.concat(back);
    } else {
      return front;
    }
  }); }

  clipTo(node) { return returning(this, () => { return this.options.timer.doTask(() => {
    this.polygons = node.clipPolygons(this.polygons);
    if (this.front != null) {
      this.front.clipTo(node);
    }
    return (this.back != null ? this.back.clipTo(node) : undefined);
  });
   }); }
};
