<template>
<div class="bg-gray-900 text-white">
    <div class="container mx-auto">
        <div class="flex justify-between text-center items-center">
            <div><g-link class="inline-block text-lg px-4 py-4" to="/"><img style="height:1.3em;display:inline-block;margin-right:0.2em" src="../../static/images/logo.png" />TextureLab</g-link></div>
            <div>
                <!-- <g-link class="inline-block text-lg px-4 py-4" to="/blog">Blog</g-link> -->
                <a class="md:inline-block text-lg px-4 py-4 hidden md:visible" href="https://njbrown.itch.io/texturelab" target="_blank">Download</a>
                <g-link class="inline-block text-lg px-4 py-4" to="/docs">Docs</g-link>
                <a class="inline-block text-lg px-4 py-4" href="https://github.com/njbrown/texturelab" target="_blank"><GithubIcon class="inline-block" /></a>
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
