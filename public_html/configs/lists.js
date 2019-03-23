Vue.component('lists', {
    data: () => ({
        logs: [],
        prefix_lists: {},
    }),
    template: `
        <div class="form-horizontal bg-white text-dark" style="width:100%;height:100vh;padding:2em;">
            <h1>Lists</h1>
            <div class="alert" v-for="{msg, type} in logs" :class="'alert-'+(type || 'info')">{{msg}}</div>
            <div v-for="(lists, node) in prefix_lists">
                <h2>{{ node }}</h2>
                <div  v-for="(list, name) in lists">
                    <h3><strong>{{ name }}</strong></h3>
                    <ul>
                        <li v-for="(entry, seq) in list">{{ seq }} : <strong>{{ entry.prefix }}</strong> ({{ entry.type }})</li>
                    </ul>
                </div>
            </div>
        </div>
    `,
    computed: {
        gns_nodes() {
            return this.$store.getters.gns_nodes;
        }
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
            
            if ('prefix_lists' in rc) {
                this.logs.push({
                    type: 'success',
                    msg: `Found Prefix lists at '${gns.name}'`
                })

                this.$set(this.prefix_lists, gns.name, rc.prefix_lists)
                
                total++;
                continue;
            }
        }

        if(total == 0){
            this.logs.push({
                type: 'danger',
                msg: `No lists found`
            })
        }
    }
})
