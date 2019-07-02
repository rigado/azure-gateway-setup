# Gateway sensor setup

Scripts for creating a configuration to be used by the gateway to get sensor data to an azure endpoint and optional validation endpoint

The validation system will consist of a Grafana dashboard and influx database. The sensors can be validated as working by checking the grafana output.
MAC addresses can be compared and expected output can be compared.

### Steps carried out by this:
The gateway will be added to the validation iot hub
A database created on influx for the data from this gateway
A dashboard created on grafana for visualizing this data

### Setup

A configuration file is required for the system to communicate with the required apis.
Create a file called config.json

It should provide the following:

```
{
        "edgedirectUser": "",
        "azureInfluxUrl": "xxx.xxx.xxx.xxx",
        "influxUser": "",
        "influxPass": "",
        "azureGrafanaUrl": "xxx.xxx.xxx.xxx",
        "grafanaUser": "",
        "grafanaPass": "",                
        "azureIoTHubConnectionString": ""
}
```

### Usage
```
node gatewaySetup.js --serial SERIAL_OF_GATEWAY --sensorType "Ruuvi|Minew|iSensor" --iothubCS "[str]" --validate --flash
```

REQUIRED:

--serial This is the serial number of the gateway you are setting up

--sensorType This will setup the pipelines so the data is sent up from the specified sensors. As well if the validation dash is used, the correct panels will be shown on the dash to visualize this data.


OPTIONAL: 

--iothubCS This setting is the IoTHub connection string that you want the data to go to on your backend. This is optional. If this value is not specified data will not be sent anywhere else. This is used as an optional addition to the validation endpoint.

--validate This flag is to specify that you want to use the validation option. This will setup the grafana dashboard, influx database, and pipelines to send the data there.

--flash This flag will kick off the flash of the config to the gateway. If specified it will run the command to send the configuration to your gateway for you. Otherwise remember to flash the file that is provided yourself.


After the script executes you will be left with the config file specified ready to flash to the gateway for configuring it.
i.e. 

```
rigado gateway configure C032031826-00037 --filename C032031826-00037-pipelines.json -i peter+solutions@rigado.com
```

