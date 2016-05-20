(function(){

    angular
        .module('dashboard')
        .controller('DashboardController', [
            'chartService', 'mapService', '$log', '$interval', '$http', '$mdDialog',
            DashboardController
        ]);

    /**
     * Main Controller for the Angular Material Starter App
     * @param $scope
     * @param $mdSidenav
     * @param avatarsService
     * @constructor
     */
    function DashboardController(chartService, mapService, $log, $interval, $http, $mdDialog) {
        var self = this;

        // Set up universal
        self.droneList = [];


        // Set up map
        mapService.initMap();


        $http.get("../../api/drones").then(function (response) {
            //console.log(response);

            for (var i = 0; i < response.data.length; i++) {
                self.droneList.push(response.data[i].name);
            }

            mapService.setDrones(self.droneList);
            chartService.setDrone("pixhack");

            $interval(function () {
                mapService.updateMap();
            }, 1000);

        }, function (error) {
            //handle
            console.log(error);
            alert("Failed to connect");
        });

        // Set up chart
        chartService.initChart();
        self.labels = chartService.labels;
        self.series = chartService.series;
        self.data = chartService.data;

        self.dataTypes = {
            temperature: true,
            airPurity: true,
            altitude: true
        };


        $interval(function () {
            chartService.getData();
            // This shouldn't need doing
            self.labels = chartService.labels;
            self.series = chartService.series;
            self.data = chartService.data;
        }, 1000);

        self.showChangeDrone = function showChangeDrone(event) {
            $mdDialog.show({
                    controller: DialogController,
                    templateUrl: 'src/dashboard/view/tabDialog.tmpl.html',
                    parent: angular.element(document.body),
                    targetEvent: event,
                    clickOutsideToClose: true
                })
                .then(function (answer) {
                    //$scope.status = 'You said the information was "' + answer + '".';
                }, function () {
                    //$scope.status = 'You cancelled the dialog.';
                });
        };

        self.swapDrone = function swapDrone(droneName) {
            chartService.setDrone(droneName)
        };

        self.updateTypes = function updateTypes(seriesName) {
            chartService.toggleDataSeries(seriesName, self.dataTypes[seriesName]);
        };

        /**
         * Hide or Show the 'left' sideNav area
         */
        self.toggleUsersList = function toggleUsersList() {
            $mdSidenav('left').toggle();
        }

        /**
         * Select the current avatars
         * @param menuId
         */
        function selectUser(user) {
            self.selected = angular.isNumber(user) ? $scope.users[user] : user;
        }

        /**
         * Show the Contact view in the bottom sheet
         */
        function makeContact(selectedUser) {

            $mdBottomSheet.show({
                controllerAs: "vm",
                templateUrl: './src/users/view/contactSheet.html',
                controller: ['$mdBottomSheet', ContactSheetController],
                parent: angular.element(document.getElementById('content'))
            }).then(function (clickedItem) {
                $log.debug(clickedItem.name + ' clicked!');
            });

            /**
             * User ContactSheet controller
             */
            function ContactSheetController($mdBottomSheet) {
                this.user = selectedUser;
                this.items = [
                    {name: 'Phone', icon: 'phone', icon_url: 'assets/svg/phone.svg'},
                    {name: 'Twitter', icon: 'twitter', icon_url: 'assets/svg/twitter.svg'},
                    {name: 'Google+', icon: 'google_plus', icon_url: 'assets/svg/google_plus.svg'},
                    {name: 'Hangout', icon: 'hangouts', icon_url: 'assets/svg/hangouts.svg'}
                ];
                this.contactUser = function (action) {
                    // The actually contact process has not been implemented...
                    // so just hide the bottomSheet

                    $mdBottomSheet.hide(action);
                };
            }
        }


        function DialogController($scope, $mdDialog) {
            $scope.hide = function () {
                $mdDialog.hide();
            };
            $scope.cancel = function () {
                $mdDialog.cancel();
            };
            $scope.swapDrone = function (answer) {
                console.log(answer)
                $mdDialog.hide(answer);
            };
        };
    }

})();
