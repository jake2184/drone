(function(){
	'use strict';

	angular.module('dashboard')
		.factory('chartService', ['$http',  ChartService]);

	/**
	 * Users DataService
	 * Uses embedded, hard-coded data model; acts asynchronously to simulate
	 * remote data service call(s).
	 *
	 * @returns {{loadAll: Function}}
	 * @constructor
	 */
	function ChartService($http){

		var IndexEnum = Object.freeze({
			"temperature" : 0,
			"airPurity" : 1,
			"altitude": 2
		});

		var chart = {};

		chart.labels = [];
		chart.series = [];
		chart.data = [];

		var store = {
			data : {}
		};

		var lastQueried = 0;
		var currentDrone = "";

		chart.initChart = function(){
			chart.labels = [0];
			chart.series = ['Temperature', 'Air Purity' , 'Altitude'];
			chart.data = [ [0], [0], [0] ];
		};

		chart.getData =  function() {
			var uri = "../../api/" + currentDrone + "/sensors/" + lastQueried;
			var thisQueryTime = new Date().getTime();
			$http.get(uri).then(function(response){
				//console.log(response);
				lastQueried = thisQueryTime;

				for(var i = 0; i < response.data.length; i++){
					var sensorReading = response.data[i];
					var push = false;

					if(sensorReading.hasOwnProperty("temperature")){
						push = true;
						chart.data[IndexEnum.temperature].push(sensorReading.temperature)
					}
					if(sensorReading.hasOwnProperty("airPurity")){
						push = true;
						chart.data[IndexEnum.airPurity].push(sensorReading.airPurity)
					}
					if(sensorReading.hasOwnProperty("altitude")){
						push = true;
						chart.data[IndexEnum.altitude].push(sensorReading.altitude)
					}
					if(push){
						var time = new Date(sensorReading.time);
						chart.labels.push(time.toUTCString().substr(4, time.toUTCString().length - 8));
					}
				}
			}, function(error){
				console.log(error);
			});
		};

		chart.setDrone = function(droneName){
			chart.initChart();
			currentDrone = droneName;
			chart.getData();
		};

		chart.toggleDataSeries = function(seriesName, enable){
			var index = IndexEnum[seriesName];
			if(enable){
				chart.data[index] = store.data[seriesName];
				store.data[seriesName] = [0];
			} else {
				store.data[seriesName] = chart.data[index];
				chart.data[index] = [0];
			}
		};

		return chart;
	}

})();
