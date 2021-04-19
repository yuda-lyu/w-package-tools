<template>
    <div @click="testArrFun">aaa</div>
</template>

<script>
export default {
    components: {
    },
    props: {
        pathItems: {
            type: Array,
            default: () => [
                'https://cdn.jsdelivr.net/npm/ag-grid-community@24.1.0/dist/ag-grid-community.min.noStyle.js',
                'https://cdn.jsdelivr.net/npm/ag-grid-vue@24.1.1/dist/ag-grid-vue.umd.min.js', //於es5內載入時, AgGridVue會出現在window['ag-grid-vue'].AgGridVue
                'https://cdn.jsdelivr.net/npm/w-aggrid-vue@2.0.7/dist/w-aggrid-vue.umd.js',
            ],
        },
        opt: {
            type: Object,
            default: () => {},
        },
        height: {
            type: Number,
            default: 300
        },
        filterall: {
            type: String,
            default: ''
        },
    },
    data: function() {
        return {
            cmpName: 'WIconLoading',
        }
    },
    mounted: function() {
    },
    computed: {
    },
    methods: {
        testArrFun: () => {
            console.log('testArrFun')
        },
    },
}
</script>

<style scoped>
</style>
