Vue.component('eigrp', {
    data: () => ({
        logs: [],
    }),
    template: `
        <div class="form-horizontal bg-white text-dark" style="width:100%;height:100vh;padding:2em;">
            <h1>Eigrp</h1>
            <div class="alert" v-for="{msg, type} in logs" :class="'alert-'+(type || 'info')">{{msg}}</div>

            <gns_canvas_project style="position:absolute;top:0;left:0;right:0;">
                <gns_canvas_link
                    v-for="link in links"
                    :link="link"
                    :key="link.link_id"
                />
                
                <gns_canvas_node
                    v-for="node in nodes"
                    :gray="!('eigrp' in gns_nodes[node.node_id].configs.running_config.router)"
                    :node="node"
                    :key="node.node_id"
                />
            </gns_canvas_project>
        </div>
    `,
    computed: {
        gns_nodes() {
            return this.$store.getters.gns_nodes;
        },
        
        nodes() {
            return this.$store.state.gns.project_nodes;
        },
        links() {
            return this.$store.getters.gns_links;
        },
    },
    methods: {
        
    },
    mounted() {
        let total = 0;
        for (const key in this.gns_nodes) {
            const { gns, configs, links } = this.gns_nodes[key];
            
            if (!('running_config' in configs)) {
                this.logs.push({
                    type: 'danger',
                    msg: `Not found 'running_config' for '${gns.name}'`
                })
                continue;
            }

            let rc = configs.running_config
            
            if (!('eigrp' in rc.router)) {
                continue;
            }

            this.logs.push({
                type: 'success',
                msg: `Found EIGRP at '${gns.name}' with AS Number ${rc.router.eigrp.as_number}`
            })
            
            for (const net of rc.router.eigrp.networks) {
                this.logs.push({
                    type: 'info',
                    msg: `Network: ${net.ip} ${net.mask}`
                })
            }

            total++;
        }

        if(total == 0){
            this.logs.push({
                type: 'danger',
                msg: `Not EIGRP found`
            })
        }
    }
})
