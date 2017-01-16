var
    SDK = require('jfs-sdk-node'),
    config = require('../../config/environment'),
    path = require('path'),
    fs = require('fs');

var jfs = {};


jfs.app = SDK.init({
  endpoint: config.jfs.endpoint,
  credential: config.jfs.credential
});

jfs.getBucket = function () {
    return jfs.app.Objects(config.jfs.bucketName);
};

jfs.test = function (cb) {
    var testFile = path.join(__dirname, '.empty');
    fs.openSync(testFile, 'w');
    jfs.getBucket().uploadFile(testFile, '.empty', function (err) {
        if (err) cb(err);
        else cb(null);
        fs.unlinkSync(testFile);
    });
};

module.exports = jfs;