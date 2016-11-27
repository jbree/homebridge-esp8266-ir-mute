/* jshint node: true */
/* jshint esversion: 6 */

"use strict";

var request = require('request');
var http = require('http');
var ipaddr = require('ipaddr.js');

var Service;
var Characteristic;

function IRMuteButton(log, config) {
  var platform = this;

  console.dir(config);
  this.log = log;
  this.name = config.name;
  this.port = config.port;
  this.muteButtonAddress = null;

  this.requestServer = http.createServer(function(request, response) {
    // get this to update the IP of the mute button
    if (request.url === '/update') {
      var ipString = request.connection.remoteAddress;
      if (ipaddr.IPv4.isValid(ipString)) {
        this.muteButtonAddress = ipString;
      } else if (ipaddr.IPv6.isValid(ipString)) {
        var ip = ipaddr.IPv6.parse(ipString);
        if (ip.isIPv4MappedAddress()) {
          this.muteButtonAddress = ip.toIPv4Address().toString();
        } else {
          platform.log('IRMute address is ipv6... handle later');
        }
      } else {
        platform.log('invalid IRMute address received');
      }

      platform.log(`IRMute checked in from ${this.muteButtonAddress}`);
      response.writeHead(204);
      response.end();
    }
  }.bind(this));

  this.requestServer.listen(config.port, function() {
    platform.log(`IRMute server listening on ${config.port}`);
  });
}

IRMuteButton.prototype.identify = function (cb) {
  this._log('identify myoot requested');
  cb();
};

IRMuteButton.prototype.getServices = function () {
  var services = [];

  var informationService = new Service.AccessoryInformation();
  informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Joshua Breeden')
    .setCharacteristic(Characteristic.Model, 'ESP8266 IR Mute')
    .setCharacteristic(Characteristic.SerialNumber, 'A1234');
  services.push(informationService);

  var switchService = new Service.Switch(this.name);
  switchService
    .getCharacteristic(Characteristic.On)
    .on('set', this.setMute.bind(this))
    .on('get', this.getMute.bind(this));
  services.push(switchService);

  return services;
};


IRMuteButton.prototype.setMute = function(state, cb) {
    console.log(`setMute ${state}`);

    request.put({
      url: `http://${this.muteButtonAddress}/mute`
    }, function(err, response, body) {

      if (!err && response.statusCode == 200) {
        this.log('State change complete.');

        cb(null); // success
      }
      else {
        this.log(`Error '${err}' setting mute state. Response: ${body}`);
        cb(err || new Error('Error setting mute state.'));
      }
    }.bind(this));
};

IRMuteButton.prototype.getMute = function(cb) {
    console.log('getMute not supported');
    cb(null, true);
};

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-esp8266-ir-mute', 'IRMuteButton', IRMuteButton);
};
