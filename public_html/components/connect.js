Vue.component('connect', {
    data: () => ({
        url: "",
        started: false
    }),
    template: `
        <div class="container py-2">
            <h1> Experimental web-based configurer </h1>
            <div class="form-horizontal">
                <div class="form-group row">
                    <label class="col-sm-4 col-form-label">Websocket Url</label>
                    <div class="col-sm-8">
                        <input type="text" class="form-control" v-model="url">
                    </div>
                </div>
                <div class="form-group row">
                    <label class="col-sm-4 col-form-label"></label>
                    <div class="col-sm-8">
                        <button v-if="!started" v-on:click="Connect()" class="btn btn-success">Connect</button>
                        <button v-else class="btn btn-success" disabled>Connecting...</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    methods: {
		Connect() {
			this.$store.dispatch("CONNECT", this.url)
        }
    },
    mounted() {
        this.url = this.$store.state.connection.url;
    }
})
