'use strict'

var Telnet = require('telnet-client')

var port = process.argv[2] || 8090;
var http = require("http").createServer();
var io = require("socket.io")(http);

http.listen(port, function () {
  console.log("Starting server on port %s", port);
});

var devices = {};
function Deivce_Add(name, host, port){
    var connection = new Telnet()
    var params = {
        host,
        port,
        shellPrompt: '#',
        timeout: 500,
        ors: '\r\n',
        waitfor: '\n'
    };
    
    connection.on("data", function(data){
        io.to(name).emit("terminal_data", ''+data);
    });

    connection.on('error', function(error) {
        devices[name].status = 'error';
        Devices();
    })

    connection.on('close', function() {
        devices[name].status = 'closed';
        Devices();
    })

    connection.on('ready', function(prompt) {
        devices[name].status = 'ready';
        Devices();
    })

    devices[name] = {
        connection,
        params,
        host,
        port,
        status: 'waiting...'
    };

    return connection.connect(params);
}

function Deivce_Remove(name){
    if(name in devices) {
        return devices[name].connection.end().then(() => {
            delete devices[name];
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
                    device.connection.send(cmd.trim()+'\r\n');
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