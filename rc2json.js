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
                auto_summary: true,
                networks: []
            };

            result.router["eigrp"] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^router ospf (.*)$/))) {
            state = "router ospf";
            state_data = {
                process_id: m[1],
                auto_summary: true,
                networks: []
            };

            result.router["ospf"] = state_data;
            continue;
        }

        else if(null !== (m = line.match(/^router rip$/))) {
            state = "router rip";
            state_data = {
                version: 1,
                auto_summary: true,
                networks: []
            };

            result.router["rip"] = state_data;
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
        
        else if(null !== (m = line.match(/^ip access-list (standard|extended) (.*)$/))) {
            state = "access-list";
            state_data = {
                type: m[1],
                rules: []
            };


            if(typeof result.access_lists === 'undefined') result.access_lists = {};
            result.access_lists[m[2]] = state_data;
            continue;
        }

        // Distribute list for eigrp|rip|ospf
        if(/router (eigrp|rip|ospf)/.test(state) && null !== (m = line.match(/^\s*distribute-list (?:(route-map|gateway|prefix) )?(.*?) (in|out)(?: (.*))?$/))) {
            var distribute_list = {
                type: 'access-list'
            };

            if(typeof m[1] !== 'undefined') {
                distribute_list.type = m[1];
            }

            distribute_list.name = m[2];
            distribute_list.direction = m[3];
            distribute_list.interface = m[4];
            
            if(typeof state_data.distribute_list === 'undefined') state_data.distribute_list = [];
            state_data.distribute_list.push(distribute_list);
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
            
            // No auto-summary
            if(null !== (m = line.match(/^\s*no auto-summary$/))) {
                state_data.auto_summary = false;
                continue;
            }

            // Redistribude
            if(null !== (m = line.match(/^\s*redistribute (?:(static|connected|rip)|(ospf|eigrp) (.*?))(?: metric (.*?) (.*?) (.*?) (.*?) (.*?)(?: route-map (.*?))?)?$/))) {
                var redistribute = {};
                if(typeof m[1] !== 'undefined') {
                    redistribute.type = m[1];
                }

                if(typeof m[2] !== 'undefined') {
                    redistribute.type = m[2];

                    if(m[2] == "ospf") {
                        redistribute.process_id = m[3]
                    }

                    if(m[2] == "eigrp") {
                        redistribute.as_number = m[3]
                    }
                }

                if(typeof m[4] !== 'undefined') {
                    redistribute.metric = {
                        bandwidth: m[4], // <1-4294967295>  Bandwidth metric in Kbits per second
                        delay: m[5], // <0-4294967295>  EIGRP delay metric, in 10 microsecond units
                        reliability: m[6], // <0-255>  EIGRP reliability metric where 255 is 100% reliable
                        effective_bandwidth: m[7], // <1-255>  EIGRP Effective bandwidth metric (Loading) where 255 is 100% loaded
                        mtu: m[8], // <1-65535>  EIGRP MTU of the path
                    }
                }

                if(typeof m[9] !== 'undefined') {
                    redistribute.route_map = m[9]
                }
                
                if(typeof state_data.redistribute === 'undefined') state_data.redistribute = [];
                state_data.redistribute.push(redistribute);
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
            
            // No auto-summary
            if(null !== (m = line.match(/^\s*no auto-summary$/))) {
                state_data.auto_summary = false;
                continue;
            }
        }

        else if(state == "router rip") {
            // Network
            if(null !== (m = line.match(/^\s*network (.*)$/))) {
                state_data.networks.push({
                    ip: m[1]
                });
                continue;
            }
            
            // Version
            if(null !== (m = line.match(/^\s*version (.*)$/))) {
                state_data.version = m[1];
                continue;
            }

            // No auto-summary
            if(null !== (m = line.match(/^\s*no auto-summary$/))) {
                state_data.auto_summary = false;
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

        else if(state == "access-list") {
            // Match
            if(null !== (m = line.match(/^\s*(permit|deny) (.*) (?:(object-group|host) (.*?)|any|(.*?) (.*?)) (?:(object-group|host) (.*?)|any|(.*?) (.*?))$/))) {
                // Src
                if (typeof m[3] != 'undefined' && typeof m[4] != 'undefined') {
                    var src = {
                        [m[3]]: m[4]
                    }
                } else if (typeof m[5] != 'undefined' && typeof m[6] != 'undefined') {
                    var src = {
                        ip: m[5],
                        wildcard: m[6],
                    }
                } else {
                    var src = "any";
                }

                // Dst
                if (typeof m[7] != 'undefined' && typeof m[8] != 'undefined') {
                    var dst = {
                        [m[7]]: m[8]
                    }
                } else if (typeof m[9] != 'undefined' && typeof m[10] != 'undefined') {
                    var dst = {
                        ip: m[9],
                        wildcard: m[10],
                    }
                } else {
                    var dst = "any";
                }

                var rule = {
                    type: m[1],
                    protocol: m[2],
                    src,
                    dst
                };
                
                state_data.rules.push(rule)
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
    
    result.debug = lines;
    return result;
}

module.exports = rc2json