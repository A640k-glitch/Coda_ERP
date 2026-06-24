import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthPopoutButton from '../components/ui/auth-popout-button';
import { GodRays } from "@paper-design/shaders-react";

const buttonRoot = document.getElementById('react-auth-button');
if (buttonRoot) {
  createRoot(buttonRoot).render(
    <React.StrictMode>
      <AuthPopoutButton />
    </React.StrictMode>
  );
}

const bgRoot = document.getElementById('react-hero-bg');
if (bgRoot) {
  createRoot(bgRoot).render(
    <React.StrictMode>
      <GodRays
        colorBack="#00000000"
        colors={["#14b8a640", "#2dd4bf40", "#0f766e40", "#0d948840"]}
        colorBloom="#14b8a6"
        offsetX={0.85}
        offsetY={-1}
        weight={0.5}
        exposure={0.6}
        decay={0.9}
        density={0.7}
        animated
      />
    </React.StrictMode>
  );
}
