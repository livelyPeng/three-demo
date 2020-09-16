/**
 * DEC SunCalcuate
 * 通用太阳方法
 * 该对象用于管理与太阳有关的计算方法
 * @type {number}
 */
const TROPIC_ANGLE = 23.43;// -回归线纬度
const CURRENT_YEAR = new Date().getFullYear();// -当前年份
const SPRING_EQUINOX_DATE = new Date(`${CURRENT_YEAR}-03-20`);//-春分
const SUMMER_SOLSTICE_DATE = new Date(`${CURRENT_YEAR}-06-21`);//-夏至
const AUTUMN_EQUINOX_DATE = new Date(`${CURRENT_YEAR}-09-22`);//-秋分
const WINTER_SOLSTICE_DATE = new Date(`${CURRENT_YEAR}-12-21`);//-冬至
const DAY_MSEC = 1000*60*60*24;// -每一天的毫秒数

const SunCalcuate =  {
    TIME_ZONE:120,// -当前时区经度
    PI_ANGLE : 180,
    /**
     * 根据日期计算太阳角度
     * @param date
     * @returns {number}
     */
    getSunAngleWithDays(date){
        let angle = -Infinity;
        let dayCount = -Infinity;
        let dayIndex = -Infinity;
        let angleStart = -Infinity;
        // -根据日期计算当前太阳照射的纬度
        if(date <= SPRING_EQUINOX_DATE){
            const lastSpringEquinox = new Date(`${CURRENT_YEAR - 1}-12-21`);
            dayCount = (SPRING_EQUINOX_DATE - lastSpringEquinox) / DAY_MSEC;
            dayIndex = (date - lastSpringEquinox) / DAY_MSEC;
            angleStart = -TROPIC_ANGLE;
        }else if(date <= SUMMER_SOLSTICE_DATE){
            dayCount = (SUMMER_SOLSTICE_DATE - SPRING_EQUINOX_DATE) / DAY_MSEC;
            dayIndex = (date - SPRING_EQUINOX_DATE) / DAY_MSEC;
            angleStart = 0;

        }else if(date <= AUTUMN_EQUINOX_DATE){
            dayCount = (AUTUMN_EQUINOX_DATE - SUMMER_SOLSTICE_DATE) / DAY_MSEC;
            dayIndex = (AUTUMN_EQUINOX_DATE - date) / DAY_MSEC;
            angleStart = 0;

        }else if(date <= WINTER_SOLSTICE_DATE){
            dayCount = (WINTER_SOLSTICE_DATE - AUTUMN_EQUINOX_DATE) / DAY_MSEC;
            dayIndex = (WINTER_SOLSTICE_DATE - date) / DAY_MSEC;
            angleStart = -TROPIC_ANGLE;
        }else{
            const nextSpringEquinox = new Date(`${CURRENT_YEAR + 1}-03-20`);
            dayCount = (nextSpringEquinox - WINTER_SOLSTICE_DATE) / DAY_MSEC;
            dayIndex = (date - WINTER_SOLSTICE_DATE) / DAY_MSEC;
            angleStart = -TROPIC_ANGLE;
        }
        const delta = TROPIC_ANGLE / dayCount;
        angle = angleStart + dayIndex * delta;
        return angle * Math.PI / this.PI_ANGLE;
    },
    /**
     * 获取当前经纬度正午太阳角度
     * @param opts
     * @returns {number}
     */
    getNoonSunAngle(opts){
        const {lat,date} = opts;
        const sunAngle = this.getSunAngleWithDays(date);
        return Math.PI / 2 - Math.abs(lat * Math.PI / this.PI_ANGLE - sunAngle);
    },
    /**
     * 根据日期及经纬度获取当地日出日落信息
     * @param opts
     * @returns {{dropTime: *, riseTime: *}}
     */
    getSunRiseDropMsg(opts){
        const { lng, lat, date } = opts;
        const sunAngle = this.getSunAngleWithDays(date);
        // -根据太阳时角计算白天时间
        const whiteAngle =Math.PI * 2 - Math.acos(Math.tan(Math.PI * lat / this.PI_ANGLE)*Math.tan(sunAngle)) * 2;
        const whiteTime = 24*whiteAngle / (Math.PI * 2);
        // -根据时区计算当前经度正午时间
        const noonTime = (this.TIME_ZONE - lng)/15+12;
        const riseTime = noonTime - whiteTime / 2;
        const dropTime = noonTime + whiteTime / 2;
        return {riseTime,dropTime};
    },
    /**
     * 时间字符串转换
     * @param time
     * @returns {string}
     */
    getTimeStr(time){
        const hourTime = Math.floor(time);
        let minTime = Math.floor((time - hourTime) * 60);
        minTime = minTime < 10?'0'+minTime:minTime;
        return hourTime + ':' + minTime;
    }
};
export default SunCalcuate