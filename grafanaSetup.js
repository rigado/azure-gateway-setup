var http = require('http');
var Q = require('q');
var fs = require('fs');

module.exports = function(grafanaUrl, adminUser, adminPass) {
    
    var auth = "Basic " + new Buffer(`${adminUser}:${adminPass}`).toString("base64");

    this.starDash = function(userName, userPass, dashID) {
        var deferred = Q.defer();

        //starDash

        var userAuth = "Basic " + new Buffer(`${userName}:${userPass}`).toString("base64");

        var post_options = {
            host:  `${grafanaUrl}`,
            port: 3000,
            path: `/api/user/stars/dashboard/${dashID}`,
            method: 'POST',
            headers: {
                "Authorization" : userAuth,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'cache-control': 'no-cache'
            }
        };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {                    
                data += chunk;
            });
    
            res.on('end', function() {                
                deferred.resolve(data);
            });
    
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
                context.done(null, 'FAILURE');
            });      
        });
    
        post_req.end();  
    
        return deferred.promise;      
    }

    this.grantPermission = function(userID, dashID) {
        var deferred = Q.defer();
    
        console.log("grant perms");

        var post_options = {
            host:  `${grafanaUrl}`,
            port: 3000,
            path: `/api/dashboards/id/${dashID}/permissions`,
            method: 'POST',
            headers: {
                "Authorization" : auth,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'cache-control': 'no-cache'
            }
        };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {                    
                data += chunk;
            });
    
            res.on('end', function() {                
                deferred.resolve(data);
            });
    
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
                context.done(null, 'FAILURE');
            });      
        });
    
        var permissions = {
            "items": [                           
                {
                "role": "Editor",
                "permission": 2
                },
                {
                "userId": userID,
                "permission": 1
                }
            ]
        }
    
        // post the data
        post_req.write(JSON.stringify(permissions));
        post_req.end();  
    
        return deferred.promise;        
    }

    this.updateDash = function(json) {
        var deferred = Q.defer();
    
        var auth = "Basic " + new Buffer(`${adminUser}:${adminPass}`).toString("base64");
        var dashData = {       
            "folderId": 0,
            "overwrite": false
        }
    
        if(json != null) {
            dashData["dashboard"] = json;
        }
        else {
            dashData["dashboard"] = {
                "id": null,
                "uid": null,
                "title": "Title",
                "tags": [ "templated" ],
                "timezone": "browser",
                "schemaVersion": 16,
                "version": 0
              }
        }
    
        var post_options = {
            host: `${grafanaUrl}`,
            port: 3000,
            path: '/api/dashboards/db',
            method: 'POST',
            headers: {
                "Authorization" : auth,
                'Accept': 'application/json',
                'Content-Type': 'application/json'            
            }
          };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {                    
                data += chunk;            
            });
    
            res.on('end', function() {
                //resolve promise
                deferred.resolve(data);
            });
    
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
                context.done(null, 'FAILURE');
            });      
        });

        // post the data
        post_req.write(JSON.stringify(dashData));
        post_req.end();      
    
        return deferred.promise;
    }

    function addPanels(source, template) {
        //load from the local template file
        var sourceTemplate = fs.readFileSync(`templates/grafana/sensors/${source}.json`, 'utf8');
        var panels = JSON.parse(sourceTemplate);

        for(var i in panels.panels) {            
            template.panels.push(panels.panels[i]);            
        }
    }

    this.setupValidationDash = function(sensorType, serial) {
        var d = Q.defer();

        //load the template
        var template = fs.readFileSync('templates/grafana/validationDash.json', 'utf8');

        //convert to json        
        var template = JSON.parse(template);        

        if(!Array.isArray(sensorType)) {
            sensorType = [ sensorType ];
        }

        //get the sensor panels
        for(var i in sensorType) {
            addPanels(sensorType[i], template);
        }

        //set a few options                   
        template.title = serial;

        //swap out the data sources
        for(var i in template.templating.list) {
            template.templating.list[i].datasource = `${serial}`;
        }

        for(var i in template.panels) {
            template.panels[i].datasource = `${serial}`;
        }

        //create a new dashboard
        updateDash(template).then(function(dashdata) {
            var data = JSON.parse(dashdata);
            d.resolve(data.id);
        });

        return d.promise;
    };

    this.setupUser = function(username, email, pass) {
        var deferred = Q.defer();
    
        var post_options = {
            host: `${grafanaUrl}`,
            port: 3000,
            path: '/api/admin/users',
            method: 'POST',
            headers: {
                "Authorization" : auth,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'cache-control': 'no-cache'
            }
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {                    
                data += chunk;
            });
    
            res.on('end', function() {
                console.log(`Created grafana user with login ${username}/${pass}`)

                deferred.resolve(JSON.parse(data).id);
            });
    
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
                context.done(null, 'FAILURE');
            });      
        });
    
        var userData = {
            "name":username,
            "email":email,
            "login":username,
            "password": (pass === undefined ? "qwe123" : pass)
        };

        // post the data
        post_req.write(JSON.stringify(userData));
        post_req.end();  
    
        return deferred.promise;
    }

    this.setupDataSource = function(serial, influxUrl, influxUser, influxPass) {
        var deferred = Q.defer();

        var post_options = {
            host: `${grafanaUrl}`,
            port: 3000,
            path: '/api/datasources',
            method: 'POST',
            headers: {
                "Authorization" : auth,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'cache-control': 'no-cache'
            }
        };
    
        // Set up the request
        var post_req = http.request(post_options, function(res) {
            var data = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {                    
                data += chunk;
            });
    
            res.on('end', function() {
                deferred.resolve(JSON.parse(data));
            });
    
            res.on('error', function (e) {
                console.log("Got error: " + e.message);
                context.done(null, 'FAILURE');
            });      
        });
        
        var dataSource = {
            "access": "proxy",
            "basicAuth": false,
            "basicAuthPassword": "",
            "basicAuthUser": "",
            "database": `${serial}`,
            "isDefault": false,
            "jsonData": {keepCookies: []},
            "name": `${serial}`, 
            "password": `${influxPass}`,
            "readOnly": false,
            "secureJsonFields": {},
            "type": "influxdb",
            "typeLogoUrl": "",
            "url": `http://${influxUrl}:8086`,
            "user": `${influxUser}`,
            "withCredentials": false
        }

        // post the data
        post_req.write(JSON.stringify(dataSource));
        post_req.end();  
    
        return deferred.promise;
    }

    this.setupGateway = function(influxUrl, influxUser, influxPass, sensorType, serial) {
        var d = Q.defer();

        //need to wait till they are all done then 
        Q.all([setupDataSource(serial, influxUrl, influxUser, influxPass)]).then(function(data) {                   
            setupValidationDash(sensorType, serial).then(function(dashid) {
                console.log("2");
                d.resolve();                
            });            
        });
                
        return d.promise;
    }

    return this;
}