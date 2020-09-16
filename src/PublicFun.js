/**
 * DEC PublicFun
 * 公用方法
 * 该对象用于管理场景中运用到的非threejs方法
 */

const ZERO_VALUE = 0.0000001;
const ONE_HOUR_MINUTES = 60;
const simpleItem = [
    Number,
    String,
    Date,
    RegExp,
    HTMLElement,
    NodeList,
    Boolean,
    Function
];

const PublicFun = {
    sunLengthColors: ['#3834C9', '#308FD5', '#1EC1AC', '#6AD335', '#F9DD31', '#FF9419', '#EA2121', '#BD0B18'],
    /**
     * [isArray 判断是否是一个array]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[type]}   o [待判断的参数]
     * @return   {Boolean}    [true-array、false-not array]
     */
    isArray(o) {
        return Object.prototype.toString.call(o) === '[object Array]';
    },
    /**
     * [isFunction 判断是否是一个function]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[type]}   a [待判断的参数]
     * @return   {Boolean}    [false-not function、true-function]
     */
    isFunction(a) {
        return Object.prototype.toString.call(a) === '[object Function]';
    },
    /**
     * @Author Duke
     * @Date 2019/12/10
     * @Description
     * @param target [any] ==>检测对象;
     * @return isSimple ==> 是否是简单对象
     */
    isSimpleObj(target) {
        const isProxy = target && target.constructor === Proxy;
        return isProxy || (typeof target !== 'object' && !isProxy)
            || (
                target === null
                || target === undefined
                || (
                    !isProxy
                    && simpleItem.some((constructor) => target instanceof constructor)
                )
            );
    },
    /**
     * 对象复制
     * @param base
     * @param target
     * @returns {*}
     */
    copy(base, target) {
        Object.keys(target).forEach((i) => {
            const item = target[i];
            if (
                this.isSimpleObj(item)
            ) {
                base[i] = item;
            } else if (
                this.isSimpleObj(base[i])
            ) {
                base[i] = this.copy(item instanceof Array ? [] : {}, item);
            } else {
                base[i] = this.copy(base[i], item);
            }
        });
        return base;
    },
    extend(...args) {
        const arg = Reflect.apply(Array.prototype.splice, args, [0]);
        if (arg[0] instanceof Boolean || typeof arg[0] === 'boolean') {
            const isDeep = arg.splice(0, 1)[0];
            if (isDeep) {
                const base = arg.splice(0, 1)[0];
                arg.forEach((item) => this.copy(base, item));
                return base;
            }
        }
        return Reflect.apply(Object.assign, Object, arg);
    },
    /**
     * [toFunction 参数不是function转为function，是则返回本身]
     * @Author   ZHOUPU
     * @DateTime 2018-08-02
     * @param    {[type]}   a [待判断的参数]
     * @return   {[function]}     [function]
     */
    toFunction(a) {
        return this.isFunction(a) ? a : function () {
        };
    },
    equals(valueA, valueB) {
        valueB = valueB || 0;
        return Math.abs(valueA - valueB) < ZERO_VALUE;
    },
    getSunLightColorWithLength(time) {
        const hours = time / ONE_HOUR_MINUTES;
        const {length} = this.sunLengthColors;
        if(hours >= length)return this.sunLengthColors[length - 1];
        for (let i = 0; i < length; i++) {
            if (hours < i + 1) {
                return this.sunLengthColors[i];
            }
        }
        return this.sunLengthColors[0];
    },
    // -ajax请求
    ajaxQuer(url, loade) {
        let xhr = null;
        // 实例化XMLHttpRequest对象
        if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
        } else {
            // IE6及其以下版本
            xhr = new ActiveXObjcet('Microsoft.XMLHTTP');
        }
        // 监听事件，只要 readyState 的值变化，就会调用 readystatechange 事件
        xhr.onreadystatechange = function () {
            // readyState属性表示请求/响应过程的当前活动阶段，4为完成，已经接收到全部响应数据
            if (xhr.readyState == 4) {
                const status = xhr.status;
                // status：响应的HTTP状态码，以2开头的都是成功
                if (status >= 200 && status < 300) {
                    let response = '';
                    // 判断接受数据的内容类型
                    let type = xhr.getResponseHeader('Content-type');
                    if (type.indexOf('xml') !== -1 && xhr.responseXML) {
                        response = xhr.responseXML; //Document对象响应
                    } else if (type === 'application/json') {
                        response = JSON.parse(xhr.responseText); //JSON响应
                    } else {
                        response = xhr.responseText; //字符串响应
                    }
                    ;
                    // 成功回调函数
                    PublicFun.toFunction(loade(response));
                } else {
                    console.log(status);
                }
            }
        };

        // 连接和传输数据
        // 三个参数：请求方式、请求地址(get方式时，传输数据是加在地址后的)、是否异步请求(同步请求的情况极少)；
        xhr.open('GET', url, true);
        xhr.send(null);
    }
};

export default PublicFun