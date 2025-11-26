"use client";

import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";

export default function Home() {
  const { count, increment, decrement } = useStore();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
      <div className="text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to Next.js
          </h1>
          <p className="text-xl text-white/90">
            with Zustand, shadcn/ui, TailwindCSS, husky, and lint-staged
          </p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-4">Zustand Counter Demo</h2>
          <div className="text-6xl font-bold mb-6 text-blue-600">{count}</div>
          <div className="flex gap-4 justify-center">
            <Button onClick={decrement} variant="outline" size="lg">
              Decrement
            </Button>
            <Button onClick={increment} size="lg">
              Increment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
