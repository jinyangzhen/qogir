'use strict';

angular.module('main', ['ngCookies', 'ngResource', 'ngSanitize', 'ngAnimate', 'ui.router', 'angular-cache', 'ui.bootstrap', 'ui.utils' ])
    .config(function ($stateProvider, $urlRouterProvider, $locationProvider) {

        var modulePath = 'scripts/modules/main';

        $locationProvider.html5Mode(true) // uncomment out to remove hash bang from url

        $urlRouterProvider.otherwise('/');

        $stateProvider.state('home', {
            url: '/',
            templateUrl: modulePath + '/views/main-view.html'
        })
            .state('home.login', {
                url: 'login',
                templateUrl: modulePath + '/views/login-view.html'
            })
            .state('home.ui-kit', {
                url: 'ui-kit',
                templateUrl: modulePath + '/views/ui-kit-view.html'
            }).state('home.icon-kit', {
                url: 'icon-kit',
                templateUrl: modulePath + '/views/icons-view.html'
            });

    })
    .run(function ($rootScope, $state, $stateParams) {
        //expose to root so that easy to access from view
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
    });
