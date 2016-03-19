var should = require('should');
require('should-http');
var assert = require('assert');
var request = require('supertest');
var fs = require('fs');
var sizeof = require('object-sizeof');
var buffEq = require ('buffer-equal');

describe('Routing', function(){
    //var url = 'http://localhost:8080';
    var url = 'http://drone-nodes.eu-gb.mybluemix.net';

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


});