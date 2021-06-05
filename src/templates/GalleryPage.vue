<template>
  <Layout>
    <div class="w-full pt-8 pb-8 bg-gray-100">
      <div 
        class="container text-black text-center text-black"
      >
        <div class="text-left text-lg mb-2">
          <a href="/gallery">Gallery</a><span class="mx-2">&raquo;</span><a href="#">{{$page.texture.title}}</a>
        </div>
        <div class="grid grid-cols-4">
          <div class="col-span-3 bg-gray-900 rounded py-20" ><g-image class="inline rounded max-h-96" :src="$page.texture.image" /></div>
          <div class="px-6 text-left">
            <h2 class="font-barlow font-bold mt-5 text-3xl">{{$page.texture.title}}</h2>
            <div class="mb-2">by <a href="#">njbrown</a></div>
            <div class="font-inter mb-8 text-lg">{{$page.texture.description}}</div>

            <div class="tags my-8">
              <span class="px-2 py-2 rounded border-2 border-gray-400 text-gray-600 mr-1">metal</span>
              <span class="px-2 py-2 rounded border-2 border-gray-400 text-gray-600 mr-1">hexagons</span>
              <span class="px-2 py-2 rounded border-2 border-gray-400 text-gray-600 mr-1">tile</span>
            </div>

            <h4 class="text-center font-bold text-xl border-gray-600 py-1 mb-4 border-b-2 mt-16">Downloads</h4>
            <div class="downloads relative bottom-0">
              <a href="#" class="w-full block px-2 py-2 mt-2 text-white font-bolder rounded-md text-center text-lg bg-blue-600">TextureLab</a>
              <a href="#" class="w-full block px-2 py-2 mt-2 text-white font-bolder rounded-md text-center text-lg bg-blue-600">Zip</a>
              <a href="#" class="w-full block px-2 py-2 mt-2 text-white font-bolder rounded-md text-center text-lg bg-blue-600">Unity Material</a>
            </div>
            <!-- <div class="downloads relative bottom-0">
              <a href="#" class="w-full block px-2 py-2 mt-2 text-white font-bolder rounded-md text-center text-lg bg-blue-900"
                @click="toggleShowDownloads()"
                >Download</a>
              <div class="absolute w-full rounded" v-if="showDownloads">
                <g-link class="w-full block px-2 py-2 text-white font-bolder text-center text-lg bg-blue-900">Zip</g-link>
                <g-link class="w-full block px-2 py-2 text-white font-bolder text-center text-lg bg-blue-900">Unity</g-link>
                <g-link class="w-full block px-2 py-2 text-white font-bolder text-center text-lg bg-blue-900">TextureLab (.texture)</g-link>
              </div>
            </div> -->

          </div>
        </div>

        <!-- <h3 class="font-bold text-3xl mt-12 mb-8">Maps</h3>

        <div class="grid grid-cols-5 gap-3">
          <div class="relative map-card">
            <g-image class="inline rounded" src="https://cgbookcase.b-cdn.net/textures/thumbnails/BlackTiles07_1K/BlackTiles07_1K_BaseColor.png" />
            <div class="map-card-title font-bold text-xl absolute bottom-0 text-white text-center w-full py-4">
              <span class="bg-gray-900 px-4 py-2 rounded">Albedo</span>
            </div>

            <div class="w-full hidden grid h-full map-card-contents absolute top-0 items-center justify-center content-center flex">
              <span class="bg-gray-900 text-white font-bold px-8 py-4 rounded cursor-pointer">Download</span>
              <span class="bg-gray-900 text-white font-bold px-8 py-4 rounded cursor-pointer mt-2">Copy to Clipboard</span>
            </div>
          </div>
          
        </div> -->

        <h3 class="font-bold text-2xl mt-12 mb-8">Similar Textures</h3>
        <div class="grid grid-cols-5 gap-3">
          <div v-for="(texture, index) in otherTextures" :key="index"
            class="rounded-lg block relative shadow-xs overflow-hidden bg-gray-100 border border-gray-300 texture-card">
            <g-link :to="texture.path"
            >
              <g-image :src="texture.thumbnail" />
              <div class="px-2 py-1 texture-card-text absolute bottom-0 white bg-gray-700 w-full text-center bg-opacity-50 hidden">
                <h2 class="text-gray-100 text-shadow-sm text-xl font-bold font-barlow">{{ texture.title }}</h2>
              </div>
            </g-link>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  </Layout>
</template>

<page-query>
query Texture ($path: String!) {
	texture: galleryPage (path: $path) {
		id
    title
    path
    image
    thumbnail
    description
    date (format: "MMMM DD, YYYY")
	}
}
</page-query>

<script>
import OnThisPage from '@/components/OnThisPage.vue';
import Layout from '@/layouts/Default.vue';
import NextPrevLinks from '@/components/NextPrevLinks.vue';

export default {
  components: {
    Layout,
    OnThisPage,
    NextPrevLinks
  },
  data:function()
  {
    const otherTextures = []
    return {
      showDownloads:false,
      otherTextures
    }
  },
  methods:{
    toggleShowDownloads(){
      this.showDownloads = !this.showDownloads;
    }
  },
  metaInfo() {
    const title = this.$page.texture.title;
    const description = this.$page.texture.description;

    return {
      title: title,
      meta: [
        {
          name: 'description',
          content: description
        },
        {
          key: 'og:title',
          name: 'og:title',
          content: title,
        },
        {
          key: 'twitter:title',
          name: 'twitter:title',
          content: title,
        },
        {
          key: 'og:description',
          name: 'og:description',
          content: description,
        },
        {
          key: 'twitter:description',
          name: 'twitter:description',
          content: description,
        },
      ]
    }
  }
}
</script>

<style>
/* @import 'prism-themes/themes/prism-vs.css'; */
</style>

<style lang="scss">
#blog-content {
    @apply mb-2
}

.map-card:hover > .map-card-contents{
  display:grid;
}

.map-card:hover > .map-card-title{
  display:none;
}

.texture-card:hover .texture-card-text{
  display:block;
}

</style>