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
          <g-image class="mt-8 mx-auto rounded screenshot" src="../../static/images/screenshot.png" />
      </div>
    </div>

    <div class="w-full py-20">
      <div class="container text-black text-left max-w-6xl">
        <div class="grid grid-cols-2">
          <div class="flex flex-col text-left justify-center px-8">
            <h1 class="text-5xl font-bold py-3">Decent Looking Title</h1>
            <h2 class="text-2xl">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</h2>
          </div>
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md" src="https://via.placeholder.com/500" />
          </div>
        </div>
      </div>
    </div>

    <div class="w-full py-20 bg-gray-900">
      <div class="container text-white text-left max-w-6xl">
        <div class="grid grid-cols-2">
          <div class="flex flex-row justify-end px-8">
            <g-image class="inline-block shadow-md" src="https://via.placeholder.com/500" />
          </div>
          <div class="flex flex-col items-start justify-center px-8">
            <h1 class="text-5xl font-bold py-3">Decent Looking Title</h1>
            <h2 class="text-2xl">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</h2>
          </div>
          
        </div>
      </div>
    </div>

    <div class="w-full py-20 bg-gray-300">
      <div class="container text-black text-left max-w-6xl">
        <div class="grid grid-cols-2">
          <div class="flex flex-col justify-center px-8">
            <h1 class="text-5xl font-bold py-3">Decent Looking Title</h1>
            <h2 class="text-2xl">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</h2>
          </div>
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md" src="https://via.placeholder.com/500" />
          </div>
        </div>
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
