<template>
  <Layout>
    <div class="w-full bg-gray-800 block">
      <div class="container text-white text-center hero-margin">
        <div class="flex flex-col pt-8 px-8">
          <h1 class="text-5xl pt-8 font-bold mx-auto max-w-4xl">Procedural Texturing is the Future</h1>
          <h4 class="text-2xl mt-4 text-gray-300 mx-auto max-w-lg">With TextureLab, you dont have to be an artist to make beautiful textures</h4>
          <div>  
            <a class="px-5 py-5 mt-8 mb-12 rounded bg-blue-400 text-2xl font-bold inline-block flex-wrap" href="#">Download</a>
          </div>
          <!-- <g-image class="mt-8 -mb-20 shadow-xl" src="../../static/images/screenshot.png" /> -->
        </div>
      </div>
    </div>
    <div class="w-full">
      <div class="container text-white text-center">
          <g-image class="mt-8 mx-auto screenshot" src="../../static/images/screenshot.png" />
      </div>
    </div>

    <div class="w-full">
      <div class="container text-white text-center">
      </div>
    </div>

  </Layout>
</template>

<script>
export default {
  metaInfo: {
    title: 'Hello, world!'
  }
}
</script>

<style>
.hero-margin {
  padding-bottom:360px;
}

.screenshot {
  margin-top:-360px;
  box-shadow: 0 5px 30px rgb(0,0,0,0.5);
}
</style>
