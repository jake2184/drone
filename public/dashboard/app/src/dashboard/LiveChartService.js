(function(){
	'use strict';

	angular.module('dashboard')
		.service('liveChartService', ['$http',  LiveChartService]);


	function LiveChartService($http){

		var chart = {};
		var data = [];
		var table;
		var view;
		var options;
		var maxSize = 50;
	
		//google.setOnLoadCallback(addToChart);

		function initChart(){
			options = {
				title: 'Live Data'
				// Multiple axis, actually looks horrible
				/*,
				series: {
					0 : {targetAxisIndex:0},
					1 : {targetAxisIndex:1},
					2 : {targetAxisIndex:2}
				}*/
			};
			chart = new google.visualization.LineChart(document.getElementById('chart-div'));
			table = new google.visualization.DataTable();

			table.addColumn('datetime', 'Timestamp');
			table.addColumn('number', 'Temperature (C\xB0)');
			table.addColumn('number', 'Air Purity');
			table.addColumn('number', 'Altitude (m)');

			view = new google.visualization.DataView(table);

			chart.draw(view, options);

		}

		function addSingleRow(newData) {
			var i = table.addRow();
			if ( i >= maxSize){
				table.removeRow(0);
				i--;
			}
			table.setCell(i, 0, new Date(newData.time));
			table.setCell(i, 1, newData.temperature);
			table.setCell(i, 2, newData.airPurity / 10);
			table.setCell(i, 3, newData.altitude);

			chart.draw(view, options);
		}

		function addToChart(data){}

		return {
			initChart : initChart,
			addToChart : addToChart,
			addSingleRow : addSingleRow
		}
	}

})();
/**
 * Created by Jake on 21/05/2016.
 */
