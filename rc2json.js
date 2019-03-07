function rc2json(running_config, debug = false) {
    running_config = running_config.replace(/[\n\r]+\!/g, "");
    var lines = running_config.split(/[\n\r]+/);
    
    var state = "start";
    var state_data = {};

    var result = {
        interfaces: {},
        router: {}
    };
    for(let i in lines) {
        var line = lines[i];

        /* INITIALIZE */
        if(null !== (m = line.match(/^interface (.*)$/))) {
            state = "interface";
            state_data = {
                running: true
            };
            
            result.interfaces[m[1]] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^router eigrp (.*)$/))) {
            state = "router eigrp";
            state_data = {
                as_number: m[1],
                networks: []
            };

            result.router["eigrp"] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^router ospf (.*)$/))) {
            state = "router ospf";
            state_data = {
                process_id: m[1],
                networks: []
            };

            result.router["ospf"] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^router bgp (.*)$/))) {
            state = "router bgp";
            state_data = {
                as_number: m[1],
                networks: [],
                neighbors: {}
            };

            result.router["bgp"] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^route-map (.*) (deny|permit) (.*)$/))) {
            state = "route-map";
            state_data = {
                type: m[2],
                seq: m[3]
            };

            if(typeof result.route_maps === 'undefined') result.route_maps = {};
            result.route_maps[m[1]] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^ip prefix-list (.*) seq (.*) (deny|permit) (.*)(?: (ge|le) (.*))?$/))) {
            var obj = {
                type: m[3],
                prefix: m[4]
            };

            if(m[5]){
                obj[m[5]] = m[6];
            }

            if(typeof result.prefix_lists === 'undefined') result.prefix_lists = {};
            if(typeof result.prefix_lists[m[1]] === 'undefined') result.prefix_lists[m[1]] = {};
            result.prefix_lists[m[1]][m[2]] = obj;
            continue;
        }

        /* STATES */
        if(state == "start") {
            if(null !== (m = line.match(/^\s*(hostname|version) (.*)$/))) {
                result[m[1]] = m[2];
                continue;
            }
        }

        else if(state == "interface") {
            // IP Address
            if(null !== (m = line.match(/^\s*ip address (.*) (.*)$/))) {
                state_data.ip_address = m[1];
                state_data.mask = m[2];
                continue;
            }

            // No IP Address
            else if(null !== (m = line.match(/^\s*no ip address$/))) {
                state_data.ip_address = null;
                state_data.mask = null;
                continue;
            }

            // (no) shutdown
            else if(null !== (m = line.match(/^\s*(no|) shutdown$/))) {
                state_data["running"] = m[1] == "no";
                continue;
            }

            // duplex | speed | description
            else if(null !== (m = line.match(/^\s*(duplex|speed|description) (.*)$/))) {
                state_data[m[1]] = m[2];
                continue;
            }

            // ip ospf
            else if(null !== (m = line.match(/^\s*ip ospf (.*) area (.*)$/))) {
                state_data.ip_ospf = {
                    process_id: m[1],
                    area: m[2]
                }
                continue;
            }
        }

        else if(state == "router eigrp") {
            // Network
            if(null !== (m = line.match(/^\s*network (.*) (.*)$/))) {
                state_data.networks.push({
                    ip: m[1],
                    mask: m[2]
                });
                continue;
            }
        }

        else if(state == "router ospf") {
            // Network
            if(null !== (m = line.match(/^\s*network (.*) (.*) area (.*)$/))) {
                state_data.networks.push({
                    ip: m[1],
                    mask: m[2],
                    area: m[3]
                });
                continue;
            }
        }

        else if(state == "router bgp") {
            // Router ID
            if(null !== (m = line.match(/^\s* bgp router-id (.*)$/))) {
                state_data.router_id = m[1];
                continue;
            }

            // Confederation
            else if(null !== (m = line.match(/^\s* bgp confederation (identifier|peers) (.*)$/))) {
                if(typeof state_data.confederation === 'undefined') state_data.confederation = {};
                state_data.confederation[m[1]] = m[2];
                continue;
            }

            // Network
            else if(null !== (m = line.match(/^\s*network (.*) mask (.*)$/))) {
                state_data.networks.push({
                    ip: m[1],
                    mask: m[2]
                });
                continue;
            }

            // Network
            else if(null !== (m = line.match(/^\s*neighbor (.*) (remote-as|ebgp-multihop|update-source) (.*)$/))) {
                if(typeof state_data.neighbors[m[1]] === 'undefined') state_data.neighbors[m[1]] = {};
                state_data.neighbors[m[1]][m[2]] = m[3];
                continue;
            }
        }

        else if(state == "route-map") {
            // Match
            if(null !== (m = line.match(/^\s*match ip (address|next-hop) (prefix-list )?(.*)$/))) {
                var obj = {
                    type: m[1],
                };

                if(m[2]) {
                    obj.prefix_lists = m[3].split(/\s+/)
                } else {
                    obj.access_lists = m[3].split(/\s+/)
                }

                if(typeof state_data.matches === 'undefined') state_data.matches = [];
                state_data.matches.push(obj)
                continue;
            }

            // Set
            if(null !== (m = line.match(/^\s*set (?:ip )?(.*) (.*)$/))) {
                if(typeof state_data.set === 'undefined') state_data.set = {};
                state_data.set[m[1]] = m[2];
                continue;
            }
        }

        lines[i] = "_________________ " + lines[i];
    }

    !debug || console.log(JSON.stringify(lines, null, 4));
    return result;
}

module.exports = rc2json