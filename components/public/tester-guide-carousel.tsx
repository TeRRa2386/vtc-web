"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    image: "/testing-guide-1.jpg",
    title: "Step 1: Open the Email",
    text: "Open the email from Vet Tech Companion and tap the Join Android Test button."
  },
  {
    image: "/testing-guide-2.jpg",
    title: "Step 2: Install the App",
    text: "The link will open Google Play. Tap Install to download Vet Tech Companion Early Access."
  },
  {
    image: "/testing-guide-3.jpg",
    title: "Step 3: Open the App",
    text: "Once the app is installed, tap Open from Google Play."
  },
  {
    image: "/testing-guide-4.jpg",
    title: "Step 4: Log In",
    text: "Continue with Google to start using Vet Tech Companion."
  },
  {
    image: "/testing-guide-5.jpg",
    title: "Step 5: Go to Settings",
    text: "After logging in, go to the Settings tab and tap User Profile."
  },
  {
    image: "/testing-guide-6.jpg",
    title: "Step 6: Unlock Pro",
    text: "In your profile, tap Unlock Pro to activate full testing access."
  },
  {
    image: "/testing-guide-7.jpg",
    title: "Step 7: Choose a Plan",
    text: "Select one of the available plans. This is required to unlock Pro features during testing."
  },
  {
    image: "/testing-guide-8.jpg",
    title: "Step 8: Confirm It Is a Test Purchase",
    text: "Before subscribing, make sure Google Play shows Test card, always approves. This means you will not be charged."
  },
  {
    image: "/testing-guide-9.jpg",
    title: "Step 9: Subscription Confirmed",
    text: "After completing the test purchase, Google Play should show that you are subscribed."
  },
  {
    image: "/testing-guide-10.jpg",
    title: "Step 10: Pro Access Active",
    text: "Go back to your profile and confirm that your account shows Pro Active."
  },
  {
    image: "/testing-guide-11.jpg",
    title: "Step 11: You Are Ready to Test",
    text: "Google may send you emails about the test subscription. No worries - it is using a Google test card, so no real payment is involved and you do not need to do anything."
  }
];

export function TesterGuideCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];

  function showSlide(index: number) {
    if (index >= slides.length) {
      setCurrentSlide(0);
      return;
    }

    if (index < 0) {
      setCurrentSlide(slides.length - 1);
      return;
    }

    setCurrentSlide(index);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border bg-muted/45">
        <div className="px-4 py-5 text-center sm:px-6">
          <div className="mx-auto max-w-[360px] overflow-hidden rounded-lg border bg-card shadow-soft">
            <Image
              alt={slide.title}
              className="h-auto w-full"
              height={900}
              priority={currentSlide === 0}
              src={slide.image}
              width={420}
            />
          </div>
          <h2 className="mt-5 text-xl font-black text-foreground">{slide.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
            {slide.text}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button onClick={() => showSlide(currentSlide - 1)} type="button">
          <ChevronLeft size={18} />
          Previous
        </Button>
        <span className="text-sm font-black text-muted-foreground">
          {currentSlide + 1} / {slides.length}
        </span>
        <Button onClick={() => showSlide(currentSlide + 1)} type="button">
          Next
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {slides.map((item, index) => (
          <button
            aria-label={`Show ${item.title}`}
            className={cn(
              "size-2.5 rounded-full transition",
              index === currentSlide ? "bg-primary" : "bg-border hover:bg-primary/45"
            )}
            key={item.title}
            onClick={() => showSlide(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
