var should = require('should');
require('should-http');
var assert = require('assert');
var request = require('supertest');
var fs = require('fs');
var sizeof = require('object-sizeof');
var buffEq = require ('buffer-equal');
var WebSocket = require('nodejs-websocket');


var server = require('../app.js');


describe('Routing', function(){
    before(function (done) {
        var dirPath = './uploads';
        try {
            var files = fs.readdirSync(dirPath);
        }
        catch (e) {
            done();
            return;
        }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
        }
        done();
    });
    function loginAdmin(done){
        request(server)
            .post('/login')
            .auth('jake','pass')
            .expect(200)
            .end(function(err, res){
                if(err){
                    throw err;
                }
                cookie = res.headers['set-cookie'].pop().split(';')[0];
                done();
            });
    }
    
    function loginGuest(done){
        request(server)
            .post('/login')
            .auth('guest','guest')
            .expect(200)
            .end(function(err, res){
                if(err){
                    throw err;
                }
                cookie = res.headers['set-cookie'].pop().split(';')[0];
                done();
            });
    }

    function asGuest(callback){
        request(server)
            .post('/login')
            .auth('guest','guest')
            .expect(200)
            .end(function(err, res){
                if(err){
                    throw err;
                }
                cookie = res.headers['set-cookie'].pop().split(';')[0];
                callback();
            });
    }

    function asAdmin(callback){
        request(server)
            .post('/login')
            .auth('jake','pass')
            .expect(200)
            .end(function(err, res){
                if(err){
                    throw err;
                }
                cookie = res.headers['set-cookie'].pop().split(';')[0];
                callback();
            });
    }
    var wsListen;
    function connectToUpdates(){
        wsListen = WebSocket.connect('ws://localhost:8080/api/updates/jake',
            {extraHeaders:{"cookie":cookie}});

        wsListen.on('text', function(message){
            //console.log("Message: " + message);
        });
        wsListen.on('close', function(err){throw err});
        wsListen.on('error', function (err) {throw err;});
    }

    function disconnectFromUpdates() {
        try {
            wsListen.close();
        } catch(a){}
    }

     function checkForErr(err){
         if(err){
             throw err;
         }
     }

    this.timeout(10000);
    var cookie;

    describe("Website", function (){
        it('should return index.html', function(done){
         request(server)
             .get('/')
             .expect(200)
             .end(function(err){
                 if(err){throw err;}
                 done();
             });
        });
        it('should return /login', function(done){
            request(server)
                .get('/login')
                .expect(400, done);
        })
    });

    describe("Security", function(){
        it('should be prevented from using secure URIs before login', function(done){
            request(server)
                .get('/api/')
                .expect('location', '/login')
                .expect(302, done)
        });
        it('should not allow empty login', function(done){
            request(server)
                .post('/login')
                .expect(400, done);
        });
        it('should not allow invalid login', function(done){
            request(server)
                .post('/login')
                .auth('pink','trees')
                .expect(403, done);
        });

        it('should allow valid login', function(done){
            request(server)
                .post('/login')
                .auth('jake','pass')
                .expect(200)
                .end(function(err, res){
                    if(err){
                        throw err;
                    }
                    cookie = res.headers['set-cookie'].pop().split(';')[0];
                    done();
                });
        });
        it('should allow access to secure URIs post login', function(done){
            asAdmin(function() {
                request(server)
                    .get('/api/pixhack/sensors/' + new Date().getTime())
                    .set('cookie', cookie)
                    .expect(200, done);
                }
            );
        })

    });

    describe("Path param checking", function(){
        beforeEach(loginAdmin);
        it('should detect when timeFrom is not a number', function(done) {
            request(server)
                .get('/api/pixhack/sensors/' + "notANumber")
                .set('cookie', cookie)
                .expect(400, done);
        });
        it('should detect when timeTill is not a number', function(done) {
            request(server)
                .get('/api/pixhack/sensors/' + (new Date().getTime() - 10000) + "/" + "notANumber")
                .set('cookie', cookie)
                .expect(400, done);
        });
        it('should detect when dronename is not valid', function(done) {
            asGuest(function () {
                request(server)
                    .get('/api/notADrone/sensors/' + (new Date().getTime() - 10000))
                    .set('cookie', cookie)
                    .expect(400, done);
            });
        });

    });

    describe("Sensor Endpoints", function(){
        beforeEach(loginAdmin);
        it('should return data from a set point', function(done){
            request(server)
                .get('/api/pixhack/sensors/' + (new Date().getTime() - 10000))
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points', function(done){
            request(server)
                .get('/api/pixhack/sensors/' + (new Date().getTime() - 10000) + "/" + new Date().getTime())
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points with a type', function(done){
            request(server)
                .get('/api/pixhack/sensors/' + (new Date().getTime() - 10000) + "/" + new Date().getTime() + "/" + "temperature")
                .set('cookie', cookie)
                .expect(200, done);
        });
    });


    describe("Image Endpoints", function() {
        beforeEach(loginAdmin);
        var time = new Date().getTime();

        it('GET /api/images should return imageFile list', function(done){
            request(server)
                .get('/api/pixhack/images')
                .set('cookie', cookie)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .expect(200, done);
        });
        it('POST /api/images/:docID should accept valid image', function (done){
          request(server)
               .post('/api/pixhack/images/' + time)
               .send({time:time, location:[50,50]})
               .attach('image', 'test/sampleFiles/testImage.jpg')
               .set('cookie', cookie)
               .expect(200, done)
        });
        it('GET /api/images/:docID should return image', function(done){
           request(server)
               .get('/api/pixhack/images/' + time)
               .set('cookie', cookie)
               .expect('Content-Type', 'image/jpeg')
               .expect(200, done)
        });
        it('DELETE /api/images should delete image', function(done){
            request(server)
                .delete('/api/pixhack/images/' + time)
                .set('cookie', cookie)
                .expect(200, done)
        });
        it('GET /api/images/latest should return image', function (done) {
            request(server)
                .get('/api/pixhack/images/latest')
                .set('cookie', cookie)
                .expect('Content-Type', 'image/jpeg')
                .expect(200 , done)
        });
        it('should cache POST to /api/images', function (done){
            request(server)
                .get('/api/pixhack/images/latest')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                      throw err;
                    }
                    var file = fs.readFileSync('test/sampleFiles/testImage.jpg');
                    var equal = buffEq(res.body, file);
                    should(equal).ok;
                    done();
              });
        });
        it('should reject invalid file upload', function(done){
           request(server)
               .post('/api/pixhack/images/' + time)
               .attach('image', 'test/sampleFiles/testInvalidImage.txt')
               .set('cookie', cookie)
               .expect(400, done);
       });
   });

    describe("Audio Endpoints", function(){
        beforeEach(loginAdmin);
        var time = new Date().getTime();
        it('GET /api/audio should return audioFile list', function(done){
            request(server)
                .get('/api/pixhack/audio')
                .set('cookie', cookie)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .expect(200, done);
        });
        it('POST /api/audio/:docID should accept valid audio', function (done){
            var req = request(server)
                .post('/api/pixhack/audio/' + time)
                .send({time:time, location:[51.5,-0.18]})
                .field('time', time).field('location', "[51.5,-0.18]")
                .attach('audio', 'test/sampleFiles/testAudio.mp3')
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('GET /api/audio/:docID should return audio', function(done){
            request(server)
                .get('/api/pixhack/audio/' + time)
                .set('cookie', cookie)
                .expect('Content-Type', 'audio/x-wav')
                .expect(200, done);
        });
        it('DELETE /api/audio should delete audio', function(done){
            request(server)
                .delete('/api/pixhack/audio/' + time)
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('GET /api/audio/latest should return audio', function (done) {
            request(server)
                .get('/api/pixhack/audio/latest')
                .set('cookie', cookie)
                .expect('Content-Type', 'audio/x-wav')
                .expect(200, done);
        });
        it('should reject invalid file upload', function(done){
            request(server)
                .post('/api/pixhack/audio/' + time)
                .attach('audio', 'test/sampleFiles/testInvalidImage.txt')
                .set('cookie', cookie)
                .expect(400, done);
        });
        it('user cannot DELETE audio', function(done){
            asGuest(function(){
                request(server)
                    .delete('/api/pixhack/audio/' + time)
                    .set('cookie', cookie)
                    .expect(401, done)
            });
        });
        it('can connect and listen to drone audio stream', function(done){
            var testString = "Hello world";
            var wsListen = WebSocket.connect('ws://localhost:8080/api/pixhack/audio/stream/listen',
                {extraHeaders:{"cookie":cookie}});

            wsListen.on('text', function(message){
                message.should.equal(testString);
                done();
            });
            wsListen.on('close', checkForErr);
            wsListen.on('error', checkForErr);

            var wsSend = WebSocket.connect('ws://localhost:8080/api/pixhack/audio/stream/upload',
                {extraHeaders:{"cookie":cookie}});

            wsSend.on('connect', function(){wsSend.send(testString);});
            wsSend.on('close', checkForErr);
            wsSend.on('error', checkForErr);
        });
        it('can connect and listen to client audio stream', function(done){
            var testString = "Hello world";
            var wsListen = WebSocket.connect('ws://localhost:8080/api/pixhack/audio/stream/download',
                {extraHeaders:{"cookie":cookie}});

            wsListen.on('text', function(message){
                message.should.equal(testString);
                done();
            });
            wsListen.on('close', checkForErr);
            wsListen.on('error', checkForErr);

            var wsSend = WebSocket.connect('ws://localhost:8080/api/pixhack/audio/stream/talk',
                {extraHeaders:{"cookie":cookie}});

            wsSend.on('connect', function(){wsSend.send(testString);});
            wsSend.on('close', checkForErr);
            wsSend.on('error', checkForErr);
        });
    });

    describe("GPS Endpoints", function(){
        beforeEach(loginAdmin);
        it('should return data from a set point', function(done){
            request(server)
                .get('/api/pixhack/gps/' + (new Date().getTime() - 10000))
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points', function(done){
            request(server)
                .get('/api/pixhack/gps/' + (new Date().getTime() - 10000) + "/" + new Date().getTime())
                .set('cookie', cookie)
                .expect(200, done);
        });
   });





    describe("User Endpoints", function(){
        beforeEach(loginAdmin);
        it('user can query own information', function(done){
           request(server)
               .get('/api/users/jake')
               .set('cookie', cookie)
               .expect(200)
               .expect('Content-Type', 'application/json; charset=utf-8')
               .end(function(err, res){
                   res.body.should.have.property('first_name');
                   res.body.should.have.property('last_name');
                   res.body.should.have.property('username');
                   done()
               })
        });
        it('user cannot query other users information', function(done){
            asGuest(function(){
                request(server)
                    .get('/api/users/jake')
                    .set('cookie', cookie)
                    .expect(401, done)
            });
        });
        it('admin can add new user and login', function(done){
            var newUser = {
                username:"__testUser__",
                password:"pass",
                first_name:"Bill",
                role:2
            };
            request(server)
                .post('/api/users/' + newUser.username)
                .set('cookie', cookie)
                .send(newUser)
                .expect(200)
                .end(function(err){
                    if(err){throw err;}
                    request(server)
                        .post('/login')
                        .auth('__testUser__', 'pass')
                        .expect(200, done);
                });
        });
        it('admin can delete user', function(done){
            request(server)
                .delete('/api/users/' + "__testUser__")
                .set('cookie', cookie)
                .expect(200, done)
        });

    });

    describe("Drone Endpoints", function(){
        beforeEach(loginAdmin);
        it('user can add drone', function(done){
            var newDrone = {
                "name":"__testDrone__",
                "model":"px4",
                "owner":"jake"
            };
             request(server)
                .post('/api/drones')
                .send(newDrone)
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', "application/json; charset=utf-8")
                .end(function(err, res){
                    if(err) { 
                        console.log(err)
                        throw err;
                    }
                    var MQTT = res.body.MQTT;
                    MQTT.should.have.property('auth-token');
                    MQTT.deviceId.should.equal(newDrone.name);
                    MQTT.should.have.property('org');
                    MQTT.should.have.property('type');
                    //console.log(err);
                    done();
                })
         });
        it('user can delete drone', function(done){
            request(server)
                .delete('/api/drones/__testDrone__')
                .set('cookie', cookie)
                .expect(200, done)
        });

        it('user can query own drone information', function(done){
            request(server)
                .get('/api/drones')
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .end(function(err, res){
                    if(err){
                        throw err;
                    }
                    res.body[0].should.have.property('model');
                    res.body[0].should.have.property('name');
                    res.body[0].should.have.property('owner');
                    res.body[0].owner.should.equal("jake");
                    done()
                })
        });
    
        
    });
    describe('Updates and Commands', function(){
        beforeEach(loginAdmin);
        it('should be able to connect to updates', function(done){
            wsListen = WebSocket.connect('ws://localhost:8080/api/updates/jake',
                {extraHeaders:{"cookie":cookie}});

            wsListen.on('connect', function(){ 
                wsListen.close(); 
                done();
            });
            wsListen.on('close', checkForErr);
            wsListen.on('error', checkForErr);

        });
        it('should be able to send Pi commands', function(done){
            request(server)
                .post('/api/pixhack/command/pi')
                .send( {command: "dummyCommand", args : []} )
                .set('cookie', cookie)
                .expect(200, done)                
        });
        it('should be able to send Mav commands', function(done){
            request(server)
                .post('/api/pixhack/command/mav')
                .send( {command: "dummyCommand", args : []} )
                .set('cookie', cookie)
                .expect(200, done)
        });
    });


    after(function (done) {
        var dirPath = './uploads';
        try {
            var files = fs.readdirSync(dirPath);
        }
        catch (e) {
            done();
            return;
        }
        if (files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                var filePath = dirPath + '/' + files[i];
                fs.unlinkSync(filePath);
            }
        }

        function Delay(callback){
            setTimeout(function(){
                callback()
            }, 1100);
        }
        Delay(done);
    });



});