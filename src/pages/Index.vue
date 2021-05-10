<template>
  <Layout>
    <div class="w-full bg-gray-900 block">
      <div class="container text-white text-center hero-margin">
        <div class="flex flex-col pt-4 md:pt-8 px-8">
          <h1 class="text-3xl md:text-5xl pt-8 font-bold mx-auto max-w-4xl font-barlow">Procedural Texturing is the Future</h1>
          <h4 class="text-xl mt-4 text-gray-300 mx-auto max-w-lg">With TextureLab, you dont have to be an artist to make beautiful textures</h4>
          <div class="pt-8">  
            <a class="md:mx-0 px-3 py-3 md:px-5 md:py-5 mb-3 md:mb-12 rounded bg-blue-400 text-xl md:text-2xl font-bold block md:inline-block flex-wrap shadow sm:text-center" href="https://njbrown.itch.io/texturelab" target="_blank">Download</a>
            <g-link class="md:mx-0 px-3 py-3 md:px-5 md:py-5 mb-12 rounded bg-white text-gray-600 text-xl md:text-2xl font-bold block md:inline-block flex-wrap md:ml-8 shadow sm:text-center" to="/docs">Get Started <ArrowRightIcon size="1.2x" class="inline"/></g-link>
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

    <div class="w-full py-10 md:py-20">
      <div class="container text-black text-left max-w-6xl">
        <div class="flex flex-col text-center items-center justify-center px-8 mb-8 md:mb-0">
          <h1 class="text-3xl md:text-5xl font-bold py-3 font-barlow">Features</h1>
          <h2 class="text-xl max-w-3xl text-gray-500">TextureLab is packed with features to help you make your next masterpiece</h2>
        </div>

        <div class="grid md:grid-cols-2 py-8 md:py-14">
          <div class="flex flex-col justify-center px-8 order-2 md:order-1 text-center md:text-left">
            <h1 class="text-2xl md:text-3xl font-bold py-3 font-barlow">Artist Friendly</h1>
            <h2 class="text-lg">Node-based workflow gives you a preview at every step.</h2>
          </div>
          <div class="flex items-start px-8 order-1 md:order-2">
            <g-image class="inline-block shadow-md rounded" src="../../static/images/artist-friendly.png" />
          </div>
        </div>

        <div class="grid md:grid-cols-2 py-8 md:py-14">
          <div class="flex items-start px-8">
            <g-image class="inline-block shadow-md rounded" src="../../static/images/seamless.png" />
          </div>
          <div class="flex flex-col justify-center px-8 text-center md:text-left">
            <h1 class="text-2xl md:text-3xl font-bold py-3 font-barlow">Create Seamless Textures, Seamlessly</h1>
            <h2 class="text-lg">Shapes, noises and filters in TextureLab are seamless by default.</h2>
          </div>
        </div>

        <div class="grid md:grid-cols-2 py-8 md:py-14">
          <div class="flex flex-col justify-center px-8 order-2 md:order-1 text-center md:text-left">
            <h1 class="text-2xl md:text-3xl font-bold py-3 font-barlow">Design Once, Use At Any Resolution</h1>
            <h2 class="text-lg">Procedural textures are the SVGs of the 3D art world.</h2>
          </div>
          <div class="flex items-start px-8 order-1 md:order-2">
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

        <h1 class="text-2xl block text-center font-bold text-gray-500 font-barlow pt-8">Other Features</h1>

        <div class="grid md:grid-cols-3 pt-2 md:pt-12">

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">Unity Support</h4>
            <p class="text-gray-500 text-md">Export your textures directly to unity materials.</p>
          </div>

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">Awesome Community</h4>
            <p class="text-gray-500 text-lg">Join our friendly community of artists and developers on Discord and itch.io</p>
          </div>

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">Open Source</h4>
            <p class="text-gray-500 text-lg">TextureLab is made awesome by the contributions of others. Check out our Github repository if you want to help with its development.</p>
          </div>

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">Hardware Accelerated</h4>
            <p class="text-gray-500 text-lg">Almost all nodes are build to work on the GPU.</p>
          </div>

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">Works Everywhere!</h4>
            <p class="text-gray-500 text-lg">Runs on Windows, Linux and Mac</p>
          </div>

          <div class="px-5 py-5 md:px-8 md:py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300">
            <h4 class="text-xl md:text-2xl font-bold text-gray-600 pb-2 md:pb-5 font-inter">PBR-Ready</h4>
            <p class="text-gray-500 text-lg">By default, materials are geared towards a metallic Physically Based Rendering workflow</p>
          </div>

        </div>
      </div>
    </div>

    <div class="w-full py-10 md:py-20 bg-gray-900">
      <div class="container text-white text-left max-w-6xl">

        <div class="flex flex-col items-center justify-center px-8">
          <h1 class="text-3xl md:text-5xl font-bold py-3 font-barlow text-center md:text-left">Want to Contribute?</h1>
          <h2 class="text-lg text-gray-300 max-w-3xl text-center">This project is still under heavy development so now is your chance to influence the project in a big way</h2>
        </div>

        <div class="grid grid-cols-1 mt-8">
          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white text-center md:text-left">
            <h4 class="text-xl md:text-2xl font-bold text-gray-800 pb-2 font-inter">Join Our Communities</h4>
            <p class="text-gray-700 text-md md:text-lg mb-6">Our growing community is very welcoming and responsive. We even have weekly challenges Discord.</p>
            <div class="text-center md:text-right">
              <a href="https://discord.gg/975NdQPsSc" target="_blank" class="inline-block rounded-md text-white font-bold px-5 py-3 mt-2 text-shadow discord-purple short-shadow">Join The #TextureLab Discord</a>
              <a href="https://njbrown.itch.io/texturelab/community" target="_blank" class="inline-block rounded-md text-white font-bold px-5 py-3 mt-2 md:ml-3 itch-red short-shadow">Checkout our itch.io Community</a>
            </div>
          </div>

          <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white text-center md:text-left">
            <h4 class="text-xl md:text-2xl font-bold text-gray-800 pb-2 font-inter">Become a Contributor on Github</h4>
            <p class="text-gray-700 text-md md:text-lg mb-6">If you want a personal hand in the development of this project, you can join in, TextureLab is open source!</p>
            <div class="text-center md:text-right">
              <a href="https://github.com/njbrown/texturelab/projects" target="_blank" class="inline-block rounded-md text-white font-bold px-5 py-3 mt-2 text-shadow bg-gray-700 short-shadow">View our Project Roadmap</a>
              <a href="https://github.com/njbrown/texturelab/issues" target="_blank" class="inline-block rounded-md text-white font-bold px-5 py-3 mt-2 text-shadow bg-gray-700 short-shadow md:ml-3">Post an Isssue, Bug or a Suggested Feature</a>
              <a href="https://github.com/njbrown/texturelab/pulls" target="_blank" class="inline-block rounded-md text-white font-bold px-5 py-3 mt-2 text-shadow bg-gray-700 short-shadow md:ml-3">Create a Pull Request</a>
            </div>
          </div>

          <!-- <div class="px-8 py-8 mx-3 my-3 border border-2 rounded-lg border-gray-300 bg-white">
            <h4 class="text-2xl font-bold text-gray-800 pb-2 font-inter">Become a Sponsor</h4>
            <p class="text-gray-700 text-lg mb-6">If you like this project and want to see it flourish, please consider donating.</p>
            <div class="flex justify-end">
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 ml-3 itch-red short-shadow">Become a Sponsor on itch.io</a>
              <a href="#" class="inline-block rounded-md text-white font-bold px-5 py-3 text-shadow bg-gray-700 short-shadow ml-3">Become a Sponsor on Github</a>
            </div>
          </div> -->
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

<static-query>
  query {
    metadata {
      siteName
      siteDescription
      siteUrl
    }
  }
</static-query>

<script>
import { ArrowRightIcon } from 'vue-feather-icons'
import { DownloadCloudIcon } from 'vue-feather-icons'
import { ArrowDownCircleIcon } from 'vue-feather-icons'

export default {
  metaInfo:function(){
    // console.log(this.$static.metadata.siteUrl);
    const siteUrl = this.$static.metadata.siteUrl;
    // const siteUrl = "";

    return {
      title: 'Home',
      meta: [
        {
          key: 'og:title',
          name: 'og:title',
          content: 'TextureLab',
        },
        {
          key: 'twitter:title',
          name: 'twitter:title',
          content: 'TextureLab',
        },
        {
          property: 'og:image',
          content: siteUrl+"/images/artist-friendly.png"
        },
        {
          name: 'twitter:card',
          content:'summary_large_image'
        },
        {
            key: 'twitter:image',
            property: 'twitter:image',
            content: siteUrl+"/images/artist-friendly.png"
          },
        {
          name: 'twitter:creator',
          content: "@njbrown"
        },
      ]
    }
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
  padding-bottom:120px;
}

.screenshot {
  margin-top:-120px;
  box-shadow: 0 5px 30px rgb(0,0,0,0.5);
}

@media (min-width: 640px) {
  .hero-margin {
    padding-bottom:240px;
  }

  .screenshot {
    margin-top:-240px;
    box-shadow: 0 5px 30px rgb(0,0,0,0.5);
  }
}

@media (min-width: 768px) {
  .hero-margin {
    padding-bottom:280px;
  }

  .screenshot {
    margin-top:-280px;
    box-shadow: 0 5px 30px rgb(0,0,0,0.5);
  }
}

@media (min-width: 1024px) {
  .hero-margin {
    padding-bottom:360px;
  }

  .screenshot {
    margin-top:-360px;
    box-shadow: 0 5px 30px rgb(0,0,0,0.5);
  }
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
