var mqtt = require('mqtt');
var platform;
var accessories = [];
var client;
var retryCount = 0;
var exceptions = [];
var config = {host: "", port: 0, credentials: false, channel: "", exceptions: "" };

module.exports = {
  Mqtt: Mqtt
}

function Mqtt(aPlatform, host, port, channel, credentials) {
  platform = aPlatform;
  platform.accessories(function(rawAccessories) {
    for (var i = 0; i < rawAccessories.length; i++)
    {
      var accessory = rawAccessories[i];
      accessories["idx_" + accessory.idx] = accessory;
    }

    config = {host: host, port: port, credentials: credentials, channel: channel};
    if (typeof config.credentials === 'undefined' || typeof config.credentials.username === 'undefined' || config.credentials.username.length == 0) {
      config.credentials = false;
    }
    this.connect();
  }.bind(this));
}

Mqtt.prototype.connect = function() {
    var connectOptions = {
    host: config.host,
    port: config.port
  };

  if (config.credentials)
  {
    connectOptions.username = config.credentials.username;
    connectOptions.password = config.credentials.password;
  }

  client = mqtt.connect(connectOptions);

  client.on('connect', function() {
    platform.forceLog("Successfully connected to MQTT broker.");
    client.subscribe(config.channel);
  });

  client.on('close', function(error) {
    if (retryCount == 5)
    {
      client.end(true, function() {
        this.error();
      }.bind(this));
      retryCount = 0;
      return;
    }

    platform.forceLog("Retrying connection to MQTT broker... (" + (retryCount + 1) + "/5)");
    retryCount++;
  }.bind(this));

  client.on('error', function(error) {
    client.end(true, function() {
      this.error(error);
    }.bind(this));
    retryCount = 0;
  }.bind(this));

  client.on('message', function (topic, buffer) {
    var message = JSON.parse(buffer.toString());
    if (typeof message.nvalue !== 'undefined' || typeof message.svalue1 !== 'undefined') {
      var accessory = accessories["idx_" + message.idx];
      if (!accessory) {
        return;
      }

      accessory.handleMQTTMessage(message, function(characteristic, value) {
        if (typeof value !== 'undefined' && typeof characteristic !== 'undefined') {
          characteristic.setValue(value, null, "eDomoticz-MQTT");
        }
      });

    } else {
		  platform.log('[ERR] MQTT message received, but no nvalue or svalue1 was found:');
		  platform.log(message);
	  }
  });
}

Mqtt.prototype.send = function(message) {
  if (client)
  {
    var payload = message;
    if (typeof payload !== 'string') {
      payload = JSON.stringify(payload);
    }
    client.publish('domoticz/in', payload);
  }
}

Mqtt.prototype.error = function(error) {
  var logMessage = "Could not connect to MQTT broker! (" + config.host + ":" + config.port + ")\n";

  if (config.credentials !== false) {
    logMessage += "Note: You're using a username and password to connect. Please verify your username and password too.\n";
  }

  if (error) {
    logMessage += error;
  }

  platform.forceLog(logMessage);
};
