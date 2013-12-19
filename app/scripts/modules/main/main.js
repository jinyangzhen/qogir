'use strict';

angular.module('main', ['ngCookies', 'ngResource', 'ngSanitize', 'ngAnimate', 'ui.router', 'angular-cache', 'ui.bootstrap', 'ui.utils' ])
    .config(function ($stateProvider, $urlRouterProvider, $locationProvider, $compileProvider) {

        var modulePath = 'scripts/modules/main';

        //$locationProvider.html5Mode(true) // Android Webview (phonegap) seems to only work with hash bang format

        $urlRouterProvider.otherwise('/');

        $stateProvider.state('home', {
            url: '/',
            templateUrl: modulePath + '/views/main-view.html',
            controller: 'MainCtrl'
        })
            .state('home.ui-kit', {
                url: 'ui-kit',
                templateUrl: modulePath + '/views/ui-kit-view.html'
            }).state('home.icon-kit', {
                url: 'icon-kit',
                templateUrl: modulePath + '/views/icons-view.html'
            });

        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);
    })
    .run(function ($rootScope, $state, $stateParams) {
        //expose to root so that easy to access from view
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
    });
