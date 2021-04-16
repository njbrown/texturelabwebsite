<template>
  <Layout>
      <div class="flex flex-wrap items-start justify-start">

        <div class="order-2 w-full md:w-1/4 sm:pl-4 md:pl-6 lg:pl-8 sticky" style="top: 4rem">
          <OnThisPage />
        </div>

        <div class="order-1 w-full md:w-3/4">
          <div class="content" v-html="$page.docPage.content" />

          <div class="mt-8 pt-8 lg:mt-12 lg:pt-12 border-t border-ui-border">
            <NextPrevLinks />
          </div>
        </div>

      </div>
  </Layout>
</template>

<page-query>
query ($id: ID!) {
  docPage(id: $id) {
    id
    title
    description
    path
    timeToRead
    content
    sidebar
    next
    prev
    headings {
      depth
      value
      anchor
    }
  }
  allDocPage{
    edges {
      node {
        path
        title
      }
    }
  }
}
</page-query>

<script>
import OnThisPage from '@/components/OnThisPage.vue';
import Layout from '@/layouts/Doc.vue';
import NextPrevLinks from '@/components/NextPrevLinks.vue';

export default {
  components: {
    Layout,
    OnThisPage,
    NextPrevLinks
  },
  
  metaInfo() {
    const title = this.$page.docPage.title;
    const description = this.$page.docPage.description || this.$page.docPage.excerpt;

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