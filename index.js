let data = [
    {value: '周杰伦的听妈妈的话，让我反复循环再循环', time: 5, color: 'red', speed: 1, fontSize: 22},
    {value: '想快快长大，才能保护她', time: 10, color: '#00a1f5', speed: 1, fontSize: 30},
    {value: '听妈妈的话吧，晚点再恋爱吧！爱呢？', time: 15}
]

// 获取元素
let doc = document;
let canvas = doc.getElementById('canvas');
let video = doc.getElementById('video');
let $txt = doc.getElementById('text');
let $btn = doc.getElementById('btn');
let $color = doc.getElementById('color');
let $range = doc.getElementById('range');

// 创建Barrage类， 用来实例化每一个弹幕元素
class Barrage {
    constructor (obj, ctx) {
        this.value = obj.value;
        this.time = obj.time;
        this.obj = obj;
        this.context = ctx; // 画布实例   
    }
    // 初始化弹幕信息
    init () {
        this.color = this.obj.color || this.context.color;
        this.opacity = this.obj.opacity || this.context.opacity;
        this.fontSize = this.obj.fontSize || this.context.fontSize;
        this.speed = this.obj.speed || this.context.speed;
       
        // 计算弹幕信息的宽度
        let p = document.createElement('p');
        p.style.fontSize = this.fontSize + 'px';
        p.innerHTML = this.value;
        document.body.appendChild(p);

        // 设置弹幕的宽度
        this.width = p.clientWidth;
        document.body.removeChild(p);

        // 设置弹幕出现的位置
        this.x = this.context.canvas.width;
        this.y = this.context.canvas.height * Math.random();

        // 对超出做处理
        if (this.y < this.fontSize) {
            this.y = this.fontSize; // 下边界
        } else if (this.y > this.context.canvas.height - this.fontSize) {
            this.y = this.context.canvas.height - this.fontSize; // 上边界
        }
    }
    // 渲染弹幕信息
    render () {
        // 设置弹幕信息的字号和字体
        this.context.ctx.font = this.fontSize + 'px Arial';
        // 设置字体颜色
        this.context.ctx.fillStyle = this.color;
        // 绘制弹幕信息
        this.context.ctx.fillText(this.value, this.x, this.y);
    }
}

// 创建canvasBarrage类型，实例一个画布
class CanvasBarrage {
    constructor (canvas, video, opts = {}) {
        if (!canvas || !video) return;
        this.video = video;
        this.canvas = canvas;
        this.canvas.width = video.width;
        this.canvas.height = video.height;
        // 获取画布，操作画布
        this.ctx = canvas.getContext('2d');
        // 设置弹幕的默认信息
        let defOpts = {
            color: '#e91e63',
            speed: 1.5,
            opacity: 0.5,
            fontSize: 20,
            data: []
        }
        Object.assign(this, defOpts, opts);
        // isPaused默认true是暂停
        this.isPaused = true;
        this.barrages = this.data.map(item => new Barrage(item, this));

        // 渲染
        this.render()
    }
    render () {
        // 渲染第一步清除之前的画布
        this.clear();
        this.renderBarrage();
        // 如果视频没有停止播放，继续渲染
        if (!this.isPaused) {
           requestAnimationFrame(this.render.bind(this));
        }
    }
    clear () {
        // 清除整个画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    renderBarrage () {
        // 要根据该时间来和弹幕要展示的时间做比较，来判断是否展示弹幕
        let time = this.video.currentTime;
        this.barrages.forEach(barrage => {
            // 用一个flag来处理是否渲染，默认是false
            // 并且只有在视频播放时间大于等于当前弹幕的展现时间时才做处理
            if (!barrage.flag && time >= barrage.time) {
                // 判断当前弹幕是否有过初始化了
                // 如果isInit还是false，那就需要先对当前弹幕进行初始化操作
                if (!barrage.isInit) {
                    barrage.isInit = true;
                    barrage.init()
                }

                barrage.x -= barrage.speed;
                barrage.render();

                if (barrage.x < -barrage.width) {
                    barrage.flag = true;
                }
            }
        })
    }
    add (obj) {
        this.barrages.push(new Barrage(obj, this));
    }
    replay () {
        this.clear();
        let time = this.video.currentTime;
        this.barrages.forEach(barrage => {
            barrage.flag = false;
            if (time <= barrage.time) {
                // 把isInit设为false这样才会重新初始化渲染
                barrage.isInit = false;
            } else {
                barrage.flag = true;
            }
        })
    }
}

// let canvasBarrage = new CanvasBarrage(canvas, video, {data});
let canvasBarrage;
let ws = new WebSocket('ws://localhost:5000'); // 和服务器建立连接
// 服务器连接成功
ws.onopen = function () {
   // 监听服务器返回的信息 
   ws.onmessage = function (e) {
       let msg = JSON.parse(e.data);

       if (msg.type === 'init') {
           // 初始化弹幕信息
           canvasBarrage = new CanvasBarrage(canvas, video, {data: msg.data});
       } else if (msg.type === 'add') {
           // 添加弹幕信息
           canvasBarrage.add(msg.data);
       }
   }
}
// 监听视频播放， 视频播放是渲染弹幕信息
video.addEventListener('play', () => {
    // isPaused 标识视频是否播放， 默认为false
    canvasBarrage.isPaused = false;
    // 渲染画布
    canvasBarrage.render();
})

// 发送弹幕消息
function send () {
    let value = $txt.value;
    let color = $color.value;
    let fontSize = $range.value;
    let time = video.currentTime; // 弹幕渲染的时间
    let obj = {value, color, fontSize, time};

    // 画布中添加弹幕消息
    // canvasBarrage.add(obj);
    // 把添加的弹幕数据发送给服务端
    // 由ws服务端拿到后添加到redis数据库中
    ws.send(JSON.stringify(obj));
    $txt.value = '';
}
// 回车发送弹幕消息
$txt.addEventListener('keyup', (e) => {
    let key = e.keyCode;
    key === 13 && send();
})

// 点击发送按钮发送弹幕消息
$btn.addEventListener('click', send);

// 暂停时不能渲染弹幕
video.addEventListener('pause', () => {
    canvasBarrage.isPaused = true; // 表示暂停播放
})

// 拖动进度条，回放时需要重新渲染弹幕
video.addEventListener('seeked', () => {
    canvasBarrage.replay();
})