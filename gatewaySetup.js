var Q = require('q');
var azuresetup = require("./azureSetup.js");
var grafanasetup = require("./grafanaSetup.js");
var influxsetup = require("./influxSetup.js");
var fs = require('fs');
const shellExec = require('shell-exec')

if (!fs.existsSync('config.json')) {
    console.log("Config file is missing. Please create a config.json file in the root directory of this script.");
}

var config = JSON.parse(fs.readFileSync('config.json', 'utf8')); 
var validSensors = "Ruuvi|Minew|iSensor";

const argv = require('yargs')
                .usage('Usage: $0 --serial "[str]" --sensorType "Ruuvi|Minew|iSensor" --iothubCS "[str]" --validate --flash')
                .demandOption(['serial','sensorType'])
                .argv

//validate the values given
var sensors = argv.sensorType.split("|");

for(var s in sensors) {
    if(!validSensors.includes(sensors[s])) {
        //invalid
        console.log(`Error invalid sensor supplied ${sensors[s]}`);
        return;
    }
}

if(argv.iothubCS == "") {
    console.log("iothubCS was blank. Please provide the connection string to your IoT Hub.");
    return;
}

if(argv.serial == "") {
    console.log("serial was blank. Please provide the serial number of your gateway.");
}

if(config.edgedirectUser === undefined || config.edgedirectUser == null || config.edgedirectUser == "") {
    console.log("Config key edgedirectUser was not defined. Please provide this value in the config.json file.");
}

if(config.azureInfluxUrl === undefined || config.azureInfluxUrl == null || config.azureInfluxUrl == "") {
    console.log("Config key azureInfluxUrl was not defined. Please provide this value in the config.json file.");
}

if(config.influxUser === undefined || config.influxUser == null || config.influxUser == "") {
    console.log("Config key influxUser was not defined. Please provide this value in the config.json file.");
}

if(config.influxPass === undefined || config.influxPass == null || config.influxPass == "") {
    console.log("Config key influxPass was not defined. Please provide this value in the config.json file.");
}

if(config.azureGrafanaUrl === undefined || config.azureGrafanaUrl == null || config.azureGrafanaUrl == "") {
    console.log("Config key azureGrafanaUrl was not defined. Please provide this value in the config.json file.");
}

if(config.grafanaUser === undefined || config.grafanaUser == null || config.grafanaUser == "") {
    console.log("Config key grafanaUser was not defined. Please provide this value in the config.json file.");
}

if(config.grafanaPass === undefined || config.grafanaPass == null || config.grafanaPass == "") {
    console.log("Config key grafanaPass was not defined. Please provide this value in the config.json file.");
}

if(config.azureIoTHubConnectionString === undefined || config.azureIoTHubConnectionString == null || config.azureIoTHubConnectionString == "") {
    console.log("Config key azureIoTHubConnectionString was not defined. Please provide this value in the config.json file.");
}

var azure = azuresetup(argv.serial, config.azureIoTHubConnectionString);

//pull up the config template
var data = fs.readFileSync('templates/edge-connect/configtemplate.json').toString();

if(!data || data == "" || data == null || data === undefined) {
    console.log("Error could not find the template file");
    return;
}

//get the pipeline template
var pipelineTemplate = fs.readFileSync(`templates/edge-connect/pipeline.json`).toString();

var configData = JSON.parse(data);
          
function addPipelines(pipelinesubtext, hostFilter) {

    //add the sensor filters    
    for(var s in sensors) {
        let sensorData = fs.readFileSync(`templates/edge-connect/${sensors[s]}.json`).toString();

        if(sensorData && sensorData!= "") {
            let sensorObj = JSON.parse(sensorData);

            //add the filter
            configData.apps['rigado-edge-connect'].values.service.filters[`${sensors[s]}f`] = sensorObj;

            let pipelineObj = JSON.parse(pipelineTemplate);
           
            //configure the pipeline
            pipelineObj.filters[1] = `${sensors[s]}f`;

            //get the host filter
            pipelineObj.filters[5] = hostFilter;

            //add the pipeline
            configData.apps['rigado-edge-connect'].values.service.pipelines[`${sensors[s]}-${pipelinesubtext}`] = pipelineObj;
        }
    }
}

//process to run after setting up the host 
function setupValidation(grafanaUrl, influxUrl, hostFilter) {        
    let filterObj = JSON.parse(hostFilter);

    //add the host filter
    configData.apps['rigado-edge-connect'].values.service.filters.azureValidationf = filterObj;

    addPipelines("validation-pipeline", "azureValidationf");

    //configure influx
    //create a database on the influx server for our data
    influxsetup(influxUrl, config.influxUser, config.influxPass).addDatabase(argv.serial);

    //configure grafana
    grafanasetup(grafanaUrl, config.grafanaUser, config.grafanaPass).setupGateway(influxUrl, config.influxUser, config.influxPass, argv.sensorType.split("|"), argv.serial);
}

function setupDataPipeline() {    

    //add the host filter
    configData.apps['rigado-edge-connect'].values.service.filters.azuref = JSON.parse(azure.getFilter(argv.iothubCS));

    //add sensor pipelines
    addPipelines("data-pipeline", "azuref");
}

function flashGateway() {
    //call the rigado app, and flash the gateway, this will assume they are logged into the app
    shellExec(`rigado gateway configure ${argv.serial} --impersonate ${config.edgedirectUser} --filename configfiles/${argv.serial}-pipelines.json`);
}

let promises = [];

//if there is a validation setup here
if(argv.validate) {
    promises.push(function() {
        var d = Q.defer();
        azure.setupGateway().then(function(filter) {
            setupValidation(config.azureGrafanaUrl, config.azureInfluxUrl, filter, 'azuref');
            console.log(`Grafana setup view validation graph at ${azureGrafanaUrl}`);
            d.resolve();
        });
        return d.promise;
    }());
}

//if we are just making a basic config file
if(argv.iothubCS) {
    promises.push(setupDataPipeline());
}

Q.allSettled(promises).then(function() {

    //write the config file
    fs.writeFile(`configfiles/${argv.serial}-pipelines.json`, JSON.stringify(configData,null,'\t'), (err) => {});

    //validate the config
    if (!fs.existsSync('configcheck.exe')) {
        shellExec(`configCheck.exe configfiles/${argv.serial}-pipelines.json`).then(function(out) {

            console.log(out);

            if(out.stdout.includes("FAIL")) {
                console.log("Something went wrong with the configuration. The refer to the error stated above");
                return;
            }

            //flash the file to the gateway?
            if(argv.flash) {
                flashGateway();
            }
            
        })
    }
    else if(argv.flash) {
        //flash the file to the gateway?        
        flashGateway();        
    }

    console.log(`Setup Complete, use config file configfiles/${argv.serial}-pipelines.json`);
});

