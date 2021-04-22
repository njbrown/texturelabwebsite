<template>
<div class="bg-gray-900 text-white">
    <div class="container mx-auto">
        <div class="flex justify-between text-center items-center">
            <div><g-link class="inline-block text-lg px-4 py-4" to="/">TextureLab</g-link></div>
            <div>
                <g-link class="inline-block text-lg px-4 py-4" to="/docs">Docs</g-link>
                <g-link class="inline-block text-lg px-4 py-4" to="/blog">Blog</g-link>
                <g-link class="inline-block text-lg px-4 py-4" to="/download">Download</g-link>
                <g-link class="inline-block text-lg px-4 py-4" to="/github"><GithubIcon class="inline-block" /></g-link>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {GithubIcon } from "vue-feather-icons"
export default {
    components:{
        GithubIcon
    }
}
</script>
