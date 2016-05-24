(function(){

    angular
        .module('dashboard')
        .controller('DashboardController', [
            'mapService', 'liveChartService', 'audioService', '$log', '$interval', '$http', '$mdDialog', '$websocket', '$mdSidenav',
            DashboardController
        ]);

    /**
     * Main Controller for the Angular Material Starter App
     * @constructor
     * @param chartService
     * @param mapService
     * @param liveChartService
     * @param $log
     * @param $interval
     * @param $http
     * @param $mdDialog
     * @param $websocket
     */
    function DashboardController(mapService, liveChartService, audioService, $log, $interval, $http, $mdDialog, $websocket, $mdSidenav) {
        var self = this;


        // Set up universal
        self.dronesNameList = [];
        self.dronesInformation = []; //  [{ connection:'', mode:'', status:{}  }]
        

        function getDroneIndex(droneName){
            for ( var i = 0; i < self.dronesInformation.length; i++){
                if(self.dronesInformation[i].name === droneName){
                    return i;
                }
            }
            return -1;
        }

        self.droneName = "";
        self.currentDroneStatus = {
            droneSettings : {}
        };
        self.maps = {
            fromDatabase : false
        };
        
        self.serviceFeedback = [];
        self.droneImageList = [];

        self.errorList = [];

        // Set up map
        mapService.initMap();
        liveChartService.initChart();
        audioService.initService();



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

            mapService.setLoadingPositionsFromDatabase(self.maps.fromDatabase);
            


            var dataStream = $websocket('ws://192.168.1.77:8080/api/updates/jake');
            
            dataStream.onMessage(function(message){
                //console.log(JSON.stringify(JSON.parse(message.data)));
                var incMessage = JSON.parse(message.data);

                if(incMessage.name === self.droneName){
                    // Is the currently focused drone
                    if(incMessage.event === 'image') {
                        self.random = new Date().getTime();
                    }
                    else if(incMessage.event === 'sensors'){
                        //should update chart
                        liveChartService.addSingleRow(incMessage.payload);
                    }
                    else if(incMessage.event === 'imageLabels'){
                        var neaterLabels = [];

                        for(var i=0; i<incMessage.payload.length; i++){
                            neaterLabels.push({
                                name : incMessage.payload[i].name,
                                score : incMessage.payload[i].score
                            })
                        }

                        self.serviceFeedback.unshift({
                            service : "Image Recognition",
                            feedback : neaterLabels.slice(0, 5),
                            time : new Date(incMessage.time).toLocaleTimeString()
                        });
                    }
                    else if(incMessage.event === 'audioTranscript'){
                        self.serviceFeedback.unshift({
                            service: 'Speech To Text',
                            feedback : "Transcript: " + incMessage.payload.transcript,
                            confidence : "Confidence: " + incMessage.payload.confidence,
                            time : new Date(incMessage.time).toLocaleTimeString()
                        })
                    }
                }

                // do universally
                if(incMessage.event === 'status'){

                    self.dronesInformation[getDroneIndex(incMessage.name)].status = incMessage.payload;

                    // If focused drone, carefully update settings
                    if(incMessage.name === self.droneName){
                        var newSettings = incMessage.payload.droneSettings;
                        self.currentDroneStatus.connection = incMessage.payload.connection;
                        self.currentDroneStatus.mode = incMessage.payload.mode;

                        for(var setting in newSettings){
                            if(newSettings.hasOwnProperty(setting)) {
                                if(self.currentDroneStatus.beingUpdated.hasOwnProperty(setting)){
                                    if(self.currentDroneStatus.droneSettings[setting] == newSettings[setting]){
                                        delete self.currentDroneStatus.beingUpdated[setting];
                                    }
                                } else{
                                    self.currentDroneStatus.droneSettings[setting] = newSettings[setting];
                                }
                            }
                        }
                    }
                } else if(incMessage.event === 'sensors'){
                    mapService.updateDronePosition(incMessage.name, incMessage.payload.location);
                }

            });

            dataStream.onError(function(error){
                console.log(error)
            });
            dataStream.onOpen(function(error){
                console.log("Connected")
            });
            dataStream.onClose(function(error){
                if(!error.wasClean){
                    // Is executed but not showing up..?
                    console.log(error);
                    self.addError("Unclean websocket close. Refresh Page.")
                }
                console.log("Uncaught websocket error")
            })

        }, function (error) {
            //handle
            self.addError("Failed to get drone infomation");
            alert("Failed to get drone information - fairly fatal error");
        });

        function loadDroneImageList() {
            $http.get("../../api/" + self.droneName + "/images").then(function (response){
                //console.log(response);
                for( var i=0; i<response.data.length-1; i++){
                    var time = parseInt(response.data[i].id);
                    var string = new Date(time).toLocaleString();
                    self.droneImageList.unshift({time: time, asString: string})
                }
                self.selectDroneImage(self.droneImageList[0].time);
            }, function(error){
                self.addError("Failed to load image list");
            });
        }

        self.selectDroneImage = function(time){
            self.legacyImage = time;  
        };

        self.addError = function(errorText){
          self.errorList.unshift({time: new Date().getTime(), text: errorText});
        };

        self.dataTypes = {
            temperature: true,
            airPurity: true,
            altitude: true,
            audioStream : false
        };

        self.changeCaptureInterval = function(){

        };

        self.updatingDroneSetting = function(){
            for(var key in self.currentDroneStatus.beingUpdated) {
                if (self.currentDroneStatus.beingUpdated.hasOwnProperty(key)) {
                    return true;
                }
            }
            return false;            
        };

        self.cancelDroneSettingUpdates = function(){
          self.currentDroneStatus.beingUpdated = {};
        };

        self.changeInterval = function(setting, action){
            if(action === 'edit'){
                self.currentDroneStatus.beingUpdated[setting] = true;
            } else if (action === 'save'){
                var newValue = self.currentDroneStatus.droneSettings[setting];
                var command = {
                    command : setting,
                    args : [newValue]
                };
                $http.post('../../api/' + self.droneName + '/command/pi', command).then(function(response){}, function (error) {
                    delete self.currentDroneStatus.beingUpdated[setting];
                    self.addError("Failed to send new command");
                });
            }
            
            
            // if(self.currentDroneStatus.beingUpdated[setting] === undefined){
            //     console.log("Preparing to update");
            //     self.currentDroneStatus.beingUpdated[setting] = true;
            // } else {
            //     var newValue = self.currentDroneStatus.droneSettings[setting];
            //     var command = {
            //         command : setting,
            //         args : [newValue]
            //     };
            //     console.log(command.args);
            //     $http.post('../../api/' + self.droneName + '/command/pi', command).then(function(response){}, function (error) {
            //         delete self.currentDroneStatus.beingUpdated[setting];
            //         self.addError("Failed to send new command");
            //     });
            // }

        };

        self.changeDroneSetting = function(setting){
            self.currentDroneStatus.beingUpdated[setting] = true;
            var newValue = self.currentDroneStatus.droneSettings[setting];
            var command = {
                command : setting,
                args : [newValue]
            };
            $http.post('../../api/' + self.droneName + '/command/pi', command).then(function(response){}, function (error) {
                delete self.currentDroneStatus.beingUpdated[setting];
                self.addError("Failed to send new command");
            });
        };

        self.showChangeDrone = function (event) {
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

        self.swapDrone = function (droneName) {
            self.droneName = droneName;
            self.currentDroneStatus = self.dronesInformation[getDroneIndex(droneName)].status || {};
            self.currentDroneStatus.beingUpdated = [];
            //chartService.setDrone(droneName);
            liveChartService.initChart();
            loadDroneImageList();
            self.random = new Date().getTime();
        };

        var audioStream;
        self.toggleAudioStream = function (){
            if(self.dataTypes.audioStream) {
                audioStream = $websocket('ws://192.168.1.77:8080/api/' + self.droneName + '/audio/stream/listen');

                audioStream.onMessage(function (message) {
                    console.log("Got data");
                    console.log(message.data);

                    var arrayBuffer;
                    var fileReader = new FileReader();
                    fileReader.onload = function() {
                        arrayBuffer = this.result;
                        var buff = new Int16Array(arrayBuffer);
                        audioService.playByteArray(buff);
                        console.log("Buffer afer raed:" + buff)
                    };
                    fileReader.readAsArrayBuffer(message.data);

                });

                audioStream.onOpen(function () {
                    console.log("Listening..")
                });

                audioStream.onClose(function () {
                    // Check if unclean and throw error
                    console.log("Stopped Listening")
                })
            } else {
                audioStream.close();
            }
        };

        //window.onload = init;
        //var context;    // Audio context

        // function init() {
        //     if (!window.AudioContext) {
        //         if (!window.webkitAudioContext) {
        //             alert("Your browser does not support any AudioContext and cannot play back audio.");
        //             return;
        //         }
        //         window.AudioContext = window.webkitAudioContext;
        //     }
        //     context = new AudioContext();
        // }
        //
        // function playByteArray(byteArray) {
        //     // Input is Int16Array
        //
        //     var myAudioBuffer = context.createBuffer(1, 8192, 44100);
        //     var nowBuffering = myAudioBuffer.getChannelData(0);
        //     for(var i = 0 ; i < 8192; i++){
        //         nowBuffering[i] = byteArray[i] / Math.pow(2,15);
        //     }
        //     var source = context.createBufferSource();
        //     source.buffer = myAudioBuffer;
        //     source.connect(context.destination);
        //     source.start();
        //
        //
        // }

        self.toggleDroneNavPanel = function(){
            $mdSidenav('right').toggle();
        };

        /**
         * Hide or Show the 'left' sideNav area
         */
        self.toggleUsersList = function toggleUsersList() {
            $mdSidenav('left').toggle();
        };

        self.toggleMapsFromDatabase = function(){
            
            mapService.setLoadingPositionsFromDatabase(self.maps.fromDatabase);

        };

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
