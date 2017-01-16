var util = require('util');
exports.save = function (obj, data) {
  return new Promise(function (resolve, reject) {
    Object.assign(obj, data);
    obj.save(function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};
// Promisify
exports.promisify = function (func, ctx) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err) {
        var _args = Array.prototype.slice.call(arguments, 1);
        if (err) reject(err);
        else resolve(_args.length > 1 ? _args : _args[0]);
      })
      func.apply(ctx || null, args);
    });
  };
};

exports.inspect = function () {
  var args = Array.prototype.slice.call(arguments);
  console.log(util.inspect(args, {
    showHidden: true,
    depth: -1,
    color: true
  }));
};
