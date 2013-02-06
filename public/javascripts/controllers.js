var socket;

var GlobalCtrl = ['$scope', '$resource', '$location', '$window', '$routeParams', function($scope, $resource, $location, $window, $routeParams){
	$scope.resource = $resource;
	$scope.location = $location;
	$scope.window = $window;

	socket = io.connect('http://node.mediamagic.co.il:8080');
	
	socket.on('connect', function () {
		console.log('connected (' + new Date() + ')');
	});

	socket.on('disconnect', function () {
		console.log('disconnected');
	});

	socket.on('message', function (msg) {
		console.log('msg: ' + msg);
	});
}];

var MainCtrl = ['$scope', function($scope){

	var currentText = '';
	$scope.updateText = function(text)	{
		currentText = text;
	}

	$scope.send = function()	{
		socket.send(currentText);
	}

}];