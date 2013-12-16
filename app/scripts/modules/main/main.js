'use strict';

angular.module('main', ['ngCookies', 'ngResource', 'ngSanitize', 'ngAnimate', 'ngRoute', 'angular-cache', 'ui.bootstrap', 'ui.utils' ])
    .config(function ($routeProvider) {

        var modulePath = 'scripts/modules/main';

        $routeProvider
            .when('/', {
                templateUrl: modulePath + '/views/main.html',
                controller: 'MainCtrl'
            })
            .when('/ui-kit', {
                templateUrl: modulePath + '/views/ui-kit-view.html',
                controller: 'MainCtrl'
            })
            .when('/icon-kit', {
                templateUrl: modulePath + '/views/icons-view.html',
                controller: 'MainCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    });
