var should = require('should');
require('should-http');
var assert = require('assert');
var request = require('supertest');
var fs = require('fs');
var sizeof = require('object-sizeof');
var buffEq = require ('buffer-equal');

describe('Routing', function(){
    var url = 'http://localhost:8080';
    //var url = 'http://drone-nodes.eu-gb.mybluemix.net';

    describe("Website", function (){
        it(url +  ' should return index.html', function(done){
         request(url)
             .get('/')
             .expect(200)
             .end(function(err, res){
                 if(err){
                     throw err;
                 }
                 done();
             });
     });
   });

   describe("Image Endpoints", function() {
       this.timeout(5000);
       it('/getLatestImage should return image', function (done) {
           request(url)
               .get('/getLatestImage')
               .expect(200)
               .expect('Content-Type', 'image/jpeg')
               .end(function (err, res) {
                   if (err) {
                       throw err;
                   }
                   done();
               });
       });

       it('/imageUpload should accept valid image', function (done){
           request(url)
               .post('/imageUpload')
               .attach('image', 'test/sampleFiles/testImage.jpg')
               .expect(200)
               .end(function (err, res){
                   if(err){
                       throw err;
                   }
                   done();
               });
       });

       it('should cache /imageUpload', function (done){
          request(url)
              .get('/getLatestImage')
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
           request(url)
               .post('/imageUpload')
               .attach('image', 'test/sampleFiles/testInvalidImage.txt')
               .expect(400)
               .end(function (err, res){
                   if(err){
                       throw err;
                   }
                   done();
               });
       });
   });

   describe("GPS Endpoints", function(){
       it('/getLatestGPS should return coordinates', function(done){
           request(url)
                .get('/getLatestGPS')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    var response = JSON.parse(res.text);
                    response.should.have.property("lat");
                    response.should.have.property("lon");
                    done();
                });
       });
   });

    describe("Security", function(){
        var cookie;
        it('should be prevented from using secure URIs before login', function(done){
           request(url)
               .get('/getLatestImageSecure')
               .expect(302)
               .end(function(err){
                    if(err){throw err;}
                    done();
               });
        });
        it('should not allow invalid login', function(done){
            request(url)
                .post('/login')
                .auth('pink','trees')
                .expect(403)
                .end(function(err){
                    if(err){
                        throw err;
                    }
                    done();
                });
        });

        it('should allow valid login', function(done){
            request(url)
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
            var req = request(url).get('/getLatestImageSecure');
            req.cookies = cookie;
            req
                .expect(200)
                .expect('Content-Type', 'image/jpeg')
                .end(function (err) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
        })

    });

    describe("Direct services", function(){
        this.timeout(20000);
        /*
        it('/testAudio should return correct transcript', function(done){
            request(url)
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
        */
        it('/testImage should return correct labels', function(done){
            request(url)
                .get('/testImage')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    console.log(res.body);
                    console.log(typeof(res.body));
                    assert.equal(res.body.name, 'Baby');
                    done();
                });

        })
    });


});