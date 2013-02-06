
/*
 * GET home page.
 */

var fs = require('fs');

exports.index = function(req, res){
  res.render('layout', { title: 'Express' });
};

exports.views = function(req, res){
 var file = 'views/partials/'+req.params.view + '.jade';
 fs.exists(file, function(exists){
  exists ? res.render('partials/'+req.params.view) : res.send(404);
 });
}