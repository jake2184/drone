(function(){
    'use strict';

    angular.module('dashboard')
        .service('mapService', ['$http', '$interval', MapService]);

    /**
     * Users DataService
     * Uses embedded, hard-coded data model; acts asynchronously to simulate
     * remote data service call(s).
     *
     * @returns {{loadAll: Function}}
     * @constructor
     */
    function MapService($http, $interval){
        var map;
        var markers = {};
        var lastQueried = {};
        var drones = [];
        var loadingFromDatabase;


        function updateMap () {
            var getLatestDronePosition = function (droneName) {
                var uri = "../../api/" + droneName + "/gps/" + lastQueried[droneName];
                var thisQueryTime = new Date().getTime();
                $http.get(uri).then(function(response){
                    lastQueried[droneName] = thisQueryTime;
                    //console.log(response);

                    if(response.data.length == 0){
                        return;
                    }

                    var latestResponse = response.data[response.data.length - 1];
                    var latLng = {lat: latestResponse.latitude , lng: latestResponse.longitude};
                    if(markers.hasOwnProperty(droneName)){
                        markers[droneName].setPosition(latLng);
                    } else {
                        markers[droneName] = new google.maps.Marker({
                            position: latLng,
                            map: map,
                            title: droneName,
                            label: droneName,
                            visible: true
                        });

                        markers[droneName].addListener('click', function () {
                           map.setCenter(markers[droneName].getPosition());
                        });
                    }
                });
            };

            for(var i = 0; i < drones.length; i++){
                getLatestDronePosition(drones[i]);
            }
        }








        return {
            initMap : function(){
                map = new google.maps.Map(document.getElementById('map-canvas'), {
                    center: {lat: 51.498594, lng: -0.177027},
                    zoom: 12
                });
            },
            setDrones : function(droneList){
                drones = droneList;
                for(var i = 0; i < droneList.length; i++){
                    lastQueried[drones[i]] = 0;
                }
            },
            setLoadingPositionsFromDatabase(enabled){
                if(enabled){
                    if(angular.isDefined(loadingFromDatabase)){ return;}                    
                    loadingFromDatabase = $interval(function(){
                        updateMap();
                    }, 1000)
                } else {
                    if(angular.isDefined(loadingFromDatabase)){
                        $interval.cancel(loadingFromDatabase);
                        loadingFromDatabase = undefined;
                    }
                }
            },
            updateDronePosition(droneName, location){
                var latLng = {lat: location[0], lng: location[1]};
                if(markers.hasOwnProperty(droneName)){
                    markers[droneName].setPosition(latLng);
                } else {
                    markers[droneName] = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        title: droneName,
                        label: droneName,
                        visible: true
                    });
                }
            }
        };
    }


})();
