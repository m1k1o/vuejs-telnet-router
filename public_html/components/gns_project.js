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
        visible: false
    }),
    template: `
        <modal v-if="visible" v-on:close="Close()" style="color:black;" :full_width="true">
            <div slot="header">
                <h1 class="mb-3"> GNS Project </h1>
            </div>
            <div slot="body" class="form-horizontal">
                <div style="width:100%;height:100%;overflow:auto;">
                    <div :style="{
                        width: project.scene_width + 'px',
                        height: project.scene_height + 'px',
                    }" style="position:relative;">
                        <div v-for="node in nodes" :style="{
                            width: node.width + 'px',
                            height: node.height + 'px',
                            top: (project.scene_height/2)+node.y + 'px',
                            left: (project.scene_width/2)+node.x + 'px',
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
		project() {
			return this.$store.state.gns.project;
        },
        nodes() {
			return this.$store.state.gns.project_nodes;
        },
        links() {
			return this.$store.state.gns.project_links;
		},
	},
    methods: {
        Open(){
            document.body.style.overflow = "hidden";
            this.visible = true;
        },
        Close(){
            document.body.style.overflow = "auto";
            this.visible = false;
            this.$emit("closed");
        }
    }
})
