<template>
  <Layout>
    <div class="w-full bg-gray-900 block">
      <div class="container text-white text-center hero-margin">
        <div class="flex flex-col pt-8 px-8">
          <h1 class="text-5xl pt-8 font-bold mx-auto max-w-4xl font-barlow">Procedural Texturing is the Future</h1>
          <h4 class="text-2xl mt-4 text-gray-300 mx-auto max-w-lg">With TextureLab, you dont have to be an artist to make beautiful textures</h4>
          <div>  
            <a class="px-5 py-5 mt-8 mb-12 rounded bg-blue-400 text-2xl font-bold inline-block flex-wrap shadow" href="https://njbrown.itch.io/texturelab" target="_blank">Download</a>
            <g-link class="px-5 py-5 mt-8 mb-12 rounded bg-white text-gray-600 text-2xl font-bold inline-block flex-wrap ml-8 shadow" to="/docs">Get Started <ArrowRightIcon size="1.2x" class="inline"/></g-link>
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
        <div class="flex flex-col text-center items-center justify-center px-8">
          <h1 class="text-5xl font-bold py-3 font-barlow">Features</h1>
          <h2 class="text-2xl max-w-3xl text-gray-500">TextureLab is packed with features to help you make your next masterpiece</h2>
        </div>

        <div class="grid grid-cols-2 py-14">
          <div class="flex flex-col justify-center px-8">
            <h1 class="text-3xl font-bold py-3 font-barlow">Artist Friendly</h1>
            <h2 class="text-xl">Node-based workflow gives you a preview at every step.</h2>
          </div>
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md rounded" src="../../static/images/artist-friendly.png" />
          </div>
        </div>

        <div class="grid grid-cols-2 py-14">
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md rounded" src="../../static/images/seamless.png" />
          </div>
          <div class="flex flex-col justify-center px-8">
            <h1 class="text-3xl font-bold py-3 font-barlow">Create Seamless Textures, Seamlessly</h1>
            <h2 class="text-xl">Shapes, noises and filters in TextureLab are seamless by default.</h2>
          </div>
        </div>

        <div class="grid grid-cols-2 py-14">
          <div class="flex flex-col justify-center px-8">
            <h1 class="text-3xl font-bold py-3 font-barlow">Design Once, Use At Any Resolution</h1>
            <h2 class="text-xl">Procedural textures are the SVGs of the 3D art world.</h2>
          </div>
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md rounded" src="../../static/images/any-resolution.png" />
          </div>
        </div>

        <!-- <div class="py-14">
          <div class="text-center px-8">
            <h1 class="text-3xl block font-bold py-3 font-barlow">Procedural Workflow</h1>
            <h2 class="text-xl block">TextureLab's procedural and non-destructive workflow enabled you to easily create variants of your textures and maximize resusability</h2>
          </div>
          <div class="grid grid-cols-5 items-start py-8 gap-x-3">
            <g-image class="inline-block shadow-md rounded" src="https://via.placeholder.com/500x500" />
            <g-image class="inline-block shadow-md rounded" src="https://via.placeholder.com/500x500" />
            <g-image class="inline-block shadow-md rounded" src="https://via.placeholder.com/500x500" />
            <g-image class="inline-block shadow-md rounded" src="https://via.placeholder.com/500x500" />
            <g-image class="inline-block shadow-md rounded" src="https://via.placeholder.com/500x500" />
          </div>
        </div> -->

        <h1 class="text-2xl block text-center font-bold text-gray-500 font-barlow">Other Features</h1>

        <div class="grid grid-cols-3 pt-12">

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">Unity Support</h4>
            <p class="text-gray-500 text-lg">Export your textures directly to unity materials.</p>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">Awesome Community</h4>
            <p class="text-gray-500 text-lg">Join our friendly community of artists and developers on Discord and itch.io</p>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">Open Source</h4>
            <p class="text-gray-500 text-lg">TextureLab is made awesome by the contributions of others. Check out our Github repository if you want to help with its development.</p>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">Hardware Accelerated</h4>
            <p class="text-gray-500 text-lg">Almost all nodes are build to work on the GPU.</p>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">Works Everywhere!</h4>
            <p class="text-gray-500 text-lg">Runs on Windows, Linux and Mac</p>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-2xl font-bold text-gray-600 pb-5 font-inter">PBR-Ready</h4>
            <p class="text-gray-500 text-lg">By default, materials are geared towards a metallic Physically Based Rendering workflow</p>
          </div>

        </div>
      </div>
    </div>

    <div class="w-full py-20 bg-gray-900">
      <div class="container text-white text-left max-w-6xl">

        <div class="flex flex-col items-center justify-center px-8">
          <h1 class="text-5xl font-bold py-3 font-barlow">Want to Contribute?</h1>
          <h2 class="text-2xl text-gray-300 max-w-3xl text-center">This project is still under heavy development so now is your chance to influence the project in a big way</h2>
        </div>

        <div class="grid grid-cols-1 mt-8">

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white">
            <h4 class="text-2xl font-bold text-gray-800 pb-2 font-inter">Join Our Communities</h4>
            <p class="text-gray-700 text-lg mb-6">Our growing community is very welcoming and responsive. We even have weekly challenges Discord.</p>
            <div class="flex justify-end">
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow discord-purple short-shadow">Join The #TextureLab Discord</a>
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 ml-3 itch-red short-shadow">Checkout our itch.io Community</a>
            </div>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white">
            <h4 class="text-2xl font-bold text-gray-800 pb-2 font-inter">Become a Contributor on Github</h4>
            <p class="text-gray-700 text-lg mb-6">If you want a personal hand in the development of this project, you can join in, TextureLab is open source!</p>
            <div class="flex justify-end">
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow bg-gray-700 short-shadow">View our Project Roadmap</a>
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow bg-gray-700 short-shadow ml-3">View our Contribution Guide</a>
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow bg-gray-700 short-shadow ml-3">Post an Isssue, Bug or a Suggested Feature</a>
            </div>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white">
            <h4 class="text-2xl font-bold text-gray-800 pb-2 font-inter">Become a Sponsor</h4>
            <p class="text-gray-700 text-lg mb-6">If you like this project and want to see it flourish, please consider donating.</p>
            <div class="flex justify-end">
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 ml-3 itch-red short-shadow">Become a Sponsor on itch.io</a>
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow bg-gray-700 short-shadow ml-3">Become a Sponsor on Github</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- <div class="w-full py-20 bg-gray-300">
      <div class="container text-black text-left max-w-6xl">
        <div class="grid grid-cols-2">
          <div class="flex flex-col justify-center px-8">
            <h1 class="text-5xl font-bold py-3 font-barlow">Decent Looking Title</h1>
            <h2 class="text-2xl">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</h2>
          </div>
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md" src="https://via.placeholder.com/500" />
          </div>
        </div>
      </div>
    </div> -->

  </Layout>
</template>

<script>
import { ArrowRightIcon } from 'vue-feather-icons'
import { DownloadCloudIcon } from 'vue-feather-icons'
import { ArrowDownCircleIcon } from 'vue-feather-icons'

export default {
  metaInfo: {
    title: 'Hello, world!'
  },
  components: {
    ArrowRightIcon,
    DownloadCloudIcon,
    ArrowDownCircleIcon
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

.discord-purple {
  background-color:#7289DA;
}

.itch-red {
  background-color:rgb(239, 0, 73);
}

.github-gray {
  /* border:solid black 1px; */
}

.short-shadow
{
  box-shadow: rgba(0, 0, 0, 0.3) 0px 2px 4px -1px;
}
</style>
