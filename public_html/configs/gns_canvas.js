Vue.component('gns_canvas_project', {
    props: {
        no_labels: {
            type: Boolean,
            default: false
        }
    },
    template: `
        <div style="user-select:none;width:100%;height:100vh;overflow:auto;" ref="gns_canvas">
            <div :style="{
                width: project.scene_width + 'px',
                height: project.scene_height + 'px',
            }" style="position:relative;">
                <template v-for="link in links" v-if="!no_labels">
                    <template v-for="label in link.labels" v-if="project.show_interface_labels">
                        <div :style="'position:absolute;top:'+label.y+'px;left:'+label.x+'px;'+label.style.replace('fill', 'color')">
                            {{ label.text }}
                        </div>
                    </template>
                </template>

                <slot></slot>
            </div>
        </div>
    `,
    computed: {
        links() {
            return this.$store.getters.gns_links;
        },
        project() {
            return this.$store.state.gns.project;
        }
    },
    mounted() {
        setTimeout(() => {
            this.$refs.gns_canvas.scrollLeft = (this.project.scene_width - this.$refs.gns_canvas.clientWidth)/2;
            this.$refs.gns_canvas.scrollTop = (this.project.scene_height - this.$refs.gns_canvas.clientHeight)/2;
        }, 0);
    },
})

Vue.component('gns_canvas_node', {
    props: ['node', 'gray'],
    template: `
        <div v-on="$listeners" v-bind="attrs">
            <div :style="'position:absolute;top:'+node.label.y+'px;left:'+node.label.x+'px;'+node.label.style">
                {{ node.label.text }}
            </div>
        </div>
    `,
    computed: {
        project() {
            return this.$store.state.gns.project;
        },
        attrs() {
            return {
                ...this.$attrs,
                style: {
                    ...(this.$attrs.style || {}),
                    position: 'absolute',
                    cursor: 'pointer',
                    zIndex: 10,
                    filter: this.gray ? 'grayscale(1)' : '',
                    width: this.node.width + 'px',
                    height: this.node.height + 'px',
                    top: (this.project.scene_height/2)+this.node.y + 'px',
                    left: (this.project.scene_width/2)+this.node.x + 'px'
                },
                class: (this.$attrs.class || '') + " router "//+this.node.type
            }
        }
    }
})

Vue.component('gns_canvas_link', {
    props: ['link'],
    template: `<div v-on="$listeners" v-bind="attrs"></div>`,
    computed: {
        attrs() {
            return {
                ...this.$attrs,
                style: {
                    ...(this.$attrs.style || {}),
                    transform: 'rotate('+this.link.angle+'rad) translateY(-50%)',
                    top: this.link.y+'px',
                    left: this.link.x+'px',
                    width: this.link.length+'px'
                },
                class: (this.$attrs.class || '') + " link "+this.link.type
            }
        }
    }
})
