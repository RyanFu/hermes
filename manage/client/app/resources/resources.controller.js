'use strict';



angular.module('manageApp')
  .filter("dateFormater", function () {
    var padding = function (num, len) {
      var len = len || 2;
      return String(new Array(len+1).join('0') + num).substr(-2);
    };
    return function (input) {
      var
        date,
        num = Number(input);
      date = isNaN(num) ? new Date(input) : new Date(num);
      var 
        YYYY = date.getFullYear(),
        MM = padding(date.getMonth() + 1),
        DD = padding(date.getDate()),
        hh = padding(date.getHours()),
        mm = padding(date.getMinutes()),
        ss = padding(date.getSeconds());
      if (String(date) !== 'Invalid Date')
        return [YYYY, MM, DD].join('/') + ' ' + [hh, mm, ss].join(':');
      return 'Invalid Date';
    }
  })
  .controller('ResourcesCtrl', function ($rootScope, $scope, $routeParams, LxNotificationService, LxDialogService, Resources, ServiceHelper, $filter) {
    var id = $routeParams.id;
    $rootScope.pageName = 'resources';

    function getResourcesList () {
      Resources.get({
        id: id
      }).$promise.then(function (data) {
        if (data.no === 0) {
          $scope.resources = data.data;
        }
      });
    }

    $scope.add = function () {
      var
        date = new Date(),
        YYYY = date.getFullYear(),
        MM = date.getMonth()+1,
        DD = date.getDate(),
        start = new Date(YYYY + '/' + MM + '/' + DD + ' 00:00:00'),
        end = new Date(YYYY + '/' + MM + '/' + DD + ' 23:59:59'),
        startDate = $filter('dateFormater')(start),
        endDate = $filter('dateFormater')(end);

      $scope.currentEdit = {
        resources: [],
        newResources: [],
        showLoading: false,
        startDate: startDate,
        endDate: endDate,
        formattedStartDate: startDate,
        formattedEndDate: endDate
      };
      $scope.modifyType = 'add';
      LxDialogService.open('editResourcesDialog');
    };

    $scope.delete = function ($index) {
      ServiceHelper.confirm('确认要删除这一个页面么？', function (answer) {
        if (answer) {
          Resources.delete({
            id: $scope.resources[$index]._id
          }).$promise.then(function () {
            LxNotificationService.success('删除成功');
            $scope.resources.splice($index, 1);
          });
        }
      });
    };

    $scope.edit = function (page) {
      $scope.currentEdit = angular.copy(page);
      $scope.currentEdit.formattedStartDate = $filter('dateFormater')(
        $scope.currentEdit.startDate
      );
      $scope.currentEdit.formattedEndDate = $filter('dateFormater')(
        $scope.currentEdit.endDate
      );
      $scope.currentEdit.showLoading = false;
      $scope.currentEdit.newResources = [];
      $scope.modifyType = 'edit';
      LxDialogService.open('editResourcesDialog');
    };

    $scope.addOne = function () {
      $scope.currentEdit.newResources.push({
        uri: '',
        type: ''
      });
    };

    $scope.deleteOne = function ($index) {
      $scope.currentEdit.newResources.splice($index, 1);
    };

    $scope.deleteCurrentOne = function ($index) {
      $scope.currentEdit.resources.splice($index, 1);
    };

    $scope.saveEdit = function () {
      var editPage = angular.copy($scope.currentEdit);
      editPage.startDate = editPage.formattedStartDate;
      editPage.EndDate = editPage.formattedEndDate;

      delete editPage.modifyType;
      delete editPage.formattedStartDate;
      delete editPage.formattedEndDate;

      if (!$scope.uriValidation(editPage.uri) || !$scope.emptyValidation(editPage.description)) {
        LxNotificationService.error('请输入正确！');
        return;
      }
      if (!$scope.dateValidation(editPage.startDate) || !$scope.dateValidation(editPage.endDate) || new Date($scope.currentEdit.formattedEndDate) - new Date($scope.currentEdit.formattedStartDate) < 0) {
        LxNotificationService.error('开始结束时间错误！');
        return;
      }

      $scope.currentEdit.showLoading = true;
      if ($.isArray(editPage.newResources)) {
        editPage.resources = editPage.resources.concat(editPage.newResources);
      }
      delete editPage.newResources;
      if ($scope.modifyType === 'edit') {
        Resources.update(editPage).$promise.then(function () {
          $scope.currentEdit.showLoading = false;
          LxDialogService.close('editResourcesDialog');
          getResourcesList();
        });
      } else if ($scope.modifyType === 'add') {
        Resources.save(editPage).$promise.then(function () {
          $scope.currentEdit.showLoading = false;
          LxDialogService.close('editResourcesDialog');
          getResourcesList();
        });
      }
    };

    $scope.uriValidation = function (input) {
      return ServiceHelper.regRex.url.test(input);
    };

    $scope.emptyValidation = function (input) {
      return ServiceHelper.regRex.empty.test(input);
    };

    $scope.dateValidation = function (input) {
      return $filter('dateFormater')(input) !== 'Invalid Date';
    };

    getResourcesList();
  });
