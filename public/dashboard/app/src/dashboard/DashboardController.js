(function(){

    angular
        .module('dashboard')
        .controller('DashboardController', [
            'chartService', 'mapService', '$log', '$interval', '$http', '$mdDialog', '$websocket',
            DashboardController
        ]);

    /**
     * Main Controller for the Angular Material Starter App
     * @param $scope
     * @param $mdSidenav
     * @param avatarsService
     * @constructor
     */
    function DashboardController(chartService, mapService, $log, $interval, $http, $mdDialog, $websocket) {
        var self = this;

        // Set up universal
        self.dronesNameList = [];
        self.dronesInformation = [];



        self.droneName = "";
        self.currentDroneStatus = {};



        // Set up map
        mapService.initMap();


        $http.get("../../api/drones").then(function (response) {
            //console.log(response);

            if(response.data.length == 0){
                return;
            }

            for (var i = 0; i < response.data.length; i++) {
                self.dronesNameList.push(response.data[i].name);
                self.dronesInformation.push(response.data[i]);
            }

            mapService.setDrones(self.dronesNameList);
            self.swapDrone("pixhack");

            $interval(function () {
                mapService.updateMap();
            }, 1000);

            var dataStream = $websocket('ws://192.168.1.77:8080/api/updates/jake');
            
            dataStream.onMessage(function(message){
                console.log(JSON.stringify(JSON.parse(message.data)));
                var incMessage = JSON.parse(message.data);

                if(incMessage.name == self.droneName){
                    // Is the currently focused drone
                    self.random = new Date().getTime();
                }

            });

            dataStream.onError(function(error){
                console.log(error)
            });
            dataStream.onOpen(function(error){
                console.log("Connected")
            });
            dataStream.onClose(function(error){
                console.log(error)
            })

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


        $interval(function(){
            self.random = new Date().getTime();
        }, 10000);

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
            self.droneName = droneName;

            for(var i=0; i<self.dronesInformation.length;i++){
                if(self.dronesInformation[i].name == droneName){
                    self.currentDroneStatus = self.dronesInformation[i].status;
                }
            }
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
            $scope.dronesInformation = self.dronesInformation;
            
            $scope.tempDrone = "";
            $scope.setTmpDrone = function(name){
                //console.log(name);
                $scope.tempDrone = name;
            };

            $scope.hide = function () {
                $mdDialog.hide();
            };
            $scope.cancel = function () {
                $mdDialog.cancel();
            };
            $scope.confirmDroneSwap = function () {
                self.swapDrone($scope.tempDrone);
                $mdDialog.hide();
            };
        }
    }

})();
