<template>
  <Layout>
    <div class="w-full pt-8 pb-8 bg-gray-100">
      <div 
        class="container text-black text-center text-black max-w-4xl"
      >
        <span class="text-md block mb-2">{{$page.blogPage.date}}</span>
        <h2 class="font-bold mb-8 text-4xl">{{$page.blogPage.title}}</h2>
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