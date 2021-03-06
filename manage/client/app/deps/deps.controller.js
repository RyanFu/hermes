'use strict';

angular.module('manageApp')
  .controller('DepsCtrl', function ($rootScope, $scope, LxDialogService, LxNotificationService, Deps, Resources, ServiceHelper) {
    $rootScope.pageName = 'deps';
    $scope.deps = null;
    $scope.currentEdit = null;

    // 获取依赖列表
    function getDepsList () {
      Deps.get().$promise.then(function (data) {
        if (data.no === 0) {
          $scope.depsList = data.data;
          $scope.depsList.forEach(function (v, k) {
            v.publishBtnText = '发布文件';
            v.cdnUrl = 'http://storage.jd.com/confs/config_file_' + v._id + '.conf';
          });
        }
      });
    }

    $scope.edit = function (dep) {
      $scope.currentEdit = angular.copy(dep);
      $scope.currentEdit.existDeps = [];
      $scope.currentEdit.createDeps = [];
      $scope.currentEdit.showExist = true;
      $scope.currentEdit.showLoading = false;
      $scope.modifyType = 'edit';
      LxDialogService.open('editDepsDialog');
    };

    // $scope.generate = function (dep) {
    //   Deps.generate({
    //     id: dep._id
    //   }).$promise.then(function (data) {
    //     if (data.no === 0) {
    //       $scope.publishData = {
    //         id: dep._id,
    //         showLoading: false,
    //         publishBtnText: '发布CDN',
    //         fileUrl: data.data.path,
    //         fileName: data.data.fileName
    //       };
    //       LxDialogService.open('publishDialog');
    //     }
    //   });
    // };

    $scope.publish = function (dep) {
      dep.publishBtnText = '正在发布';
      Deps.publish({
        id: dep._id
      }).$promise.then(function (data) {
        if (data.no === 0) {
          dep.publishBtnText = '发布文件';
        }
        else {
          console.dir(data);
        }
      })
      // $scope.publishData.showLoading = true;
      // $scope.publishData.publishBtnText = '正在发布...';
      // Deps.publish({
      //   id: publishData.id,
      //   filename: publishData.fileName
      // }).$promise.then(function (data) {
      //   if (data.no === 0) {
      //     $scope.publishData.pubstate = true;
      //     $scope.publishData.showLoading = false;
      //     $scope.publishData.publishBtnText = '发布成功';
      //     $scope.publishData.cdnUrl = data.data.path;
      //   }
      //   else {
      //     console.dir(data);
      //   }
      // });
    };

    $scope.add = function () {
      $scope.currentEdit = {
        existDeps: [],
        createDeps: [],
        showExist: true,
        showLoading: false,
        autoPublish: true,
        jsonpConf: {
          enable: true,
          callback: ""
        }
      };
      $scope.modifyType = 'add';
      LxDialogService.open('editDepsDialog');
    };

    $scope.delete = function ($index) {
      ServiceHelper.confirm('确认要删除这一条配置么？', function (answer) {
        if (answer) {
          Deps.delete({
            id: $scope.depsList[$index]._id
          }).$promise.then(function () {
            LxNotificationService.success('删除成功');
            $scope.depsList.splice($index, 1);
          });
        }
      });
    };

    $scope.deleteCurrentOneDep = function ($index) {
      if ($.isArray($scope.currentEdit.pages)) {
        $scope.currentEdit.pages.splice($index, 1);
      }
    };

    $scope.addExistOne = function () {
      $scope.currentEdit.existDeps.push(null);
    };

    $scope.deleteExistOne = function ($index) {
      $scope.currentEdit.existDeps.splice($index, 1);
    };

    $scope.addCreateOne = function () {
      $scope.currentEdit.createDeps.push({
        uri: '',
        description: '',
        resources: []
      });
    };

    $scope.deleteCreateOne = function ($index) {
      $scope.currentEdit.createDeps.splice($index, 1);
    };

    $scope.saveEdit = function () {
      var editData = angular.copy($scope.currentEdit);
      delete editData.showExist;
      delete editData.showLoading;

      editData.existDeps = _.dropWhile(editData.existDeps, function (item) {
        return item === null;
      });
      editData.existDeps = _.dropRightWhile(editData.existDeps, function (item) {
        return item === null;
      });
      if (!$scope.uriValidation(editData.uri) || !$scope.emptyValidation(editData.description) || !$scope.functionNameValidation(editData.jsonpConf.callback)) {
        LxNotificationService.error('请输入正确！');
        return;
      }
      $scope.currentEdit.showLoading = true;
      
      if ($scope.modifyType === 'edit') {
        Deps.update(editData).$promise.then(function () {
          $scope.currentEdit.showLoading = false;
          LxDialogService.close('editDepsDialog');
          getDepsList();
        });
      } else if ($scope.modifyType === 'add') {
        Deps.save(editData).$promise.then(function () {
          $scope.currentEdit.showLoading = false;
          LxDialogService.close('editDepsDialog');
          getDepsList();
        });
      }
    };

    $scope.uriValidation = function (input) {
      return ServiceHelper.regRex.url.test(input);
    };

    $scope.emptyValidation = function (input) {
      return ServiceHelper.regRex.empty.test(input);
    };

    $scope.functionNameValidation = function (input) {
      return ServiceHelper.regRex.functionName.test(input);
    };

    getDepsList();

    $scope.fetchExistDeps = {
      selected: null,
      list: [],
      loading: false,
      update: function(newFilter) {
        if (newFilter) {
          $scope.fetchExistDeps.loading = true;
          Resources.get({
            uriReg: newFilter
          }).$promise.then(function (data) {
            if (data.no === 0) {
              $scope.fetchExistDeps.list = data.data;
            }
            $scope.fetchExistDeps.loading = false;
          }, function () {
            $scope.fetchExistDeps.loading = false;
          });
        }
      },
      toModel: function(data, callback) {
        if (data) {
          callback({
            uri: data.uri,
            _id: data._id,
            description: data.description,
            resources: data.resources
          });
        } else {
          callback();
        }
      },
      toSelection: function (data, callback) {
        if (data) callback(data);
        else callback();
      }
    };
  });