
import React from 'react';

export const ICONS = {
  UFO: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  GHOST: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  SEARCH: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  MAP: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  BRAIN: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  UPLOAD: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  ARCHIVE: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  SPEAKER: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  INFO: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  FOLDER: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  NEXUS: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.5 9.5 0 0113.858 0M6.228 6.228A14.5 14.5 0 0117.772 17.772" />
    </svg>
  ),
  SATELLITE: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.297A2.453 2.453 0 019.209 21.696L3.39 20.8a2.453 2.453 0 01-1.59-3.468L5.582 9.462a2.453 2.453 0 013.406-1.541l2.012.961M11 5.882l7.75-3.875a2.453 2.453 0 013.438 1.542l3.782 11.346a2.453 2.453 0 01-1.591 3.468l-5.819.897a2.453 2.453 0 01-1.8-2.399V5.882z" />
    </svg>
  ),
  VIDEO: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  GRID: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  AUDIO_SPARK: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
    </svg>
  ),
  CAMERA: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  SIGNAL: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  CELESTIAL: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  RADAR: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a10.003 10.003 0 008.139-4.161l.054.09m-3.44 2.04C15.01 17.799 14 14.517 14 11m-4 0c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09A10.003 10.003 0 0012 3a10.003 10.003 0 00-8.139 4.161l-.054-.09m3.44-2.04C8.99 6.201 10 9.483 10 13" />
    </svg>
  ),
  FILE: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  SHIELD: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ALERT: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

export const ANOMALY_FACTS = [
  "The 2024 NDAA Disclosure Act contains specific language about 'non-human intelligence' and 'recovered biologics'.",
  "A massive 'gravitational anomaly' has been detected 100km beneath the moon's South Pole.",
  "Deep-sea sensor arrays in the Mariana Trench have recorded rhythmic sounds that match no known geological or biological source.",
  "Quantum computers are reportedly experiencing 'ghost qubits' that behave as if being observed from outside our timeline.",
  "In late 2024, a swarm of 50+ UAPs was reported over Dyess AFB, displaying perfect synchronization without propulsion signatures.",
  "Havana Syndrome research in 2025 suggests a localized 'temporal fold' effect on brain tissue rather than simple microwave pulses.",
  "The 'Black Knight' satellite theory persists as radar signatures in polar orbits continue to show unlisted 15-ton objects.",
  "In 1952, a fleet of UFOs was radar-tracked over the White House, causing the largest military response of the decade.",
  "Project Blue Book analyzed 12,618 UFO reports; 701 remain 'unidentified' to this day.",
  "The Nimitz 'Tic Tac' UFO displayed 'instantaneous acceleration' without visible wings or propulsion.",
  "Skinwalker Ranch has been the site of scientifically documented electromagnetic anomalies and 'portals' for decades.",
  "The 1977 'Wow!' Signal from space lasted 72 seconds and matches the profile of an interstellar transmission.",
  "In 1994, over 60 children in Ariel, Zimbabwe, reported seeing a craft and telepathic 'beings'. All accounts matched.",
  "The Rendlesham Forest Incident involved military personnel touching a craft with strange, binary-like carvings.",
  "NASA recently formed a dedicated UAP task force to study sightings using satellite and sensor data.",
  "The term 'Flying Saucer' was coined in 1947 after pilot Kenneth Arnold saw nine crescent-shaped objects over Mt. Rainier.",
  "Bermuda Triangle disappearances are often attributed to sudden, massive methane eruptions from the seafloor.",
  "In 2017, the NY Times revealed a secret $22M Pentagon program called AATIP that investigated UAPs.",
  "Astronaut Edgar Mitchell, the 6th man on the moon, publicly claimed that 'aliens have been watching us for some time'.",
  "The Nazca Lines in Peru are so large they can only be recognized from the air; their purpose remains a complete mystery.",
  "MH370's disappearance remains the greatest aviation mystery, with some theories suggesting electromagnetic interference.",
  "Project MKUltra involved the CIA testing mind-control drugs on unsuspecting citizens for nearly 20 years.",
  "The Roswell Daily Record first reported a 'Captured Flying Saucer' before the military corrected it to a 'weather balloon'.",
  "Dyce AFB radar once tracked an object moving at Mach 10 before it vanished from sensors instantly.",
  "Cattle mutilations are often characterized by 'surgical precision' and a complete lack of blood at the scene.",
  "The 1966 'Mothman' sightings in West Virginia culminated in the tragic collapse of the Silver Bridge.",
  "Oumuamua, the first interstellar object found in our solar system, had an 'unexplained' acceleration away from the sun.",
  "The Vatican Secret Archives contain documents dating back 1,200 years, including accounts of 'visions from the heavens'.",
  "Operation Highjump was a massive 1946 US Navy expedition to Antarctica that many believe was searching for hidden bases.",
  "The Phoenix Lights of 1997 were witnessed by thousands, including the Governor of Arizona, who later called them 'otherworldly'."
];

export const CATEGORY_DEFINITIONS: Record<string, { description: string; color: string }> = {
  'Economic anomalies': {
    description: 'Anomalies in global markets, resource distribution, or financial systems that defy standard economic models.',
    color: 'emerald'
  },
  'Cultural trends': {
    description: 'Unusual cultural trends with potentially significant societal impact, suggesting external influence or mass behavioral anomalies. Significance: Useful for detecting large-scale memetic influence or cognitive shifts.',
    color: 'psi-purple'
  },
  'Technological oddities': {
    description: 'Emergent technological phenomena not yet widely understood, originating from unknown or advanced sources. Significance: Helps identify non-human infrastructure or "black budget" covert developments.',
    color: 'celestial-blue'
  },
  'Environmental events': {
    description: 'Ecological shifts, weather patterns, or geological events that occur outside of natural variance.',
    color: 'ufo-green'
  },
  'Geopolitical shifts': {
    description: 'Unexplained shifts in geopolitical power, clandestine operations, or policy changes related to anomaly disclosure.',
    color: 'warning-amber'
  },
  'Scientific breakthroughs': {
    description: 'Breakthroughs in scientific understanding that challenge existing paradigms, potentially influenced by anomalous or non-human data. Significance: Can signal clandestine application of recovered technologies.',
    color: 'ufo-green'
  },
  'UFO / UAP': {
    description: 'Unidentified Aerial Phenomena and extraterrestrial craft sightings.',
    color: 'ufo-green'
  },
  'Paranormal': {
    description: 'Events involving ghosts, hauntings, or other non-physical entities.',
    color: 'psi-purple'
  },
  'Cryptid': {
    description: 'Sightings of creatures whose existence is not proven by science.',
    color: 'warning-amber'
  },
  'Gov / Black Ops': {
    description: 'Clandestine government projects and military operations involving anomalies.',
    color: 'danger-red'
  },
  'Phenomena': {
    description: 'Natural or scientific events that defy current human understanding.',
    color: 'celestial-blue'
  },
  'Site Intel': {
    description: 'Intelligence regarding specific locations known for high anomalous activity.',
    color: 'slate'
  }
};
