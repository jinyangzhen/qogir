/**
 * simply wrap service on top of local storage currently
 */
angular.module('main').service('PersistenceService', function () {

    /**
     *
     * @param key
     * @param value
     */
    this.setItem = function (key, value) {
        localStorage.setItem(key, value);
    };

    /**
     *
     * @param key
     * @returns {*}  undefined if the item is non exist
     */
    this.getItem = function (key) {
        var value = localStorage.getItem(key);
        return  value === 'undefined' ? undefined : value;  //chrome would return 'undefined' string for non-exist item.
    };

});