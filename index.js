//         ____                        _   _
//     ___|  _ \  ___  _ __ ___   ___ | |_(_) ___ ____
//    / _ | | | |/ _ \| '_ ` _ \ / _ \| __| |/ __|_  /
//   |  __| |_| | (_) | | | | | | (_) | |_| | (__ / /
//    \___|____/ \___/|_| |_| |_|\___/ \__|_|\___/___|
//       www.npmjs.com/package/homebridge-edomoticz
//
//   A Platform Plugin for HomeBridge by Marci & TheRamon
//           [http://twitter.com/marcisshadow]
//           [http://domoticz.com/forum/memberlist.php?mode=viewprofile&u=10884]
//
//     ** Remember to add platform to config.json **
//
// Example ~/.homebridge/config.json content:
//
// {
//  "bridge": {
//         "name": "Homebridge",
//         "username": "CC:21:3E:E4:DE:33", // << Randomize this...
//         "port": 51826,
//         "pin": "031-45-154",
//      },
//
//  "platforms": [{
//         "platform": "eDomoticz",
//         "name": "eDomoticz",
//         "server": "127.0.0.1",   // or "user:pass@ip"
//         "port": "8080",
//         "roomid": 0 ,  // 0 = all sensors, otherwise, room idx as shown at http://server:port/#/Roomplan
//         "ssl": 0,
//         "mqtt": true,
//         "exceptions": [12,14]   // exceptions of devices (idx)
//      }],
//
//  "accessories":[]
// }
//

var Domoticz = require('./lib/domoticz.js').Domoticz;
var Mqtt = require('./lib/mqtt.js').Mqtt;
var eDomoticzAccessory = require('./lib/domoticz_accessory.js');
var Constants = require('./lib/constants.js');
var Helper = require('./lib/helper.js').Helper;
var eDomoticzServices = require('./lib/services.js').eDomoticzServices;
const util = require('util');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Types = homebridge.hapLegacyTypes;
  UUID = homebridge.hap.uuid;

  Helper.fixInheritance(eDomoticzServices.TotalConsumption, Characteristic);
  Helper.fixInheritance(eDomoticzServices.CurrentConsumption, Characteristic);
  Helper.fixInheritance(eDomoticzServices.GasConsumption, Characteristic);
  Helper.fixInheritance(eDomoticzServices.TempOverride, Characteristic);
  Helper.fixInheritance(eDomoticzServices.MeterDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.GasDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.CurrentUsage, Characteristic);
  Helper.fixInheritance(eDomoticzServices.UsageDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.TodayConsumption, Characteristic);
  Helper.fixInheritance(eDomoticzServices.Barometer, Characteristic);
  Helper.fixInheritance(eDomoticzServices.WaterFlow, Characteristic);
  Helper.fixInheritance(eDomoticzServices.TotalWaterFlow, Characteristic);
  Helper.fixInheritance(eDomoticzServices.WaterDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.WeatherService, Service);
  Helper.fixInheritance(eDomoticzServices.WindSpeed, Characteristic);
  Helper.fixInheritance(eDomoticzServices.WindChill, Characteristic);
  Helper.fixInheritance(eDomoticzServices.WindDirection, Characteristic);
  Helper.fixInheritance(eDomoticzServices.WindDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.Rainfall, Characteristic);
  Helper.fixInheritance(eDomoticzServices.RainDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.Visibility, Characteristic);
  Helper.fixInheritance(eDomoticzServices.VisibilityDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.SolRad, Characteristic);
  Helper.fixInheritance(eDomoticzServices.SolRadDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.LocationService, Service);
  Helper.fixInheritance(eDomoticzServices.Location, Characteristic);
  Helper.fixInheritance(eDomoticzServices.InfotextDeviceService, Service);
  Helper.fixInheritance(eDomoticzServices.Infotext, Characteristic);
  homebridge.registerAccessory("homebridge-edomoticz", "eDomoticz", eDomoticzAccessory);
  homebridge.registerPlatform("homebridge-edomoticz", "eDomoticz", eDomoticzPlatform);
};

function eDomoticzPlatform(log, config, api) {
  this._cachedAccessories = false;
  this.forceLog = log;
  this.log = function() {
      if (typeof process.env.DEBUG !== 'undefined') {
          log(util.format.apply(this, arguments));
      }
  };

  this.config = config;
  this.server = config.server;
  this.authorizationToken = false;
  if (this.server.indexOf(":") > -1 && this.server.indexOf("@") > -1)
  {
    tmparr = this.server.split("@");
    var Base64 = {
        _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        encode: function(e) {
            var t = "";
            var n, r, i, s, o, u, a;
            var f = 0;
            e = Base64._utf8_encode(e);
            while (f < e.length) {
                n = e.charCodeAt(f++);
                r = e.charCodeAt(f++);
                i = e.charCodeAt(f++);
                s = n >> 2;
                o = (n & 3) << 4 | r >> 4;
                u = (r & 15) << 2 | i >> 6;
                a = i & 63;
                if (isNaN(r)) {
                    u = a = 64;
                } else if (isNaN(i)) {
                    a = 64;
                }
                t = t + this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a);
            }
            return t;
        },
        _utf8_encode: function(e) {
            e = e.replace(/\r\n/g, "\n");
            var t = "";
            for (var n = 0; n < e.length; n++) {
                var r = e.charCodeAt(n);
                if (r < 128) {
                    t += String.fromCharCode(r);
                } else if (r > 127 && r < 2048) {
                    t += String.fromCharCode(r >> 6 | 192);
                    t += String.fromCharCode(r & 63 | 128);
                } else {
                    t += String.fromCharCode(r >> 12 | 224);
                    t += String.fromCharCode(r >> 6 & 63 | 128);
                    t += String.fromCharCode(r & 63 | 128);
                }
            }
            return t;
        }
    };
    this.authorizationToken = Base64.encode(tmparr[0]);
    this.server = tmparr[1];
  }
  this.ssl = (config.ssl == 1);
  this.port = config.port;
  this.room = config.roomid;
  this.api = api;
  this.apiBaseURL = "http" + (this.ssl ? "s" : "") + "://" + this.server + ":" + this.port + "/json.htm?";
  this.mqtt = false;
  this.exceptions = config.exceptions;

  var requestHeaders = {};
  if (this.authorizationToken) {
    requestHeaders['Authorization'] = 'Basic ' + this.authorizationToken;
  }
  Domoticz.initialize(this.ssl, requestHeaders);

  // Legacy, will be deprecated soon:
  if (typeof config.mqtt === 'undefined' && typeof config.mqttenable !== 'undefined') {
    config.mqtt = (config.mqttenable === 1);
  }

  if (config.mqtt && this.api)
  {
    this.api.once("domoticzAccessoriesLoaded", function() {
      this.accessories(function(accessories) {
        if (accessories.length > 0) {
          setupMqttConnection(this);
        }
      }.bind(this));
    }.bind(this));
  }
}

eDomoticzPlatform.prototype = {
  accessories: function(callback, forceUpdate) {
    if (this._cachedAccessories && ((typeof forceUpdate === 'undefined') || !forceUpdate)) {
      callback(this._cachedAccessories);
      return;
    }

    this.log("Fetching Domoticz lights and switches...");

    Domoticz.devices(this.apiBaseURL, this.room, function(devices) {
      this.log("You have " + devices.length + " devices defined in Domoticz.");

      var newAccessories = [];

      for (var i = 0; i < devices.length; i++)
      {
        var device = devices[i];
        if (this.exceptions.indexOf(device.idx) > -1) {
          this.forceLog("Skipped device: "+device.idx+" - "+device.Name);
        }
        else {
          var accessory = new eDomoticzAccessory(this, false, device.Used, device.idx, device.Name, device.HaveDimmer, device.MaxDimLevel, device.SubType, device.Type, device.BatteryLevel, device.SwitchType, device.SwitchTypeVal, device.HardwareTypeVal, this.eve);
          newAccessories.push(accessory);
        }
      }

      this._cachedAccessories = newAccessories;
      callback(this._cachedAccessories);
      this.api.emit("domoticzAccessoriesLoaded");

      if (this._cachedAccessories.length == 0)
      {
        if (this.room == 0) {
          this.forceLog("You do not have any Domoticz devices yet. Please add some devices and restart HomeBridge.");
        }
        else {
          this.forceLog("You do not have any Domoticz devices in this room (roomid: " + this.room + ") yet. Please add some devices to this room and restart HomeBridge.");
        }
      }
    }.bind(this), function(response, err) {
      Helper.LogConnectionError(this, response, err);
    }.bind(this));
  }
};

function setupMqttConnection(platform)
{
  var connectionInformation = {
    host: (typeof platform.config.mqtt.host !== 'undefined' ? platform.config.mqtt.host : '127.0.0.1'),
    port: (typeof platform.config.mqtt.port !== 'undefined' ? platform.config.mqtt.port : 1883),
    topic: (typeof platform.config.mqtt.topic !== 'undefined' ? platform.config.mqtt.topic : 'domoticz/out'),
    username: (typeof platform.config.mqtt.username !== 'undefined' ? platform.config.mqtt.username : ''),
    password: (typeof platform.config.mqtt.password !== 'undefined' ? platform.config.mqtt.password : ''),
  };

  var mqttError = function() {
    platform.forceLog("There was an error while getting the MQTT Hardware Device from Domoticz.\nPlease verify that you have added the MQTT Hardware Device and that the hardware device is enabled.");
  };

  Domoticz.hardware(platform.apiBaseURL, function(hardware) {
    var mqttHardware = false;
    for (var i = 0; i < hardware.length; i++)
    {
      if (hardware[i].Type == Constants.HardwareTypeMQTT)
      {
        mqttHardware = hardware[i];
        break;
      }
    }

    if (mqttHardware === false || (mqttHardware.Enabled != "true")) {
      mqttError();
      return;
    }

    if (typeof platform.config.mqtt.host === 'undefined') {
      connectionInformation.host = mqttHardware.Address;
    }

    if (typeof platform.config.mqtt.port === 'undefined') {
      connectionInformation.port = mqttHardware.Port;
    }

    if (typeof platform.config.mqtt.username === 'undefined') {
      connectionInformation.username = mqttHardware.Username;
    }

    if (typeof platform.config.mqtt.password === 'undefined') {
      connectionInformation.password = mqttHardware.Password;
    }

    platform.mqtt = new Mqtt(platform, connectionInformation.host, connectionInformation.port, connectionInformation.topic, {username: connectionInformation.username, password: connectionInformation.password});
  }, mqttError);
}
