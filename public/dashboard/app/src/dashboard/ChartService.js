(function(){
  'use strict';

  angular.module('dashboard')
         .service('chartService', ['$http', ChartService]);

  /**
   * Users DataService
   * Uses embedded, hard-coded data model; acts asynchronously to simulate
   * remote data service call(s).
   *
   * @returns {{loadAll: Function}}
   * @constructor
   */
  function ChartService($http){
    return {
      getData: function() {
		  return [
			[3, 1, 6],
			[49, 18, 32]
		  ];
	  }
    };
  }

})();
