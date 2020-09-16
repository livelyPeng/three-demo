/**
 * DEC
 * 鼠标事件 及 拾取对象数组
 *
 */
import PublicThree from './PublicThree'
import PublicFun from './PublicFun'

let selectObj = null;// -选中对象
let dbclick_delay = false;// -双击节流
let mouseDownTimes = 0;// -单击的次数
let mouseDownEvent = {x: -1, y: -1};// -事件点击屏幕位置

const mouseEvents = {
    eventArr: [],
    highlightObjects:[],
    /**
     * 根据建筑id获取楼层对象
     * @param buildIndex
     * @returns {[]}
     */
    getFloorArr(buildIndex) {
        const result = [];
        this.eventArr.forEach(child => {
            if (child.userData._buildIndex === buildIndex) result.push(child);
        });
        return result;
    },
    /**
     * 获取点击的位置 （移动与pc参数不一样，所以需要统一）
     * @param event
     * @returns {{x: *, y: *}}
     */
    getEventClient(event) {
        let x, y;
        if (event.type === 'touchend' || event.type === 'touchstart') {
            x = event.changedTouches[0].clientX;
            y = event.changedTouches[0].clientY;
        } else {
            x = event.offsetX;
            y = event.offsetY;
        }
        return {x, y};
    },
    /**
     * 获取点击的对象
     * @param threeNode 3D场景对象
     * @param event 鼠标对象
     * @returns {*}
     */
    getPickObjects(threeNode, event) {
        const {x, y} = this.getEventClient(event);
        threeNode.mouseVector.x = (x / threeNode.container.offsetWidth) * 2 - 1;
        threeNode.mouseVector.y = -(y / threeNode.container.offsetHeight) * 2 + 1;
        threeNode.raycaster.setFromCamera(threeNode.mouseVector, threeNode.camera);
        //触发前端事件
        return threeNode.raycaster.intersectObjects(this.eventArr, true);
    },
    /**
     * 双击事件
     * @param self
     * @param event
     */
    doubleClick(self, event) {
        const intersects = mouseEvents.getPickObjects(self, event);
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const {userData} = object;
            const {_sunTimeShow, _sunTimeCal} = userData;
            // -如果之前已经显示日照颜色，则双击之后取消，否则显示
            if (_sunTimeShow) {
                PublicThree.cancelSunLightColor(object);
            } else {
                // -如果之前没有计算过当前楼层的日照时间，则进行计算
                if (!_sunTimeCal) PublicThree.calSingleFloorSunTime(object, mouseEvents.eventArr, self);
                PublicThree.setSunLightColor(object);
            }
            if (self._doubleClickEvent) self._doubleClickEvent({
                _floorIndex: userData._floorIndex,
                _buildIndex: userData._buildIndex,
                floorCount: mouseEvents.getFloorArr(userData._buildIndex).length
            });
        } else {
            // -双击回调
            if (self._doubleClickEvent) self._doubleClickEvent();
        }
    },
    /**
     * 单击事件
     * @param event
     */
    onDocumentMouseDown(event) {
        event.preventDefault();
        mouseDownEvent = mouseEvents.getEventClient(event);
    },
    /**
     * 因为移动端没有双击事件的监听，故需要通过单击进行模拟
     * @param event
     */
    onDocumentMouseUp(event) {
        event.preventDefault();
        const self = this;
        mouseDownTimes++;
        clearTimeout(dbclick_delay);
        dbclick_delay = setTimeout(function () {
            const mouseUpEvent = mouseEvents.getEventClient(event);
            if (PublicFun.equals(mouseUpEvent.x, mouseDownEvent.x) && PublicFun.equals(mouseUpEvent.y, mouseDownEvent.y)) {
                const intersects = mouseEvents.getPickObjects(self, event);
                if (intersects.length > 0) {
                    const {object} = intersects[0];
                    const {userData} = object;
                    // -单击之后需要将视角移动到选中的物体
                    PublicThree.cameraToObject(self, object);
                    // -取消高亮之前建筑
                    PublicThree.cancelHighlight(mouseEvents.highlightObjects);
                    mouseEvents.highlightObjects = mouseEvents.getFloorArr(userData._buildIndex);
                    // -高亮当前建筑
                    PublicThree.highlightObject(mouseEvents.highlightObjects);
                    if (self._mouseDownFunction) self._mouseDownFunction({
                        floorCount: mouseEvents.highlightObjects.length,
                        _floorIndex: userData._floorIndex,
                        _buildIndex: userData._buildIndex
                    });
                } else {
                    if (self._mouseDownFunction) self._mouseDownFunction();
                    PublicThree.cancelHighlight(mouseEvents.highlightObjects);
                }
            }
            mouseDownEvent = {x: -1, y: -1};
            mouseDownTimes = 0;
        }, 300);
        if (mouseDownTimes > 1) {
            // - 模拟双击事件
            mouseDownTimes = 0;
            clearTimeout(dbclick_delay);
            const mouseUpEvent = mouseEvents.getEventClient(event);
            if (PublicFun.equals(mouseUpEvent.x, mouseDownEvent.x) && PublicFun.equals(mouseUpEvent.y, mouseDownEvent.y)) {
                mouseEvents.doubleClick(self, event);
            }
        }
    },
    // -pc端可以将此方法进行双击监听
    onDocumentDoubleClick(event) {
        event.preventDefault();
        clearTimeout(dbclick_delay);
        const self = this;
        mouseEvents.doubleClick(self, event);
    },
    /**
     * 移动事件
     * @param event
     */
    onDocumentMouseMove(event) {
        event.preventDefault();
        const self = this;
        mouseDownTimes = 0;
        const intersects = mouseEvents.getPickObjects(self, event);
        if (intersects.length > 0) {
            if (intersects[0].object !== selectObj) {
                selectObj = intersects[0].object;
                if (self._mouseMoveFunction) self._mouseMoveFunction(mouseEvents.getFloorArr(selectObj.userData._buildIndex));
            }
        } else {
            selectObj = null;
            if (self._mouseMoveFunction) self._mouseMoveFunction();
        }
    },
    /**
     * 初始化事件
     * @param threeNode
     */
    initEvent(threeNode) {
        // -鼠标事件
        window.addEventListener('resize', threeNode.onWindowResize.bind(threeNode), false);
        threeNode.container.addEventListener('mousemove', mouseEvents.onDocumentMouseMove.bind(threeNode), false);
        threeNode.container.addEventListener('touchmove', mouseEvents.onDocumentMouseMove.bind(threeNode), false);
        threeNode.container.addEventListener('mousedown', mouseEvents.onDocumentMouseDown.bind(threeNode), false);
        threeNode.container.addEventListener('touchstart', mouseEvents.onDocumentMouseDown.bind(threeNode), false);
        threeNode.container.addEventListener('touchend', mouseEvents.onDocumentMouseUp.bind(threeNode), false);
        threeNode.container.addEventListener('mouseup', mouseEvents.onDocumentMouseUp.bind(threeNode), false);
    },
    /**
     * 事件监听移除
     * @param threeNode
     */
    removeEvent(threeNode) {
        window.removeEventListener('resize', threeNode.onWindowResize.bind(threeNode), false);
        threeNode.container.removeEventListener('mousemove', mouseEvents.onDocumentMouseMove.bind(threeNode), false);
        threeNode.container.removeEventListener('touchmove', mouseEvents.onDocumentMouseMove.bind(threeNode), false);
        threeNode.container.removeEventListener('mousedown', mouseEvents.onDocumentMouseDown.bind(threeNode), false);
        threeNode.container.removeEventListener('touchstart', mouseEvents.onDocumentMouseDown.bind(threeNode), false);
        threeNode.container.removeEventListener('touchend', mouseEvents.onDocumentMouseUp.bind(threeNode), false);
        threeNode.container.removeEventListener('mouseup', mouseEvents.onDocumentMouseUp.bind(threeNode), false);
    }
};

export default mouseEvents