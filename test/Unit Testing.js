
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var server = require('../app.js');
var dc = require('../lib/drone_interpret_and_control/DroneCoordinator.js');

describe('Unit Testing', function(){
    var url = 'http://localhost:8080';
    //var url = 'http://drone-nodes.eu-gb.mybluemix.net';

    describe("DroneCoordinator", function (){

        var mqttHandler = {
            sendCommand : sinon.spy(),
            sendEvent : sinon.spy()
        };

        var cloudant = {
            db :{
                insert : sinon.stub(),
                use: function(logName){
                    return {
                        insert: this.insert
                    }
                }
            }
        };

        var sendUpdates = sinon.spy();
        var droneName = "testDrone";
        var DroneCoordinator = new dc(mqttHandler, cloudant, sendUpdates );


        beforeEach(function(done){
            DroneCoordinator.reset(droneName);
            mqttHandler.sendCommand.reset();
            mqttHandler.sendEvent.reset();
            cloudant.db.insert.reset();
            sendUpdates.reset();
            done();
        });

        it('should initialise in normal mode and be able to change mode', function(done) {
            assert.equal(DroneCoordinator.getModeName(droneName), "Normal");
            DroneCoordinator.setMode(droneName, "Fire");
            assert.equal(DroneCoordinator.getModeName(droneName), "Fire");
            DroneCoordinator.setMode(droneName, "Interact");
            assert.equal(DroneCoordinator.getModeName(droneName), "Interact");
            DroneCoordinator.setMode(droneName, "Avoidance");
            assert.equal(DroneCoordinator.getModeName(droneName), "Avoidance");

            DroneCoordinator.setMode(droneName, "Normal");
            assert.equal(DroneCoordinator.getModeName(droneName), "Normal");
            done();
        });

        it('should reset handler when asked', function(done){
            DroneCoordinator.setMode(droneName, "Fire");
            DroneCoordinator.reset(droneName);
            assert(DroneCoordinator.getModeName(droneName, "Normal"), "Cannot reset correctly");
            done();
        });

        it('should insert sensor readings to database', function(done){
            cloudant.db.insert.reset();
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 40,
                airPurity: 200,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            DroneCoordinator.updateSensorReadings(droneName, sensorReadings);


            var position = {
                time : sensorReadings.time,
                latitude : sensorReadings.location[0],
                longitude : sensorReadings.location[1],
                altitude : sensorReadings.altitude
            };

            assert(cloudant.db.insert.calledWith(sensorReadings, sensorReadings.time.toString()), "sensorlog failure");
            assert(cloudant.db.insert.calledWith(position, sensorReadings.time.toString()), "positionlog failure");
            assert(cloudant.db.insert.calledTwice, "Sensor readings weren't saved correctly");
            done();
        });
        it('should process image labels and send mqtt event messages', function(done){
            var fire = [{name:"Wild_Fire", score:0.8}, {name:"Rainbow", score:0.53}];
            DroneCoordinator.processImageLabels(droneName, fire, new Date().getTime(),[51.485138, -0.18775] );
            assert(mqttHandler.sendEvent.called, "MQTT Not called");
            done();
        });


    });






});
