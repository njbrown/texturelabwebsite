<template>
<div class="bg-gray-900 text-white">
    <div class="container mx-auto">
        <div class="flex justify-between text-center items-center">
            <div><g-link class="inline-block text-lg px-4 py-4" to="/">TextureLab</g-link></div>
            <div>
                <g-link class="inline-block text-lg px-4 py-4" to="/docs">Docs</g-link>
                <!-- <g-link class="inline-block text-lg px-4 py-4" to="/blog">Blog</g-link> -->
                <a class="inline-block text-lg px-4 py-4" href="https://njbrown.itch.io/texturelab" target="_blank">Download</a>
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
