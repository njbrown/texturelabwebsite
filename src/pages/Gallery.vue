<template>
  <Layout>
    <div class="flex w-full bg-gray-200 blog-list">
      <div class="w-60 flex-shrink-0 px-2 bg-gray-300 pt-8">
        <div class="text-lg text-black font-bold ml-2">
        Categories
        </div>
        <div class="border-1 border-black w-full py-2">
          <div v-for="(cat, index) in categories" :key="index" :value="cat" :selected="index === 0"
          class="flex justify-between cursor-pointer text-md hover:bg-gray-100 rounded px-3 py-1 ml-2"
          ><span class="">{{cat.title}}</span> <span class="px-1 py-0.5 bg-gray-500 text-white text-sm my-auto rounded-lg ml-3">{{cat.count}}</span></div>
        </div>
      </div>
      <div class="w-full">
        <div class="flex w-full justify-center py-4">
          <input class="flex w-full max-w-4xl text-xl rounded px-4 py-2" placeholder="search..." />
        </div>
      <div class="grid md:grid-cols-5 gap-4 text-white text-center text-black px-4 py-4">
        
        <div v-for="(texture, index) in textures" :key="index"
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

    for(let i = 0; i < 25;i++) {
      images.push({
        path:"/gallery/hex-texture",
        title:"Hex Texture",
        date:"",
        image:"",
        thumbnail:"/uploads/hex-render.jpg",
        description:""
      })
    }

    return {
      textures:images,
      categories:[
          {title:"All",count:100},
          {title:"Wood",count:32},
          {title:"Metal",count:12},
          {title:"Organic",count:5},
          {title:"Tiles",count:2},
          {title:"Rocks",count:30},
          {title:"Pavement",count:45},
          {title:"Grass",count:85},
          {title:"Scifi",count:1},
          ]
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
