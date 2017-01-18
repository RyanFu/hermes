'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var Dep = require('./dep.model');
var Page = require('../page/page.model');
var UserController = require('../user/user.controller');
var config = require('../../config/environment');
var jfs = require('../../components/jfs');
var generator = require('../../components/generator');
var publisher = require('../../components/publisher');
var tools = require('../../components/tools');

// Get list of deps
exports.index = function(req, res) {
  var user = req.session.user;
  if (!user) {
    res.json(404, {
      errmsg: '尚未登录'
    })
  }
  var searchParam = {};
  if (user.role === 'user') {
    searchParam.creator = user._id;
  }
  Dep.find(searchParam)
    .populate('creator')
    .populate('pages')
    .sort({createTime: 'desc'})
    .exec(function (err, deps) {
      if(err) { return handleError(res, err); }
      return res.json(200, {
        no: 0,
        errmsg: '成功',
        data: deps
      });
    });
};

// Get a single dep
exports.show = function(req, res) {
  Dep.findById(req.params.id).populate('pages').exec(function (err, dep) {
    if(err) { return handleError(res, err); }
    if(!dep) { return res.send(404); }
    return res.json(dep);
  });
};

var createOneDep = function (param) {
  return new Promise(function (resolve, reject) {
    Dep.create(param, function (err, dep) {
      if(err) reject(err);
      else resolve(dep);
    });
  });
};


// Creates a new dep in the DB.
  // exports.create = function(req, res) {
  //   var body = req.body;
  //   var existDeps = req.body.existDeps; // 已经存在的
  //   var createDeps = req.body.createDeps; // 需要新创建
  //   var jsonpConf = body.jsonpConf || { enable: true };
  //   var user = req.user;
  //   var depParam = {
  //     uri: body.uri,
  //     description: body.description,
  //     creator: user._id,
  //     createTime: new Date(),
  //     jsonpConf: body.jsonpConf
  //   };
  //   if (!_.isArray(existDeps) && !_.isArray(createDeps)) {
  //     return res.json(200, {
  //       no: 10000,
  //       errmsg: '输入参数错误'
  //     });

  //   }
  //   // 需要创建新的依赖关系
  //   if (_.isArray(createDeps) && createDeps.length > 0) {
  //     createDeps.forEach(function (item) {
  //       item.creator = user._id;
  //       item.createTime = new Date();
  //     });
  //     Page.collection.insert(createDeps, function (err, pages) {
  //       if(err) {
  //         if (err.code === 11000) {
  //           return res.json(200, {
  //             no: 10001,
  //             errmsg: '所依赖的页面已经存在'
  //           });
  //         }
  //         return handleError(res, err);
  //       }
  //       var pagesIds = _.pluck(pages, '_id');
  //       if (_.isArray(existDeps) && existDeps.length > 0) {
  //         existDeps = _.pluck(existDeps, '_id');
  //         depParam.pages = pagesIds.concat(existDeps);
  //       } else {
  //         depParam.pages = pagesIds;
  //       }
  //       createOneDepByParam(depParam, res);
  //     });
  //   } else {
  //     if (_.isArray(existDeps) && existDeps.length > 0) {
  //       existDeps = _.pluck(existDeps, '_id');
  //     }
  //     depParam.pages = existDeps;
  //     createOneDepByParam(depParam, res);
  //   }
  // };

exports.create = function(req, res) {
  var
    body = req.body,
    existDeps = req.body.existDeps, // 已经存在的
    createDeps = req.body.createDeps, // 需要新创建
    jsonpConf = body.jsonpConf || { enable: true },
    user = req.user,
    depParam = {
      uri: body.uri,
      description: body.description,
      creator: user._id,
      createTime: new Date(),
      autoPublish: body.autoPublish,
      jsonpConf: body.jsonpConf
    }, dep;
  if (!_.isArray(existDeps) && !_.isArray(createDeps)) {
    return res.json(200, {
      no: 10000,
      errmsg: '输入参数错误'
    });

  }
  if (_.isArray(createDeps) && createDeps.length > 0) { // 有需要创建的活动内容
    createDeps.forEach(function (item) {
      item.creator = user._id;
      item.createTime = new Date();
    });
    Page.collection.insert(createDeps, function (err, pages) {
      if(err) {
        if (err.code === 11000) {
          return res.json(200, {
            no: 10001,
            errmsg: '所依赖的页面已经存在'
          });
        }
        return handleError(res, err);
      }
      var
        pagesIds = _.pluck(pages, '_id');

      if (_.isArray(existDeps) && existDeps.length > 0) {
        existDeps = _.pluck(existDeps, '_id');
        depParam.pages = pagesIds.concat(existDeps);
      } else {
        depParam.pages = pagesIds;
      }
      createOneDep(depParam)
        .then(function (data) { // 生成
          dep = data;
          return generator.generate(dep._id);
        })
        .then(function (data) { // 发布
          return publisher.publish(dep._id);
        })
        .then(function () { // 回包
          res.json(201, {
            no: 0,
            errmsg: '成功',
            data: dep
          });
        })
        .catch(function (err) {
          res.json(200, {
            no: 10002,
            errmsg: '要添加的页面已经存在了'
          });
        });
    });
  } else { // 需要创建的活动内容
    if (_.isArray(existDeps) && existDeps.length > 0) {
      existDeps = _.pluck(existDeps, '_id');
    }
    depParam.pages = existDeps;
    createOneDep(depParam)
      .then(function (data) { // 生成
        dep = data;
        return generator.generate(dep._id);
      })
      .then(function (data) { // 发布
        return publisher.publish(dep._id);
      })
      .then(function () { // 回包
        res.json(201, {
          no: 0,
          errmsg: '成功',
          data: dep
        });
      })
      .catch(function (err) {
        res.json(200, {
          no: 10002,
          errmsg: '要添加的页面已经存在了'
        });
      });
  }
};

var createPages = function (createDeps, user) {
  return new Promise(function (resolve, reject) {
    if (_.isArray(createDeps) && createDeps.length) {
      createDeps.map(function (v) {
        v.creator = user._id;
        v.createTime = new Date();
        return v;
      });
      Page.collection.insert(createDeps, function (err, pages) {
        if (err && err.code === 11000)
          return reject({
            no: 10001,
            errmsg: '所依赖的页面已经存在'
          });
        resolve(pages)
      });
    }
    else
      resolve();
  });
};

var generateDep = function (req) {
  return new Promise(function (resolve, reject) {
    var
      body = req.body,
      user = req.user,
      createDeps = body.createDeps,
      autoPublish = body.autoPublish,
      depPages = body.pages.map(function (v) {
        return v._id;
      }),
      existDeps = body.existDeps,
      jsonpConf = body.jsonpConf || { enable: true };
    createPages(createDeps, user)
      .then(function (createdPages) {
        var
          createData = [],
          existData = [];
        if (_.isArray(createdPages) && createdPages.length) {
          createData = createdPages.map(function (v) { return v._id; });
        }
        if (_.isArray(existDeps) && existDeps.length) {
          existData = existDeps.map(function (v) { return v._id; });
        }
        resolve({
          uri: req.body.uri,
          description: req.body.description,
          pages: depPages.concat(createData, existData),
          jsonpConf: jsonpConf,
          autoPublish: autoPublish
        });
      });
  });
};


exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Dep.findById(req.params.id, function (err, dep) {
    if (err) { return handleError(res, err); }
    if(!dep) { return res.send(404); }

    generateDep(req)
      .then(tools.save.bind(null, dep))
      .then(function () { // 重新生成
        return generator.generate(dep._id);
      })
      .then(function (data) { // 自动发布
        if (data.dep.autoPublish)
          return publisher.publish(dep._id);
      })
      .then(function () { // 回包
        res.json(200, {
          no: 0,
          errmsg: '成功',
          data: dep
        });
      })
      .catch(function (err) {
        res.json(500, Object.assign({
          no: 1,
          errmsg: '失败'
        }, err));
      });
  });
};

// Deletes a dep from the DB.
exports.destroy = function(req, res) {
  Dep.findById(req.params.id, function (err, dep) {
    if(err) { return handleError(res, err); }
    if(!dep) { return res.send(404); }
    dep.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

// 读取数据，生成配置文件
// exports.generate = function (req, res) {
//   var depId = req.params.id;
//   generator.generate(depId).then(function (data) {
//     res.json(200, data);
//   }).catch(function (err) {
//     res.json(500, err);
//   });
// };

// 发布到CDN
exports.publish = function (req, res) {
  var depId = req.params.id;
  generator.generate(depId)
  .then(publisher.publish.bind(null, depId))
  .then(function (data) {
    res.json(200, {
      no: 0,
      errmsg: '发布文件成功',
      data: data
    });
  }).catch(function (err) {
    res.json(500, {
      no: 1,
      errmsg: '发布文件失败',
      data: err
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}

function createOneDepByParam (param, res) {
  Dep.create(param, function (err, dep) {
    if(err) {
      if (err.code === 11000) {
        return res.json(200, {
          no: 10002,
          errmsg: '要添加的页面已经存在了'
        });
      }
      return handleError(res, err);
    }
    return res.json(201, {no: 0, errmsg: '成功', data: dep});
  });
}
