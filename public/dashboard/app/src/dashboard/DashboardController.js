(function(){

    angular
        .module('dashboard')
        .controller('DashboardController', [
            'chartService', 'mapService', '$log', '$interval', '$http',
            DashboardController
        ]);

    /**
     * Main Controller for the Angular Material Starter App
     * @param $scope
     * @param $mdSidenav
     * @param avatarsService
     * @constructor
     */
    function DashboardController( chartService, mapService, $log, $interval, $http) {
        var self = this;
        self.droneList = [];
        // Set up universal
        $http.get("http://192.168.1.77:8080/api/drones").then (function(response){
            //console.log(response);

            for(var i = 0; i < response.data.length; i++){
                self.droneList.push(response.data[i].name);
            }


            mapService.setDrones(self.droneList);

            $interval(function() {
                mapService.updateMap();
            }, 1000);

        }, function (error) {
            //handle
            console.log(error);
            alert("Failed to connect");
        });

        // Set up graph
        self.labels = ['A', 'B', 'C'];
        self.series = ['Series 1', 'Series 2'];
        self.data = [
            [14, 89,32],
            [36, 99, 27]
        ];

        $interval(function() {
            self.data.concat(chartService.getData());
        }, 1000);


        // Set up map
        mapService.initMap();
        

        /**
         * Hide or Show the 'left' sideNav area
         */
        function toggleUsersList() {
            $mdSidenav('left').toggle();
        }

        /**
         * Select the current avatars
         * @param menuId
         */
        function selectUser ( user ) {
            self.selected = angular.isNumber(user) ? $scope.users[user] : user;
        }

        /**
         * Show the Contact view in the bottom sheet
         */
        function makeContact(selectedUser) {

            $mdBottomSheet.show({
                controllerAs  : "vm",
                templateUrl   : './src/users/view/contactSheet.html',
                controller    : [ '$mdBottomSheet', ContactSheetController],
                parent        : angular.element(document.getElementById('content'))
            }).then(function(clickedItem) {
                $log.debug( clickedItem.name + ' clicked!');
            });

            /**
             * User ContactSheet controller
             */
            function ContactSheetController( $mdBottomSheet ) {
                this.user = selectedUser;
                this.items = [
                    { name: 'Phone'       , icon: 'phone'       , icon_url: 'assets/svg/phone.svg'},
                    { name: 'Twitter'     , icon: 'twitter'     , icon_url: 'assets/svg/twitter.svg'},
                    { name: 'Google+'     , icon: 'google_plus' , icon_url: 'assets/svg/google_plus.svg'},
                    { name: 'Hangout'     , icon: 'hangouts'    , icon_url: 'assets/svg/hangouts.svg'}
                ];
                this.contactUser = function(action) {
                    // The actually contact process has not been implemented...
                    // so just hide the bottomSheet

                    $mdBottomSheet.hide(action);
                };
            }
        }

    }

})();
