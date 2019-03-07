'use strict'

var axios = require('axios');
var url = require('url');

var port = process.argv[2] || 8090;
var http = require("http").createServer();
var io = require("socket.io")(http);
var devices = require('./devices.js')(io);

http.listen(port, function () {
  console.log("Starting server on port %s", port);
});

http.on('request', async (req, res) => {
    // Is Execute
    if(/^\/execute/.test(req.url) && req.method === 'POST') {
        let deivce_name = req.url.replace(/^\/execute\/(.*)\/?/, "$1");
        
        let cmd = '';
        req.on('data', chunk => {
            cmd += chunk.toString();
        });
        req.on('end', () => {
            new Promise((resolve, reject) => {
                let device = devices.get(deivce_name, true);
                if(!device) {
                    reject("device "+deivce_name+" not found");
                    return ;
                }

                device.connection.write(cmd.trim()+'\r\n');
                
                let response = "";
                let timeout = null;
                function unsubscribe(multiplier = 1) {
                    clearInterval(timeout);
                    timeout = setTimeout(() => {
                        // Paginate?
                        if(response.endsWith("\r\n --More-- ")) {
                            device.connection.write(Buffer.from('20', 'hex'))
                            unsubscribe()
                            return;
                        }

                        if(response.endsWith("Building configuration...\r\n")) {
                            unsubscribe(5)
                            return;
                        }

                        device.connection.removeListener("data", handler);
                        resolve(response);
                    }, 300*multiplier)
                }
                
                unsubscribe();
                let handler = function(data) {
                    var str = String(data);
                    for (var i = 0; i < str.length; i++) {
                        if(str.charCodeAt(i) == 8) {
                            response = response.slice(0, -1);
                        } else {
                            response += str.charAt(i);
                        }
                    }

                    unsubscribe();
                };

                device.connection.on("data", handler);
            }).then((data) => {
                res.writeHead(200);
                res.end(data);
            }, (err) => {
                res.writeHead(400);
                res.end(err);
            });
        });

        return ;
    }

    // Is GNS Api
    if(/^\/gns_api/.test(req.url)) {
        var query = url.parse(req.url, true).query;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS' ) {
            res.writeHead(200);
            res.end();
            return;
        }
        
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
        devices.advertise(socket);
	});
	socket.on("device_remove", (name) => {
		devices.remove(name).then(() => {
            devices.advertise(socket);
        });
	});
    
    // Send Data
	socket.on("execute", function({cmds, to}) {
        cmds = String(cmds).trim().split('\n');
        
        // Get all
        if (!to) to = devices.get_names()

        // Get specific
        for (var name of to) {
            var device = devices.get(name, true);
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