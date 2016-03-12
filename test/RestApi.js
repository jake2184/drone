require('should');
require('should-http');
var assert = require('assert');
var request = require('supertest');

describe('Routing', function(){
    var url = 'http://localhost:8080';
    var url = 'http://drone-nodes.eu-gb.mybluemix.net';

    describe("Website", function (){
    it('should return index.html', function(done){
         request(url)
             .get('/')
             .end(function(err, res){
                 if(err){
                     throw err;
                 }
                 res.should.have.status(200);
                 done();
             });
     });
   });

   describe("Getter Endpoints", function(){
       this.timeout(5000);
       it('/getLatestImage should return image', function(done){
            request(url)
              .get('/getLatestImage')
              .end(function (err, res){
                  if(err){
                     throw err;
                  }
                  res.should.have.status(200);
                  res.should.have.header('content-type', "image/jpeg");
                  done();
             });
       });
       it('/getLatestGPS should return coordinates', function(done){
           request(url)
                .get('/getLatestGPS')
                .end(function(err, res) {
                    if (err) {
                        throw err;
                    }
                    res.should.have.status(200);
                    var response = JSON.parse(res.text);
                    response.should.have.property("lat");
                    response.should.have.property("lon");
                    done();
                });
       });


   });
});