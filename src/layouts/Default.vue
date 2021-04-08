<template>
  <div class="w-full">
    <Header />
    <slot/>
    <Footer />
  </div>
</template>

<script>
import Header from "../components/Header"
import Footer from "../components/Footer"

export default {
  components:{
    Header,
    Footer
  },
  setup() {
    
  },
}
</script>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>

<style>
body {
  font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  margin:0;
  padding:0;
  line-height: 1.5;
}

.layout {
  max-width: 760px;
  margin: 0 auto;
  padding-left: 20px;
  padding-right: 20px;
}
</style>
