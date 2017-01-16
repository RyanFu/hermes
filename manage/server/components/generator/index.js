var
  fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  Page = require('../../api/page/page.model'),
  Dep = require('../../api/dep/dep.model'),
  config = require('../../config/environment'),
  crypto = require('crypto');

var generate;

generate = function (depId) {
  return new Promise(function (resolve, reject) {
    Dep.findById(depId, '-creator -createTime -_id -__v')
      .sort({
        createTime: 'desc'
      })
      .populate({
        path: 'pages',
        // match: { $or: [{'enabled': true}, {'enabled': { $exists: true }}] },
        match: {
          state: {
            '$eq': 2
          }
        },
        select: '-uri -description -creator -createTime -_id -__v -resources.enabled -resources._id'
      }).exec(function (err, dep) {
        if (err) {
          return handleError(res, err);
        }
        var date = new Date();
        var now = date.getTime();
        var folderName = config.root + config.staticPath + 'data';
        var newFile = path.join(folderName, 'config_file_' + depId + '_' + now + '.conf');
        var defaultFile = path.join(folderName, 'config_file_' + depId + '.conf');
        var jsonpConf = dep.jsonpConf;
        var existPromise = function () {
          return new Promise(function (resolve, reject) {
            fs.exists(folderName, function (exists) {
              if (exists) {
                resolve();
              } else {
                reject();
              }
            });
          });
        };

        var mkdirPromise = function () {
          return new Promise(function (resolve, reject) {
            fs.mkdir(folderName, function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        };

        dep = dep.toObject();

        // 针对数据进行必要处理
        dep.resources = [];
        if (_.isArray(dep.pages) && dep.pages.length > 0) {
          dep.pages.forEach(function (page) {
            if (page.resources && page.enabled) {
              page.resources.forEach(function (resource) {
                dep.resources.push(resource);
              });
            }
          });
        }
        delete dep.pages;
        delete dep.jsonpConf;

        existPromise().then(function () {}, mkdirPromise).then(function () {
          var
            hash = crypto.createHash('sha256'),
            str;
          hash.update(JSON.stringify(dep));
          dep.version = hash.digest('hex');
          str = JSON.stringify(dep);
          if (jsonpConf.enable) {
            str = (jsonpConf.callback || 'jsonpCallbackHermes') + '(' + str + ');';
          }
          fs.writeFile(newFile, str, function (err) {
            if (err) {
              throw err;
            }
            fs
              .createReadStream(newFile)
              .pipe(fs.createWriteStream(defaultFile))
              .on('close', function () {
                resolve({
                  no: 0,
                  errmsg: '生成文件成功',
                  dep: dep,
                  data: {
                    fileName: 'config_file_' + depId + '.conf',
                    path: '/data/config_file_' + depId + '.conf'
                  }
                });
              })
          });
        });

      });
  });
};

exports.generate = generate;
