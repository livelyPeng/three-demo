
import PublicFun from './PublicFun'
import SunCalcuate from './SunCalcuate'

/**
 * DEC PublicThree
 * 通用3D方法
 * 该对象用于管理通用的涉及threejs的方法
 */
const PLANE_FONT_SIZE_RATIO = 30;// -平面标签换算参数
const DAY_FIVE_MINUTES_NUM = 576;// -每天包含的2.5分钟个数
const EARTH_SUN_DISTANCE = 400;// -假设日地距离
const WHEEL_HEIGHT = 0.01;// -防止z-fighting的参数
const BOUNDARY = {width:10,height:10};// 建筑范围 东西南北：-10 ~ 10
const HEIGHT_OFFSET = 0.0;// 楼顶高度偏移量
const INNER_OFFSET = 0.0;// 楼顶向内偏移量

let floorHeight = 0.5;// -单层楼高度
/**
 * [_Materials 常用材质对象]
 * @type {Object}
 */
const _Materials = {
    point(param) {
        return new THREE.PointsMaterial(param); // 点材质
    },
    sprite(param) {
        return new THREE.SpriteMaterial(param); // sprite粒子材质
    },

    line(param) {
        return new THREE.LineBasicMaterial(param); // 线材质
    },
    lineD(param) {
        return new THREE.LineDashedMaterial(param); // 线段材质
    },

    shader(param) {
        return new THREE.ShaderMaterial(param); // shader自定义材质
    },

    basic(param) {
        return new THREE.MeshBasicMaterial(param); // 基础几何体材质
    },
    phong(param) {
        return new THREE.MeshPhongMaterial(param); // 高光几何体材质
    },
    lambert(param) {
        return new THREE.MeshLambertMaterial(param); // 兰伯特感光几何体材质
    },
    standard(param) {
        return new THREE.MeshStandardMaterial(param); // 标准几何体材质
    }
};

/**
 * [_Geometries 常用几何体对象]
 * @type {Object}
 */
const _Geometries = {
    geo() {
        return new THREE.Geometry(); // 基础几何体
    },
    buf() {
        return new THREE.BufferGeometry(); // 基础buffe几何体
    },
    insBuf() {
        return new THREE.InstancedBufferGeometry(); // 基础buffer实例几何体
    },

    shape(shp, seg) {
        return new THREE.ShapeBufferGeometry(shp, seg); // 形状
    },
    extrude(shp, opt) {
        return new THREE.ExtrudeBufferGeometry(shp, opt); // 拉伸几何体
    },

    plane(w, h, ws, hs) {
        return new THREE.PlaneBufferGeometry(w, h, ws, hs); // 平面
    },
    circle(r, s) {
        return new THREE.CircleBufferGeometry(r, s); // 圆面
    },
    box(w, h, d) {
        return new THREE.BoxBufferGeometry(w, h, d); // 立方体
    },
    sphere(r, ws, hs) {
        return new THREE.SphereBufferGeometry(r, ws, hs); // 球体
    },
    torus(r, t, rs, ts) {
        return new THREE.TorusBufferGeometry(r, t, rs, ts); // 圆环
    },
    Icosah(r, s) {
        return new THREE.IcosahedronBufferGeometry(r, s); // 二十面体
    },
    cylinder(rt, rb, h, rs, o) {
        return new THREE.CylinderBufferGeometry(rt, rb, h, rs, 1, o); // 圆柱
    }
};
/**
 * 常用着色器对象
 * @type {{SpreadVShader: string, SpreadFShader: string}}
 * @private
 */
const _Shaders = {
    // -扩散对象
    SpreadVShader: `uniform float u_time;          
                varying float _y;  
                varying float _time;
                void main() { 
                vec3 v_position = mix(vec3(0,0,0),position,u_time); 
                _time =1.0-u_time;           
                _y = v_position.y;                     
                vec4 mvPosition = modelViewMatrix * vec4(v_position, 1.0);                 
                gl_Position = projectionMatrix * mvPosition;
            }`,
    SpreadFShader: `                           
            uniform vec3 u_color;
            uniform float u_height; 
            varying float _time;           
            varying float _y;              
            void main() {                                
                gl_FragColor = vec4(u_color, (1.0-_y/u_height)*_time);  
            }`
};
const PublicThree = {
    geo: _Geometries,
    mtl: _Materials,
    // - 图片loader
    textureLoader: (function () {
        return new THREE.TextureLoader();
    }()),
    cubeLoader: (function () {
        return new THREE.CubeTextureLoader();
    }()),
    // - 基础object3D
    obj(describe) {
        const obj = new THREE.Object3D();
        obj.name = describe;
        obj.userData.describe = describe;
        return obj;
    },
    // - 基础颜色
    color(c) {
        return new THREE.Color(c); // 颜色
    },
    /**
     * 根据建筑范围获取变换矩阵
     * @param boundary
     * @returns {*}
     */
    getChangeMatrix(boundary) {
        const {
            minX, minZ, maxX, maxZ
        } = boundary;
        const xSize = PublicFun.equals(maxX, minX) ? 1 : BOUNDARY.width * 2 / (maxX - minX);
        const zSize = PublicFun.equals(maxZ, minZ) ? 1 : BOUNDARY.height * 2 / (maxZ - minZ);
        const size = Math.min(xSize,zSize);
        const scaleMatrix = new THREE.Matrix4().makeScale(size, 1,size);
        const matrix = scaleMatrix.multiply(
            new THREE.Matrix4().makeTranslation(-(maxX + minX) / 2, 0, -(maxZ + minZ) / 2)
        );
        return matrix;
    },
    /**
     * 楼层变化动画
     * @param _builds
     */
    buildPathAnimation(_builds) {
        if (_builds) {
            new TWEEN.Tween({value: 0.001}).to({value: 1}, 3000).easing(TWEEN.Easing.Linear.None).onUpdate(function () {
                _builds.scale.y = this.value;
            }).start();
        }
    },
    /**
     * 创建扩散对象
     * @param opts
     * @returns {Mesh|Yr|Yr|Wr|Wr}
     */
    createSpreadObject(opts) {
        opts = opts || {};
        const {radius = Math.max(BOUNDARY.width,BOUNDARY.height) * 3, color = '#ffe438', perTime = 1, height = 2} = opts;
        const geometry = new THREE.CylinderBufferGeometry(radius, radius, height, 32, 1, true);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, height / 2, 0));

        const material = new THREE.ShaderMaterial({
            uniforms: {
                u_time: {
                    value: 0.0
                },
                u_height: {
                    value: height
                },
                u_color: {
                    value: new THREE.Color(color)
                }
            },
            transparent: true,
            depthWrite:false,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            vertexShader: _Shaders.SpreadVShader,
            fragmentShader: _Shaders.SpreadFShader
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.userData = {
            _transTime: 0,
            _perTime: perTime
        };
        return mesh;
    },
    /**
     * 相机到对象动画
     * @param threeNode
     * @param obj
     */
    cameraToObject(threeNode, obj) {
        const targetPosition = obj.geometry.boundingSphere.center.clone();
        const currentTarget = threeNode.controls.target.clone();
        new TWEEN.Tween({x: currentTarget.x, y: currentTarget.y, z: currentTarget.z})
            .to({x: targetPosition.x, y: targetPosition.y, z: targetPosition.z}, 1000)
            .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
            // debugger;
            threeNode.controls.target.set(this.x, this.y, this.z);
        })
            .onComplete(function () {

            })
            .start();

    },
    /**
     * 相机到目标点动画
     * @param threeNode
     * @param position
     * @param target
     */
    cameraToPosition(threeNode, position, target) {
        const targetCameraPosition = position.clone();
        const currentCameraPosition = threeNode.camera.position.clone();
        const targetPosition = target.clone();
        const currentTarget = threeNode.controls.target.clone();
        new TWEEN.Tween({
            targetX: currentTarget.x, targetY: currentTarget.y, targetZ: currentTarget.z,
            positionX: currentCameraPosition.x, positionY: currentCameraPosition.y, positionZ: currentCameraPosition.z
        }).to({
            targetX: targetPosition.x, targetY: targetPosition.y, targetZ: targetPosition.z,
            positionX: targetCameraPosition.x, positionY: targetCameraPosition.y, positionZ: targetCameraPosition.z

        }, 1000)
            .easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
            // debugger;
            threeNode.controls.target.set(this.targetX, this.targetY, this.targetZ);
            threeNode.camera.position.set(this.positionX, this.positionY, this.positionZ);
        }).onComplete(function () {
        }).start();
    },
    /**
     * 创建文字面板
     * @param content
     * @param opts
     * @returns {gs|xs|xs|Sprite|gs}
     */
    createSpriteText(content, opts) {
        const texture = this.createTextCanvas(content, opts);
        const {_size} = texture;
        const {width, height} = _size;
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture, color: 0xffffff,sizeAttenuation:true,transparent:true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(width / 64, height / 64, 1);
        sprite.center.set(0.5, 0);
        sprite.renderOrder = 100;
        return sprite;
    },
    /**
     * 创建太阳光及阴影参数
     * @param opts
     * @returns {DirectionalLight|Qh|Qu|Qu|Qh}
     */
    createSunLight(opts) {
        opts = opts || {};
        const {
            color = '#ffffff', intensity = 0.5,
            width = 1024,height = 512,near = 0.1,far = 600,
            left = -40,right = 40,top = 20,bottom = -20
        } = opts;
        const _directLight = new THREE.DirectionalLight(color, intensity);
        _directLight.castShadow = true;

        _directLight.add(this.createLensflare());
        // -设置阴影参数
        _directLight.shadow.mapSize.width = width;  // default
        _directLight.shadow.mapSize.height = height; // default
        _directLight.shadow.camera.near = near;       // default
        _directLight.shadow.camera.far = far;      // default
        _directLight.shadow.camera.left = left;
        _directLight.shadow.camera.right = right;
        _directLight.shadow.camera.top = top;
        _directLight.shadow.camera.bottom = bottom;
        return _directLight;
    },
    /**
     * 格式化建筑数据
     * @param buildData
     */
    calBuildData(buildData) {
        //-首先将data中数据转为THREE的对象
        const newData = [];
        let maxX = -Infinity;
        let minX = Infinity;
        let maxZ = -Infinity;
        let minZ = Infinity;
        const data = buildData.data;
        for (let i = 0, length = data.length; i < length; i++) {
            const geometry = data[i].geometry;
            const geometryPoint = [];
            newData.push(geometryPoint);
            for (let j = 0, geoLength = geometry.length; j < geoLength; j++) {
                const x = geometry[j][0];
                const z = geometry[j][1];
                geometryPoint.push(new THREE.Vector3(x, 0, z));
                if (maxX <= x) maxX = x;
                if (minX >= x) minX = x;
                if (maxZ <= z) maxZ = z;
                if (minZ >= z) minZ = z;
            }

        }
        const changeMatrix = this.getChangeMatrix({minX, minZ, maxX, maxZ});

        for (let i = 0, length = newData.length; i < length; i++) {
            const newGeometry = [];
            for (let j = 0, geoLength = newData[i].length; j < geoLength; j++) {
                const point = newData[i][j];
                point.applyMatrix4(changeMatrix);
                newGeometry.push([point.x, point.z]);
            }
            data[i].geometry = newGeometry;

        }
    },
    /**
     * 格式化建筑数据
     * @param data
     */
    handleBuild(data) {
        const result = GeometryExtrude.flatten(data); // 解析数据
        result.indices = GeometryExtrude.triangulate(result.vertices, result.holes); // 构面
        result.beveling = GeometryExtrude.offsetPolygon2(result.vertices, result.holes, true); // 计算斜边参数
        return result;
    },
    /**
     * 创建建筑物几何体
     * @param opts
     * @returns {*|基础buffe几何体}
     */
    createBuildGeo(opts) {
        opts = opts || {};
        const {indices, positions, uvs, normals, colors} = opts;
        const geo = this.geo.buf();
        geo.setIndex(indices);
        geo.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        if (uvs) geo.addAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        if (normals) geo.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 2));
        else {
            geo.computeVertexNormals();
            //  geo.computeFaceNormals ();
        }
        if (colors) geo.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
    },
    /**
     * 创建建筑物顶层对象
     * @param bdResult
     * @param opts
     * @returns {Mesh|Yr|Yr|Wr|Wr}
     */
    createTopMesh(bdResult, opts) {
        const {texture, buildIndex} = opts;
        // 此处需要合并到同一个buffer中
        const inPos = [], outPos = [], tIdx = [], sIdx = [];
        const tUvs = [], tsUvs = [];

        const idxs = bdResult.indices; // 构面
        const vecs = bdResult.vertices; // 点数据
        const bvls = bdResult.beveling; // 点的斜角参数
        const vlen2 = vecs.length * 0.5;
        let maxX = -Infinity, minX = Infinity, maxZ = -Infinity, minZ = Infinity;
        for (let k = 0; k < vlen2; k++) {
            const vx = vecs[k * 2], vz = vecs[k * 2 + 1];
            const bx = bvls[k * 2] * INNER_OFFSET, bz = bvls[k * 2 + 1] * INNER_OFFSET;

            inPos.push(vx - bx, -HEIGHT_OFFSET, vz - bz); // 内

            if (maxX < vx - bx) maxX = vx - bx;
            if (minX > vx - bx) minX = vx - bx;
            if (maxZ < vz - bz) maxZ = vz - bz;
            if (minZ > vz - bz) minZ = vz - bz;

            outPos.push(vx, 0, vz); // 外
            outPos.push(vx - bx, 0, vz - bz);
            outPos.push(vx - bx, -HEIGHT_OFFSET, vz - bz);


            let a = vlen2 + k * 3, b = vlen2 + k * 3 + 1, c, d, e, f;
            if (k < vlen2 - 1) {
                c = vlen2 + k * 3 + 3;
                d = vlen2 + k * 3 + 4;
                e = vlen2 + k * 3 + 2;
                f = vlen2 + k * 3 + 5;
            } else {
                c = vlen2;
                d = vlen2 + 1;
                e = b + 1;
                f = vlen2 + 2;
            }
            tIdx.push(a, c, d, d, b, a); // 凸起顶部构面
            sIdx.push(b, d, f, f, e, b); // 凸起侧边构面
        }

        // - 计算uv
        for (let k = 0; k < vlen2; k++) {
            tUvs.push((inPos[k * 3] - minX) / (maxX - minX), (inPos[k * 3 + 2] - minZ) / (maxZ - minZ));
            tsUvs.push(0, 1, 0, 0.5, 0, 0);
        }
        const topGeo = this.createBuildGeo({
            indices: idxs.concat(tIdx, sIdx),
            positions: inPos.concat(outPos),
            uvs: tUvs.concat(tsUvs)
        });        // -楼顶
        const topMesh = new THREE.Mesh(topGeo, this.mtl.lambert({
            map: texture,
            transparent: true,
            opacity: 1.0,
            color: 0xffffff,
            side: THREE.BackSide,
            skinning: true,
            wireframe: false,
        }));
        topMesh.castShadow = true;
        topMesh.receiveShadow = true;
        topMesh.userData = {
            _buildIndex: buildIndex,
            _isTop:true
        };

        return topMesh;
    },
    /**
     * 高亮对象
     */
    highlightObject(obj){
        if(obj&&PublicFun.isArray(obj)){
            obj.forEach(child=>{
                if(!child.userData._isTop){
                    const {highlightColors} = child.userData;
                    child.material.color = highlightColors[0];
                    child.material.opacity = highlightColors[1];
                }
            });
        }

    },
    cancelHighlight(obj){
        if(obj&&PublicFun.isArray(obj)){
            const defaultColors = this.getColorArr('#FFFFFF');
            obj.forEach(child=>{
                if(!child.userData._isTop){
                    child.material.color = defaultColors[0];
                    child.material.opacity = defaultColors[1];
                }
            });
        }
    },
    /**
     * 创建建筑物侧边对象
     * @param bdResult
     * @param opts
     * @returns {Mesh|Yr|Yr|Wr|Wr}
     */
    createSideMesh(bdResult, opts) {
        const {
            texture = null, buildIndex, floorIndex = 0, color = '#FFFFFF',
            floorHeight,floorCount,highlightColor
        } = opts;
        const sidePos = [], sideIdx = [], sideUvs = [], colors = [];
        const vecs = bdResult.vertices; // 点数据
        const vlen2 = vecs.length * 0.5;
        let sumLength = 0;
        const lengthArr = [];
        const [sideColors,sideOpacity] = this.getColorArr(color);
        for (let k = 0; k < vlen2; k++) {
            const vx = vecs[k * 2], vz = vecs[k * 2 + 1];
            /*为了区分面，不使用共享点*/
            sidePos.push(vx, floorIndex * floorHeight, vz);
            sidePos.push(vx, (floorIndex + 1) * floorHeight, vz);
            sidePos.push(vx, floorIndex * floorHeight, vz);
            sidePos.push(vx, (floorIndex + 1) * floorHeight, vz);

            colors.push(sideColors.r, sideColors.g, sideColors.b, sideColors.r, sideColors.g, sideColors.b, sideColors.r, sideColors.g, sideColors.b, sideColors.r, sideColors.g, sideColors.b);


            if (k < vlen2 - 1) sideIdx.push(4 * k, 4 * k + 1, 4 * k + 3, 4 * k, 4 * k + 3, 4 * k + 2, 4 * k + 2, 4 * k + 3, 4 * k + 5, 4 * k + 2, 4 * k + 5, 4 * k + 4);
            else sideIdx.push(4 * k, 4 * k + 1, 4 * k + 3, 4 * k, 4 * k + 3, 4 * k + 2, 4 * k + 2, 4 * k + 3, 1, 4 * k + 2, 1, 0);
            if (k > 0) {
                const behind = new THREE.Vector3(vecs[(k - 1) * 2], 0, vecs[(k - 1) * 2 + 1]);
                const ahead = new THREE.Vector3(vx, 0, vz);
                const length = behind.sub(ahead).length();
                sumLength += length;
                lengthArr.push(length);
            }
        }
        sideUvs.push(0, 0, 0, 1, 1, 0, 1, 1);
        for (let i = 0, length = lengthArr.length; i < length; i++) {
            sideUvs.push(lengthArr[i] / sumLength, 0, lengthArr[i] / sumLength, 1, 1, 0, 1, 1);
        }
        // -楼侧面
        // const sideNormals = this.getNormals(sidePos, sideIdx);
        const sideGeo = this.createBuildGeo({
            indices: sideIdx,
            positions: sidePos,
            uvs: sideUvs,
            colors
        });
        const sideMesh = new THREE.Mesh(sideGeo, this.mtl.lambert({
            map: texture,
            transparent: true,
            opacity: 1.0,
            color: '#ffffff',
            vertexColors: THREE.VertexColors,
            side: THREE.FrontSide,
            wireframe: false,
        }));
        const highlightColors = this.getColorArr(highlightColor);
        sideMesh.userData = {
            _color: sideColors,
            _opacity:sideOpacity,
            highlightColors,
            _buildIndex: buildIndex + 1,
            _floorIndex: floorIndex + 1,
            sunFace: {},
            _sunTimeCal: false,
            _sunTimeShow: false,
            bdResult,floorCount
        };
        sideMesh.castShadow = true;
        sideMesh.receiveShadow = true;
        return sideMesh;
    },
    /**
     * 创建纹理及设置参数
     * @param opts
     * @returns {*}
     */
    createTexture(opts) {
        const {url, xRepeat = 8, yRepeat = 8} = opts;
        const texture = this.textureLoader.load(url);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(xRepeat, yRepeat);
        return texture;
    },
    /**
     * 创建建筑物对象
     * @param buildData
     * @param eventArr
     * @param opts
     * @returns {gi|gi|Object3D|xn|xn}
     */
    createBuildings(buildData, eventArr, opts) {
        const group = new THREE.Object3D();
        group.scale.y = 0.001;
        const {
            topUrl = '', sideUrl = '',fontColor = '#FF0000',strokeWidth = 2,strokeColor = '#ffffff',
            oddColor = '#CCCED1', evenColor = '#6E6660',fontSize = 20,
            highlightColor = '#FFFF00',speed = 0.01,maxWidth,maxHeight
        } = opts;
        BOUNDARY.width = maxWidth || BOUNDARY.width;
        BOUNDARY.height = maxHeight || BOUNDARY.height;
        group._speed = speed;
        floorHeight = opts.floorHeight || 0.5;

        let i = 0, len = buildData.data.length;
        this.calBuildData(buildData);

        // -准备建筑纹理
        const topTexture = this.createTexture({url: topUrl});
        const sideTexture = this.createTexture({url: sideUrl});

        for (; i < len; i++) {
            const di = buildData.data[i];
            const { floor,name } = di;//-楼层数
            const bdResult = this.handleBuild([di.geometry]); // 解析后的结果
            // 楼顶面
            const topMesh = this.createTopMesh(bdResult, {texture: topTexture, buildIndex: i + 1});
            eventArr.push(topMesh);
            topMesh.position.y = floorHeight * floor;
            group.add(topMesh);
            // -添加楼顶标签
            const sprite = this.createSpriteText(name || `${i + 1}#${floor}层`, {
                fontSize, fontColor,strokeColor,strokeWidth
            });
            sprite.position.copy(topMesh.geometry.boundingSphere.center.clone().add(topMesh.position));
            group.add(sprite);
            // -楼侧面
            for (let j = 0; j < floor; j++) {
                const sideMesh = this.createSideMesh(bdResult, {
                    color: j % 2 === 0 ? evenColor : oddColor,
                    texture: sideTexture, buildIndex: i, floorIndex: j,
                    floorHeight,floorCount:floor,highlightColor
                });
                eventArr.push(sideMesh);
                group.add(sideMesh);
            }
        }
        return group;
    },
    /**
     * 计算面中心点
     * @param face
     * @returns {*}
     */
    calFaceCenter(face) {
        const {leftTop, leftBottom, rightTop, rightBottom} = face;
        return (leftTop.add(leftBottom).multiplyScalar(0.5)).add(rightTop.add(rightBottom).multiplyScalar(0.5)).multiplyScalar(0.5);
    },
    /**
     * 计算楼层热力数据
     * @param objArr
     * @param threeNode
     */
    calSunTime(objArr, threeNode) {
        console.time('计算时间');
        objArr.forEach(child => {
            if (child.userData._sunTimeShow) {
                this.calSingleFloorSunTime(child, objArr, threeNode);
            }
        });
        console.timeEnd('计算时间');
    },

    /**
     * 计算单个楼层热力数据
     * @param floorObj
     * @param objArr
     * @param threeNode
     */
    calSingleFloorSunTime(floorObj, objArr, threeNode) {
        const {startIndex, endIndex, points,originPoint} = threeNode._sunPath.userData;
        // -首先去除每个楼层的日照信息
        floorObj.userData.sunFace = {};
        floorObj.userData._sunTimeCal = true;
        let resultArr = PublicThree.findIntersectArr(floorObj, objArr);
        // -根据日出日落太阳位置循环计算
        // 16*2.5  每40分钟计算一次
        const delta = 16;
        for (let i = startIndex; i < endIndex; i += delta) {
            const sunPosition = new THREE.Vector3(points[i * 3], points[i * 3 + 1], points[i * 3 + 2]);
            const {array} = floorObj.geometry.attributes.position;
            for (let j = 6, length = array.length; j < length; j += 12) {
                // -获取每个面的四个角点
                let leftBottom, leftTop, rightBottom, rightTop;
                leftBottom = new THREE.Vector3(array[j], array[j + 1], array[j + 2]);
                leftTop = new THREE.Vector3(array[j + 3], array[j + 4], array[j + 5]);
                if (j < length - 12) {
                    rightBottom = new THREE.Vector3(array[j + 6], array[j + 7], array[j + 8]);
                    rightTop = new THREE.Vector3(array[j + 9], array[j + 10], array[j + 11]);
                } else {
                    rightBottom = new THREE.Vector3(array[0], array[1], array[2]);
                    rightTop = new THREE.Vector3(array[3], array[4], array[5]);
                }
                // -获取每个面的中心点
                const center = this.calFaceCenter({leftBottom, leftTop, rightBottom, rightTop}).add(new THREE.Vector3(0, floorHeight * 0.25, 0));
                // -根据中心点得到raycaster的方向
                const normal = originPoint.clone().sub(sunPosition.clone()).normalize();
                const origin = (center.clone()).sub(normal.clone().multiplyScalar(100));
                const faceNormal = this.getFaceNormal([leftTop, rightTop, rightBottom]);
                if (normal.dot(faceNormal) > 0) continue;


                threeNode.raycaster.set(origin, normal);
                const intersects = threeNode.raycaster.intersectObjects(resultArr, false);
                // -如果根据面中心射线与面所在的对象相交，则计算日照
                if (intersects.length > 0 && intersects[0].object === floorObj) {
                    const {faceIndex} = intersects[0];
                    // -如果相交的面正好为计算的面则该面记一次日照
                    if (faceIndex === (j / 3) || faceIndex === (j / 3 + 1)) {

                        if (floorObj.userData.sunFace[faceIndex] !== undefined) floorObj.userData.sunFace[faceIndex] += delta * 2.5;
                        else floorObj.userData.sunFace[faceIndex] = delta * 2.5;
                    }
                }
            }
        }
        // -将虚拟对象销毁
        resultArr.forEach(child=>{
            if(objArr.indexOf(child) === -1){
                PublicThree.disposeObj(child);
            }
        });
        resultArr = [];
    },
    findIntersectArr(floorObj, objArr) {
        const result = [];
        const {_buildIndex} = floorObj.userData;
        const virtualObj = {};
        objArr.forEach(child => {
            const childBuildIndex = child.userData._buildIndex;
            if (childBuildIndex !== _buildIndex){
                if(!virtualObj[childBuildIndex]&&!child.userData._isTop){
                    result.push(PublicThree.createVirtualBuilding(child.userData));
                    virtualObj[childBuildIndex] = true;
                }
                if(child.userData._isTop)result.push(child);
            }else if(childBuildIndex === _buildIndex)result.push(child);
        });
        return result;
    },
    createVirtualBuilding(buildConfig){
        const {bdResult,floorCount}=buildConfig;
        return PublicThree.createSideMesh(bdResult,{
            floorHeight:floorHeight * floorCount
        });
    },
    /**
     * 设置楼层热力图
     * @param node
     */
    setSunLightColor(node) {
        // console.time('单个楼层设置日照时间');
        const {array} = node.geometry.attributes.color;
        const {sunFace} = node.userData;
        for (let i = 6, length = array.length; i < length; i += 12) {

            const color = this.getColorArr(PublicFun.getSunLightColorWithLength(sunFace[i / 3]))[0];
            if (i < length - 12) {
                for (let j = 0; j < 12; j += 3) {
                    array[i + j] = color.r;
                    array[i + j + 1] = color.g;
                    array[i + j + 2] = color.b;
                }
            } else {
                for (let j = 0; j < 6; j += 3) {
                    array[i + j] = color.r;
                    array[i + j + 1] = color.g;
                    array[i + j + 2] = color.b;
                    array[j] = color.r;
                    array[j + 1] = color.g;
                    array[j + 2] = color.b;
                }
            }

        }
        node.geometry.attributes.color.needsUpdate = true;
        node.userData._sunTimeShow = true;
    },
    /**
     * 取消楼层热力图
     * @param node
     */
    cancelSunLightColor(node) {
        const {_color} = node.userData;
        const {array} = node.geometry.attributes.color;
        for (let i = 0, length = array.length; i < length; i += 3) {
            array[i] = _color.r;
            array[i + 1] = _color.g;
            array[i + 2] = _color.b;
        }
        node.geometry.attributes.color.needsUpdate = true;
        node.userData._sunTimeShow = false;
    },
    /**
     * 重新计算热力数据
     * @param arr
     */
    sunTimeRefresh(arr) {

        arr.forEach(child => {
            if (child.userData._sunTimeShow) this.setSunLightColor(child);
        });

    },
    /**
     * 创建天空盒子
     * @param opts
     * @returns {*}
     */
    createSkybox(opts) {

        const {path} = opts;
        const urls = [
            path + "px.jpg", path + "nx.jpg",
            path + "py.jpg", path + "ny.jpg",
            path + "pz.jpg", path + "nz.jpg"
        ];
        const textureCube = PublicThree.cubeLoader.load(urls);
        textureCube.format = THREE.RGBFormat;
        return textureCube;
    },
    /**
     * 创建地面
     * @param opts
     * @returns {Mesh|Yr|Yr|Wr|Wr}
     */
    createGround(opts) {
        const self = this;
        const group = new THREE.Object3D();
        const {
            imageUrl, width = 50, height = 50,
            xRepeat = 20, yRepeat = 20,
            radius = 40,radiusSegment = 64,
            mapUrl,mapColor
        } = opts;
        if(imageUrl){
            const geometry = this.geo.circle(radius,radiusSegment);
            const texture = self.textureLoader.load(imageUrl);
            texture.wrapT = THREE.RepeatWrapping;
            texture.wrapS = THREE.RepeatWrapping;
            texture.anisotropy = 16;
            texture.repeat.set(xRepeat, yRepeat);

            const material = self.mtl.lambert({
                map: texture, transparent: false,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = Math.PI / 2;
            mesh.receiveShadow = true;
            group.add(mesh);
        }

        if(mapUrl){
            const geometry = this.geo.plane(width,height);
            const texture = self.textureLoader.load(mapUrl);
            texture.wrapT = THREE.RepeatWrapping;
            texture.wrapS = THREE.RepeatWrapping;
            texture.anisotropy = 16;
            texture.repeat.set(xRepeat, yRepeat);
            const colors = this.getColorArr(mapColor);
            const material = self.mtl.lambert({
                map: texture, transparent: true,depthWrite:false,
                color:colors[0],opacity:colors[1],
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = Math.PI / 2;
            mesh.receiveShadow = true;
            mesh.position.y += 0.001;
            group.add(mesh);
        }

        return group;
    },
    /**
     * 创建坐标轴对象
     * @param opts
     * @returns {gi|gi|Object3D|xn|xn}
     */
    createAxis(opts) {
        opts = opts || {};
        const {length = 100, divsion = 100} = opts;
        const group = new THREE.Object3D();
        const axesHelper = new THREE.AxesHelper(length);
        group.add(axesHelper);

        const helper = new THREE.GridHelper(length, divsion);
        helper.material.opacity = 0.25;
        helper.material.transparent = true;
        helper.position.set(length / 2, 0.1, length / 2);
        // group.add(helper);
        return group;
    },
    /**
     * 创建屏幕炫光
     * @returns {THREE.Lensflare}
     */
    createLensflare() {
        const textureFlare0 = this.textureLoader.load('./images/lensflare0.png');
        const textureFlare3 = this.textureLoader.load('./images/lensflare3.png');
        const lensflare = new THREE.Lensflare();
        lensflare.addElement(new THREE.LensflareElement(textureFlare0, 256, 0.0));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 80, 0.5));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.6));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.9));
        lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 1));
        return lensflare;
    },
    /**
     * 计算面的法向量
     * @param positions
     */
    getFaceNormal(positions) {
        const firstPoint = positions[0].clone();
        const secondPoint = positions[1].clone();
        const thirdPoint = positions[2].clone();
        return (thirdPoint.sub(firstPoint).normalize().cross(secondPoint.sub(firstPoint).normalize())).normalize().multiplyScalar(-1);
    },
    /**
     * 计算每个点的法向量
     * @param positions
     * @param indices
     * @returns {[]}
     */
    getNormals(positions, indices) {
        const position = [];
        for (let i = 0, length = positions.length; i < length; i += 3) {
            position.push(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
        }
        const face = [];
        for (let i = 0, length = indices.length; i < length; i += 3) {
            const firstPoint = position[indices[i]].clone();
            const secondPoint = position[indices[i + 1]].clone();
            const thirdPoint = position[indices[i + 2]].clone();
            const data = {};
            face.push(data);
            data.points = [];
            data.points.push(indices[i], indices[i + 1], indices[i + 2]);
            data.normal = (thirdPoint.sub(firstPoint).normalize().cross(secondPoint.sub(firstPoint).normalize())).normalize();
        }
        const normals = [];
        for (let i = 0, length = positions.length / 3; i < length; i++) {
            let normal = new THREE.Vector3();
            face.forEach(data => {
                if (data.points.indexOf(i) !== -1) normal.add(data.normal);
            });
            normal.normalize();
            normals.push(normal.x, normal.y, normal.z);
        }
        return normals;
    },
    /**
     * 创建文字纹理对象
     * @param content
     * @param opts
     * @returns {Mn|Mn|Texture|Mi|Mi}
     */
    createTextCanvas(content, opts) {
        opts = opts || {};
        const {
            fontSize = 12, fontColor = '#FFFFFF',strokeColor = '#FFFFFF',strokeWidth = 2
        } = opts;
        let canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        const context = canvas.getContext('2d');
        context.font = '500 ' + fontSize + 'px Arial';
        const wh = context.measureText(content);
        const width = THREE.Math.ceilPowerOfTwo(wh.width);
        const height = THREE.Math.ceilPowerOfTwo(fontSize);

        canvas.width = width;
        canvas.height = height;
        canvas.style.backgroundColor = 'rgba(255,255,255,0.0)';
        context.font = '500 ' + fontSize + 'px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // 设置字体填充颜色

        context.lineWidth = strokeWidth;

        context.strokeStyle = strokeColor;
        context.strokeText(content, width / 2, height / 2);

        context.fillStyle = fontColor;
        context.fillText(content, width / 2, height / 2);

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture._size = {width, height, realWidth: wh.width};
        canvas = null;
        return texture;
    },
    /**
     * 创建平面文字对象
     * @param opts
     * @returns {Mesh|Yr|Yr|Wr|Wr}
     */
    createPlaneTexture(opts) {
        opts = opts || {};
        const {content = '', color = '#FFFFFF', fontSize} = opts;
        const texture = this.createTextCanvas(content, {fontSize});
        const {_size} = texture;
        const {width, height} = _size;
        const colors = this.getColorArr(color);
        const geometry = this.geo.plane(width / PLANE_FONT_SIZE_RATIO, height / PLANE_FONT_SIZE_RATIO);
        const material = this.mtl.lambert({
            map: texture, transparent: true, side: THREE.DoubleSide,depthWrite:false,
            color: colors[0], opacity: colors[1], blending: THREE.NormalBlending
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh._size = {width: width / PLANE_FONT_SIZE_RATIO, height: height / PLANE_FONT_SIZE_RATIO};
        mesh.renderOrder = 10;
        // mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    },
    /**
     * 创建单个文字对象
     * @param opts
     * @returns {gi|gi|Object3D|xn|xn}
     */
    createSingleTextIcon(opts) {
        opts = opts || {};
        const {content, fontSize, fontColor} = opts;
        const group = new THREE.Object3D();
        const text = this.createPlaneTexture({content, fontSize});
        text.position.y -= (text._size.height / 2);
        const geometry = this.geo.circle(2, 3);
        const colors = this.getColorArr(fontColor);
        const material = this.mtl.lambert({
            transparent: true,
            opacity: colors[1],
            side: THREE.DoubleSide,
            color: colors[0]
        });
        const trangle = new THREE.Mesh(geometry, material);
        // trangle.castShadow = true;
        trangle.receiveShadow = true;
        trangle.rotation.z -= Math.PI / 6;
        trangle.position.y += 2;
        group.add(text);
        group.add(trangle);
        return group;
    },
    /**
     * 创建方位轮盘四个方位文字对象
     * @param opts
     * @returns {gi|gi|Object3D|xn|xn}
     */
    createWheelText(opts) {
        opts = opts || {};
        const {fontSize, outerRadius, fontColor} = opts;
        const group = new THREE.Object3D();
        //- 东
        const eastText = this.createSingleTextIcon({content: '东', fontSize, fontColor});
        eastText.position.set(outerRadius, WHEEL_HEIGHT, 0);
        // eastText.lookAt(new THREE.Vector3());
        eastText.rotation.x -= Math.PI / 2;
        eastText.rotation.z -= Math.PI / 2;
        group.add(eastText);
        //-西
        const westText = this.createSingleTextIcon({content: '西', fontSize, fontColor});
        westText.position.set(-outerRadius, WHEEL_HEIGHT, 0);
        // westText.lookAt(new THREE.Vector3());
        westText.rotation.x += Math.PI / 2;
        westText.rotation.z += Math.PI / 2;
        group.add(westText);
        // -南
        const southText = this.createSingleTextIcon({content: '南', fontSize, fontColor});
        southText.position.set(0, WHEEL_HEIGHT, outerRadius);
        southText.lookAt(new THREE.Vector3());
        southText.rotation.x += Math.PI / 2;
        group.add(southText);
        //-北
        const northText = this.createSingleTextIcon({content: '北', fontSize, fontColor});
        northText.position.set(0, WHEEL_HEIGHT, -outerRadius);
        northText.lookAt(new THREE.Vector3());
        northText.rotation.x -= Math.PI / 2;
        group.add(northText);
        return group;
    },
    /**
     * 创建方位轮盘线对象
     * @param opts
     * @returns {Ss|Ss|Ms|Ms|LineSegments}
     */
    createWheelLine(opts) {
        opts = opts || {};
        const {innerRadius, outerRadius, lineColor} = opts;
        const lineGeometry = this.geo.buf();
        const colors = this.getColorArr(lineColor);
        const lineMaterial = this.mtl.line({
            transparent: true,
            color: colors[0],
            opacity: colors[1]
        });
        const linePositions = [];
        const longCount = DAY_FIVE_MINUTES_NUM / 4;
        const deltaAngle = Math.PI * 2 / DAY_FIVE_MINUTES_NUM;
        for (let i = 0; i < DAY_FIVE_MINUTES_NUM; i++) {
            linePositions.push(innerRadius * Math.cos(i * deltaAngle), WHEEL_HEIGHT, innerRadius * Math.sin(i * deltaAngle));
            let plusRadius = innerRadius;
            if (PublicFun.equals(i % longCount)) plusRadius += 1.5;
            else plusRadius += 1;
            linePositions.push(plusRadius * Math.cos(i * deltaAngle), WHEEL_HEIGHT, plusRadius * Math.sin(i * deltaAngle));
        }

        const outerPoints = this.createCurvePoints({xRadius: outerRadius, yRadius: outerRadius, aRotation: 0});
        for (let i = 1, length = outerPoints.length; i < length; i++) {
            linePositions.push(outerPoints[i - 1].x, WHEEL_HEIGHT, outerPoints[i - 1].y);
            linePositions.push(outerPoints[i].x, WHEEL_HEIGHT, outerPoints[i].y);
        }
        lineGeometry.addAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const innerLine = new THREE.LineSegments(lineGeometry, lineMaterial);
        innerLine.receiveShadow = true;
        return innerLine;
    },
    /**
     * 创建方位轮盘
     * @param width
     * @param height
     */
    createBearingWheel(opts) {
        opts = opts || {};
        const {width = 20, height = 20, fontSize = 80, fontColor = '#ffffff', lineColor = '#ffffff'} = opts;
        const group = new THREE.Object3D();
        // - 绘制线
        const innerRadius = Math.max(width, height) * Math.sqrt(2) / 2;
        const line = this.createWheelLine({innerRadius, outerRadius: innerRadius + 5, lineColor});
        group.add(line);

        const text = this.createWheelText({outerRadius: innerRadius + 5, fontSize, fontColor});
        group.add(text);
        return group;
    },
    /**
     * 创建盒子模型
     * @returns {Mesh}
     */
    create3DMesh() {
        const geometry = this.geo.box(5, 10, 5);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 5, 0));
        const material = this.mtl.lambert({color: 0xffffff});
        const mesh = new THREE.Mesh(geometry, material);
        // mesh.position.y += 5;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    },
    /**
     * 根据太阳参数计算太阳轨迹点
     * @param opts
     * @returns {*|[]}
     */
    createCurvePoints(opts) {
        opts = opts || {};
        const {xRadius, yRadius, aRotation = -Math.PI / 2, pointCount = DAY_FIVE_MINUTES_NUM - 1} = opts;
        const curve = new THREE.EllipseCurve(
            0, 0,            // ax, aY
            xRadius, yRadius,           // xRadius, yRadius
            0, Math.PI * 2,  // aStartAngle, aEndAngle
            false,            // aClockwise
            aRotation                // aRotation
        );

        return curve.getPoints(pointCount);
    },
    /**
     * 创建太阳轨迹对象
     * @param opts
     * @returns {bs|bs|Line|Ms|Ms}
     */
    createSunPath(opts) {
        const {lng, lat, date} = opts;
        const noonSunAngle = SunCalcuate.getNoonSunAngle({lat, date});
        let {riseTime, dropTime} = SunCalcuate.getSunRiseDropMsg({
            lng, lat, date
        });
        const sunTimeLength = dropTime - riseTime;
        // console.log(riseTime,dropTime);
        const startIndex = Math.floor(riseTime * 60 / 2.5);
        const endIndex = Math.floor(dropTime * 60 / 2.5);
        const latDeg = lat * Math.PI / SunCalcuate.PI_ANGLE;
        const lngDeg = 2 * Math.PI * (SunCalcuate.TIME_ZONE - lng) / (15 * 24);
        const deltaAngle = noonSunAngle + latDeg;
        const sunPathRadius = EARTH_SUN_DISTANCE * Math.sin(deltaAngle);
        const sunPathCenter = new THREE.Vector3(0, -EARTH_SUN_DISTANCE * Math.cos(deltaAngle) * Math.sin(latDeg),
            EARTH_SUN_DISTANCE * Math.cos(deltaAngle) * Math.cos(latDeg));

        const points = this.createCurvePoints({xRadius: sunPathRadius, yRadius: sunPathRadius});
        // points.push(new THREE.Vector3());
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        let matrix = new THREE.Matrix4().makeTranslation(0, sunPathCenter.y, sunPathCenter.z);
        matrix = matrix.multiply(new THREE.Matrix4().makeRotationZ(-lngDeg));
        matrix = matrix.multiply(new THREE.Matrix4().makeRotationX(latDeg));
        geometry.applyMatrix(matrix);

        const material = new THREE.LineBasicMaterial({color: 0xff0000});
        riseTime = SunCalcuate.getTimeStr(startIndex * 24 / 576);
        dropTime = SunCalcuate.getTimeStr(endIndex * 24 / 576);
        // Create the final object to add to the scene
        const ellipse = new THREE.Line(geometry, material);
        ellipse.userData = {
            startIndex,
            endIndex,
            riseTime,
            dropTime,
            sunTimeLength,
            date,
            originPoint:new THREE.Vector3(0, sunPathCenter.y, sunPathCenter.z),
            points: geometry.attributes.position.array
        };
        return ellipse;
    },
    /**
     * [getColorArr 分拆RGBA,获取颜色（THREE）和透明度数组]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {string}   str [rgba/rgb/16进制/颜色名称等]
     * @return   {[array]}       [颜色（THREE）和透明度数组]
     */
    getColorArr(str) {
        function pad2(c) {
            return c.length === 1 ? `0${c}` : `${c}`;
        }

        if (PublicFun.isArray(str)) return str;
        const _arr = [];
        const nStr = (`${str}`).toLowerCase().replace(/\s/g, '');
        if (/^((?:rgba)?)\(\s*([^)]*)/.test(nStr)) {
            const arr = nStr.replace(/rgba\(|\)/gi, '').split(',');
            const hex = [
                pad2(Math.round(arr[0] - 0 || 0).toString(16)),
                pad2(Math.round(arr[1] - 0 || 0).toString(16)),
                pad2(Math.round(arr[2] - 0 || 0).toString(16))
            ];
            _arr[0] = this.color(`#${hex.join('')}`);
            _arr[1] = Math.max(0, Math.min(1, (arr[3] - 0 || 0)));
        } else if (str === 'transparent') {
            _arr[0] = this.color();
            _arr[1] = 0;
        } else {
            _arr[0] = this.color(str);
            _arr[1] = 1;
        }
        return _arr;
    },

    // - dispose
    /**
     * [disposeObj 删除组合节点]
     * @Author   ZHOUPU
     * @DateTime 2019-05-14
     * @param    {[object]}   obj [组合节点]
     * @return   {[type]}       [description]
     */
    disposeObj(obj) {
        if (obj instanceof THREE.Object3D) {
            this.objectTraverse(obj, PublicThree.disposeNode.bind(PublicThree));
        }
    },
    /**
     * [disposeNode 删除单个节点]
     * @Author   ZHOUPU
     * @DateTime 2019-05-14
     * @param    {[object]}   node [节点对象]
     * @return   {[type]}        [description]
     */
    disposeNode(node) {
        if (PublicFun.isArray(node._txueArr)) {
            for (let i = 0; i < node._txueArr.length; i++) {
                node._txueArr[i].dispose();
                node._txueArr[i] = null;
            }
            node._txueArr = null;
        }
        this.deleteGeometry(node);
        this.deleteMaterial(node);
        if (node.dispose) node.dispose();
        if (node.parent) node.parent.remove(node);
        node.userData = null;
        node = null;
    },
    /**
     * [deleteGeometry 删除几何体]
     * @Author   ZHOUPU
     * @DateTime 2019-05-14
     * @param    {[object]}   node [节点对象]
     * @return   {[type]}        [description]
     */
    deleteGeometry(node) {
        if (node.geometry && node.geometry.dispose) {
            if (node.geometry._bufferGeometry) {
                node.geometry._bufferGeometry.dispose();
            }

            node.geometry.dispose();
            node.geometry = null;
        }
    },
    /**
     * [deleteMaterial 删除材质，多材质]
     * @Author   ZHOUPU
     * @DateTime 2019-05-14
     * @param    {[object]}   node [节点对象]
     * @return   {[type]}        [description]
     */
    deleteMaterial(node) {
        if (PublicFun.isArray(node.material)) {
            node.material.forEach(PublicThree.disposeMaterial.bind(PublicThree));
        } else if (node.material) {
            this.disposeMaterial(node.material);
        }
        node.material = null;
    },
    /**
     * [disposeMaterial 销毁材质]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[object]}   obj      [THREE的材质对象]
     * @return   {[void]}
     */
    disposeMaterial(mtl) {
        Object.keys(mtl).forEach((key) => {
            if (!(mtl[key] && PublicFun.isFunction(mtl[key].dispose))
                && key !== 'uniforms') {
                if (key === 'program' || key === 'fragmentShader' || key === 'vertexShader') {
                    mtl[key] = null;
                }
                return;
            }

            if (key === 'uniforms') {
                Object.keys(mtl.uniforms).forEach((i) => {
                    let uniform = mtl.__webglShader ? mtl.__webglShader.uniforms[i] : undefined;
                    if (uniform && uniform.value) {
                        if (uniform.value.dispose) {
                            uniform.value.dispose();
                        }
                        uniform.value = null;
                    }
                    uniform = mtl.uniforms[i];
                    if (uniform.value) {
                        if (uniform.value.dispose) {
                            uniform.value.dispose();
                        }
                        uniform.value = null;
                    }
                });
            } else {
                mtl[key].dispose();
                mtl[key] = null;
            }
        });

        mtl.dispose();
        mtl = null;
    },
    /**
     * [objectTraverse 遍历对象树，由叶到根]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[object]}   obj      [THREE的object3D对象]
     * @param    {Function} callback [回调函数，返回遍历对象]
     * @return   {[void]}
     */
    objectTraverse(obj, callback) {
        if (!PublicFun.isFunction(callback)) return;
        const {children} = obj;
        for (let i = children.length - 1; i >= 0; i--) {
            PublicThree.objectTraverse(children[i], callback);
        }
        callback(obj);
    }
};
export default PublicThree