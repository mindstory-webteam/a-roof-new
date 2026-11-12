'use client';

import { useState } from 'react';
import SmoothScroll from '@/components/SmoothScroll';
import Preloader from '@/components/Preloader';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Marquee from '@/components/Marquee';
import About from '@/components/About';
import Products from '@/components/Products';
import Tests from '@/components/Tests';
import Faq from '@/components/Faq';
import Showreel from '@/components/Showreel';
import Gallery from '@/components/Gallery';
import VideoStories from '@/components/VideoStories';
import Cta from '@/components/Cta';
import Footer from '@/components/Footer';
import SheetStory from '@/components/SheetStory';

export default function Home() {
  const [ready, setReady] = useState(false);

  return (
    <SmoothScroll>
      <Preloader onDone={() => setReady(true)} />
      <Nav />
      <main>
        <Hero ready={ready} />
        <Marquee />
        <About />
        <Showreel />
        <Products />
        <SheetStory/>
        <Gallery />
        <Tests />
        <VideoStories />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
