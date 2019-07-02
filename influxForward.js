var querystring = require('querystring');
var http = require('http');

module.exports = function (context, IoTHubMessages) {
    IoTHubMessages.forEach(message => {
        context.log(message);

        try {
            //parse the incoming data into something that can be stored
            //use the detectedBy as the table name
            var post_data = "";
            
            //the database name we will use
            var id = "";

            var reservedKeys = [ "mac", "timestamp", "serial", "id", "mfg", "flags", "uuid", "connectable" ];
            
            for(var mac in message) {
                id = message[mac].serial;                            
                post_data += message[mac].serial +
                    ",macAddress=" + mac + " "

                for(var key in message[mac]) {            
                                                                                
                    if(message[mac][key]) {
                        if(!reservedKeys.includes(key)) {
                            //check if is an array
                            if(Array.isArray(message[mac][key])) {
                                for(var k in message[mac][key]) {
                                    if(!reservedKeys.includes(k)) {
                                        post_data += key + k + "=" + message[mac][key][k] + ","
                                    }
                                }
                            }
                            else if(typeof message[mac][key] === 'object') {
                                for(var k in message[mac][key]) {
                                    if(!reservedKeys.includes(k)) {
                                        post_data += key + k + "=" + message[mac][key][k] + ","
                                    }
                                }
                            }
                            else {                                                     
                                post_data += key + "=" + message[mac][key] + ","
                            }
                        }                            
                    }                                        
                }

                post_data = post_data.substring(0, post_data.length - 1);
                post_data += " " + (message[mac].timestamp * 1000) + "\n";
            }

            if(post_data != "" && id != "") {

                //An object of options to indicate where to post to
                var post_options = {
                    host: process.env.influxurl,
                    port: 8086,
                    path: `/write?db=${id}&p=S0lutions&u=admin&precision=ms`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(post_data)
                    }
                };

                //context.log(post_options);
                
                // Set up the request
                var post_req = http.request(post_options, function(res) {
                    res.setEncoding('utf8');                
                    res.on('end', function (e) {
                        context.log("result: " + e.message);            
                    });        
                    res.on('error', function (e) {
                        context.log("Got error: " + e.message);            
                    });        
                });
                
                context.log(post_data);

                // post the data
                post_req.write(post_data);
                post_req.end();
            }
        }
        catch(ex) {
            context.log("An Error occured");
            context.log(ex.message)
        }

        context.done();
    });
};