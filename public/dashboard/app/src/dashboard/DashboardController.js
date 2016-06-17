(function(){

    angular
        .module('dashboard')
        .controller('DashboardController', [
            'mapService', 'liveChartService', 'audioService', '$scope', '$log', '$interval', '$http', '$mdDialog', '$websocket', '$mdSidenav',
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
    function DashboardController(mapService, liveChartService, audioService, $scope, $log, $interval, $http, $mdDialog, $websocket, $mdSidenav) {
        var self = this;

        if (window.location.host.indexOf('192') > -1){
            var protocol = "ws://"
        } else {
            protocol = "wss://"
        }

        self.username = "";

        // Set up universal settings
        self.dronesNameList = [];
        self.droneName = "";
        self.currentDroneStatus = {
            droneSettings : {}
        };
        self.dronesInformation = []; //  [{ connection:'', mode:'', status:{}  }]

        self.options = {
            availablePhotoResolutions: ['854x480', '1280x720', '1600x900', '1920x1080'],
            availablePhotoQualities : [25, 50, 75, 100],
            availableAudioFileTypes : ['mp3', 'wav'],
            availableAudioSamplingFrequencies : [16000, 22500, 32000, 44100]
        };

        // Helper function
        function getDroneIndex(droneName){
            for ( var i = 0; i < self.dronesInformation.length; i++){
                if(self.dronesInformation[i].name === droneName){
                    return i;
                }
            }
            return -1;
        }


        // Map settings
        self.maps = {
            fromDatabase : false
        };

        // List containers for various displays
        self.serviceFeedback = [];
        self.droneImageList = [];
        self.errorList = [];

        self.dataTypes = {
            temperature: true,
            airPurity: true,
            altitude: true,
            audioStream : false
        };

        // Initialise services
        mapService.initMap();
        mapService.setLoadingPositionsFromDatabase(self.maps.fromDatabase);
        liveChartService.initChart();
        audioService.initService();

        // Get user information
        $http.get("../../api/users").then(function(response){

            self.username = response.data.username;

            // Get drone information
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

                self.swapDrone(self.dronesNameList[0]);

                var dataStream = $websocket(protocol + window.location.host +'/api/updates/' + self.username);
                var got = {};
                dataStream.onMessage(function(message){
                    //console.log(JSON.stringify(JSON.parse(message.data)));
                    var incMessage = JSON.parse(message.data);
                    if(!got.hasOwnProperty(incMessage.event)){
                        console.log(incMessage.event);
                        got[incMessage.event]= true
                    }


                    if(incMessage.name === self.droneName){
                        // Is the currently focused drone
                        if(incMessage.event === 'image') {
                            self.random = incMessage.payload.time;
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
                                drone : self.droneName,
                                feedback : neaterLabels.slice(0, 5),
                                time : new Date(incMessage.time).toLocaleTimeString()
                            });
                        }
                        else if(incMessage.event === 'audioTranscript'){
                            self.serviceFeedback.unshift({
                                service: 'Speech To Text',
                                drone : self.droneName,
                                feedback : "Transcript: " + incMessage.payload.transcript,
                                confidence : "Confidence: " + incMessage.payload.confidence,
                                time : new Date(incMessage.time).toLocaleTimeString()
                            })
                        } else {
                            //console.log("Unknown type "  + incMessage.event)
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
                    } else if(incMessage.event === 'event'){
                        mapService.addEventMarker(incMessage.payload.text, incMessage.payload.location);
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
                        self.addError("Unclean websocket close. Refresh Page.");
                        $scope.$apply();
                    }
                })

            }, function (error) {
                //handle
                self.addError("Failed to get drone infomation");
                alert("Failed to get drone information - fairly fatal error");
            });

        }, function(error){
            self.addError("Failed to get user infomation");
            alert("Failed to get user information - fairly fatal error");
        });



        // Universal function
        self.addError = function(errorText){
            self.errorList.unshift({time: new Date().getTime(), text: errorText});
            //$scope.$apply();
        };

        self.swapDrone = function (droneName) {
            self.droneName = droneName;
            self.currentDroneStatus = self.dronesInformation[getDroneIndex(droneName)].status || {droneSettings : {}};
            self.currentDroneStatus.beingUpdated = [];


            if(self.currentDroneStatus.droneSettings === undefined){
                self.currentDroneStatus.droneSettings = {}
            }

            liveChartService.initChart();
            loadDroneImageList();
            self.random = new Date().getTime();
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

        self.toggleDroneNavPanel = function(){
            $mdSidenav('right').toggle();
        };

        self.deleteDrone = function(ev, droneName){
            var confirm = $mdDialog.confirm()
                .parent(angular.element(document.body))
                .clickOutsideToClose(true)
                .title('Are you sure you want to delete ' + droneName + '?')
                .cancel('No')
                .ok('Yes')
                .targetEvent(ev);
            $mdDialog.show(confirm).then(function(){
                $http.delete('../../api/drones/' + droneName).then(
                    function(){
                        self.dronesInformation.splice(getDroneIndex(droneName), 1);
                        self.dronesNameList.splice(self.dronesNameList.indexOf(droneName));
                        if(self.droneName === droneName){
                            self.swapDrone(self.dronesNameList[0])
                        }
                    }, function (error) {
                        console.log(error)
                    }
                );
            }, function(){})

        };

        self.showAddDroneDialog = function(ev){
            $mdDialog.show({
                controller: AddDroneController,
                templateUrl: '/dashboard/app/src/dashboard/view/addDroneDialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: false,
                fullscreen : true
            })
        };

        function AddDroneController($scope, $mdDialog, $http) {
            $scope.dronesInformation = self.dronesInformation;
            $scope.droneName = "";
            $scope.droneModel = "";

            $scope.acceptButton = "Add Drone";

            $scope.hide = function () {
                $mdDialog.hide();
            };
            $scope.cancel = function () {
                $mdDialog.cancel();
                self.toggleDroneNavPanel();
            };
            $scope.accept = function(){
                if ($scope.acceptButton === 'Add Drone'){
                    $scope.addNewDrone()
                } else {
                    $scope.cancel();
                }
            };
            $scope.addNewDrone = function () {
                var newDrone = {
                    name: $scope.droneName,
                    model: $scope.droneModel
                };
                $http.post('../../api/drones', newDrone).then(
                    function(response){
                        var MQTTDetails = response.data.MQTT;

                        $scope.org = MQTTDetails.org;
                        $scope.type = MQTTDetails.type;
                        $scope.deviceId = MQTTDetails.deviceId;
                        $scope.authToken = MQTTDetails["auth-token"];

                        $scope.SuccessMessage = "Drone successfully added! Make sure you note the MQTT details. These are needed for the drone to connect and are not reobtainable.";
                        $scope.acceptButton = "Accept";

                        self.dronesNameList.push($scope.droneName);
                        self.dronesInformation.push({
                            'name' : $scope.droneName,
                            'model' : $scope.droneModel,
                            'status' : {
                                'connection' : 'offline'
                            }
                        })


                    }, function(error){
                        console.log(error)
                    }
                );
            };
        }

        self.logout = function(){
            // Doesn't set the cookie in the browser?
            $http({
                url: '../../logout',
                method : 'GET',
                withCredentials: true
            }).then(function(response){
                window.location.replace('/');
            }, function(){
                self.addError("Unknown error whilst logging out");
            });
        };

        // Settings Card
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
        };

        self.sendContinue = function(){
            var command = {
                command : 'continue',
                args : []
            };
            $http.post('../../api/' + self.droneName + '/reset', {}).then(function(){}, function(){});
            $http.post('../../api/' + self.droneName + '/command/mav', command).then(function(response){}, function (error) {
                self.addError("Failed to send "+error+" command");
            });
        };

        self.sendHover = function(){
            self.currentDroneStatus.beingUpdated['hovering'] = true;
            var command = {
                command : 'hover',
                args : []
            };
            $http.post('../../api/' + self.droneName + '/command/mav', command).then(function(response){}, function (error) {
                delete self.currentDroneStatus.beingUpdated['hovering'];
                self.addError("Failed to send "+error+" command");
            });

        };

        self.clearMap = function(){
            mapService.clearMap();
        };

        self.changeDroneSetting = function(setting, value){
            self.currentDroneStatus.beingUpdated[setting] = true;
            if(value === undefined){
                var newValue = self.currentDroneStatus.droneSettings[setting];
            } else {
                newValue = value;
            }
            var command = {
                command : setting,
                args : [newValue]
            };
            $http.post('../../api/' + self.droneName + '/command/pi', command).then(function(response){}, function (error) {
                delete self.currentDroneStatus.beingUpdated[setting];
                self.addError("Failed to send "+error+" command");
            });
        };

        // Latest Media Card
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
                self.addError("Failed to load image list for " + self.droneName);
            });
        }

        self.selectDroneImage = function(time){
            self.legacyImage = time;
        };

        var audioStream;
        self.toggleAudioStream = function (){
            if(self.dataTypes.audioStream) {
                audioStream = $websocket(protocol + window.location.host +'/api/' + self.droneName + '/audio/stream/listen');

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

        // Map Card
        self.toggleMapsFromDatabase = function(){
            mapService.setLoadingPositionsFromDatabase(self.maps.fromDatabase);
        };


    }

})();
