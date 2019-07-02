var Q = require('q');
var iothub = require('azure-iothub');

module.exports = function(serial, connectionString) {
    
    function getHostName() {
        let result = connectionString.match(/^HostName=([^=]+);/);
        return result ? result[1] : "";
    }

    this.getFilter = function(connectionString) {
        return `{
            "type": "azureiot",
            "config": {
                "connectionString":"${connectionString}"
            }            
        }`;
    }

    this.buildFilter = function(deviceInfo) {

        var hostName = getHostName();
        var connectionString = `HostName=${hostName};DeviceId=${serial};SharedAccessKey=${deviceInfo.authentication.symmetricKey.primaryKey}`;
        
        return this.getFilter(connectionString);
    }

    //add a device and create keys
    this.addDevice = function(serial) { 
        var d = Q.defer();
       
        var registry = iothub.Registry.fromConnectionString(connectionString);
         
        // Create a new device
        var device = {
            deviceId: `${serial}`
        };
         
        registry.create(device, function(err, deviceInfo, res) {
            if (err) { 
                console.log(' error: ' + err.toString()); 
                d.resolve(null);
            }
            if (deviceInfo) {
                d.resolve(deviceInfo);
            }
        });

        return d.promise;
    }
    
    //register device
    //returns a filter that can be used with edge connect 
    this.setupGateway = function() {
        
        var d = Q.defer();
                
        addDevice(serial).then(function(deviceData) {
            d.resolve(this.buildFilter(deviceData));
        }).fail(function (error) {
            console.log(error);
        });;

        return d.promise;
    }

    return this;
}