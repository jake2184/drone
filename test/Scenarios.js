
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var DroneCoordinator = require('../lib/drone_interpret_and_control/DroneCoordinator.js');

describe('Scenario Testing', function(){

    var mqttHandler = {
        sendCommand : sinon.spy(),
        sendEvent: sinon.spy()
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
    var droneName = "testDrone";
    var droneCoordinator = new DroneCoordinator(mqttHandler, cloudant, [droneName]);
    
    function getModeNameWithDelay(callback){
        setTimeout(function(){
            callback(droneCoordinator.getModeName(droneName))
        }, 1100);
    }

    describe("Fire", function () {

        beforeEach(function(done){
            droneCoordinator.reset(droneName);
            mqttHandler.sendCommand.reset();
            done();
        });

        it('should be triggered by images', function(done){
            var fire = [{name:"Wild_Fire", score:0.8}, {name:"Rainbow", score:0.53}];
            droneCoordinator.processImageLabels(droneName, fire, new Date().getTime(), [51.5,-0.19]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                done();
            });
        });

        it('should be triggered by high temperature', function(done){
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 100,
                airPurity: 200,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            droneCoordinator.updateSensorReadings(droneName, sensorReadings);
            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                done();
            });
        });
        it('should be triggered by poor air quality', function(done){
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 20,
                airPurity: 800,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            droneCoordinator.updateSensorReadings(droneName, sensorReadings);
            
            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                done();
            });
        })
    });

    describe("Person", function () {

        beforeEach(function(done){
            droneCoordinator.reset(droneName);
            mqttHandler.sendCommand.reset();
            done();
        });
        
        it('should be triggered by image label above single threshold', function(done){
            var person = [{name:"Adult", score:0.8}, {name:"Rainbow", score:0.53}];
            droneCoordinator.processImageLabels(droneName, person, new Date().getTime(), [51.8,-0.18]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Interact", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                done();
            });
        });
        it('should be triggered by image labels above lower threshold ', function(done){
            var person = [
                {name:"Adult", score:0.7},
                {name:"Female_Adult", score:0.65},
                {name:"Human", score:0.79}
            ];
            droneCoordinator.processImageLabels(droneName, person, new Date().getTime(), [10, 10]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Interact", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                done();
            });
        });
    });





});
