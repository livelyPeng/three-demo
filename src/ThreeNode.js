/**
 * DEC ThreeNode
 * 日照模拟场景主文件，负责整个场景的渲染
 *
 */

import PublicThree from './PublicThree'
import mouseEvents from './Events'
import PublicFun from './PublicFun'
import SunCalcuate from './SunCalcuate'

// -在容器画布上新建一层覆盖
const _creatContainer = (id) => {
    const containers = document.createElement('div');
    containers.id = id;
    containers.style = 'width:100%;height:100%;overflow:hidden;position:relative !important;';
    return containers;
};
const _isDomElement = function (d) {
    return !!(d instanceof HTMLElement) ||
        !!(d && typeof d === 'object' && d.nodeType === 1 && typeof d.nodeName === 'string');
};
// -初始化时是否传入dom对象，如果不是则根据传入的容器ID获取dom对象
const _parseCts = (cts) => {
    let domEle = null;
    if (typeof cts === 'object') {
        if (_isDomElement(cts)) {
            domEle = cts;
        } else {
            domEle = _isDomElement(cts[0]) ? cts[0] : null;
        }
    } else {
        domEle = document.getElementById(cts);
    }
    return domEle;
};
// -检测浏览器是否支持webgl，并获取浏览器canvas的webgl画笔
const _detector = () => {
    try {
        return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
    } catch (e) {
        return false;
    }
};
// -获取容器尺寸
const _getWH = container => ({
    w: container.offsetWidth,
    h: container.offsetHeight,
});
// -设置控制器
const _setControls = (controls, opts) => {
    controls.zoomSpeed = opts.zoomSpeed;
    controls.enablePan = opts.enablePan;
    controls.enableKeys = opts.enablePan;
    controls.panSpeed = opts.panSpeed;
    controls.keyPanSpeed = opts.panSpeed;
    controls.enableZoom = opts.enableZoom;
    controls.rotateSpeed = opts.rotateSpeed;
    controls.enableRotate = opts.enableRotate;

    controls.enableDamping = opts.enableDamping;
    controls.dampingFactor = opts.dampingFactor;

    controls.minDistance = opts.distance[0];
    controls.maxDistance = opts.distance[1];
    controls.minPolarAngle = opts.polarAngle[0];
    controls.maxPolarAngle = opts.polarAngle[1];
    controls.minAzimuthAngle = opts.azimuthAngle[0];
    controls.maxAzimuthAngle = opts.azimuthAngle[1];
};

// -默认参数
const defaultConfig = {
    background: {// -画布背景参数
        color: '#ffffff',// -背景颜色
        opacity: 0.0 // -背景透明度
    },
    camera: {// -相机参数 参考官网https://threejs.org/
        fov: 45,// -俯仰角
        near: 1,// -最近距离
        far: 20000,// -最远距离
        position: [0, 0, 100],// -相机位置
    },
    controls: {// -控制器参数 参考官网
        enablePan: true,// -是否平移
        panSpeed: 1.0,// -平移步幅
        enableZoom: true,// -是否缩放
        zoomSpeed: 1.0,// -缩放步幅
        enableRotate: true,// -是否旋转
        rotateSpeed: 1.0,// -旋转步幅
        enableDamping:false,// -是否允许阻尼运动
        dampingFactor:0.05,// -阻尼运动系数
        distance: [10, 1000],// -控制器缩放的最大最小距离
        polarAngle: [0, Math.PI / 2],// -上下旋转角度
        azimuthAngle: [-Infinity, Infinity],// -左右旋转角度
        target: [0, 0, 0],// -目标点
    },
    render:{
        pixelRatio:1,// -渲染像素参数 场景清晰度
        light:{ // -灯光系数
            color:'#FFFFFF',
            intensity:0.5
        }
    },
    localPosition: {// -当前城市经纬度
        lng: 104.07,
        lat: 30.67
    }
};

let dfConfig = {};
let Sun_Path_Function = null;// -太阳动态回调函数
let sunRiseAnimate = true;// -太阳自运行参数，对外参数
let sunAnimateStart = false;// -太阳是否开始自运行 与建筑动画配合使用
/**
 * 动画
 * @param self threeNode对象
 * @param dt
 * @private
 */
const _animation = (self, dt) => {
    if (dt < 0.1) {// -如果当前帧率太低 ，则不运行动画

        // -太阳轨迹动画
        if (self._sunPath && sunAnimateStart) {
            // -获取太阳轨迹参数
            const {startIndex, endIndex, points,date} = self._sunPath.userData;

            if (self._directLight && sunRiseAnimate) {
                const index = Math.floor(self._directLight._index);
                self._directLight.position.set(points[index * 3], points[index * 3 + 1], points[index * 3 + 2]);

                if (self._directLight._index > endIndex) self._directLight._index = startIndex;
                if (Sun_Path_Function) {
                    const time = 24 * index / 576;
                    const timeStr = SunCalcuate.getTimeStr(time);
                    const deltaTime = time - 8;
                    const milliSeconds = date.getTime() + deltaTime * 3600;
                    Sun_Path_Function({currentTime:timeStr,milliSeconds});
                }
                self._directLight._index += dt * 10;
            }
        }
        // -扩散对象动画
        if (self._spread) {
            const {_perTime, _transTime} = self._spread.userData;
            self._spread.material.uniforms.u_time.value = _transTime / _perTime;
            self._spread.userData._transTime += dt;
            if (self._spread.userData._transTime >= _perTime) self._spread.userData._transTime = 0;
        }
        // -相机角度动画 即传递当前方位角
        if(self._cameraAngleCallback){
            const target = self.controls.target.clone();
            const position = self.camera.position.clone();
            const vector = target.sub(position).setY(0).normalize();
            let angle = vector.angleTo(new THREE.Vector3(0,0,-1));
            angle = vector.x>=0?angle:Math.PI * 2-angle;
            self._cameraAngleCallback(angle);
        }
        // -建筑动画
        if(self._builds){
            if(self._builds.scale.y < 1)self._builds.scale.y += self._builds._speed;
            if(self._builds.scale.y >= 1)sunAnimateStart = true;
        }

    }
};

class ThreeNode {
    constructor(cts, config) {
        const conts = _parseCts(cts);
        if (_detector() && conts != null) {
            try {
                config = config || {};
                // -获取参数对象
                dfConfig = PublicFun.extend(true, {}, defaultConfig, config);
                // -创建画布
                this.container = _creatContainer(THREE.Math.generateUUID());
                this.parentCont = conts;
                this.parentCont.append(this.container);
                // -创建场景
                this.scene = new THREE.Scene();

                // -平行光
                this._directLight = PublicThree.createSunLight(dfConfig.render.light);
                this._directLight.position.set(100, 500, 2);
                this.scene.add(this._directLight);
                // -环境光
                const alight = new THREE.AmbientLight('#756e63'); // soft white light
                this.scene.add(alight);

                // -场景时间参数
                this.clock = new THREE.Clock();
                const wh = _getWH(this.container);
                const cm = dfConfig.camera,
                    bg = dfConfig.background;
                const ct = dfConfig.controls;
                // -创建相机
                this.camera = new THREE.PerspectiveCamera(cm.fov, wh.w / wh.h, cm.near, cm.far);
                this.camera.position.set(cm.position[0], cm.position[1], cm.position[2]);

                // -控制器
                this.controls = new THREE.OrbitControls(this.camera, this.container);
                this.controls.target.set(ct.target[0], ct.target[1], ct.target[2]);
                _setControls(this.controls, ct);
                //拾取射线 用于做日照分析
                this.raycaster = new THREE.Raycaster();
                this.mouseVector = new THREE.Vector2();

                // -渲染器
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                });
                this.renderer.autoClear = false;
                this.renderer.setSize(wh.w, wh.h);
                this.renderer.setPixelRatio(dfConfig.render.pixelRatio);
                this.renderer.setClearColor(bg.color, bg.opacity);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.container.appendChild(this.renderer.domElement);
                // -鼠标事件
               mouseEvents.initEvent(this);
            } catch (e) {
                console.log(e);
            }
        }
    }
    // -渲染方法
    render() {
        const self = this;
        const Animations = function () {
            self.renderer.render(self.scene, self.camera);
            requestAnimationFrame(Animations);
            if (self.controls) self.controls.update();
            _animation(self, self.clock.getDelta());
            if (self.stats) self.stats.update();
            TWEEN.update();
        };
        Animations();
    }

    /**
     * 创建地面
     * @param opts
     * {
     *     width:地面宽度,
     *     height:地面长度
     *     imageUrl:地面使用的纹理图片
     *     xRepeat:x方向纹理重复次数
     *     yRepeat:y方向纹理重复次数
     * }
     */
    createGround(opts){
        const self = this;
        if(self._ground){
            PublicThree.disposeObj(self._ground);
        }
        self._ground = PublicThree.createGround(opts);
        self.scene.add(self._ground);
    }

    /**
     * 创建方位轮
     * @param opts
     * {
     *     width:内圈宽度
     *     height:内圈长度
     *     lineColor:线颜色
     *     fontSize:四个字的尺寸
     *     fontColor:四个字的字体颜色
     * }
     */
    createBear(opts) {
        this.scene.add(PublicThree.createBearingWheel(opts));
    }

    /**
     * 创建天空盒子
     * @param opts
     * {
     *     path:存放天空盒子图片的路径
     *     fog:{
     *         show:是否创建雾气
     *         color:雾气颜色
     *         density:雾气密度
     *     }
     * }
     */
    createSkybox(opts){
        const {fog}=opts;
        const {
            show = true,color = '#FFFFFF',density = 0.0025
        }=fog;
        this.scene.background = PublicThree.createSkybox(opts);
        if(show){
            this.scene.fog = new THREE.FogExp2(color, density);
        }
    }

    /**
     * 创建扩散动画
     * @param opts
     * {
     *     radius:半径
     *     color:颜色
     *     perTime:扩散频率
     *     height:高度
     * }
     */
    createSpread(opts){
        const self = this;
        // -添加扩散效果
        if (self._spread) {
            PublicThree.disposeObj(self._spread);
        }
        self._spread = PublicThree.createSpreadObject(opts);
        self.scene.add(self._spread);
    }

    /**
     * 设置热力图的颜色范围 每个颜色表示一个小时的颜色 从0小时开始
     * @param colors 颜色数组
     */
    setSunLengthColors(colors){
        PublicFun.sunLengthColors = colors.concat();
        PublicThree.sunTimeRefresh(mouseEvents.eventArr);
    }

    /**
     * 设置清晰度
     * @param value
     */
    setPixelRatio(value){
        const self = this;
        self.renderer.setPixelRatio(value);
    }
    /**
     * 太阳运行动画回调函数
     * @param callback
     */
    setSunAnimateFunction(callback) {
        Sun_Path_Function = callback;
    }

    /**
     * 创建建筑物
     * @param url 建筑数据路径
     * @param opts 建筑配置项
     * {
     *     topUrl:楼顶纹理图片地址
     *     sideUrl:建筑侧边纹理图片
     *     oddColor:奇数层颜色
     *     evenColor:偶数层颜色
     * }
     */
    createBuildings(url,opts,onProgress) {
        const self = this;
        if (self._builds) {
            mouseEvents.eventArr = [];
            mouseEvents.highlightObjects = [];
            PublicThree.disposeObj(self._builds);
        }
         self._calSunTimeProgress = onProgress;
        if(url.constructor === Object){
            self._builds = PublicThree.createBuildings(url, mouseEvents.eventArr,opts);
            self.scene.add(self._builds);
            // -计算日照长度
            PublicThree.calSunTime(mouseEvents.eventArr, self);
        }
        else PublicFun.ajaxQuer(url, function (result) {
            console.time('建筑构建时间');
            self._builds = PublicThree.createBuildings(result, mouseEvents.eventArr,opts);
            self.scene.add(self._builds);
            // -计算日照长度
            PublicThree.calSunTime(mouseEvents.eventArr, self);
            console.timeEnd('建筑构建时间');
        });
    }


    /**
     * 设置太阳路径
     * @param date 日期
     * @param callback  {dropTime: *, riseTime: *}
     */
    setSunPath(date,callback) {
        const self = this;
        const position = dfConfig.localPosition;
        if (self._sunPath) {
            PublicThree.disposeObj(self._sunPath);
        }
        self._sunPath = PublicThree.createSunPath({lng: position.lng, lat: position.lat, date});
        self.scene.add(self._sunPath);
        // -如果场景中存在建筑物则需要刷新日照热力图
        if (self._builds) {
            PublicThree.calSunTime(mouseEvents.eventArr, self);
            PublicThree.sunTimeRefresh(mouseEvents.eventArr);
        }
        // -重新设置太阳光位置参数
        if (self._directLight) {
            const {points} = self._sunPath.userData;
            const index = self._sunPath.userData.startIndex;
            self._directLight._index = index;
            self._directLight.position.set(points[index * 3], points[index * 3 + 1], points[index * 3 + 2]);
        }
        if(callback)callback({riseTime: self._sunPath.userData.riseTime, dropTime: self._sunPath.userData.dropTime});
    }

    /**
     * 窗体resize调用方法
     */
    onWindowResize() {
        const self = this;
        const wh = _getWH(self.container);
        self.camera.aspect = wh.w / wh.h;
        self.camera.updateProjectionMatrix();
        self.renderer.setSize(wh.w, wh.h);
    }

    /**
     * 鼠标滑动回调
     * @param func
     */
    setMouseMoveFunction(func){
        const self = this;
        self._mouseMoveFunction = func;
    }

    /**
     * 鼠标单击回调
     * @param func { currentBuild //当前楼栋号,currentFloor//当前楼层号,floorCount//当前共有多少层}
     */
    setMouseDownFunction(func){
        const self = this;
        self._mouseDownFunction = func;
    }

    /**
     * 鼠标双击回调
     * @param func
     */
    setDoubleClickEvent(func){
        const self = this;
        self._doubleClickEvent = func;
    }

    /**
     * 太阳是否自动运动
     * @param state true / false
     */
    setSunPositionAnimate(state){
        const self = this;
        sunRiseAnimate = state;
    }

    /**
     * 根据时间设置当前太阳位置
     * @param time 例如'12:30'
     */
    setSunPositionCurrentTime(time){
        const self = this;
        sunRiseAnimate = false;
        if (self._sunPath) {
            const {points} = self._sunPath.userData;
            if (self._directLight) {
                const times = time.split(':');
                if(times.length !== 2)return;
                const hour = parseFloat(times[0]);
                const minutes = parseFloat(times[1]) + hour * 60;
                const index = Math.floor(minutes / 2.5);
                self._directLight.position.set(points[index * 3], points[index * 3 + 1], points[index * 3 + 2]);
                self._directLight._index = index;
            }
        }
    }

    /**
     * 设置楼层热力图
     * @param buildIndex 建筑ID
     * @param floorIndex 楼层ID
     */
    setSunShineOfFloor(buildIndex,floorIndex){
        const self = this;
        for(let i = 0,length = mouseEvents.eventArr.length;i<length;i++){
            const object = mouseEvents.eventArr[i];
            if( object.userData._buildIndex === buildIndex){
                if(floorIndex !== undefined && object.userData._floorIndex === floorIndex){
                    if(!object.userData._sunTimeCal){
                        PublicThree.calSingleFloorSunTime(object,mouseEvents.eventArr,self);
                    }
                    PublicThree.setSunLightColor(object);
                    break;
                }else if(floorIndex === undefined){
                    if(!object.userData._sunTimeCal){
                        PublicThree.calSingleFloorSunTime(object,mouseEvents.eventArr,self);
                    }
                   PublicThree.setSunLightColor(object);
                }
            }
        }
    }

    /**
     * 取消楼层热力图
     * @param buildIndex 建筑ID
     * @param floorIndex 楼层ID
     */
    cancelSunShineOfFloor(buildIndex,floorIndex){
        for(let i = 0,length = mouseEvents.eventArr.length;i<length;i++){
            const object = mouseEvents.eventArr[i];
            if( object.userData._buildIndex === buildIndex){
                if(floorIndex !== undefined && object.userData._floorIndex === floorIndex){
                    PublicThree.cancelSunLightColor(object);
                    break;
                }else if(floorIndex === undefined){
                    PublicThree.cancelSunLightColor(object);
                }
            }
        }
    }

    /**
     * 重置相机 回到初始位置
     */
    resetCamera(){
        const self = this;
        const {camera,controls}=dfConfig;
        const {position} = camera;
        const {target}=controls;
        PublicThree.cameraToPosition(self,
            new THREE.Vector3(position[0],position[1],position[2]),
            new THREE.Vector3(target[0],target[1],target[2])
        );
        if(self._cameraAngleCallback){
            self._cameraAngleCallback(0);
        }
    }

    /**
     * 设置相机正北角度回调函数
     * @param callback
     * 参数 angle 0  ~~~~~ PI * 2
     */
    setCameraAngleCallback(callback){
        const self = this;
        self._cameraAngleCallback = callback;
    }

    /**
     * 场景销毁函数 关闭页面时调用
     */
    disposeRender() {
        const self = this;
        mouseEvents.removeEvent(self);
        self.controls.dispose();
        self.container.remove();
        self.renderer.forceContextLoss();
        self.renderer.domElement = null;
        self.renderer.context = null;
        self.renderer = null;
    }
}
// 要导出 不导出玩个锤子
export default ThreeNode