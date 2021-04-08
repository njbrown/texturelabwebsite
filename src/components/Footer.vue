<template>
<div class="bg-gray-800 text-white py-4">
    <div class="container mx-auto">
        <div class="grid md:grid-cols-2 text-gray-300">
            <div class="sm:text-center md:text-left">
                <g-link class="inline-block text-md px-4 py-4" to="/">© 2021 Texturelab, Inc., All Rights Reserved</g-link>
            </div>
            <div class="flex flex-center sm:justify-center md:justify-end items-center">
                <g-link class="inline-block text-lg mx-1 px-2 py-2 hover:text-gray-500" to="/github"><TwitterIcon class="inline-block" /></g-link>
                <g-link class="inline-block text-lg mx-1 px-2 py-2 hover:text-gray-500" to="/github"><GithubIcon class="inline-block" /></g-link>
                <g-link class="inline-block text-lg mx-1 px-2 py-2 hover:text-gray-500" to="/github"><MessageSquareIcon class="inline-block" /></g-link>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import {GithubIcon } from "vue-feather-icons"
import {TwitterIcon } from "vue-feather-icons"
import {MessageSquareIcon } from "vue-feather-icons"
export default {
    components:{
        GithubIcon,
        TwitterIcon,
        MessageSquareIcon
    }
}
</script>
