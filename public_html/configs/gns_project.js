Vue.component('gns_project', {
    data: () => ({
        gns_link: false,
        gns_node: false,
        action: false
    }),
    template: `
        <div class="form-horizontal bg-white text-dark">
            <gns_link
                :opened="gns_link"
                @closed="gns_link = false"
            />
            <gns_node
                :opened="gns_node"
                @closed="gns_node = false"
            />
            
            <div style="user-select:none;width:100%;height:100vh;overflow:auto;" ref="gns_canvas">
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
                            @click="gns_link = link"
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
                        @click="gns_node = node"
                        :title="NodeTooltip(node)"
                        style="position:absolute;cursor:pointer;"
                        class="router"
                    >
                        <div :style="'position:absolute;top:'+node.label.y+'px;left:'+node.label.x+'px;'+node.label.style">
                            {{ node.label.text }}
                        </div>
                    </div>
                </div>
            </div>
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
    },
    mounted() {
        setTimeout(() => {
            this.$refs.gns_canvas.scrollLeft = (this.project.scene_width - this.$refs.gns_canvas.clientWidth)/2;
            this.$refs.gns_canvas.scrollTop = (this.project.scene_height - this.$refs.gns_canvas.clientHeight)/2;
        }, 0);
    }
})
