Vue.component('gns', {
    data: () => ({
        connect_modal: false
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
                <button @click="GnsProject()">View Project</button>
            </div>
            
            <connect_modal
                :opened="connect_modal"
                @closed="connect_modal = false"
            />
        </div>
    `,
    methods: {
        GnsProject() {
            this.$store.commit('SET_WORKSPACE', 'gns_project')
        }
    },
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
        }
    }
})
