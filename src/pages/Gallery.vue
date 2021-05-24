<template>
  <Layout>
    <div class="flex w-full pt-8 pb-8 bg-gray-200 blog-list">
      <div class="w-60 flex-shrink-0 px-2">
        <div class="text-xl">
        Categories
        </div>
        <div class="border-1 border-black w-full px-2 py-2">
          <div v-for="(cat, index) in categories" :key="index" :value="cat" :selected="index === 0"
          class="flex justify-between cursor-pointer text-lg"
          ><span>{{cat}}</span> <span>10</span></div>
        </div>
      </div>
      <div class="w-full">
        <div class="flex w-full">
          <input class="flex w-full max-w-4xl" />
        </div>
      <div class="grid md:grid-cols-5 gap-2 text-white text-center text-black">
        
        <div v-for="(texture, index) in gallery" :key="index"
        class="rounded-lg block relative shadow-xs overflow-hidden bg-gray-100 border border-gray-300 texture-card">
        <g-link :to="texture.path"
        >
          <g-image :src="texture.thumbnail" />
          <div class="px-2 py-1 texture-card-text absolute bottom-0 white bg-gray-700 w-full text-center">
            <h2 class="text-gray-100 text-shadow-sm text-xl font-bold font-barlow">{{ texture.title }}</h2>
          </div>
        </g-link>
        </div>
      </div>
      </div>
    </div>


  </Layout>
</template>

<page-query>
query Gallery{
  gallery: allGalleryPage {
    edges {
      node {
        id
        title
        path
        thumbnail
        description
        date (format: "MMMM DD, YYYY")
      }
    }
  }
}
</page-query>

<script>
export default {
  metaInfo: {
    title: 'Gallery',
    meta: [
      {
        key: 'og:title',
        name: 'og:title',
        content: 'TextureLab Gallery',
      },
      {
        key: 'twitter:title',
        name: 'twitter:title',
        content: 'TextureLab Gallery',
      },
    ]
  },
  data:function(){
    let images = [];

    for(let i = 0; i < 40;i++) {
      images.push({
        path:"",
        title:"Hex Texture",
        date:"",
        image:"",
        thumbnail:"/uploads/hex-render.jpg",
        description:""
      })
    }

    return {
      textures:images,
      categories:["All", "Grass","Wood", "Tiles"]
    }
  },
  computed:{
      // posts: function(){
      //   let posts = []
      //     for(let i=0;i<20;i++) {
      //       let post = {
      //         index:i,
      //         thumbail:"https://picsum.photos/600/300",
      //         category:"",
      //         date:"",
      //         author:"",
      //         summary:""
      //       }

      //       posts.push(post);
      //     }

      //     return posts;
      // },
    gallery:function(){
      // console.log(this.$page.blogs.edges)
      return this.$page.gallery.edges.map( ({ node })  => node);
    }
  }
}
</script>

<style>
.blog-list {
  min-height: 70vh;
}

.texture-card:hover .texture-card-text{
  display:block;
}

.texture-card-text {
  /* position:absolute;
  bottom:0; */
  /* display:none; */
  /* color:white;
  font-weight:bold;
  background: rgba(0,0,0,0.2); */
}
</style>
