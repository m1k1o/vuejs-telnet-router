Vue.component('gns_project', {
    data: () => ({
        gns_link: false,
        gns_node: false,
        action: false,
        routing_protocol: ""
    }),
    template: `
        <div class="form-horizontal bg-white text-dark">
            <div class="text-center">
                Highlight Protocol: <select v-model="routing_protocol">
                    <option value="">--none--</option>
                    <option>eigrp</option>
                    <option>rip</option>
                    <option>ospf</option>
                    <option>bgp</option>
                </select>
            </div>

            <gns_link
                :opened="gns_link"
                @closed="gns_link = false"
            />
            <gns_node
                :opened="gns_node"
                @closed="gns_node = false"
            />
            
            <gns_canvas_project>
                <gns_canvas_link
                    v-for="link in links"
                    :link="link"
                    :key="link.link_id"

                    :title="LinkTooltip(link)"
                    @click="gns_link = link"
                />
                
                <gns_canvas_node
                    v-for="node in nodes"
                    :node="node"
                    :key="node.node_id"
                    :gray="gray_filter[node.node_id]"

                    @click="gns_node = node"
                    :title="NodeTooltip(node)"
                />
            </gns_canvas_project>
        </div>
    `,
    computed: {
        is_running_config(){
            return this.$store.getters.is_running_config;
        },
        running_config() {
            return Object.keys(this.$store.state.configs.running_config).length == 0 ? null : this.$store.state.configs.running_config;
        },
        project() {
            return this.$store.state.gns.project;
        },
        nodes() {
            return this.$store.state.gns.project_nodes;
        },
        links() {
            return this.$store.getters.gns_links;
        },
        gray_filter() {
            let gray = {};
            for (const node of this.nodes) {
                if(!this.routing_protocol) {
                    gray[node.node_id] = false
                    continue
                }
                
                gray[node.node_id] = !(this.routing_protocol in this.running_config[node.name].router)
            }
            return gray
        }
    },
    methods: {
        LinkTooltip(link) {
            var running_config = this.running_config;
            if(!this.is_running_config) {
                return 'No running config found...';
            }
            
            var dev0 = running_config[link.devices[0].name].interfaces[link.devices[0].port];
            var dev1 = running_config[link.devices[1].name].interfaces[link.devices[1].port];
            
            return ''+
            link.devices[0].name + ' ' + link.devices[0].port + '\n' +
            'IP: ' + dev0.ip_address + ' ' + dev0.mask + '\n' +
            (dev0.running ? 'Running' : 'Not running') + '\n' +
            '\n' +
            link.devices[1].name + ' ' + link.devices[1].port + '\n' +
            'IP: ' + dev1.ip_address + ' ' + dev1.mask + '\n' +
            (dev1.running ? 'Running' : 'Not running') + '\n' +
            '';
        },
        NodeTooltip(node) {
            var running_config = this.running_config;
            if(!this.is_running_config) {
                return 'No running config found...';
            }
            
            var rc = running_config[node.name]
            var router = rc.router;
            
            var str = '';
            for (const int in rc.interfaces) {
                if(/loopback/i.test(int)) {
                    str += 
                    int + '\n' +
                    'IP: ' + rc.interfaces[int].ip_address + ' ' + rc.interfaces[int].mask + '\n' +
                    (rc.interfaces[int].running ? 'Running' : 'Not running') + '\n' +
                    '\n';
                }
            }
            /*
            if('bgp' in router) {
                str += '\nBGP '+router.bgp.as_number+(router.bgp.router_id ? ' ('+router.bgp.router_id+')' : '')+'\n';
                
                str += 'Networks:\n';
                for (const network of router.bgp.networks) {
                    str += '  '+network.ip+' '+network.mask+'\n';
                }
                
                str += 'Neighbors:\n';
                for (const id in router.bgp.neighbors) {
                    str += '  '+id+' ('+router.bgp.neighbors[id]["remote-as"]+')\n';
                }
            }
            
            if('ospf' in router) {
                str += '\nOSPF '+router.ospf.process_id+'\n';
                
                str += 'Networks:\n';
                for (const network of router.ospf.networks) {
                    str += '  '+network.ip+' '+network.mask+' ('+network.area+')\n';
                }
            }
            */
            return str +
            'Router: ' + Object.keys(router).join(", ");
        }
    }
})
