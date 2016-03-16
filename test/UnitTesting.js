var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var iandc = require('../lib/drone_interpret_and_control/drone_interpret_and_control.js');

describe('Unit Testing', function(){
    var url = 'http://localhost:8080';
    //var url = 'http://drone-nodes.eu-gb.mybluemix.net';

    describe("IandC", function (){

        var mqttHandler = {
            sendCommand : sinon.spy()
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
            IandC.setMode("Normal");
            assert.equal(IandC.getModeName(), "Normal");
            done();
        });

        it('should insert sensor readings to database', function(done){
            IandC.updateTemp({temperature:10, time: 10, location: 10});
            IandC.updateAirPurity({purity:10, time: 10, location: 10});
            IandC.updatePosition({GPS:10, altitude:10, time:10});
            assert(cloudant.db.insert.calledThrice);
            done();
        });
        it('should process image labels and send mqtt event messages', function(done){
            IandC.processImageLabels([ {name:"Fire" , score:0.7 }, {name:"Whut", score:0.6} , {name:"Person", score:0.8}], null, null);
            assert.equal(mqttHandler.sendCommand.callCount, 6);
            done();
        });
   });
    describe("Modes", function(){
        it('How extensive do I want to go?', function(done){
            done();
        })
    });





});