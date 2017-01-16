'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var DepSchema = new Schema({
  uri: {
    type: String,
    unique: true,
    index: true,
    require: true
  },
  description: String,
  product: String,
  creator: { type: Schema.Types.ObjectId, ref: 'User' },
  createTime: Date,
  pages: [{ type: Schema.Types.ObjectId, ref: 'Page' }],
  jsonpConf: {
    enable: Boolean,
    callback: String
  },
  autoPublish: Boolean,
  lastModified: Date,
  lastPublished: Date
});

module.exports = mongoose.model('Dep', DepSchema);
