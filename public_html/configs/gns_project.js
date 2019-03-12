Vue.component('gns_project', {
    props: ['opened'],
    watch: { 
        opened: function(newVal, oldVal) {
            if(!oldVal && newVal) {
                this.Open();
            }
            
            if(oldVal && !newVal) {
                this.Close();
            }
        }
    },
    data: () => ({
        visible: false,
        action: false
    }),
    template: `
        <modal v-if="visible" v-on:close="Close()" style="color:black;" :full_width="true">
            <div slot="header">
                <h1 class="mb-3"> GNS Project </h1>
            </div>
            <div slot="body" class="form-horizontal">
                <div style="position:absolute;z-index:20;background:white;max-height:100%;overflow:auto;">
                    <button v-if="action" @click="action = false">CLOSE</button>
                    <component v-if="action" :data="action.data" :is="action.is" />
                </div>

                <div style="user-select:none;width:100%;height:100%;max-height: calc(100vh - 202px);overflow:auto;" ref="gns_canvas">
                    <div :style="{
                        width: project.scene_width + 'px',
                        height: project.scene_height + 'px',
                    }" style="position:relative;">
                        <template v-for="link in links">
                            <template v-for="label in link.labels" v-if="project.show_interface_labels">
                                <div :style="'position:absolute;top:'+label.y+'px;left:'+label.x+'px;'+label.style">
                                    {{ label.text }}
                                </div>
                            </template>
                            
                            <div
                                :style="{
                                    transform: 'rotate('+link.angle+'rad) translateY(-50%)',
                                    top: link.y+'px',
                                    left: link.x+'px',
                                    width: link.length+'px'
                                }"
                                :title="LinkTooltip(link)"
                                @click="action = {
                                    is: 'gns_link',
                                    data: link
                                }"
                                class="link"
                                :class="link.type"
                            ></div>
                        </template>
                        
                        <div
                            v-for="node in nodes"
                            :style="{
                                width: node.width + 'px',
                                height: node.height + 'px',
                                top: (project.scene_height/2)+node.y + 'px',
                                left: (project.scene_width/2)+node.x + 'px',
                                zIndex: 10
                            }"
                            @click="action = {
                                is: 'gns_node',
                                data: node
                            }"
                            :title="NodeTooltip(node)"
                            style="position:absolute;"
                            class="router"
                        >
                            <div :style="'position:absolute;top:'+node.label.y+'px;left:'+node.label.x+'px;'+node.label.style">
                                {{ node.label.text }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </modal>
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
            // DEVICES & PORTS
            var node_ports = {};
            for(var node of this.nodes) {
                node_ports[node.node_id] = {};
                for (const port of node.ports) {
                    node_ports[node.node_id][port.adapter_number + "_" + port.port_number] =  {
                        port: port.name,
                        device: node.name,
                        link_type: port.link_type,
                        
                        x: node.x,
                        y: node.y,
                        
                        width: node.width,
                        height: node.height
                    };
                }
            }
            
            // LINKS
            var links = [];
            for(var link of this.$store.state.gns.project_links) {
                var nodes = link.nodes.map(node => {
                    return {
                        label: node.label,
                        ...node_ports[node.node_id][node.adapter_number + "_" + node.port_number]
                    }
                })
                
                var x = (this.project.scene_width/2);
                var y = (this.project.scene_height/2);
                
                var line = {
                    x0: x + nodes[0].x + (nodes[0].width/2),
                    y0: y + nodes[0].y + (nodes[0].height/2),
                    x: x + nodes[1].x + (nodes[1].width/2),
                    y: y + nodes[1].y + (nodes[1].height/2),
                }
                
                let { angle, length } = this.getAngleLength(line);
                
                links.push({
                    x: line.x0,
                    y: line.y0,
                    angle,
                    length,
                    labels: [
                        {
                            rotation: nodes[0].label.rotation,
                            style: nodes[0].label.style,
                            text: nodes[0].label.text,
                            x: x + nodes[0].x + nodes[0].label.x,
                            y: y + nodes[0].y + nodes[0].label.y
                        },
                        {
                            rotation: nodes[1].label.rotation,
                            style: nodes[1].label.style,
                            text: nodes[1].label.text,
                            x: x + nodes[1].x + nodes[1].label.x,
                            y: y + nodes[1].y + nodes[1].label.y
                        }
                    ],
                    devices: [
                        {
                            name: nodes[0].device,
                            port: nodes[0].port
                        },
                        {
                            name: nodes[1].device,
                            port: nodes[1].port
                        }
                    ],
                    type: nodes[0].link_type
                });
            }
            
            return links;
        },
    },
    methods: {
        Open(){
            document.body.style.overflow = "hidden";
            this.visible = true;
            setTimeout(() => {
                this.$refs.gns_canvas.scrollLeft = (this.project.scene_width - this.$refs.gns_canvas.clientWidth)/2;
                this.$refs.gns_canvas.scrollTop = (this.project.scene_height - this.$refs.gns_canvas.clientHeight)/2;
            }, 0)
        },
        Close(){
            document.body.style.overflow = "auto";
            this.visible = false;
            this.$emit("closed");
        },
        getAngleLength({x0, y0, x, y}) {
            let length = Math.sqrt(Math.pow(y - y0, 2) + Math.pow(x - x0, 2));
            let angle = Math.asin((y - y0) / length);
            
            if(y0 > y) {
                x0 < x || (angle =  Math.acos((y - y0) / length) + Math.PI/2);
            } else {
                x0 < x || (angle = Math.acos((y - y0) / length) + Math.PI/2);
            }
            
            return { length, angle };
        },
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
                console.log(int);
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
    },
    components: {
        'gns_link': {
            props: ['data'],
            template: `
            <div v-if="!is_running_config">
            <h2> {{ link0.name }} </h2>
            <pre>no running config...</pre>
            <h2> {{ link1.name }} </h2>
            <pre>no running config...</pre>
            </div>
            <div v-else>
            <h2> {{ link0.name }} </h2>
            <pre>{{ dev0 }}</pre>
            <h2> {{ link1.name }} </h2>
            <pre>{{ dev1 }}</pre>
            </div>
            `,
            computed: {
                is_running_config(){
                    return this.$store.getters.is_running_config;
                },
                running_config() {
                    return Object.keys(this.$store.state.configs.running_config).length == 0 ? null : this.$store.state.configs.running_config;
                },
                
                link0() {
                    return this.data.devices[0];
                },
                link1() {
                    return this.data.devices[1];
                },
                
                dev0() {
                    return this.running_config[this.link0.name].interfaces[this.link0.port];
                },
                dev1() {
                    return this.running_config[this.link1.name].interfaces[this.link1.port];
                }
            }
        },
        'gns_node': {
            props: ['data'],
            template: `
            <div v-if="!is_running_config">
            <h2> {{ data.name }} </h2>
            <pre>{{ data.ports }}</pre>
            </div>
            <div v-else>
            <pre>{{ config.router }}</pre>
            </div>
            `,
            computed: {
                is_running_config(){
                    return this.$store.getters.is_running_config;
                },
                running_config() {
                    return this.$store.state.configs.running_config;
                },
                
                config() {
                    return this.running_config[this.data.name];
                },
            },
            mounted() {
            }
        }
    }
})
