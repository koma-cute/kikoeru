const crypto = require('crypto');
const path = require('path');
const express = require('express'); // Web应用框架
const session = require('express-session'); // session
const memorystore = require('memorystore');

const routes = require('./routes');
const { router: authRoutes, authenticator } = require('./auth');
const { performScan } = require('../server/filesystem/scanner');

const app = express(); // 初始化 express 实例，创建一个应用
const http = require('http').Server(app); // websocket 握手需要依赖 http 服务
const io = require('socket.io')(http); // 初始化 socket.io 实例，socket.io 是一个 websocket 库
const MemoryStore = memorystore(session);

// For handling authentication POST
app.use(express.urlencoded({ extended: false }));

// Use session middleware
app.use(session({
  cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 过期时间为 1000 天
  resave: false, // 当客户端并行发送多个请求时，是否允许其中一个请求在另一个请求结束时对 session 进行修改覆盖并保存
  saveUninitialized: false, // 初始化 session 时是否保存到存储
  secret: process.env.SECRET || crypto.randomBytes(32).toString('hex'), // 一个 String 类型的字符串，作为服务器端生成 session 的签名
  store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
}));

// Use authenticator middleware
app.use(authenticator);

// Serve webapp routes
app.get(/^\/(player|work|circle|tag|va)s?\/(\d+)?$/, (req, res, next) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
});

// 添加路由
app.get('/scan', (req, res, next) => {
  res.sendFile(path.join(__dirname, '../../dist', 'index.html'));
});

// 加载静态文件
// Serve static files from 'dist' folder
//app.use(express.static('dist'));
app.use(express.static(path.join(__dirname, '../../dist'))); // 为了使 pkg 打包识别到 dist 目录

// If 404'd, serve from 'static' folder
//app.use('/static', express.static('static'));
app.use('/static', express.static(path.join(__dirname, '../../static'))); // 为了使 pkg 打包识别到 static 目录

// Expose API routes
app.use('/api', routes);

// Expose authentication route
app.use('/auth', authRoutes);

//监听 connection 事件来接收 sockets，并将连接信息打印到控制台
io.on('connection', function(socket){
  //console.log('a user connected');
 
  // disconnect 事件
  socket.on('disconnect', function(){
    //console.log('user disconnected');
  });

  // perform scan 事件
  socket.on('perform scan', function(msg){
    //console.log(msg);
    performScan(io);
  });
});


// Start server
http.listen(process.env.PORT || 8888, () => {
  console.log(`Express listening on http://localhost:${process.env.PORT || 8888}`);
});
