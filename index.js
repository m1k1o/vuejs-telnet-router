'use strict'

var net = require('net')
var axios = require('axios');
var url = require('url');

var port = process.argv[2] || 8090;
var http = require("http").createServer();
var io = require("socket.io")(http);

http.listen(port, function () {
  console.log("Starting server on port %s", port);
});

http.on('request', async (req, res) => {
    // Is GNS Api
    if(!/^\/gns_api/.test(req.url)) {
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

var devices = {};
function Deivce_Add(name, host, port){
    var params = {host, port};
    var connection = net.createConnection(params);
    
    connection.on("data", function(data){
        io.to(name).emit("terminal_data", ''+data);
    });

    connection.on('error', function(error) {
        !devices[name] || (devices[name].status = 'error');
        Devices();
    })

    connection.on('close', function() {
        !devices[name] || (devices[name].status = 'closed');
        Devices();
    })

    connection.on('ready', function() {
        connection.write('\r\n')
        !devices[name] || (devices[name].status = 'ready');
        Devices();
    })

    devices[name] = {
        connection,
        params,
        host,
        port,
        status: 'waiting...'
    };

    return connection;
}

function Deivce_Remove(name){
    if(name in devices) {
        return new Promise(resolve => {
            devices[name].connection.end()
            delete devices[name];
            resolve()
        })
    }
}

function Devices(){
    var obj = {};
    for (const device in devices) {
        if (devices.hasOwnProperty(device)) {
            var {name, host, port, status} = devices[device];
            obj[device] = {name, host, port, status}
        }
    }
    io.sockets.emit("devices", obj);
}

function Deivce_Get(name, running = false){
    if(!(name in devices)) {
        return null;
    }

    var device = devices[name];
    if(running && device.status !== 'ready') {
        return null;
    }
    
    return device;
}

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
    Devices();
	socket.on("devices", () => {
        Devices();
    });
	socket.on("devices_put", async (input) => {
        // Remove all
        for(var name in devices) {
            await Deivce_Remove(name)
        }
        
        for(var dev of input) {
            var {name, host, port} = dev;
            Deivce_Add(name, host, port);
        }
        
        Devices();
	});
	socket.on("device_add", ({name, host, port}) => {
		Deivce_Add(name, host, port);
        Devices();
	});
	socket.on("device_remove", (name) => {
		Deivce_Remove(name).then(() => {
            Devices();
        });
	});
    
    // Send Data
	socket.on("execute", function({cmds, to}) {
        cmds = String(cmds).trim().split('\n');
        
        // Get all
        if (!to) to = Object.keys(devices);

        // Get specific
        for (var name of to) {
            var device = Deivce_Get(name, true);
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