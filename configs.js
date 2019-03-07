var rc2json = require('./rc2json.js');

function Config(devices) {
    var cmds = {
        running_config: {
            cmd: "show running-config",
            transform: (data) => rc2json(data)
        }
    }

    var configs = {};
    for (const struct in cmds) {
        configs[struct] = {};
    }
    
    this.update = function(type, device_name){
        if(!(type in cmds)){
            return new Promise((resolve, reject) => {
                reject(type + " is not in cmds.");
            })
        }

        let device = devices.by_name(device_name);
        if(device) device.connection.write("end\r\n");
            
        return devices.execute(device_name, cmds[type].cmd).then((data) => {
            return configs[type][device_name] = cmds[type].transform(data)
        })
    }
    
    this.update_all = function(type){
        var device_names = devices.get_names();

        var promises = [];
        for(let dev of device_names) {
            promises.push(this.update(type, dev));
        }
        
        return Promise.all(promises).then(() => {
            return configs[type];
        });
    }
    
    this.load = function(type = null, device_name = null){
        if(type == null) return configs;
        if(device_name == null) return configs[type];

        if(device_name in configs[type]) {
            return configs[type][device_name];
        }

        return null;
    }
    
    return this;
}

module.exports = function(devices){
    return Config(devices)
}