
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
    db = require('./models');
global.root = process.cwd()+'/';

var app = express();
var server = http.createServer(app);
sio = require('socket.io').listen(server);

var Settings = require('./controllers/settings');
var Banners = require('./controllers/banners');
var Users = require('./controllers/users');

Settings.init(db);
Banners.init(db);
Users.init(db);

app.configure(function(){
  app.set('port', process.env.PORT || 8080);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  //app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/views/:view.html', routes.views);

app.get('/resources/settings', Settings.index);
app.post('/resources/settings', Settings.create);

app.get('/resources/banners', Banners.index);
app.post('/resources/banners', Banners.create);

app.post('/resources/users', Users.create);

sio.configure(function () {
  //sio.set('heartbeat timeout', 60);
  sio.set('log_level', 10);
  sio.set('transports', [   
    'websocket'
  , 'flashsocket'  
  , 'xhr-polling'
  , 'htmlfile' 
  , 'jsonp-polling'
  ]);
});

var onlineUsers = {};

sio.sockets.on('connection', function (socket) {
  sio.sockets.emit('UPDATE_BANNERS_STATUS', { banners:Banners.getBanners() });

  socket.on('disconnect', function () {      
    // Remove User
    if(socket.username != undefined)
    {    
      delete onlineUsers[socket.user.facebook.id];    
      sio.sockets.emit('UPDATE_ONLINE_USERS_LIST', {users:onlineUsers});
      updateSocketLog('DISCONNECTED: ' +socket.username);
    } 
    
    // Remove Banner
    if(socket.banner) {
      Banners.remove(socket); 
      sio.sockets.emit('UPDATE_BANNERS_STATUS', { banners:Banners.getBanners() });
    }
  });

  socket.on('USER_LOGIN', function (data) {    
    socket.username = data.user.facebook.username;
    socket.user = data.user;
    onlineUsers[socket.user.facebook.id] = {socketId:socket.id, fbUid:socket.user.facebook.id, username:socket.username, name:socket.user.facebook.name, picture:'//graph.facebook.com/' + socket.user.facebook.id + '/picture'};
    sio.sockets.emit('UPDATE_ONLINE_USERS_LIST', {users:onlineUsers});
    updateSocketLog('USER_LOGIN: ' +socket.username);    
  });

  socket.on('BANNER_LOGIN', function (data) {     
    db.Users.findOne({ fbUid:data.fbUid }, function(err, doc) {
      sio.sockets.emit('BANNER_CONNECTION_SOUND', {});
      updateSocketLog('BANNER CONNECTION: ' + doc.name + ' from banner ' + data.banner + ' at ' + data.media);
      
      socket.banner = {
        code: data.banner,
        media: data.media
      };

      Banners.push(socket, function() {
        sio.sockets.emit('UPDATE_BANNERS_STATUS', { banners:Banners.getBanners() });
      });

      socket.emit('GET_USER', { name: doc.name})
    });
  });

  socket.on('message', function (msg) {  
    socket.broadcast.send(msg);
  });

  socket.on('SERVER_INVITE_TO_CHAT', function (data) {     
    sio.sockets.socket(data.to.socketId).emit('CLIENT_INVITE_TO_CHAT', { user:data.from});
  });

  socket.on('SERVER_INVITE_TO_CHAT_CANCELED', function (data) {     
    sio.sockets.socket(data.to.socketId).emit('CLIENT_INVITE_TO_CHAT_CANCELED', { user:data.from});
  });

  socket.on('SERVER_INVITE_TO_CHAT_CONFIRMATION', function (data) {         
    sio.sockets.socket(data.to.socketId).emit('CLIENT_INVITE_TO_CHAT_CONFIRMATION', { to:data.to, from:data.from, agree:data.agree});
  });

  socket.on('SERVER_USER_IN_CHAT_PROCESS', function (data) {    
    sio.sockets.socket(data.to.socketId).emit('CLIENT_USER_IN_CHAT_PROCESS', {user:data.from});
  });

  socket.on('SEND_DATA', function (req, cb) {    
    cb(req.data)    
    sio.sockets.emit('SEND_DATA', { data:req.data });
  });

  socket.send('welcome to our WebSocket server :)');   
});

var updateSocketLog = function(message) {
  sio.sockets.emit('UPDATE_SOCKET_LOG', { message: message });
}

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));  
});