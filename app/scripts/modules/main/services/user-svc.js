/**
 * simply wrap service on top of XmppService
 */
angular.module('main').service('UserService', function (XmppService) {


    this.getCurrentUser = function (){
        if(XmppService.isConnected()){
            return XmppService.getUser();
        }

        return null;
    };

    this.logout = function (){
        XmppService.disconnect();
    };

});
