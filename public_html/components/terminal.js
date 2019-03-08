Vue.component('terminal', {
    data: () => ({
        input: ""
    }),
    template: `
        <div stlye="position:fixed;width:calc(50% - 30px);">
            <ul class="nav nav-pills nav-fill my-2">
                <li class="nav-item mx-2" v-for="(device, name) in devices">
                    <a
                        href="javascript:void(0);"
                        class="nav-link"
                        :class="terminal_device == name ? 'active' : ''"
                        @click="Toggle(name)"
                    >{{ name }}</a>
                </li>
            </ul>
            <template v-if="terminal_device">
                <div class="terminal terminal_pre" ref="terminal">{{ data }}</div>
                <textarea
                    class="input batch"
                    rows="5"
                    v-model="input"
                    @keyup.enter="Send()"
                    placeholder="Enter command here"
                />
                <div>
                    <button @click="Send('\x03')">CTRL+C</button>
                    <button class="float-right" @click="Send()">SEND</button>
                </div>
            </template>
        </div>
    `,
	computed: {
		devices() {
			return this.$store.state.devices;
		},
		data() {
			return this.$store.state.terminal.data;
		},
		terminal_device() {
			return this.$store.state.terminal.device;
		}
    },
    watch: {
        devices: {
            deep: true,
            handler(devices){
                // If current device disapeared
                if(this.terminal_device !== null && !(this.terminal_device in devices)) {
                    this.$store.dispatch("TERMINAL_SET", null)
                }
            }
        },
        data() {
            // Auto scroll
            if(this.$refs.terminal)
                this.$refs.terminal.scrollTop = this.$refs.terminal.scrollHeight;
        },
        terminal_device() {
            this.$store.commit("TERMINAL_FLUSH_DATA")
            this.input = "";
        }
    },
    methods: {
        Toggle(device = null) {
			this.$store.dispatch("TERMINAL_SET", device == this.terminal_device ? null : device)
        },
		Send(input = null) {
			this.$store.dispatch("EXECUTE", {
                cmds: input == null ? this.input : input,
                to: [ this.terminal_device ]
            })

            if(input == null) {
                this.input = '';
            }
        }
    }
})
