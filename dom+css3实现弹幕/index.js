let data = [
    {value: '周杰伦的听妈妈的话，让我反复循环再循环', time: 5, color: 'red', speed: 1, fontSize: 22},
    {value: '想快快长大，才能保护她', time: 10, color: '#00a1f5', speed: 1, fontSize: 30},
    {value: '听妈妈的话吧，晚点再恋爱吧！爱呢？', time: 15}
]

// 获取元素
let doc = document;
let video = doc.getElementById('video');
let $txt = doc.getElementById('text');
let $btn = doc.getElementById('btn');
let $color = doc.getElementById('color');
let $range = doc.getElementById('range');
// 声明一个Barrage类，实例化每一条弹幕信息

// color,fontSize,time,opacity,speed, value, width
class Barrage {
    constructor (obj, ctx) {
        this.value = obj.value;
        this.time = obj.time;
        this.obj = obj;
        this.context = ctx; //
    }
    // 初始化弹幕信息
    init () {
        this.color = this.obj.color || this.context.color;
        this.speed = this.obj.speed || this.context.speed;
        this.opacity = this.obj.opacity || this.context.opacity;
        this.fontSize = this.obj.fontSize || this.context.fontSize;

        // 计算弹幕信息的宽度
        let p = document.createElement('p');
        p.style.fontSize = this.fontSize + 'px';
        p.style.color = this.color;
        p.innerHTML = this.value;
        p.className = 'danmu';
        this.context.box.appendChild(p);

        // 设置弹幕的宽度
        this.width = p.clientWidth;
        // 设置弹幕出现的位置
        this.x = this.context.box.width;
        this.y = this.context.box.height * Math.random();
        // 对超出做处理
        if (this.y < this.fontSize) {
            this.y = this.fontSize; // 下边界
        } else if (this.y > this.context.box.height - this.fontSize) {
            this.y = this.context.box.height - this.fontSize; // 上边界
        }
    }
    // 渲染弹幕信息
    render () {
        let style = document.createElement('style');
        document.head.appendChild(style);
        let from = `from { visibility: visible; -webkit-transform: translateX( ${this.x}px); }`;
        let to = `to { visibility: visible; -webkit-transform: translateX(-10px); }`;
        style.sheet.insertRule(`@-webkit-keyframes danmu { ${from} ${to} }`, 0);
    }
}

// 声明一个弹幕池BarrageBox类，储存弹幕元素，添加弹幕的时候向弹幕池中增加一个元素，用一个计时器不断的扫描弹幕池
class BarrageBox {
    constructor (box, video, data) {
       if (!box || !video) return;
       this.video = video;
       this.box = box;
       this.box.width = video.width;
       this.box.height = video.height;
       // 设置弹幕的默认信息
       let defOpts = {
            color: '#e91e63',
            speed: 1.5,
            opacity: 0.5,
            fontSize: 20,
            data: []
        }
        Object.assign(this, defOpts, data);
         // isPaused默认true是暂停
        this.isPaused = true;
        this.barrrages = this.data.map(item => new Barrage(item, this));

        this.render();
    }
    // 渲染弹幕信息 
    render () {
      this.renderBarrage();  
      // 如果视频没有停止播放，继续渲染
      if (!this.isPaused) {
        requestAnimationFrame(this.render.bind(this));
      }
    }
    renderBarrage () {
        let time = this.video.currentTime;
        this.barrrages.forEach(barrage => {
            // 判断弹幕是否渲染
            if (!barrage.flag && time > barrage.time) {
                // 进行渲染
                if (!barrage.isInit) { // 判断弹幕是否初始化
                     barrage.isInit = true;
                     barrage.init()
                }
                // 对弹幕进行渲染
                barrage.render();
            }

            if (barrage.x < -barrage.width) { // 什么情况下弹幕已经渲染
                barrage.flag = true;
            }
        }) 
    }
    // 添加弹幕信息
    add (obj) {
        this.barrrages.push(new Barrage(obj, this));
    }
    // 删除弹幕信息
    remove () {
       this.box.remove(); 
    }
}

// let barrageBox = new BarrageBox(box, video, {data});

let barrageBox;
let ws = new WebSocket('ws://localhost:5000'); // 和服务器建立链接
ws.onopen = function () { // 服务器连接成功
   ws.onmessage = function (e) { // 监听服务端发来的信息
      let msg = JSON.parse(e.data);
      
      if (msg.type === 'init') {
          // 初始化弹幕信息
          barrageBox = new BarrageBox(box, video, {data: msg.data});   
      } else if (msg.type === 'add') {
          // 添加弹幕信息
          barrageBox.add(msg.data);
      }
      
   }
}
// 监听视频播放
video.addEventListener('play', () => {
    barrageBox.isPaused = false;
    barrageBox.render();
})
// 监听视频暂停
video.addEventListener('pause', () => {
    barrageBox.isPaused = true;
})
// 发送弹幕
function send () {
    let value = $txt.value;
    let color = $color.value;
    let fontSize = $range.value;
    let time = video.currentTime;
    let obj = {value, color, fontSize, time};

    // 添加弹幕信息
    barrageBox.add(obj);
    
    $txt.value = '';
}

// 点击发送弹幕信息
$btn.addEventListener('click', send);

// 回车发送弹幕信息
$txt.addEventListener('keyup', (e) => {
    let key = e.keyCode;
    key === 13 && send();
})