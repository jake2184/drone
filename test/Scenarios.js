
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var iandc = require('../lib/drone_interpret_and_control/drone_interpret_and_control.js');

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

    var IandC = new iandc(mqttHandler, cloudant);

    describe("Fire", function () {
        function getModeNameWithDelay(callback){
            setTimeout(function(){
                callback(IandC.getModeName())
            }, 1100);
        }

        it('should be triggered by images', function(done){
            IandC.setMode("Normal");
            var fire = [{name:"Wild_Fire", score:0.8}, {name:"Rainbow", score:0.53}];
            IandC.processImageLabels(fire, new Date().getTime(), [10, 10]);

            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledOnce, "MQTT Command not sent");
                done();
            });
        });

        it('should be triggered by high temperature', function(done){
            mqttHandler.sendCommand.reset();
            IandC.setMode("Normal");
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 100,
                airPurity: 200,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            IandC.updateSensorReadings(sensorReadings);
            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledOnce, "MQTT Command not sent");
                done();
            });
        });
        it('should be triggered by poor air quality', function(done){
            mqttHandler.sendCommand.reset();
            IandC.setMode("Normal");
            var sensorReadings = {
                time: new Date().getTime(),
                temperature: 20,
                airPurity: 700,
                altitude: 100,
                location: [51.485138, -0.18775]
            };
            //IandC.updateSensorReadings(sensorReadings);
            
            getModeNameWithDelay(function (result) {
                assert.equal(result, "Fire", "Modes do not match");
                assert(mqttHandler.sendCommand.calledOnce, "MQTT Command not sent");
                done();
            });
        })
    });

    describe("Person", function () {

    });





});
