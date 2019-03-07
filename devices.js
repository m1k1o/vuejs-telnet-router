var net = require('net')

module.exports = function(io) {
    var devices = {};

    this.add = function(name, host, port){
        var params = {host, port};
        var connection = net.createConnection(params);
        
        connection.on("data", (data) => {
            io.to(name).emit("terminal_data", ''+data);
        });

        connection.on('error', (error) => {
            !devices[name] || (devices[name].status = 'error');
            this.advertise();
        })

        connection.on('close', () => {
            !devices[name] || (devices[name].status = 'closed');
            this.advertise();
        })

        connection.on('ready', () => {
            connection.write('\r\n')
            !devices[name] || (devices[name].status = 'ready');
            this.advertise();
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

    this.remove = function(name){
        if(name in devices) {
            return new Promise(resolve => {
                devices[name].connection.end()
                delete devices[name];
                resolve()
            })
        }
    }

    this.advertise = function(socket = null){
        var obj = {};
        for (const device in devices) {
            if (devices.hasOwnProperty(device)) {
                var {name, host, port, status} = devices[device];
                obj[device] = {name, host, port, status}
            }
        }

        if(socket === null) {
            io.sockets.emit("devices", obj);
        } else {
            socket.emit("devices", obj);
        }
    }

    this.get = function(name, running = false){
        if(!(name in devices)) {
            return null;
        }

        var device = devices[name];
        if(running && device.status !== 'ready') {
            return null;
        }
        
        return device;
    }

    this.put = async function(input){
        // Remove all
        for(var name in devices) {
            await this.remove(name)
        }
        
        for(var dev of input) {
            var {name, host, port} = dev;
            this.add(name, host, port);
        }
    }

    this.get_names = function(){
        return Object.keys(devices);
    }

    return this;
}
