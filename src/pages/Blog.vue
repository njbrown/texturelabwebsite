<template>
  <Layout>
    <div class="w-full bg-gray-800 block">
      <div class="container text-white text-center hero-margin">
        <div class="flex flex-col pt-8 px-8">
          <h1 class="text-5xl pt-8 font-bold mx-auto max-w-4xl">Welcome to TextureLab's Blog</h1>
          <h4 class="text-2xl mt-4 mb-12 text-gray-300 mx-auto max-w-lg">Guides, announcements and articles about TextureLab</h4>
        </div>
      </div>
    </div>
    <div class="w-full mt-8">
      <div class="container grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-white text-center text-black max-w-6xl">
        <div v-for="post in posts" :key="post.index"
        class="rounded-lg shadow-xl overflow-hidden">
        <a href="#"
        >
          <img :src="post.thumbail" />
          <div class="px-8 py-7">
            <h2 class="text-black text-gray-700 text-left text-xl font-bold">Hello Welcome to my Blog</h2>
            <h4 class="text-black text-gray-400 font-semibold text-left pt-1">March 31, 2021</h4>
            <p class="text-black text-left pt-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean pretium tempor placerat. Quisque id nunc a ipsum maximus dapibus. Maecenas nec metus odio. Praesent non odio aliquam, volutpat nisl non, iaculis erat.</p>
          </div>
        </a>
        </div>
      </div>
    </div>


  </Layout>
</template>

<script>
export default {
  metaInfo: {
    title: 'Texturelab Blog'
  },
  computed:{
      posts: function(){
        let posts = []
          for(let i=0;i<20;i++) {
            let post = {
              index:i,
              thumbail:"https://picsum.photos/600/300",
              category:"",
              date:"",
              author:"",
              summary:""
            }

            posts.push(post);
          }

          return posts;
      }
  }
}
</script>

<style>
</style>
