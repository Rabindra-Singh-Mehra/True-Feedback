'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react'; // Assuming you have an icon for messages
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Autoplay from 'embla-carousel-autoplay';
import messages from '@/messages.json';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function Home() {
  return (
    <>
      {/* Main content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 md:px-24 py-20 bg-gray-900 text-white">
        <section className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl font-bold">
            Dive into the World of Anonymous Feedback
          </h1>
          <p className="mt-5 md:mt-6 text-lg md:text-xl text-gray-300">
            True Feedback - Where your identity remains a secret.
          </p>
        </section>

        {/* Carousel for Messages */}
        <Carousel
          plugins={[Autoplay({ delay: 2000 })]}
          className="w-full max-w-md md:max-w-2xl"
        >
          <CarouselContent className="-ml-1">
            {messages.map((message, index) => (
              <CarouselItem key={index} className="pl-1 md:pl-2">
                <Card className="bg-gray-800 text-white border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{message.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row items-start space-y-3 md:space-y-0 md:space-x-5 p-6">
                    <Mail className="flex-shrink-0 w-6 h-6 text-gray-400" />
                    <div>
                      <p className="text-base">{message.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {message.received}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="text-white" />
          <CarouselNext className="text-white" />
        </Carousel>
      </main>

      
    </>
  );
}
