//         ____                        _   _
//     ___|  _ \  ___  _ __ ___   ___ | |_(_) _v0.2.1
//    / _ | | | |/ _ \| '_ ` _ \ / _ \| __| |/ __|_  /
//   |  __| |_| | (_) | | | | | | (_) | |_| | (__ / /
//    \___|____/ \___/|_| |_| |_|\___/ \__|_|\___/___|
//       www.npmjs.com/package/homebridge-edomoticz
//
//       A Platform Plugin for HomeBridge by Marci
//           [http://twitter.com/marcisshadow]
//
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
//         "ssl": 0
//      }],
//
//  "accessories":[]
// }
//


var Service, Characteristic, types, uuid, hapLegacyTypes;
var request = require("request");
var inherits = require('util').inherits;
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    types = homebridge.hapLegacyTypes;
    uuid = homebridge.hap.uuid;
    fixInheritance(eDomoticzPlatform.TotalConsumption, Characteristic);
    fixInheritance(eDomoticzPlatform.CurrentConsumption, Characteristic);
    fixInheritance(eDomoticzPlatform.GasConsumption, Characteristic);
    fixInheritance(eDomoticzPlatform.TempOverride, Characteristic);
    fixInheritance(eDomoticzPlatform.MeterDeviceService, Service);
    fixInheritance(eDomoticzPlatform.GasDeviceService, Service);
    fixInheritance(eDomoticzPlatform.CurrentUsage, Characteristic);
    fixInheritance(eDomoticzPlatform.UsageDeviceService, Service);
    fixInheritance(eDomoticzPlatform.TodayConsumption, Characteristic);
    fixInheritance(eDomoticzPlatform.Barometer, Characteristic);
    fixInheritance(eDomoticzPlatform.WindSpeed, Characteristic);
    fixInheritance(eDomoticzPlatform.WindChill, Characteristic);
    fixInheritance(eDomoticzPlatform.WindDirection, Characteristic);
    fixInheritance(eDomoticzPlatform.WindDeviceService, Service);
    fixInheritance(eDomoticzPlatform.Rainfall, Characteristic);
    fixInheritance(eDomoticzPlatform.RainDeviceService, Service);
    fixInheritance(eDomoticzPlatform.Visibility, Characteristic);
    fixInheritance(eDomoticzPlatform.VisibilityDeviceService, Service);
    fixInheritance(eDomoticzPlatform.SolRad, Characteristic);
    fixInheritance(eDomoticzPlatform.SolRadDeviceService, Service);
    fixInheritance(eDomoticzPlatform.LocationService, Service);
    homebridge.registerAccessory("homebridge-edomoticz", "eDomoticz", eDomoticzAccessory);
    homebridge.registerPlatform("homebridge-edomoticz", "eDomoticz", eDomoticzPlatform);
};

function eDomoticzPlatform(log, config) {
    this.log = log;
    this.config = config;
    this.server = config.server;
    if (this.server.indexOf(":") > -1 && this.server.indexOf("@") > -1) {
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
        this.authstr = Base64.encode(tmparr[0]);
        this.server = tmparr[1];
    }
    this.ssl = config.ssl;
    this.agOptions = (this.ssl==1) ? {rejectUnauthorized: false}:{};
    this.port = config.port;
    this.room = config.roomid;
}

 /* Handy Utility Functions */
if (!Date.prototype.toISOString) {
  (function() {

    function pad(number) {
      if (number < 10) {
        return '0' + number;
      }
      return number;
    }

    Date.prototype.toISOString = function() {
      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

  }());
}
Date.prototype.addMinutes = function(h) {
  this.setTime(this.getTime() + (h*60*1000));
  return this;
};

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function oneDP(value) {
   var converted = Math.round(value*10)/10;
   var fixed = converted.toFixed(1);
   return parseFloat(fixed);
}

function fixInheritance(subclass, superclass) {
    var proto = subclass.prototype;
    inherits(subclass, superclass);
    subclass.prototype.parent = superclass.prototype;
    for (var mn in proto) {
        subclass.prototype[mn] = proto[mn];
    }
}
/* End of Utility Functions */

/* Define Custom Services & Characteristics */
// PowerMeter Characteristics
eDomoticzPlatform.TotalConsumption = function() {
    var charUUID = 'E863F10C-079E-48FF-8F27-9C2605A29F52'; //uuid.generate('eDomoticz:customchar:TotalConsumption');
    Characteristic.call(this, 'Total Consumption', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
eDomoticzPlatform.TodayConsumption = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:TodayConsumption');
    Characteristic.call(this, 'Today', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
eDomoticzPlatform.CurrentConsumption = function() {
    var charUUID = 'E863F10D-079E-48FF-8F27-9C2605A29F52'; //uuid.generate('eDomoticz:customchar:CurrentConsumption');
    Characteristic.call(this, 'Consumption', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
eDomoticzPlatform.GasConsumption = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:CurrentConsumption');
    Characteristic.call(this, 'Meter Total', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// Custom SetPoint Minutes characteristic for TempOverride modes
eDomoticzPlatform.TempOverride = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:OverrideTime');
    Characteristic.call(this, 'Override (Mins, 0 = Auto, 481 = Permanent)', charUUID);
    this.setProps({
        format: 'float',
        maxValue: 481,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// The PowerMeter itself
eDomoticzPlatform.MeterDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:powermeter:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.CurrentConsumption());
    this.addOptionalCharacteristic(new eDomoticzPlatform.TotalConsumption());
    this.addOptionalCharacteristic(new eDomoticzPlatform.TodayConsumption());
};
// P1 Smart Meter -> Gas
eDomoticzPlatform.GasDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:gasmeter:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.GasConsumption());
};
// Usage Meter Characteristics
eDomoticzPlatform.CurrentUsage = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:CurrentUsage');
    Characteristic.call(this, 'Current Usage', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// The Usage Meter itself
eDomoticzPlatform.UsageDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:usagedevice:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.CurrentUsage());
};
// Location Meter (sensor should have 'Location' in title)
eDomoticzPlatform.LocationService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:location:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new Characteristic.Version());
};
// DarkSkies WindSpeed Characteristic
eDomoticzPlatform.WindSpeed = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:WindSpeed');
    Characteristic.call(this, 'Wind Speed', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies WindChill Characteristic
eDomoticzPlatform.WindChill = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:WindChill');
    Characteristic.call(this, 'Wind Chill', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies WindDirection Characteristic
eDomoticzPlatform.WindDirection = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:WindDirection');
    Characteristic.call(this, 'Wind Direction', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies Virtual Wind Sensor
eDomoticzPlatform.WindDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:winddevice:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.WindSpeed());
    this.addOptionalCharacteristic(new eDomoticzPlatform.WindChill());
    this.addOptionalCharacteristic(new eDomoticzPlatform.WindDirection());
    this.addOptionalCharacteristic(new Characteristic.CurrentTemperature());
};
// DarkSkies Rain Characteristics
eDomoticzPlatform.Rainfall = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:Rainfall');
    Characteristic.call(this, 'Amount today', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies Rain Meter itself
eDomoticzPlatform.RainDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:raindevice:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.Rainfall());
};
// DarkSkies Visibility Characteristics
eDomoticzPlatform.Visibility = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:Visibility');
    Characteristic.call(this, 'Distance', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies Visibility Meter itself
eDomoticzPlatform.VisibilityDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:visibilitydevice:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.Visibility());
};
// DarkSkies Solar Radiation Characteristics
eDomoticzPlatform.SolRad = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:SolRad');
    Characteristic.call(this, 'Radiation', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
// DarkSkies Solar Radiation Meter itself
eDomoticzPlatform.SolRadDeviceService = function(displayName, subtype) {
    var serviceUUID = uuid.generate('eDomoticz:solraddevice:customservice');
    Service.call(this, displayName, serviceUUID, subtype);
    this.addCharacteristic(new eDomoticzPlatform.SolRad());
};
// Barometer Characteristic
eDomoticzPlatform.Barometer = function() {
    var charUUID = uuid.generate('eDomoticz:customchar:CurrentPressure');
    Characteristic.call(this, 'Pressure', charUUID);
    this.setProps({
        format: 'string',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};
/* End of Custom Services & Characteristics */
eDomoticzPlatform.prototype = {
    accessories: function(callback) {
        var that = this;
        var foundAccessories = [];
        var asyncCalls = 0;

        function callbackLater() {
            if (--asyncCalls === 0) callback(foundAccessories);
        }
        this.log("Fetching Domoticz lights and switches...");
        asyncCalls++;
        var domurl;
        var prot = (this.ssl == 1) ? "https://" : "http://";
        domurl = (!(this.room) || this.room === 0) ? prot + this.server + ":" + this.port + "/json.htm?type=devices&used=true&order=Name" : prot + this.server + ":" + this.port + "/json.htm?type=devices&plan=" + this.room + "&used=true&order=Name";
        var myopt;
        if (this.authstr) {
            myopt = {
                'Authorization': this.authstr
            };
        }
        request.get({
            url: domurl,
            agentOptions: this.agOptions,
            headers: myopt,
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                if (json.result !== undefined) {
                    var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        accessory = new eDomoticzAccessory(that.log, that.server, that.port, false, s.Used, s.idx, s.Name, s.HaveDimmer, s.MaxDimLevel, s.SubType, s.Type, s.BatteryLevel, s.authstr, s.SwitchType, s.SwitchTypeVal, prot, s.HardwareTypeVal);
                        foundAccessories.push(accessory);
                    });
                }
                callbackLater();
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    }
};

function eDomoticzAccessory(log, server, port, IsScene, status, idx, name, haveDimmer, maxDimLevel, subType, Type, batteryRef, auth, swType, swTypeVal, prot, hwType) {
    if ((haveDimmer) || (swType == "Dimmer")) {
        if ((hwType!==51)&&(swType!=="On/Off")){
          this.haveDimmer = true;
          this.maxDimLevel = maxDimLevel;
        } else {
            this.haveDimmer = false;
        }
    } else {
        this.haveDimmer = false;
    }
    this.log = log;
    this.server = server;
    this.port = port;
    this.IsScene = IsScene; // Domoticz Scenes ignored for now...
    this.status = status;
    this.idx = idx;
    this.name = name;
    this.subType = subType;
    this.swType = swType;
    this.swTypeVal = swTypeVal;
    this.Type = Type;
    this.batteryRef = batteryRef;
    this.CounterToday = 1;
    this.onValue = "On";
    this.offValue = "Off";
    this.param = "switchlight";
    this.access_url = prot + this.server + ":" + this.port + "/json.htm?";
    this.control_url = this.access_url + "type=command&param=" + this.param + "&idx=" + this.idx;
    this.status_url = this.access_url + "type=devices&rid=" + this.idx;
    this.authstr = (auth) ? auth : '';
}

eDomoticzAccessory.prototype = {
    identify: function(callback) {
        callback();
    },
    setPowerState: function(powerOn, callback) {
        var url, that = this;
        if (powerOn) {
            url = that.control_url + "&switchcmd=On";
            that.log("Setting power state to on");
        } else {
            url = that.control_url + "&switchcmd=Off";
            that.log("Setting power state to off");
        }
        request.put({
            url: url,
            header: {
                'Authorization': 'Basic '+that.authstr
            }
        }, function(err, response) {
            if (err) {
                that.log("There was a problem sending command to" + that.name);
                that.log(response);
            } else {
                that.log(that.name + " sent command succesfully");
            }
            callback();
        }.bind(this));
    },
    getPowerState: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                    var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = (s.Status == "Off") ? 0 : 1;
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getRainfall: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                    var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.Rain + "mm";
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    setdValue: function(level, callback) {
        var url, that = this;
        if (!(that.factor)) {
            request.get({
                url: that.status_url,
                header: {
                    'Authorization': 'Basic '+that.authstr
                },
                json: true
            }, function(err, response, json) {
                if (!err && response.statusCode == 200) {
                    if (json.result !== undefined) {
                        var sArray = sortByKey(json.result, "Name");
                        sArray.map(function(s) {
                            that.factor = 100 / s.MaxDimLevel;
                        });
                    }
                } else {
                    that.log("There was a problem connecting to Domoticz.");
                }
            });
        }
        var dim = (level / that.factor == 15) ? 16 : level / that.factor;
        url = that.control_url + "&switchcmd=Set%20Level&level=" + dim;
        request.put({
            url: url,
            header: {
                'Authorization': 'Basic '+that.authstr
            }
        }, function(err, response) {
            if (err) {
                that.log("There was a problem sending command to" + that.name);
                that.log(response);
            } else {
                that.log(that.name + " sent command succesfully");
            }
            callback();
        }.bind(this));
    },
    getdValue: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                    var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        if (s.Status == "Off") {
                            value = 0;
                        }
                        else {
                            value = s.LevelInt;
                            that.factor = 100 / s.MaxDimLevel;
                            value = value * that.factor;
                        }
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getHueValue: function(type, callback) {        
        // TODO: Wait for Domoticz to add RGB/HSB status to their lights. Return last known value or 'white' for now.

        if (type == 'Hue') {
            callback(null, (this.hueValue !== undefined ? this.hueValue : 0));
        }
        else if (type == 'Saturation') {
            callback(null, (this.saturationValue !== undefined ? this.saturationValue : 0));
        }
        else {
            callback(null, 0);
        }
    },
    setHueValue: function(type, value, callback) {
        var that = this;

        if (type == 'Hue')
        {
            that.hueValue = value;
            that.hueSemaphore = (that.hueSemaphore === undefined ? 0 : that.hueSemaphore + 1);
        }
        else if (type == 'Saturation')
        {
            that.saturationValue = value;
            that.hueSemaphore = (that.hueSemaphore === undefined ? 0 : that.hueSemaphore + 1);
        }

        if (that.hueValue !== undefined && that.saturationValue !== undefined && that.hueSemaphore !== undefined && that.hueSemaphore > 0)
        {
            var parameters = "&hue=" + that.hueValue + "&brightness=100&sat=" + that.saturationValue + "&iswhite=" + (that.saturationValue < 3 && that.hueValue < 3 ? "true" : "false");
            var url = that.control_url.replace(that.param, "setcolbrightnessvalue") + parameters;
            that.hueSemaphore = undefined;
            request.put({
                url: url,
                header: {
                    'Authorization': 'Basic '+that.authstr
                }
            }, function(err, response) {
                if (err) {
                    that.log("There was a problem sending command to" + that.name);
                    that.log(response);
                } else {
                    that.log(that.name + " sent command succesfully");
                }
                callback();
            }.bind(this));
        }
        else {
            callback();
        }
    },
    getValue: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = oneDP(s.Data.replace(/[^\d.-]/g, ''));
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getStringValue: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        if (s.SwitchTypeVal == 2) { //contact
                            if(s.Data=="Closed"){
                              value = Characteristic.ContactSensorState.CONTACT_DETECTED;
                            } else {
                              value = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
                            }
                        } else if (s.SwitchTypeVal == 5) { //smoke
                            if(s.Data=="Off" || s.Data=="Normal"){
                              value = Characteristic.SmokeDetected.SMOKE_NOT_DETECTED;
                            } else {
                              value = Characteristic.SmokeDetected.SMOKE_DETECTED;
                            }
                        } else if (s.SwitchTypeVal == 8) { //motion
                            if(s.Data=="Off"){
                              value = false;
                            } else {
                              value = true;
                            }
                        } else if (that.Type=="Lux") { //motion
                            value = parseInt(s.Data, 10);
                        } else {
                            if (that.name.indexOf("Gas") > -1 && that.Type=="General" && that.subType=="kWh") {
                              value = s.Usage;
                            } else {
                              value = s.Data;
                            }
                        }
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getYLTodayValue: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.CounterToday;
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getYLTotalValue: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = oneDP(s.Counter) + " kWh";
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getWindSpeed: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.Speed;
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getWindChill: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = String(s.Chill);
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getWindDirection: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.Direction + " (" + s.DirectionStr + ")";
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getCPower: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = (that.Type=="Usage" && that.subType=="Electric") ? s.Data : s.Usage;
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getState: function(callback) {
      value = 1;
      this.log("Static Data for "+this.name+": "+value);
      callback(null,value);
    },
    getTemperature: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        var heat = (that.subType=="Zone") ? true : false;
                        var therm = (that.subType=="SetPoint") ? true : false;
                        value = ((heat) || (therm)) ? oneDP(s.SetPoint) : oneDP(s.Temp);
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    setPoint: function(setpoint, callback) {
      var url, that = this;

      if (that.subType == "SetPoint"){
        url = that.access_url + "type=command&param=udevice&idx=" + that.idx;
        url = url + "&nvalue=0&svalue=" + setpoint;
      } else if (that.subType == "Zone"){
        url = that.access_url + "type=setused&idx=" + that.idx + "&setpoint=";
        url = url + setpoint + "&mode=PermanentOverride&used=true";
      }
      that.log("Setting thermostat SetPoint to " + setpoint);

      request.put({
          url: url,
          header: {
              'Authorization': 'Basic '+that.authstr
          }
      }, function(err, response) {
          if (err) {
              that.log("There was a problem sending command to" + that.name);
              that.log(response);
          } else {
              that.log(that.name + " sent command succesfully");
          }
          callback(null, setpoint);
      }.bind(this));
    },
    setTempOverride: function(setuntil, callback) {
      var url, that = this, temp;
      var now = new Date();
      var newnow,isonow;
      var mode;
      if (setuntil < 1) {
        mode = "Auto";
      } else if (setuntil > 480) {
        mode = "PermanentOverride";
      } else {
        mode = "TemporaryOverride";
        newnow = new Date(now.getTime() + (setuntil * 60 * 1000));
        isonow = newnow.toISOString();
      }
      request.get({
          url: that.status_url,
          header: {
              'Authorization': 'Basic '+that.authstr
          },
          json: true
      }, function(err, response, json) {
          if (!err && response.statusCode == 200) {
              var value;
              if (json.result !== undefined) {
                var sArray = sortByKey(json.result, "Name");
                  sArray.map(function(s) {
                      var heat = (that.Type=="Heating" && that.subType=="Zone") ? true : false;
                      var therm = (that.Type=="Thermostat" && that.subType=="SetPoint") ? true : false;
                      temp = (heat || therm) ? oneDP(s.SetPoint) : oneDP(s.Temp);

                      url = that.access_url + "type=setused&idx=" + that.idx + "&setpoint=";
                      url = url + temp + "&mode=" + mode;
                      url = (mode == "TemporaryOverride")? url + "&until=" + isonow + "&used=true" : url + "&used=true";
                      that.log("Setting thermostat SetPoint to " + temp +", mode to " + mode);
                      var putme = request.put({
                          url: url,
                          header: {
                              'Authorization': 'Basic '+that.authstr
                          }
                      }, function(err, response) {
                          if (err) {
                              that.log("There was a problem sending command to" + that.name);
                              that.log(response);
                          } else {
                              that.log(that.name + " sent command succesfully");
                          }
                          callback(null,setuntil);
                      });
                  });
              }
          } else {
              that.log("There was a problem connecting to Domoticz.");
              callback();
          }
        }.bind(this));
    },
    getTempOverride: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        var d1 = new Date(s.Until);
                        var now = new Date().getTime();
                        var diff = d1 - now;
                        value = (diff/(60*1000));
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getHumidity: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = oneDP(s.Humidity);
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getPressure: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = oneDP(s.Barometer) + "hPa";
                    });
                }
                that.log("Data Received for "+that.name+": "+value);
                callback(null, value);
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getLowBatteryStatus: function(callback) {
        var that = this;
        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.BatteryLevel;
                    });
                }
                if (value > 20) {
                    callback(null, 0);
                } else {
                    callback(null, 1);
                }
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    getBlindStatus: function(callback) {
        var that = this;

        if (this.isPercentageBlind) {
            that.getdValue(callback);
            return;
        }

        request.get({
            url: that.status_url,
            header: {
                'Authorization': 'Basic '+that.authstr
            },
            json: true
        }, function(err, response, json) {
            if (!err && response.statusCode == 200) {
                var value;
                if (json.result !== undefined) {
                  var sArray = sortByKey(json.result, "Name");
                    sArray.map(function(s) {
                        value = s.Data;
                    });
                }
                
                if (value == "Open") {
                    callback(null, 100);
                } else {
                    callback(null, 0);
                }
            } else {
                that.log("There was a problem connecting to Domoticz.");
            }
        }.bind(this));
    },
    setBlindStatus: function(blindService, pos, callback) {
        var url, that = this;
        var shouldOpen = (pos <= 50);
        if (that.isInvertedBlind) {
            shouldOpen = !shouldOpen;
        }

        var command = (shouldOpen ? "On" : "Off");

        if (that.isPercentageBlind && pos > 0 && pos < 100)
        {
            that.setdValue(pos, function() {
                blindService.getCharacteristic(Characteristic.CurrentPosition).setValue(pos, false, that);
                callback();
            });
            return;
        }

        url = that.control_url + "&switchcmd=" + command;
        request.put({
            url: url,
            header: {
                'Authorization': 'Basic '+that.authstr
            }
        }, function(err, response) {
            if (err) {
                that.log("There was a problem sending command to" + that.name);
                that.log(response);
            } else {
                that.log(that.name + " sent command succesfully");
            }
            callback();

            blindService.getCharacteristic(Characteristic.CurrentPosition).setValue(pos, false, that);
        }.bind(this));
    },
    getBlindPStatus: function(callback) {
        var that = this;
        callback(null, Characteristic.PositionState.STOPPED);
    },
    getServices: function() {
        var services = [];
        var informationService = new Service.AccessoryInformation();
        informationService.setCharacteristic(Characteristic.Manufacturer, "eDomoticz").setCharacteristic(Characteristic.Model, this.Type).setCharacteristic(Characteristic.SerialNumber, "DomDev" + this.idx);
        services.push(informationService);
        if ((this.Type=="P1 Smart Meter" && this.swTypeVal==1 && this.subType=="Gas")||(this.Type=="General" && this.swTypeVal==2 && this.subType=="Counter Incremental")){
          this.swTypeVal = false; //cludgey fix for a P1 SmartMeter Virtual Sensor being ID'd as a doorbell in Domoticz, and Incremental COunters being id'd as contact switches
        }
        if (typeof this.swTypeVal !=='undefined' && this.swTypeVal){ // is a switch
          switch (true) {
            case this.swTypeVal == 2:{ //contact
              var contactService = new Service.ContactSensor(this.name);
              contactService.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getStringValue.bind(this));
              services.push(contactService);
              break;
            }
            case this.swTypeVal == 5:{ //smoke
              var smokeService = new Service.SmokeSensor(this.name);
              smokeService.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getStringValue.bind(this));
              if (this.batteryRef && this.batteryRef !== 255) { // if batteryRef == 255 we're running on mains
                  smokeService.addCharacteristic(new Characteristic.StatusLowBattery()).on('get', this.getLowBatteryStatus.bind(this));
              }
              services.push(smokeService);
              break;
            }
            case this.swTypeVal == 7:{ //dimmer (and RGBW)
              var lightbulbService = new Service.Lightbulb(this.name);
              lightbulbService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this)).on('get', this.getPowerState.bind(this));
              lightbulbService.addCharacteristic(new Characteristic.Brightness()).on('set', this.setdValue.bind(this)).on('get', this.getdValue.bind(this));

              if (this.subType == "RGBW")
              {
                lightbulbService.addCharacteristic(new Characteristic.Hue()).on('set', this.setHueValue.bind(this, 'Hue')).on('get', this.getHueValue.bind(this, 'Hue'));
                lightbulbService.addCharacteristic(new Characteristic.Saturation()).on('set', this.setHueValue.bind(this, 'Saturation')).on('get', this.getHueValue.bind(this, 'Saturation'));
              }
              
              services.push(lightbulbService);
              break;
            }
            case this.swTypeVal == 8:{ //motion
              var motionService = new Service.MotionSensor(this.name);
              motionService.getCharacteristic(Characteristic.MotionDetected).on('get', this.getStringValue.bind(this));
              if (this.batteryRef && this.batteryRef !== 255) { // if batteryRef == 255 we're running on mains
                  motionService.addCharacteristic(new Characteristic.StatusLowBattery()).on('get', this.getLowBatteryStatus.bind(this));
              }
              services.push(motionService);
              break;
            }
            case this.swTypeVal == 3: //blinds
            case this.swTypeVal == 6: //blinds inv
            case this.swTypeVal == 13: //blinds percentage
            case this.swTypeVal == 16:{ //blinds percentage inv
              this.isInvertedBlind = (this.swTypeVal == 6 || this.swTypeVal == 16);
              this.isPercentageBlind = (this.swTypeVal == 13 || this.swTypeVal == 16);
              var blindService = new Service.WindowCovering(this.name);
              blindService.getCharacteristic(Characteristic.CurrentPosition).on('get', this.getBlindStatus.bind(this));
              blindService.getCharacteristic(Characteristic.TargetPosition).on('get', this.getBlindStatus.bind(this)).on('set', this.setBlindStatus.bind(this, blindService));
              blindService.getCharacteristic(Characteristic.PositionState).on('get', this.getBlindPStatus.bind(this));
              services.push(blindService);
              break;
            }
            /* Following sensors not supported yet...
            case this.swTypeVal == 1:{ //doorbell
              break;
            }
            case this.swTypeVal == 4:{ //x10siren
              break;
            }
            case this.swTypeVal == 9:{ //pushon
              break;
            }
            case this.swTypeVal == 10:{ //pushoff
              break;
            }
            case this.swTypeVal == 11:{ //doorlock
              break;
            }
            case this.swTypeVal == 12:{ //dusk
              break;
            }case this.swTypeVal == 14:{ //venetianus
              break;
            }
            case this.swTypeVal == 15:{ //venetianeu
              break;
            }
            case this.swTypeVal == 17:{ //media
              break;
            }
            ...so instead, default to switch, but check whether switch name contains 'Fan' and if so use Fan Service */
            default:{
                if (this.name.indexOf("Fan") > -1) {
                    var fanService = new Service.Fan(this.name);
                    fanService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this)).on('get', this.getPowerState.bind(this));
                    services.push(fanService);
                    break;
                } else {
                    var switchService = new Service.Switch(this.name);
                    switchService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this)).on('get', this.getPowerState.bind(this));
                    services.push(switchService);
                    break;
                }
            }
          }
        } else { // is a sensor
          switch(true){
            case this.Type == "General" || this.Type == "YouLess Meter" || this.Type == "Current" || this.Type == "UV" || this.Type == "Usage" || this.Type == "Lux":{
              if (this.subType == "kWh" || this.subType == "YouLess counter" || this.subType == "Electric") {
                  var MeterDeviceService = new eDomoticzPlatform.MeterDeviceService("Power Usage");
                  MeterDeviceService.getCharacteristic(eDomoticzPlatform.CurrentConsumption).on('get', this.getCPower.bind(this));
                  if (this.subType == "kWh") {
                      MeterDeviceService.getCharacteristic(eDomoticzPlatform.TotalConsumption).on('get', this.getStringValue.bind(this));
                  } else if (this.subType == "YouLess counter") {
                      MeterDeviceService.getCharacteristic(eDomoticzPlatform.TotalConsumption).on('get', this.getYLTotalValue.bind(this));
                  }
                  if (this.subType !== "Electric"){
                    MeterDeviceService.getCharacteristic(eDomoticzPlatform.TodayConsumption).on('get', this.getYLTodayValue.bind(this));
                  }
                  services.push(MeterDeviceService);
                  break;
              } else if (this.subType == "Percentage") {
                  var UsageDeviceService = new eDomoticzPlatform.UsageDeviceService("Current Usage");
                  UsageDeviceService.getCharacteristic(eDomoticzPlatform.CurrentUsage).on('get', this.getStringValue.bind(this));
                  services.push(UsageDeviceService);
                  break;
              } else if (this.subType == "Visibility") {
                  var VisibilityDeviceService = new eDomoticzPlatform.VisibilityDeviceService("Current Distance");
                  VisibilityDeviceService.getCharacteristic(eDomoticzPlatform.Visibility).on('get', this.getStringValue.bind(this));
                  services.push(VisibilityDeviceService);
                  break;
              } else if (this.subType == "Solar Radiation" || this.subType == "UVN800") {
                  var SolRadDeviceService = new eDomoticzPlatform.SolRadDeviceService("Current radiation");
                  SolRadDeviceService.getCharacteristic(eDomoticzPlatform.SolRad).on('get', this.getStringValue.bind(this));
                  services.push(SolRadDeviceService);
                  break;
              } else if ((this.subType) == "Text" && (this.name.indexOf('Location')>-1)) {
                  var LocationDeviceService = new eDomoticzPlatform.LocationService("Current Location");
                  LocationDeviceService.getCharacteristic(Characteristic.Version).on('get', this.getStringValue.bind(this));
                  services.push(LocationDeviceService);
                  break;
              } else if (this.subType == "Counter Incremental"){
                  var wMeterDeviceService = new eDomoticzPlatform.MeterDeviceService("Water Usage");
                  wMeterDeviceService.getCharacteristic(eDomoticzPlatform.CurrentConsumption).on('get', this.getStringValue.bind(this));
                  services.push(wMeterDeviceService);
                  break;
              } else if (this.subType == "Lux"){
                  var lightSensorService = new Service.LightSensor("Current Luminiscence");
                  lightSensorService.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getStringValue.bind(this));
                  services.push(lightSensorService);
                  break;
              } else {
                  var dMeterDeviceService = new eDomoticzPlatform.MeterDeviceService("Power Usage");
                  dMeterDeviceService.getCharacteristic(eDomoticzPlatform.CurrentConsumption).on('get', this.getStringValue.bind(this));
                  services.push(dMeterDeviceService);
                  break;
              }
              break;
            }
            case this.Type == "Temp" || this.Type == "Temp + Humidity" || this.Type == "Temp + Humidity + Baro":{
                var temperatureSensorService = new Service.TemperatureSensor(this.name);
                temperatureSensorService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getTemperature.bind(this));
                temperatureSensorService.getCharacteristic(Characteristic.CurrentTemperature).setProps({
                    minValue: -50
                });
                if (this.Type == "Temp + Humidity" || this.Type == "Temp + Humidity + Baro") {
                    temperatureSensorService.addCharacteristic(new Characteristic.CurrentRelativeHumidity()).on('get', this.getHumidity.bind(this));
                    if (this.Type == "Temp + Humidity + Baro") {
                        temperatureSensorService.addCharacteristic(new eDomoticzPlatform.Barometer()).on('get', this.getPressure.bind(this));
                    }
                }
                if (this.batteryRef && this.batteryRef !== 255) {
                    temperatureSensorService.addCharacteristic(new Characteristic.StatusLowBattery()).on('get', this.getLowBatteryStatus.bind(this));
                }
                services.push(temperatureSensorService);
                break;
            }
            case this.Type == "Wind":{
                var windService = new eDomoticzPlatform.WindDeviceService(this.name);
                windService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getTemperature.bind(this));
                windService.getCharacteristic(eDomoticzPlatform.WindSpeed).on('get', this.getWindSpeed.bind(this));
                windService.getCharacteristic(eDomoticzPlatform.WindChill).on('get', this.getWindChill.bind(this));
                windService.getCharacteristic(eDomoticzPlatform.WindDirection).on('get', this.getWindDirection.bind(this));
                services.push(windService);
                break;
            }
            case this.Type == "Rain":{
                var rainService = new eDomoticzPlatform.RainDeviceService(this.name);
                rainService.getCharacteristic(eDomoticzPlatform.Rainfall).on('get', this.getRainfall.bind(this));
                services.push(rainService);
                break;
            }
            case this.Type == "Heating" || this.Type == "Thermostat":{
                var HeatingDeviceService = new Service.Thermostat(this.name);
                HeatingDeviceService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get',this.getState.bind(this));
                HeatingDeviceService.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get',this.getState.bind(this));
                HeatingDeviceService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getTemperature.bind(this));
                HeatingDeviceService.getCharacteristic(Characteristic.TargetTemperature).on('get', this.getTemperature.bind(this)).on('set', this.setPoint.bind(this));
                HeatingDeviceService.getCharacteristic(Characteristic.TargetTemperature).setProps({
                    minValue: 4
                });
                if (this.subType == "Zone"){
                  HeatingDeviceService.addCharacteristic(new eDomoticzPlatform.TempOverride()).on('set',this.setTempOverride.bind(this)).on('get',this.getTempOverride.bind(this));
                }
                services.push(HeatingDeviceService);
                break;
              }
            case this.Type == "P1 Smart Meter":{
                if (this.subType == "Gas"){
                  var P1GasMeterDeviceService = new eDomoticzPlatform.GasDeviceService("Gas Usage");
                  P1GasMeterDeviceService.getCharacteristic(eDomoticzPlatform.GasConsumption).on('get', this.getStringValue.bind(this));
                  services.push(P1GasMeterDeviceService);
                } else if (this.subType == "kWh" || this.subType == "Energy") {
                  var P1ElecMeterDeviceService = new eDomoticzPlatform.MeterDeviceService("Power Usage");
                  P1ElecMeterDeviceService.getCharacteristic(eDomoticzPlatform.CurrentConsumption).on('get', this.getCPower.bind(this));
                  P1ElecMeterDeviceService.getCharacteristic(eDomoticzPlatform.TotalConsumption).on('get', this.getStringValue.bind(this));
                  P1ElecMeterDeviceService.getCharacteristic(eDomoticzPlatform.TodayConsumption).on('get', this.getYLTodayValue.bind(this));
                  services.push(P1ElecMeterDeviceService);
                }
                break;
            }
            default:{
              if (this.name.indexOf("Occupied") > -1) {
                        var occServiceB = new Service.OccupancySensor(this.name);
                        occServiceB.getCharacteristic(Characteristic.OccupancyDetected).on('get',this.getPowerState.bind(this));
                        services.push(occServiceB);
                        break;
                 } else {
                        var dswitchService = new Service.Switch(this.name);
                        dswitchService.getCharacteristic(Characteristic.On).on('set', this.setPowerState.bind(this)).on('get', this.getPowerState.bind(this));
                        services.push(dswitchService);
                        break;
                }
            }
          }
        }
        return services;
    }
};
