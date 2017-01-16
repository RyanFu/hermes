var
  path = require('path'),
  Dep = require('../../api/dep/dep.model'),
  config = require('../../config/environment'),
  jfs = require('../jfs');

var
  folderName = config.root + config.staticPath + 'data',
  cdnPrefix = 'http://storage.jd.com/' + config.jfs.bucketName + '/';

exports.publish = function (depId) {
  return new Promise(function (resolve, reject) {
    var 
      filename = 'config_file_' + depId + '.conf',
      cdnUrl = cdnPrefix + filename;
    jfs.getBucket().uploadFile(path.join(folderName, filename), filename, function (err) {
        if (err)
            reject(err);
        else
            resolve({
                path: cdnUrl
            });
    });
  });
};
