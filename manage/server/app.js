/**
 * Main application file
 */

'use strict';

// Set default node environment to development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
 
var express = require('express');
var mongoose = require('mongoose');
var config = require('./config/environment');

var
  fs = require('fs'),
  path = require('path'),
  jfs = require('./components/jfs');

// 测试jfs服务
jfs.test(function (err) {
  if (err) console.log('Failed to connect to storage.jd.com: ' + err.msg);
  else console.log('Successfully connected to storage.jd.com. ');
});

// Connect to database
mongoose.connect(config.mongo.uri, config.mongo.options);

// Populate DB with sample data
if(config.seedDB) { require('./config/seed'); }

// Setup server
var app = express();
var server = require('http').createServer(app);
var socketio = require('socket.io')(server, {
  serveClient: (config.env === 'production') ? false : true,
  path: '/socket.io-client'
});
require('./config/socketio')(socketio);
require('./config/express')(app);
require('./routes')(app);


var worker = require('./components/worker');
setInterval(function () {
  worker.work();
}, 3000);




// Start server
server.listen(config.port, config.ip, function () {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// Expose app
exports = module.exports = app;
