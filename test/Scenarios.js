
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
var logger = require('../lib/logger.js');
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
    var sendUpdates = sinon.spy();
    var droneName = "testDrone";
    var droneCoordinator = new DroneCoordinator(mqttHandler, cloudant, sendUpdates );
    
    function getModeNameWithDelay(callback){
        setTimeout(function(){
            callback(droneCoordinator.getModeName(droneName))
        }, 1100);
    }


    beforeEach(function(done){
        droneCoordinator.reset(droneName);
        mqttHandler.sendCommand.reset();
        mqttHandler.sendEvent.reset();
        cloudant.db.insert.reset();
        sendUpdates.reset();
        done();
    });

    describe("Fire", function () {

        it('should trigger fire mode from image labels', function(done){
            var fire = [{name:"Wild_Fire", score:0.8}, {name:"Rainbow", score:0.53}];
            droneCoordinator.processImageLabels(droneName, fire, new Date().getTime(), [51.5,-0.19]);
            getModeNameWithDelay(  function (result){
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.called, "Database not used");
                assert(sendUpdates.calledWith(droneName, 'event'), "sendUpdates not called correctly");
                done();
            });
        });

        it('should trigger fire mode from high temperature', function(done){
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 100,
                airPurity: 200,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            droneCoordinator.updateSensorReadings(droneName, sensorReadings);
            getModeNameWithDelay(function (result){
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.called, "Database not used");
                done();
            });
        });
        it('should trigger fire mode from poor air quality', function(done){
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 20,
                airPurity: 800,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            droneCoordinator.updateSensorReadings(droneName, sensorReadings);
            getModeNameWithDelay(function(result){
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.called, "Database not used");
                done();
            });
        })
    });

    describe("Person", function () {

        it('should trigger Interact mode from single image label above threshold', function(done){
            var person = [{name:"Adult", score:0.8}, {name:"Rainbow", score:0.53}];
            droneCoordinator.processImageLabels(droneName, person, new Date().getTime(), [51.8,-0.18]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Interact", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.calledOnce, "Database not used");
                done();
            });
        });
        it('should trigger Interact mode from 2+ image labels above lower threshold ', function(done){
            var person = [
                {name:"Adult", score:0.7},
                {name:"Female_Adult", score:0.65},
                {name:"Human", score:0.79}
            ];
            droneCoordinator.processImageLabels(droneName, person, new Date().getTime(), [51.8,-0.18]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Interact", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.calledOnce, "Database not used");
                done();
            });
        });
    });
    describe("Building", function(){
        it('should log an event from an image label', function(done){
           var building = [{name:"Rural_Building", score:0.8}, {name:"Food_Processor", score:0.56}];

            droneCoordinator.processImageLabels(droneName, building, new Date().getTime(), [51.8,-0.18]);
            getModeNameWithDelay(function (result) {
                assert.equal(result, "Normal", "Modes do not match");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.calledOnce, "Database not used");
                done();
            });
        });
    });
    describe("Explosion", function () {
       it('should trigger fire mode from image label', function(done){
           // Is treated the same as a fire
           var explosion = [{name:"Explosion", score:0.8}, {name:"Rainbow", score:0.53}];
           droneCoordinator.processImageLabels(droneName, explosion, new Date().getTime(), [51.5,-0.19]);
           getModeNameWithDelay(  function (result){
               assert.equal(result, "Fire", "Modes do not match");
               assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
               assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
               assert(cloudant.db.insert.called, "Database not used");
               assert(sendUpdates.calledWith(droneName, 'event'), "sendUpdates not called correctly");
               done();
           });
       })
    });
    describe("Smoke", function(){
        it('should log event from image labels', function(done){
            var smoke = [{name:"Smoke", score:0.8}, {name:"Rainbow", score:0.53}];
            droneCoordinator.processImageLabels(droneName, smoke, new Date().getTime(), [51.5,-0.19]);
            getModeNameWithDelay( function (result){
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
                assert(mqttHandler.sendEvent.calledOnce, "MQTT Event not sent");
                assert(cloudant.db.insert.called, "Database not used");
                assert(sendUpdates.calledWith(droneName, 'event'), "sendUpdates not called correctly");
                done();
            });
        });
    });
    describe("Person in Distress", function(){
       it('should trigger Interact mode and send special event from transcript', function(done){
           var transcript = 'help i am in danger';
           droneCoordinator.processSpeechTranscript(droneName, transcript, new Date().getTime(), [51.5,-0.19]);
           getModeNameWithDelay(function (result){
               assert.equal(result, "Interact", "Modes do not match");
               assert(mqttHandler.sendCommand.calledTwice, "MQTT Command not sent");
               assert(mqttHandler.sendEvent.called, "MQTT Event not sent");
               assert(cloudant.db.insert.called, "Database not used");
               assert(sendUpdates.calledWith(droneName, 'event'), "sendUpdates not called correctly");
               assert(sendUpdates.calledWith(droneName, 'urgent'), "sendUpdates not called correctly");
               done();
               
           })
       }) 
    });





});
