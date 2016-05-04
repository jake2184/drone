
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var server = require('../app.js');
var iandc = require('../lib/drone_interpret_and_control/drone_interpret_and_control.js');

describe('Unit Testing', function(){
    var url = 'http://localhost:8080';
    //var url = 'http://drone-nodes.eu-gb.mybluemix.net';

    describe("IandC", function (){

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

        var IandC = new iandc(mqttHandler, cloudant);

        it('should initialise in normal mode and be able to change mode', function(done) {
            assert.equal(IandC.getModeName(), "Normal");
            IandC.setMode("Fire");
            assert.equal(IandC.getModeName(), "Fire");
            IandC.setMode("Interact");
            assert.equal(IandC.getModeName(), "Interact");
            IandC.setMode("Avoidance");
            assert.equal(IandC.getModeName(), "Avoidance");

            IandC.setMode("Normal");
            assert.equal(IandC.getModeName(), "Normal");
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
            IandC.updateSensorReadings(sensorReadings);


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
            //IandC.setMode("Normal");
            //IandC.processImageLabels([ {name:"Fire" , score:0.7 }, {name:"Whut", score:0.6} , {name:"Person", score:0.8}], new Date().getTime(), null);
            //assert.equal(mqttHandler.sendCommand.callCount, 6);
            done();
        });
    });
    describe("Modes", function(){
        it('How extensive do I want to go?', function(done){
            done();
        })
    });





});
