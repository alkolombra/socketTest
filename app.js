
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');
 // , db = require('./models');
global.root = process.cwd()+'/';

var app = express();
var server = http.createServer(app);
sio = require('socket.io').listen(server);

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

sio.sockets.on('connection', function (socket) {
  
  socket.on('handshake', function (data) {     
     socket.username = data.username;
     sio.sockets.emit('room_message', { message: '<font color="#00ff00"><b>' + socket.username + ' has just connected.</font></b>' }); 
  });

  socket.on('room_message', function (data) {          
     sio.sockets.emit('room_message', { message: '<b>' + socket.username + ':</b> ' + data.message }); 
  });

  socket.on('disconnect', function () {  
    console.log(socket.id + ' disconnected.');
    sio.sockets.emit('room_message', { message: '<font color="#cc3300"><b>' + socket.username + ' has just disconnected.</font></b>' }); 
  });

  socket.on('message', function (msg) {  
    socket.broadcast.send(msg);
  });

  socket.send('welcome to our WebSocket server :)');   
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));  
});