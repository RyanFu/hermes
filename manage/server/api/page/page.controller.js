'use strict';

var _ = require('lodash');
var Page = require('./page.model');
var Dep = require('../dep/dep.model.js');
var generator = require('../../components/generator');
var publisher = require('../../components/publisher');
var tools = require('../../components/tools');
var objectIdReg = /^[0-9a-fA-F]{24}$/;

// Get list of pages
exports.index = function(req, res) {
  var param = { };
  if (req.query.uriReg) {
    // 根据url模糊查找
    param.uri = new RegExp(decodeURIComponent(req.query.uriReg));
  }
  Page.find(param)
    .populate('creator')
    .sort({createTime: 'desc'})
    .exec(function (err, pages) {
      if(err) { return handleError(res, err); }
      return res.json(200, {
        no: 0,
        errmsg: '成功',
        data: pages
      });
    });
};

// Get a single page
exports.show = function(req, res) {
  var id = req.params.id;
  if (!id.match(objectIdReg)) {
    return res.send(200, {
      no: 10002,
      errmsg: '输入参数错误',
      data: []
    });
  }
  Page.findById(req.params.id).populate('creator').exec(function (err, page) {
    console.log(err);
    if(err) { return handleError(res, err); }
    if(!page) {
      return res.send(200, {
        no: 0,
        errmsg: '成功',
        data: []
      });
    }
    return res.json({
      no: 0,
      errmsg: '成功',
      data: [page]
    });
  });
};

// Creates a new page in the DB.
exports.create = function(req, res) {
  req.body.createTime = new Date();
  req.body.creator = req.user._id;
  Page.create(req.body, function(err, page) {
    page.resources.create(req.body.resources);
    if(err) { return handleError(res, err); }
    return res.json(201, page);
  });
};


var findPage = function () {

}

var findDepsHasPage = function (pageId) {
  return new Promise(function (resolve, reject) {
    Dep
      .find({
        'pages': pageId
      })
      .populate('pages')
      .exec(function (err, data) {
        if (err) reject(err);
        else resolve(data);
      });
  });
};

var save = function (data, obj) {
  return new Promise(function (resolve, reject) {
    Object.assign(obj, data);
    obj.save(function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

var save = function (obj, data) {
  return new Promise(function (resolve, reject) {
    Object.assign(obj, data);
    obj.save(function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};  

// Updates an existing page in the DB.
exports.update = function(req, res) {
  var body = req.body,
    now = Date.now();
  if(body._id) { delete body._id; }
  Page.findById(req.params.id, function  (err, page) {
    tools.save(page, {
      uri: body.uri,
      startDate: body.startDate,
      endDate: body.endDate,
      description: body.description,
      resources: body.resources,
      state: [
        +new Date(body.startDate),
        +new Date(body.endDate)
      ].reduce(function (p, c) {
        return p + (now > c ? 1 : 0);
      }, 1)
    })
    .then(findDepsHasPage.bind(null, req.params.id))
    .then(function (data) {
      return Promise.all(data.map(function (v, k) {
        return generator.generate(v._id)
          .then(function (data) {
            if (data.dep.autoPublish)
              return publisher.publish(v._id);
          });
      }));
    })
    .then(function (data) {
      res.json(200, page);
    })
    .catch(function (err) {
      res.json(500, page);
    });
  });
};


// exports.update = function(req, res) {
//   var body = req.body;
//   if(body._id) { delete body._id; }
//   Page.findById(req.params.id, function (err, page) {
//     var now = Date.now();
//     if (err) { return handleError(res, err); }
//     if(!page) { return res.send(404); }
//     page.uri = body.uri;
//     page.startDate = body.startDate;
//     page.endDate = body.endDate;
//     page.description = body.description;
//     page.resources = body.resources;
//     if (now < new Date(page.startDate))
//       page.state = 1;
//     else if (now > new Date(page.endDate))
//       page.state = 3;
//     else
//       page.state = 2;



//     page.save(function (err) {
//       if (err) return handleError(res, err);
//       return res.json(200, page);
//     });
//   });
// };

// Deletes a page from the DB.
exports.destroy = function(req, res) {
  Page.findById(req.params.id, function (err, page) {
    if(err) { return handleError(res, err); }
    if(!page) { return res.send(404); }
    page.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
