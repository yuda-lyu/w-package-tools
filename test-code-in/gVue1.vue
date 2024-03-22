<template>
    <div>
        <div @click="testArrFun">aaa</div>
        <div :a="`abc-${name}`">{{name}}</div>
    </div>
</template>

<script>
// import trim from 'lodash-es/trim.js'

export default {
    components: {
    },
    props: {
        pathItems: {
            type: Array,
            default: () => [ //array function
                'src:aaa',
            ],
        },
        opt: {
            type: Object,
            default: () => {}, //array function
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
            name: 'name',
        }
    },
    mounted: () => {
        console.log('mounted')
    },
    computed: {
    },
    methods: {
        testArrFun: () => { //array function
            console.log('testArrFun')
        },
        testAsyncFun1: async () => { //async function
            console.log('testAsyncFun1')
            let name = 'testAsyncFun1 xyz'
            let c = ` testAsyncFun1 a ${name} b `
            console.log((c))
        },
        testAsyncFun2: () => { //async function
            console.log('testAsyncFun2')
            async function core() {
                let name = 'testAsyncFun2 xyz'
                let c = ` testAsyncFun2 a ${name} b `
                console.log((c))
            }
            core()
                .catch(() => {})
        },
        async testAsyncFun3() { //async function
            await (() => {
                return new Promise(resolve => { //promise
                    setTimeout(() => {
                        window.console.log('testAsyncFun3')
                        resolve()
                    }, 3000)
                })
            })()
        },
    },
}
</script>

<style scoped>
</style>
