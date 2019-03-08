'use strict'

var axios = require('axios');
var url = require('url');

var port = process.argv[2] || 8090;
var http = require("http").createServer();
var io = require("socket.io")(http);
var devices = require('./devices.js')(io);
var configs = require('./configs.js')(devices);

http.listen(port, function () {
  console.log("Starting server on port %s", port);
});

http.on('request', async (req, res) => {
    let m;

    // Set CORS headers
    var CROS = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', '*');
    }

    if (req.method === 'OPTIONS' ) {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Is Execute
    if(/^\/execute/.test(req.url) && req.method === 'POST') {
        CROS();
        let deivce_name = req.url.replace(/^\/execute\/(.*)\/?/, "$1");
        
        let cmd = '';
        req.on('data', chunk => {
            cmd += chunk.toString();
        });
        req.on('end', () => {
            devices.execute(deivce_name, cmd).then((data) => {
                res.writeHead(200);
                res.end(JSON.stringify(rc2json(data)));
            }, (err) => {
                res.writeHead(400);
                res.end(String(err));
            });
        });

        return ;
    }

    // Get running config
    if(/^\/running_config/.test(req.url)) {
        CROS();
        let deivce_name = req.url.replace(/^\/running_config\/(.*)\/?/, "$1");
        
        //deivce_name.connection.write("end\r\n");
        configs.get_rc(deivce_name).then((running_config) => {
            res.writeHead(200);
            res.end(JSON.stringify(running_config, null, 4));
        }, (err) => {
            res.writeHead(400);
            res.end(String(err));
        });

        return ;
    }

    // Get update|load configs
    if(null !== (m = req.url.match(/^\/configs\/(update|load)(?:\/(.*?)){0,2}\/?$/))) {
        CROS();
        
        if(m[1] == "update") {
            if(m[3]) {
                var promise = configs.update(m[2], m[3]);
            } else {
                var promise = configs.update_all(m[2]);
            }

            promise.then((data) => {
                res.writeHead(200);
                res.end(JSON.stringify(data, null, 4));
            }, (err) => {
                res.writeHead(400);
                res.end(JSON.stringify(err));
            });
        }
        
        if(m[1] == "load") {
            var data = configs.load(m[2], m[3]);

            res.writeHead(200);
            res.end(JSON.stringify(data, null, 4));
        }

        return ;
    }

    // Is GNS Api
    if(/^\/gns_api/.test(req.url)) {
        CROS();
        var query = url.parse(req.url, true).query;

        res.writeHead(200, {'Content-Type': 'text/json'});

        try {
            var axios_resp = await axios.get(query.url , {
                auth: {
                    username: query.username,
                    password: query.password
                }
            })
            
            res.end(JSON.stringify({
                error: false,
                data: axios_resp.data
            }));
        } catch (error) {
            res.end(JSON.stringify({
                error: true,
                message: String(error)
            }));
        }
        return ;
    }
});


io.sockets.on("connection", function(socket) {
    console.log("New connection!");
    
    // Terminal Device
    var terminal_device = null;
    socket.on('terminal_set', function(device) {
        if (terminal_device != null) {
            socket.leave(terminal_device);
        }
        
        if (device != null) {
            socket.join(device);
        }

        terminal_device = device;
        socket.emit("terminal_device", device);
    });

    // Devices
    devices.advertise(socket);
	socket.on("devices", () => {
        devices.advertise(socket);
    });
	socket.on("devices_put", async (input) => {
        devices.put(input);
        devices.advertise(socket);
	});
	socket.on("device_add", ({name, host, port}) => {
		devices.add(name, host, port);
        devices.advertise(socket, name);
	});
	socket.on("device_remove", (name) => {
		devices.remove(name).then(() => {
            devices.advertise(socket, name);
        });
    });
    
    // Confgis
    socket.emit("configs", configs.load());
    
    // Send Data
	socket.on("execute", function({cmds, to}) {
        cmds = String(cmds).trim().split('\n');
        
        // Get all
        if (!to) to = devices.get_names()

        // Get specific
        for (var name of to) {
            var device = devices.by_name(name, true);
            if(device) {
                for (var cmd of cmds) {
                    device.connection.write(cmd.trim()+'\r\n');
                }
            }
        }
	});
    
    // Disconnect
	socket.on("disconnect", function() {
        console.log("Got disconnect!");
        
        if (terminal_device != null) {
            socket.leave(terminal_device);
        }
	});
});