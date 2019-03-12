Vue.component('gns_link', {
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
        link: false
    }),
    computed: {
        is_running_config(){
            return this.$store.getters.is_running_config;
        },
        running_config() {
            return Object.keys(this.$store.state.configs.running_config).length == 0 ? null : this.$store.state.configs.running_config;
        },
        
        dev0() {
            return this.link.devices[0];
        },
        dev1() {
            return this.link.devices[1];
        },
        
        if0() {
            return this.running_config[this.dev0.name].interfaces[this.dev0.port];
        },
        if1() {
            return this.running_config[this.dev1.name].interfaces[this.dev1.port];
        }
    },
    template: `
        <modal v-if="visible" v-on:close="Close()">
            <div slot="header">
                <h1 class="mb-0"> {{ link.type }} <b>{{ dev0.name }}</b> => <b>{{ dev1.name }}</b> </h1>
            </div>
            <div slot="body" class="form-horizontal" v-if="!is_running_config">
                <pre>no running config...</pre>
            </div>
            <div slot="body" class="form-horizontal" v-else>
                <h2> <b>{{ dev0.name }}</b> : {{ dev0.port }} <span class="text-success" v-if="if0.running"> Running </span><span class="text-danger" v-else> Not Running </span></h2>
                    <pre>{{ if0 }}</pre>
                <h2> <b>{{ dev1.name }}</b> : {{ dev1.port }} <span class="text-success" v-if="if1.running"> Running </span><span class="text-danger" v-else> Not Running </span></h2>
                    <pre>{{ if1 }}</pre>
            </div>
        </modal>
    `,
    methods: {
        Open(link){
            document.body.style.overflow = "hidden";
            this.visible = true;
            this.link = link;
        },
        Close(){
            document.body.style.overflow = "auto";
            this.visible = false;
            this.$emit("closed");
        }
    }
})
