'use strict';
angular.module('socketTest.controllers', ['ui']);
var GlobalCtrl = ['$scope', '$resource', '$location', '$window', '$routeParams', function($scope, $resource, $location, $window, $routeParams){
	$scope.resource = $resource;
	$scope.location = $location;
	$scope.window = $window;	

	$scope.userCollected = false;

	$scope.chat = {};
	$scope.chat.rooms = {};
	$scope.chat.inProcess = false;
	$scope.chat.invitedUser = {};
	$scope.chat.invitingUser = {};
	
	$scope.dialogs = {};

	$scope.loadSettings = function() {				
		$scope.Settings = $scope.resource('/resources/settings');	
		$scope.Banners = $scope.resource('/resources/banners');

		$scope.Banners.query({enabled:1}, function(res) {
			$scope.banners = res;		
		});

		$scope.Settings.query({}, function(res) {			
			$scope.settings = res[0];			
			fbInit($scope.settings.host, $scope.settings.facebook.appId, $scope.collectUser);			
		});	
	}

	$scope.flashSO = mmSO('socketTest', function(e) { 		
		$scope.loadSettings(); 
		$scope.flashSO = e;	
	});

	$scope.Users = $scope.resource('/resources/users');	

	$scope.user = {
		profilePicture:'http://profile.ak.fbcdn.net/hprofile-ak-ash4/c37.0.126.126/283270_257757160902107_690367_n.jpg'
	};
	
	$scope.socket = {};
	$scope.socket.log = [];		
	$scope.socket.users = [];	

	$scope.loadSocket = function() {
		
		$scope.socket.io = io.connect($scope.settings.host);
		
		$scope.socket.io.on('SEND_DATA', function (res, cb) { 	
			// console.log(res);
			// if(cb)
			// 	cb(res.data);
		});

		$scope.socket.io.on('connect', function () {
			$scope.socket.io.emit('USER_LOGIN', { user: $scope.user });			
		});

		$scope.socket.io.on('UPDATE_ONLINE_USERS_LIST', function (data) {			
			$scope.$apply(function() {	
				$scope.socket.users = data.users;		
			});			
		});

		$scope.socket.io.on('BANNER_CONNECTION_SOUND', function (data) {
			try{
				play_buffersource();
			}catch(e) { console.log(e);}
		});

		$scope.socket.io.on('disconnect', function () {
		 	console.log('disconnected');
		});

		$scope.socket.io.on('message', function (message) {
			$scope.$apply(function() {	
				$scope.socket.log.push('hi ' + $scope.user.facebook.username + ', ' + message);				  			
			});
			
		});	

		$scope.socket.io.on('UPDATE_SOCKET_LOG', function (data) { 
			$scope.log(data.message);
		});


		$scope.socket.io.on('UPDATE_BANNERS_STATUS', function (data) { 			
			$scope.$apply(function() {	
				$scope.socket.banners = data.banners;				
			});
		});

		$scope.socket.io.on('CLIENT_INVITE_TO_CHAT', function (data) {
			$scope.log('you are INVITED to chat by ' + data.user.name);	
			
			if(!$scope.chat.inProcess) {
				$scope.$apply(function() {	
					$scope.chat.inProcess = true;

					$scope.chat.invitingUser = data.user;				
					$scope.dialogs.chat.confirmation.shown = true;
					$scope.dialogs.message.shown = false;
				});
			} else {
				// tell the sender that this user is in chat process				
				$scope.socket.io.emit('SERVER_USER_IN_CHAT_PROCESS', { to: data.user, from:$scope.socket.users[$scope.user.facebook.id] });
			}
		});

		$scope.socket.io.on('CLIENT_USER_IN_CHAT_PROCESS', function (data) {			
			//$scope.$apply(function() {
				$scope.chat.inProcess = false;
				$scope.dialogs.chat.waitingConfirmation.shown = false;
				$scope.dialogs.message.text = data.user.name + ' is in a chat process right now, please try again later.';								
				$scope.dialogs.message.shown = true;
			//});			
		});

		$scope.socket.io.on('CLIENT_INVITE_TO_CHAT_CANCELED', function (data) {
			$scope.$apply(function() {	
				$scope.chat.inProcess = false;

				$scope.dialogs.chat.confirmation.shown = false;
				$scope.dialogs.message.text = data.user.name + ' canceled the chat request.';
				$scope.dialogs.message.shown = true;				
			});
		});

		$scope.socket.io.on('CLIENT_INVITE_TO_CHAT_CONFIRMATION', function (data) {			
			$scope.$apply(function() {
				$scope.chat.invitingUser = data.to;
				$scope.chat.invitedUser = data.from;
				$scope.dialogs.chat.waitingConfirmation.shown = false;
			});

			if(data.agree) {
				//TODO: commit chat between $scope.chat.invitingUser to $scope.chat.invitedUser
			} else {
				$scope.$apply(function() {		
					$scope.chat.inProcess = false;

				 	$scope.dialogs.message.text = data.from.name + ' refused to chat with you.';
				 	$scope.dialogs.message.shown = true;
				});
			}
		});
	}

	$scope.log = function(msg) {
		//$scope.$apply(function() {	
			$scope.socket.log.push(msg);
			setTimeout(function() { document.getElementById('socketLog').scrollTop = document.getElementById('socketLog').scrollHeight;	}, 100);
		//});
	}

	$scope.collectUser = function(user) {	
		if(!$scope.userCollected) {
			$scope.userCollected = true;
			
			$('#login').css('display', 'none');

			FB.api('/me', function(res) {			

				$scope.user.facebook = res;
				$scope.flashSO.fbUid = $scope.flashSO.read().fbUid;

				if($scope.flashSO.fbUid == undefined) {
					$scope.flashSO.write({ fbUid:$scope.user.facebook.id });	
					$scope.flashSO.fbUid = $scope.user.facebook.id;
				}			

				$scope.$apply(function() {	
					$scope.user.profilePicture = '//graph.facebook.com/' + $scope.user.facebook.id + '/picture/?type=large';
				});

				var updatedUser = {
					fbUid:$scope.user.facebook.id, 
					name:$scope.user.facebook.name, 
					firstName:$scope.user.facebook.first_name, 
					lastName:$scope.user.facebook.last_name, 
					email:$scope.user.facebook.email, 
					gender:$scope.user.facebook.gender
				}
				$scope.Users.save({}, { user:updatedUser }, function(resp){
					//console.log(resp);
				});
				
				$scope.loadSocket();			
			});	
		}	
	}

	var kSampleRate = 44100; // Other sample rates might not work depending on the your browser's AudioContext
	var kNumSamples = 4000;
	var kAmplitute  = 3000;
	var kPI_2       = Math.PI * 2;

	function play_buffersource() {
		if (!window.AudioContext)			
			window.AudioContext = window.webkitAudioContext;
		
	    var ctx = new AudioContext();

	    var buffer = ctx.createBuffer(1, kNumSamples, kSampleRate);
	    var buf    = buffer.getChannelData(0);
	    for (i = 0; i < kNumSamples; ++i) 
	        buf[i] = Math.sin(kAmplitute * kPI_2 * i / kSampleRate);

	    var node = ctx.createBufferSource(0);
	    node.buffer = buffer;
	    node.connect(ctx.destination);
	    node.noteOn(ctx.currentTime);
	    		
	    // node = ctx.createBufferSource(0);
	    // node.buffer = buffer;
	    // node.connect(ctx.destination);
	    // node.noteOn(ctx.currentTime + 2.0);
	}	
}];

var MainCtrl = ['$scope', function($scope){		

	// var currentText = '';
	// $scope.updateText = function(text)	{
	// 	currentText = text;
	// }

	// $scope.send = function()	{
	// 	socket.send(currentText);
	// 	// var settings = {
	// 	// 	host:'node.mediamagic.co.il:8080',
	// 	// 	facebook: {
	// 	// 		permissions: {
	// 	// 			publish_stream:1,
	// 	// 			email:1
	// 	// 		},
	// 	// 		appId:475148455866731
	// 	// 	}
	// 	// };

	// 	// $scope.Settings.save({}, settings, function(resp){
	// 	// 		console.log(resp);
	// 	// });
	// }

	// var banners = {
	// 	code:'GK7B3',
	// 	media: {},
	// 	enabled:1
	// };

	// $scope.Banners.save({}, banners, function(resp){
	// 	console.log(resp);
	// });
}];

var FacebookCtrl = ['$scope', function($scope){

	$scope.handleFbLogin = function(cb){		
		FB.getLoginStatus(function(res) {
			if(res.status != undefined) {
				var status = res.status;					
				$scope.fbLogin(cb);
			}
		});
	}

	$scope.checkPermissions = function(cb, user) {		
		FB.api('/me/permissions', function(response) {		
			var valid = true;
			for(var per in $scope.settings.facebook.permissions) {
				if(!response.data[0][per])
					valid = false;									
			}
			if(!valid) {
				$scope.fbLogin(cb);
			} else if(cb != null && cb != undefined) {
				cb(user);
			}
		});	
	}

	$scope.fbLogin = function(cb){
		var pers = [];
		for(var per in $scope.settings.facebook.permissions)
			pers.push(per);
		FB.login(function(res) {			
			if(res.status === 'connected')
			$scope.checkPermissions(cb, res.authResponse);
		},{scope:pers.join(',')});		
	}

}];
	
var ChatCtrl = ['$scope', function($scope){			
	
	$scope.dialogs.message = {};
	$scope.dialogs.message.text = '';
	$scope.dialogs.chat = {};
	$scope.dialogs.chat.confirmation = {};
	$scope.dialogs.chat.waitingConfirmation = {};

	$scope.dialogs.message.shown = false;
	$scope.dialogs.chat.confirmation.shown = false;
	$scope.dialogs.chat.waitingConfirmation.shown = false;

	$scope.inviteToChat = function(user) {		
		// if(user.socketId != $scope.socket.users[$scope.user.facebook.id].socketId)
		// {
		// 	$scope.log('inviting ' + user.name + ' to chat.');		
		// 	$scope.chat.inProcess = true;
		// 	$scope.chat.invitedUser = user;
		// 	$scope.dialogs.chat.waitingConfirmation.shown = true;				
		// 	$scope.socket.io.emit('SERVER_INVITE_TO_CHAT', { from:$scope.socket.users[$scope.user.facebook.id], to:user });		
		// }

		$scope.io.send({ text:'hello world' }, function(res) { 
			$scope.log('ITS BACK !!! :) ' + res);
		});

		// $scope.io.emit('TEST_REQUEST', { data:'hello world' }, function(res) { 
		// 	$scope.log('ITS BACK !!! :)');
		// });		
		//$scope.io.to('ME').send('TEST_REQUEST', { data:'' }, function(res) { $scope.log('ITS BACK !!! :)')});

		//sio.sockets.emit('UPDATE_BANNERS_STATUS', { banners:Banners.getBanners() });
		//sio.sockets.socket(data.to.socketId).emit('CLIENT_INVITE_TO_CHAT', { user:data.from});
	}

	$scope.io = { sendTo:null };

	$scope.io.send = function(data, cb) {
		var socketId = $scope.io.sendTo;	
		$scope.io.sendTo = null;

		if(socketId) {
			
		} else {						
			$scope.socket.io.emit('SEND_DATA', { data:data }, cb);
		}		
	}

	$scope.io.emit = function(event, data, cb) {
		var socketId = $scope.io.sendTo;	
		$scope.io.sendTo = null;

		if(socketId) {
			
		} else {
			$scope.socket.io.emit('EMIT_DATA', {event:event, cb:cb, data:data});
		}		
	}

	$scope.io.to = function(_socketId) {
		$scope.io.sendTo = _socketId;
		return $scope.io;
	}

	$scope.chatConfirmation = function(agree) {			
		if(!agree)		
			$scope.chat.inProcess = false;

		$scope.socket.io.emit('SERVER_INVITE_TO_CHAT_CONFIRMATION', { to:$scope.chat.invitingUser, from:$scope.socket.users[$scope.user.facebook.id], agree:agree }); 	
		$scope.dialogs.chat.confirmation.shown = false;
	}

	$scope.closeWaitingConfirmation = function() {	
		$scope.chat.inProcess = false;
		$scope.dialogs.chat.waitingConfirmation.shown = false;
		$scope.socket.io.emit('SERVER_INVITE_TO_CHAT_CANCELED', { from:$scope.socket.users[$scope.user.facebook.id], to:$scope.chat.invitedUser }); 
	};


	// $scope.$watch('dialogs.chat.waitingConfirmation.shown', function(newValue, oldValue) {		
	// 	if(newValue == oldValue)
	// 		return;

	// 	if(newValue) {// open

	// 	} else { // close			
	// 		//$scope.socket.io.emit('SERVER_INVITE_TO_CHAT_CANCELED', { from:$scope.socket.users[$scope.user.facebook.id], to:$scope.invitedUser }); 
	// 	}
	// });

}];