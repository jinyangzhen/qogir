'use strict';

angular.module('qogirApp', [
        'ngCookies',
        'ngResource',
        'ngSanitize',
        'ngRoute'
    ])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html',
                controller: 'MainCtrl'
            })
            .when('/ui-kit', {
                templateUrl: 'views/ui-kit-view.html',
                controller: 'MainCtrl'
            })
            .when('/icon-kit', {
                templateUrl: 'views/icons-view.html',
                controller: 'MainCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    });
