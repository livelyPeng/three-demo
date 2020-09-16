ThreeNode

Constructor:

new ThreeNode(id, config);

Properties:
/*id - 容器ID ，绘制场景的div或canvas的Id
config：{
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
}*/

Methods:
/** -渲染方法
 * --必须调用
 */
render();

/**
 * 创建地面
 * @param opts
 * {
 *
 *     imageUrl:地面使用的纹理图片
 *     xRepeat:x方向纹理重复次数 默认20
 *     yRepeat:y方向纹理重复次数 默认20
 *     radius:地面半径,
 *     radiusSegment :地面构成圆的分段 64,
 *
 *     mapUrl:地面上地图使用的纹理图片,
       mapColor:地图颜色,
       width:地图宽度,默认50
 *     height:地图长度，默认50
 * }
 */
createGround(opts);

/**
 * 创建方位轮
 * @param opts
 * {
 *     width:内圈宽度 默认20
 *     height:内圈长度 默认20
 *     lineColor:线颜色 默认白色
 *     fontSize:四个字的尺寸 默认80
 *     fontColor:四个字的字体颜色 默认白色
 * }
 */
createBear(opts);

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
createSkybox(opts);

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
createSpread(opts);

/**
 * 创建建筑物
 * @param url 建筑数据路径
 * @param opts 建筑配置项
 * {
 *     topUrl:楼顶纹理图片地址
 *     sideUrl:建筑侧边纹理图片
 *     oddColor:奇数层颜色
 *     evenColor:偶数层颜色
 *     floorHeight:楼层高度 默认0.5，此为三维之中的高度非实际高度
 *     fontColor :楼顶文件颜色,
 *     fontSize:楼顶文字尺寸,
 *     strokeWidth :楼顶文字描边尺寸,
 *     strokeColor : 楼顶文字描边颜色,
 *     maxWidth : 建筑最大宽度 东西距离,
 *     maxHeight : 建筑最大长度 南北距离
 * }
 */
createBuildings(url,opts);

/**
 * 取消楼层热力图
 * @param buildIndex 建筑ID
 * @param floorIndex 楼层ID
 */
cancelSunShineOfFloor(buildIndex,floorIndex);

/**
 * 场景销毁函数 关闭页面时调用
 */
disposeRender();

/**
 * 重置相机 回到初始位置
 */
resetCamera();

/**
 * 设置清晰度
 * @param value
 */
setPixelRatio(value);

/**
 * 鼠标单击回调
 * @param func { _buildIndex //当前楼栋号,_floorIndex//当前楼层号,floorCount//当前共有多少层}
 */
setMouseDownFunction(func);
/**
 * 鼠标双击回调
 * @param func { _buildIndex //当前楼栋号,_floorIndex//当前楼层号,floorCount//当前共有多少层}
 */
setDoubleClickEvent(func);
/**
 * 太阳是否自动运动 即 暂停/继续 播放
 * @param state true / false
 */
setSunPositionAnimate(state);
/**
 * 根据时间设置当前太阳位置 若调用则动画暂停
 * @param time 例如'12:30'
 */
setSunPositionCurrentTime(time);

/**
 * 设置相机正北角度回调函数
 * @param callback
 * 参数 angle 0  ~~~~~ PI * 2
 */
setCameraAngleCallback(callback);

/**
 * 设置太阳路径
 * @param date 日期 new Date()
 * @param callback {dropTime: hour:minute, riseTime: hour:minute}
 *
 */
setSunPath(date,callback);

/**
 * 设置热力图的颜色范围 每个颜色表示一个小时的颜色 从0小时开始
 * @param colors 颜色数组
 */
setSunLengthColors(colors);

/**
 * 太阳运行动画回调函数
 * @param callback 返回当前日期时间{currentTime:'6:02',milliSeconds:当前时间的毫秒}
 */
setSunAnimateFunction(callback);

/**
 * 设置楼层热力图
 * @param buildIndex 建筑ID
 * @param floorIndex 楼层ID
 */
setSunShineOfFloor(buildIndex,floorIndex);
