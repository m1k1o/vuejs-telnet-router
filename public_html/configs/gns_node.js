Vue.component('gns_node', {
    props: ['opened'],
    watch: { 
        opened: function(newVal, oldVal) {
            if(!oldVal && newVal) {
                this.Open(newVal);
            }
            
            if(oldVal && !newVal) {
                this.Close();
            }
        }
    },
    data: () => ({
        visible: false,
        node: false
    }),
    computed: {
        is_running_config(){
            return this.$store.getters.is_running_config;
        },
        running_config() {
            return Object.keys(this.$store.state.configs.running_config).length == 0 ? null : this.$store.state.configs.running_config;
        },
        
        config() {
            return this.running_config[this.node.name];
        }
    },
    template: `
        <modal v-if="visible" v-on:close="Close()">
            <div slot="header">
                <h1 class="mb-0"> {{ node.name }} </h1>
            </div>
            <div slot="body" class="form-horizontal" v-if="!is_running_config">
                <pre>no running config...</pre>
                <h2> {{ node.name }} </h2>
                <pre>{{ node.ports }}</pre>
            </div>
            <div slot="body" class="form-horizontal" v-else>
                <pre>{{ config.router }}</pre>
            </div>
        </modal>
    `,
    methods: {
        Open(node){
            this.visible = true;
            this.node = node;
        },
        Close(){
            this.visible = false;
            this.$emit("closed");
        }
    }
})
