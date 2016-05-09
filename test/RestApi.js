var should = require('should');
require('should-http');
var assert = require('assert');
var request = require('supertest');
var fs = require('fs');
var sizeof = require('object-sizeof');
var buffEq = require ('buffer-equal');

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
    
    this.timeout(20000);
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
                .expect(200)
                .end(function(err){
                    if(err){throw err;}
                    done();
                });
        })
    });

    describe("Security", function(){
        it('should be prevented from using secure URIs before login', function(done){
            request(server)
                .get('/api/')
                .expect(302)
                .end(function(err){
                    if(err){throw err;}
                    done();
                });
        });
        it('should not allow empty login', function(done){
            request(server)
                .post('/login')
                .expect(400)
                .end(function(err){
                    if(err){throw err;}
                    done();
                });
        });
        it('should not allow invalid login', function(done){
            request(server)
                .post('/login')
                .auth('pink','trees')
                .expect(403)
                .end(function(err){
                    if(err){throw err;}
                    done();
                });
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
            request(server)
                .get('/api/sensors/' + new Date().getTime())
                .set('cookie', cookie)
                .expect(200)
                .end(function (err) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        })

    });

    describe("Path param checking", function(){
        beforeEach(loginAdmin);
        it('should detect when timeFrom is not a number', function(done) {
            request(server)
                .get('/api/sensors/' + "notANumber")
                .set('cookie', cookie)
                .expect(400, done);
        });
        it('should detect when timeTill is not a number', function(done) {
            request(server)
                .get('/api/sensors/' + (new Date().getTime() - 10000) + "/" + "notANumber")
                .set('cookie', cookie)
                .expect(400, done);
        });
    });

    describe("Sensor Endpoints", function(){
        beforeEach(loginAdmin);
        it('should return data from a set point', function(done){
            request(server)
                .get('/api/sensors/' + (new Date().getTime() - 10000))
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points', function(done){
            request(server)
                .get('/api/sensors/' + (new Date().getTime() - 10000) + "/" + new Date().getTime())
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points with a type', function(done){
            request(server)
                .get('/api/sensors/' + (new Date().getTime() - 10000) + "/" + new Date().getTime() + "/" + "temperature")
                .set('cookie', cookie)
                .expect(200, done);
        });
    });

    describe("Image Endpoints", function() {
        beforeEach(loginAdmin);
        var time = new Date().getTime();
        it('GET /api/images should return imageFile list', function(done){
            request(server)
                .get('/api/images')
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .end(done);
        });
        
        it('POST /api/images/:docID should accept valid image', function (done){
          request(server)
               .post('/api/images/' + time)
               .send({time:time, location:[50,50]})
               .attach('image', 'test/sampleFiles/testImage.jpg')
               .set('cookie', cookie)
               .expect(200)
               .end(done);
        });
        it('DELETE /api/images should delete image', function(done){
            request(server)
                .delete('/api/images/' + time)
                .set('cookie', cookie)
                .expect(200)
                .end(done)
        });
        it('GET /api/images/latest should return image', function (done) {
            request(server)
                .get('/api/images/latest')
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', 'image/jpeg')
                .end(done);
        });
        it('should cache POST to /api/images', function (done){
            request(server)
                .get('/api/images/latest')
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
               .post('/api/images/' + time)
               .attach('image', 'test/sampleFiles/testInvalidImage.txt')
               .set('cookie', cookie)
               .expect(400)
               .end(done);
       });
   });

    describe("Audio Endpoints", function(){
        beforeEach(loginAdmin);
        var time = new Date().getTime();
        it('GET /api/audio should return audioFile list', function(done){
            request(server)
                .get('/api/audio')
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .end(done);
        });

        it('POST /api/audio/:docID should accept valid audio', function (done){
            var req = request(server)
                .post('/api/audio/' + time)
                .send({time:time, location:[50,50]})
                .attach('audio', 'test/sampleFiles/testAudio.mp3')
                .set('cookie', cookie)
                .expect(200)
                .end(done);
        });
        it('user cannot DELETE audio', function(done){
            asGuest(function(){
                request(server)
                    .delete('/api/audio/' + time)
                    .set('cookie', cookie)
                    .expect(401)
                    .end(done)
            });
        });
        it('DELETE /api/audio should delete audio', function(done){
            request(server)
                .delete('/api/audio/' + time)
                .set('cookie', cookie)
                .expect(200)
                .end(done)
        });
        it('GET /api/audio/latest should return audio', function (done) {
            request(server)
                .get('/api/audio/latest')
                .set('cookie', cookie)
                .expect(200)
                .expect('Content-Type', 'audio/x-wav')
                .end(done);
        });
        it('should reject invalid file upload', function(done){
            request(server)
                .post('/api/audio/' + time)
                .attach('audio', 'test/sampleFiles/testInvalidImage.txt')
                .set('cookie', cookie)
                .expect(400)
                .end(done);
        });
    });

    describe("GPS Endpoints", function(){
        beforeEach(loginAdmin);
        it('should return data from a set point', function(done){
            request(server)
                .get('/api/gps/' + (new Date().getTime() - 10000))
                .set('cookie', cookie)
                .expect(200, done);
        });
        it('should return data between two points', function(done){
            request(server)
                .get('/api/gps/' + (new Date().getTime() - 10000) + "/" + new Date().getTime())
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
                    .expect(401)
                    .end(done)
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
                .end(function(){
                    request(server)
                        .post('/login')
                        .auth('__testUser__', 'pass')
                        .expect(200)
                        .end(done);
                });
        });
        it('admin can delete user', function(done){
            request(server)
                .delete('/api/users/' + "__testUser__")
                .set('cookie', cookie)
                .expect(200)
                .end(done)
                
        });

    });

/*
    describe("Direct services", function(){
        this.timeout(20000);

        it('/testAudio should return correct transcript', function(done){
            request(server)
                .get('/testAudio')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    assert.equal(res.text, 'can you hear what I am saying ');
                    done();
                });
        });

        it('/testImage should return correct labels', function(done){
            request(server)
                .get('/testImage')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    res.body.should.have.property("name");
                    res.body.name.should.equal('Baby');
                    done();
                });

        })
    });
*/

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
        done();
    });

});