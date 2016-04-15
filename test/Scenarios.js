
var should = require('should');
require('should-http');
var assert = require('assert');
var sinon = require('sinon');
require("unit.js");
var iandc = require('../lib/drone_interpret_and_control/drone_interpret_and_control.js');

describe('Scenario Testing', function(){
    var url = 'http://localhost:8080';
    //var url = 'http://drone-nodes.eu-gb.mybluemix.net';

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

    describe("Fire", function () {
        it('should be triggered ', function(done){
            IandC.setMode("Normal");
            var fire = [{name:"Fire", score:0.8}];
            IandC.processImageLabels(fire, 10, 10);
            assert.equal(IandC.getModeName(), "Fire");

            IandC.setMode("Normal");
            IandC.updateTemp({'temperature':10, 'time': 10, 'location': [10,10]});
            //assert.equal(IandC.getModeName(), "Fire");
            done();
        })
    });

    describe("Person", function () {

    });





});
