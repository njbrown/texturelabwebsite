<template>
  <Layout>
    <div class="w-full bg-gray-900 block">
      <div class="container text-white text-center">
        <div class="flex flex-col pt-8 px-8">
          <h1 class="text-5xl pt-8 font-bold mx-auto max-w-4xl font-barlow">Welcome to TextureLab's Blog</h1>
          <h4 class="text-2xl mt-4 mb-12 text-gray-300 mx-auto max-w-lg">Guides, announcements and articles about TextureLab</h4>
        </div>
      </div>
    </div>
    <div class="w-full pt-8 pb-8 bg-gray-200 blog-list">
      <div class="container grid md:grid-cols-2 gap-6 text-white text-center text-black max-w-6xl">
        <div v-for="post in posts" :key="post.index"
        class="rounded-lg shadow-md overflow-hidden bg-gray-100 border border-gray-300">
        <g-link :to="post.path"
        >
          <g-image :src="post.image.src" />
          <div class="px-8 py-7">
            <h2 class="text-black text-gray-700 text-left text-3xl font-bold font-barlow">{{ post.title }}</h2>
            <h4 class="text-black text-gray-400 font-bolder text-left pt-1">{{ post.date }}</h4>
            <p class="text-black text-left pt-1">{{ post.description }}</p>
          </div>
        </g-link>
        </div>
      </div>
    </div>


  </Layout>
</template>

<page-query>
query Blog {
	blogs: allBlogPage(order: DESC, filter: { draft: { eq: false } }) {
		edges {
			node {
				id
        path
				title
				description
				image
				path
				category
				date (format: "MMMM DD, YYYY")
			}
		}
	}
}
</page-query>

<script>
export default {
  metaInfo: {
    title: 'TextureLab Blog',
    meta: [
      {
        key: 'og:title',
        name: 'og:title',
        content: 'TextureLab Blog',
      },
      {
        key: 'twitter:title',
        name: 'twitter:title',
        content: 'TextureLab Blog',
      },
    ]
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
    posts:function(){
      console.log(this.$page.blogs.edges)
      return this.$page.blogs.edges.map( ({ node })  => node);
    }
  }
}
</script>

<style>
.blog-list {
  min-height: 70vh;
}
</style>
