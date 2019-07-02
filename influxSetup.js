var http = require('http');

module.exports = function(influxURL, user, pass) {
    
    //create a database on the influx server
    this.addDatabase = function(databaseName) {
        var post_options = {
            host: `${influxURL}`,
            port: 8086,
            path: `/query?q=CREATE%20DATABASE%20%22${databaseName}%22&p=${pass}&u=${user}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'                
            }
        };

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

        post_req.end();
    }

    return this;
}