Vue.component('gns', {
    data: () => ({
        connect_modal: false,
        gns_project: false
    }),
    template: `
        <div class="card bg-dark mb-3">
            <div class="card-header">
                <span class="float-right ml-3" style="width: 100px;" v-if="compute">MEM:&nbsp;{{ compute.memory_usage_percent || '-'}}%<br>CPU:&nbsp;{{ compute.cpu_usage_percent || '-'}}% </span>
                <div class="my-1 float-right">
                    <span> Project: {{ project.name || '--none--'}} </span>
                    <button class="btn btn-outline-light" @click="connect_modal = true">Connection</button>
                </div>
                <h1 class="card-title mb-0">GNS</h1>
            </div>
            <div class="card-body" v-if="project">
                <button @click="gns_project = true">View Project</button>
            </div>
            
            <connect_modal
                :opened="connect_modal"
                @closed="connect_modal = false"
            />
		
            <gns_project
                :opened="gns_project"
                @closed="gns_project = false"
            ></gns_project>
        </div>
    `,
	computed: {
		compute() {
			return this.$store.state.gns.compute;
        },
		project() {
			return this.$store.state.gns.project;
        },
        nodes() {
			return this.$store.state.gns.project_nodes;
        },
        links() {
			return this.$store.state.gns.project_links;
		}
	},
    components: {
        'connect_modal': {
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
                error: false,
                step: 1,
                connection: {}
            }),
            computed: {
                project() {
                    return this.$store.state.gns.project;
                },
                projects() {
                    return this.$store.state.gns.projects;
                }
            },
            template: `
                <modal v-if="visible" v-on:close="Close()">
                    <template v-if="step == 1">
                        <div slot="header">
                            <h1 class="mb-3"> Login to GNS </h1>
                        </div>
                        <div slot="body" class="form-horizontal">
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">URL</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="connection.url">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">Username</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="connection.name">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label">Password</label>
                                <div class="col-sm-8">
                                    <input type="text" class="form-control" v-model="connection.pass">
                                </div>
                            </div>
                            <div class="form-group row">
                                <label class="col-sm-4 col-form-label"></label>
                                <div class="col-sm-8">
                                    <label class="form-check form-control-plaintext">
                                        <input type="checkbox" value="1" v-model="connection.auto" class="form-check-input"> Auto connect
                                    </label>
                                </div>
                            </div>
                            <div class="alert alert-danger" v-if="error"> {{ error }} </div>
                        </div>
                        <div slot="footer">
                            <button v-on:click="Disconnect()" v-if="project" class="btn btn-danger">Disconnect</button>
                            <button v-on:click="Action()" class="btn btn-success">Next &gt;</button>
                            <button v-on:click="Close()" class="btn btn-secondary">Cancel</button>
                        </div>
                    </template>
                    <template v-if="step == 2">
                        <div slot="header">
                            <h1 class="mb-3"> Select Project  </h1>
                        </div>
                        <div slot="body" class="form-horizontal">
                            <div class="text-center">
                                <template v-for="{name, status, project_id} in projects">
                                    <button class="btn m-2" :class="status == 'opened' ? 'btn-success' : 'btn-outline-success'" @click="Action(project_id)">{{ name }} ({{ status }})</button>
                                </template>
                            </div>
                        </div>
                        <div slot="footer">
                            <button v-on:click="step = 1" class="btn btn-secondary">&lt; Back</button>
                        </div>
                    </template>
                </modal>
            `,
            methods: {
                Open(){
                    document.body.style.overflow = "hidden";
                    this.step = 1;
                    this.connection = this.$store.state.gns.connection;
                    this.visible = true;
                },
                Close(){
                    document.body.style.overflow = "auto";
                    this.visible = false;
                    this.$emit("closed");
                },
                Disconnect() {
                    this.$store.dispatch('GNS_DISCONNECT')
                    this.Close();
                },
                Action(input = null){
                    // LOGIN
                    if(this.step == 1) {
                        this.error = false;

                        // Parse http://user:pass@domain.tld
                        if(/\/\/(.*):(.*)@/.test(this.connection.url)) {
                            var m = this.connection.url.match(/\/\/(.*):(.*)@/)
                            this.connection.name = m[1];
                            this.connection.pass = m[2];
    
                            this.connection.url = this.connection.url.replace(/\/\/(.*):(.*)@/, "//")
                        }
    
                        this.$store.commit('GNS_CONNECTION', this.connection)
                        this.$store.dispatch('GNS_PROJECTS').then(() => {
                            this.step = 2;
                        }, (err) => {
                            this.error = String(err);
                        })
                    }

                    // SELECT PROJECT
                    if(this.step == 2) {
                        this.$store.dispatch("GNS_CONNECT", input).then(() => {
                            this.Close();
                        })
                        return;
                    }
                }
            }
        },
        'gns_project': {
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
                visible: false
            }),
            template: `
                <modal v-if="visible" v-on:close="Close()" style="color:black;" :full_width="true">
                    <div slot="header">
                        <h1 class="mb-3"> GNS Project </h1>
                    </div>
                    <div slot="body" class="form-horizontal">
                        <div style="width:100%;height:100%;max-height: calc(100vh - 202px);overflow:auto;" ref="gns_canvas">
                            <div :style="{
                                width: project.scene_width + 'px',
                                height: project.scene_height + 'px',
                            }" style="position:relative;">
                                <template v-for="link in links">
                                    <template v-for="label in link.labels">
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
                                        class="link"
                                        :class="link.type"
                                    ></div>
                                </template>
                                
                                <div v-for="node in nodes" :style="{
                                    width: node.width + 'px',
                                    height: node.height + 'px',
                                    top: (project.scene_height/2)+node.y + 'px',
                                    left: (project.scene_width/2)+node.x + 'px',
                                    zIndex: 10
                                }" style="position:absolute;" class="router">
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
                running_config() {
                    return this.$store.state.configs.running_config || null;
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
                    if(running_config == null) {
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
                }
            }
        }
    }
})
