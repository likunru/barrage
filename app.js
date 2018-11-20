const WebSocket = require('ws');
const redis = require('redis');
const clientRedis = redis.createClient(); // 创建redis客户端
clientRedis.auth('Jon!Q@W#E'); // 
const ws = new WebSocket.Server({port: 5000}); // 创建ws服务

// 用来存储不同的socket实例，区分不同用户
let clients = [];

// 监听链接
ws.on('connection', socket => {
    clients.push(socket); // 把socket添加到数组

    // 通过redis客户端的lrange方法获取数据库中key为barrages的数据
    clientRedis.lrange('barrages', 0, -1, (err, data) => {
        // 由于redis存储key value类型，因此需要JSON.parse转成对象
        data = data.map(item => JSON.parse(item));

        // 发送客户端
        socket.send(JSON.stringify({
            type: 'init',
            data
        }))
    });
    // 监听客户端发来的消息
    socket.on('message', data => {
        // redis客户端通过rpush的方法把每个消息都添加到barrages表的最后面
        clientRedis.rpush('barrages', data);

        // 每个socket实例之间都可以发送弹幕，并显示在对方的画布上
        clients.forEach(sk => {
            sk.send(JSON.stringify({
                type: 'add',
                data: JSON.parse(data)
            }))
        })
    });
    // 当有socket实例断开与ws服务端的连接时
    socket.on('close', () => {
        clients = clients.filter(client => client !== socket);
    })
})