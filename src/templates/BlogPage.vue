<template>
  <Layout>
    <div class="w-full pt-8 pb-8 bg-gray-100">
      <div 
        class="container text-black text-center text-black max-w-4xl"
      >
        <h2 class="font-barlow font-bold mb-2 mt-16 text-6xl">{{$page.blogPage.title}}</h2>
        <span class="font-barlow text-md font-bolder text-gray-700 text-lg block mb-12">{{$page.blogPage.date}}</span>
        <div class="text-center mb-10">
            <img class="inline w-full rounded" src="https://picsum.photos/600/300" />
        </div>
        <!-- <div class="content" v-html="$page.blogPage.content" /> -->
        <div id="blog-content" class="text-left">
            <VueRemarkContent />
        </div>
      </div>
    </div>
  </Layout>
</template>

<page-query>
query Blog ($path: String!) {
	blogPage: blogPage (path: $path) {
		title
		date (format: "MMMM DD, YYYY")
		image
		description
		path
		content
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
  
  metaInfo() {
    const title = this.$page.blogPage.title;
    const description = this.$page.blogPage.description || this.$page.blogPage.excerpt;

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

#blog-content {
    // h1, h2, h3, h4, h5, h6 {
    //     @apply mt-4 pb-2
    // }

    // h1, h2, h3, h4, h5, h6, ol, ul, p {
	// 	@apply mb-2
    // }

    // ol, ul, p {
	// 	color: #474C55;
	// 	@apply leading-8
    // }

    h1 {
        @apply text-4xl font-bold mb-2 mt-4
    }

    h2 {
        @apply text-3xl font-bold mt-12
    }

    h3 {
        @apply text-2xl font-bold mt-12
    }

    h4 {
        @apply text-xl font-bold mt-12
    }

    h5 {
        @apply text-lg font-bold mt-12
    }

    p {
        @apply mt-8 leading-8 text-lg
    }

    img {
        @apply w-full
    }
}
</style>