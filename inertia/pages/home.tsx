import { Link } from '@inertiajs/react'
import { ArrowRight } from 'lucide-react'
import Seo from '~/components/seo'
import SiteLayout from '~/components/site_layout'
import type { SiteLinks } from '~/lib/types'

// `imageLeft` puts the screenshot on the left of the row on desktop. On mobile
// every row stacks image first, then the copy.
const FEATURES = [
  {
    title: 'Artist Friendly',
    body: 'Node-based workflow gives you a preview at every step.',
    image: '/images/artist-friendly.png',
    imageLeft: false,
  },
  {
    title: 'Create Seamless Textures, Seamlessly',
    body: 'Shapes, noises and filters in TextureLab are seamless by default.',
    image: '/images/seamless.png',
    imageLeft: true,
  },
  {
    title: 'Design Once, Use At Any Resolution',
    body: 'Procedural textures are the SVGs of the 3D art world.',
    image: '/images/any-resolution.png',
    imageLeft: false,
  },
]

const OTHER_FEATURES = [
  { title: 'Unity Support', body: 'Export your textures directly to unity materials.' },
  {
    title: 'Awesome Community',
    body: 'Join our friendly community of artists and developers on Discord and itch.io',
  },
  {
    title: 'Open Source',
    body: 'TextureLab is made awesome by the contributions of others. Check out our Github repository if you want to help with its development.',
  },
  { title: 'Hardware Accelerated', body: 'Almost all nodes are built to work on the GPU.' },
  { title: 'Works Everywhere!', body: 'Runs on Windows, Linux and Mac' },
  {
    title: 'PBR-Ready',
    body: 'By default, materials are geared towards a metallic Physically Based Rendering workflow',
  },
]

export default function Home({ links }: { links: SiteLinks }) {
  return (
    <SiteLayout>
      <Seo title="Home" />

      <section className="block w-full bg-gray-900 pb-[120px] sm:pb-[240px] md:pb-[280px] lg:pb-[360px]">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="flex flex-col px-8 pt-4 md:pt-8">
            <h1 className="mx-auto max-w-4xl pt-8 font-display text-3xl font-bold md:text-5xl">
              Procedural Texturing is the Future
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-xl text-gray-300">
              Texturelab is an Open Source alternative for making beautiful, tileable,
              physically-based textures
            </p>
            <div className="pt-8">
              <Link
                className="mb-3 block rounded bg-brand px-3 py-3 text-xl font-bold shadow md:mb-12 md:inline-block md:px-5 md:py-5 md:text-2xl"
                href="/download"
              >
                Download
              </Link>
              <Link
                className="mb-12 block rounded bg-white px-3 py-3 text-xl font-bold text-gray-600 shadow md:ml-8 md:inline-block md:px-5 md:py-5 md:text-2xl"
                href="/docs"
              >
                Get Started <ArrowRight className="inline" size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full">
        <div className="container mx-auto px-4 text-center">
          <img
            className="mx-auto -mt-[120px] rounded shadow-[0_5px_30px_rgba(0,0,0,0.5)] sm:-mt-[240px] md:-mt-[280px] lg:-mt-[360px]"
            src="/images/screenshot.png"
            alt="The TextureLab editor"
          />
        </div>
      </div>

      <section className="w-full py-10 md:py-20">
        <div className="container mx-auto max-w-6xl px-4 text-left text-black">
          <div className="mb-8 flex flex-col items-center justify-center px-8 text-center md:mb-0">
            <h2 className="py-3 font-display text-3xl font-bold md:text-5xl">Features</h2>
            <p className="max-w-3xl text-xl text-gray-500">
              TextureLab is packed with features to help you make your next masterpiece
            </p>
          </div>

          {FEATURES.map((feature) => (
            <div key={feature.title} className="grid py-8 md:grid-cols-2 md:py-14">
              <div
                className={`order-2 flex flex-col justify-center px-8 text-center md:text-left ${
                  feature.imageLeft ? '' : 'md:order-1'
                }`}
              >
                <h3 className="py-3 font-display text-2xl font-bold md:text-3xl">
                  {feature.title}
                </h3>
                <p className="text-lg">{feature.body}</p>
              </div>
              <div
                className={`order-1 flex items-start px-8 ${feature.imageLeft ? '' : 'md:order-2'}`}
              >
                <img className="inline-block rounded shadow-md" src={feature.image} alt="" />
              </div>
            </div>
          ))}

          <h3 className="block pt-8 text-center font-display text-2xl font-bold text-gray-500">
            Other Features
          </h3>

          <div className="grid pt-2 md:grid-cols-3 md:pt-12">
            {OTHER_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="mx-3 my-3 rounded-lg border-2 border-gray-300 px-5 py-5 md:px-8 md:py-8"
              >
                <h4 className="pb-2 text-xl font-bold text-gray-600 md:pb-5 md:text-2xl">
                  {feature.title}
                </h4>
                <p className="text-gray-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-gray-900 py-10 md:py-20">
        <div className="container mx-auto max-w-6xl px-4 text-left text-white">
          <div className="flex flex-col items-center justify-center px-8">
            <h2 className="py-3 text-center font-display text-3xl font-bold md:text-5xl">
              Want to Contribute?
            </h2>
            <p className="max-w-3xl text-center text-lg text-gray-300">
              This project is still under heavy development so now is your chance to influence the
              project in a big way
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1">
            <div className="mx-3 my-3 rounded-lg border-2 border-gray-300 bg-white px-8 py-8 text-center md:text-left">
              <h4 className="pb-2 text-xl font-bold text-gray-800 md:text-2xl">
                Join Our Communities
              </h4>
              <p className="mb-6 text-gray-700 md:text-lg">
                Our growing community is very welcoming and responsive. We even have weekly
                challenges on Discord.
              </p>
              <div className="text-center md:text-right">
                <a
                  href={links.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md bg-discord px-5 py-3 font-bold text-white shadow-sm"
                >
                  Join The #TextureLab Discord
                </a>
                <a
                  href={links.itchCommunity}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-md bg-itch px-5 py-3 font-bold text-white shadow-sm md:ml-3"
                >
                  Checkout our itch.io Community
                </a>
              </div>
            </div>

            <div className="mx-3 my-3 rounded-lg border-2 border-gray-300 bg-white px-8 py-8 text-center md:text-left">
              <h4 className="pb-2 text-xl font-bold text-gray-800 md:text-2xl">
                Become a Contributor on Github
              </h4>
              <p className="mb-6 text-gray-700 md:text-lg">
                If you want a personal hand in the development of this project, you can join in,
                TextureLab is open source!
              </p>
              <div className="text-center md:text-right">
                {[
                  { href: links.roadmap, label: 'View our Project Roadmap' },
                  { href: links.issues, label: 'Post an Issue, Bug or a Suggested Feature' },
                  { href: links.pulls, label: 'Create a Pull Request' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 ml-0 inline-block rounded-md bg-gray-700 px-5 py-3 font-bold text-white shadow-sm md:ml-3"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
