(function(){
    'use strict';

    angular.module('dashboard')
        .service('mapService', ['$http', MapService]);

    /**
     * Users DataService
     * Uses embedded, hard-coded data model; acts asynchronously to simulate
     * remote data service call(s).
     *
     * @returns {{loadAll: Function}}
     * @constructor
     */
    function MapService($http){
        var map;
        var markers = {};
        var lastQueried = {};
        var drones = [];
        // Promise-based API
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
            updateMap : function() {

                var getLatestDronePosition = function (droneName) {
                    var uri = "http://192.168.1.77:8080/api/" + droneName + "/gps/" + lastQueried[droneName];
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
                        }
                    });
                };

                for(var i = 0; i < drones.length; i++){
                    getLatestDronePosition(drones[i]);
                }



            }
        };
    }


})();
