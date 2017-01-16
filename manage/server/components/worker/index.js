var
  Page = require('../../api/page/page.model'),
  Dep = require('../../api/dep/dep.model'),
  generator = require('../generator'),
  publisher = require('../publisher');

var
  worker = {},
  promiseHub = {},
  readDepPromise,
  readPagePromise;

promiseHub.readDepPromise = function () {
  return new Promise(function (resolve, reject) {
    Dep.find()
    .populate('pages', '_id')
    .exec(function (err, deps) {
      if (err) reject(err);
      else resolve(deps);
    });
  });
};
promiseHub.readPagePromise = function () {
  return new Promise(function (resolve, reject) {
    Page.find({
      state: {
        $ne: 3
      }
    })
    .exec(function (err, pages) {
      if (err) reject(err);
      else resolve(pages);
    });
  });
};

worker.info = {
  nextTick: new Date(Date.now() + 10000)
};
worker.work = function () {
  var now = Date.now();
  Promise.all([
    promiseHub.readDepPromise(),
    promiseHub.readPagePromise()
  ]).then(function ([deps, pages]) {
    var
      _pageChangeMap = new Set(),
      _depNeedsFlush;

    // 更新pages的state
    Promise.all(
      pages.filter(function (v, k) {
        var _nstate;
        _nstate = [
          +new Date(v.startDate),
          +new Date(v.endDate)
        ].reduce(function (p, c) {
          return p + (now > c ? 1 : 0);
        }, 1);
        if (v.state !== _nstate) {
          v.state = _nstate;
          _pageChangeMap.add(v._id.id);
          return true;
        }
      }).map(function (v) {
        return new Promise(function (resolve, reject) {
          v.save(function (err, data) {
            if (err) reject(err);
            else resolve(data);
          });
        });
      })
    ).then(function (data) {
      deps.filter(function (v, k) {
        // 找出state变化后受影响的依赖关系
        return !!v.pages.some(function (v, k) {
          return _pageChangeMap.has(v._id.id);
        });
      }).forEach(function (v, k) {
        // 变化的依赖关系重新生成依赖文件并发布CDN
        generator.generate(v._id)
          .then(function (data) {
            if (data.dep.autoPublish)
              return publisher.publish(v._id);
          })
          .then(function () {
            v.save({
              lastPublishDate: new Date()
            });
          })
          .catch(function (err) {
            console.log(err);
          })
      });
    }).catch(function (err) {
      if (err) throw err;
    })
  }).catch(function () {
    console.dir(arguments);
  });
};

module.exports = worker;
