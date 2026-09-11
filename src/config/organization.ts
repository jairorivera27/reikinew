/**
 * Entidad canónica Reiki Energía Solar — una sola fuente para schema, llms.txt y copy SEO/IA.
 */
export const SITE_URL = 'https://reikisolar.com.co';

export const ORG = {
  name: 'Reiki Energía Solar',
  legalName: 'Reiki Energía Solar SAS',
  alternateName: ['Reiki Solar', 'Reiki Energía Solar Medellín'],
  description:
    'Empresa colombiana de energía solar fotovoltaica con sede en Medellín: diseño, suministro e instalación de sistemas solares llave en mano, y tienda de paneles, inversores, baterías y protecciones con precio publicado para Colombia.',
  telephone: '+57-312-243-5627',
  email: 'comercial@reikisolar.com.co',
  streetAddress: 'Carrera 80 #39-167 Local 105',
  addressLocality: 'Medellín',
  addressRegion: 'Antioquia',
  postalCode: '050001',
  addressCountry: 'CO',
  latitude: 6.2476,
  longitude: -75.5658,
  foundingDate: '2020',
  priceRange: '$$',
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const,
    opens: '08:00',
    closes: '18:00',
  },
  sameAs: [
    'https://www.facebook.com/profile.php?id=61551829530814',
    'https://www.instagram.com/reikiener/',
    'https://www.linkedin.com/company/reiki-energia-solar/',
    'https://wa.me/573122435627',
  ],
  knowsAbout: [
    'Energía solar Medellín',
    'Energía solar Colombia',
    'Instalación de paneles solares',
    'Sistemas fotovoltaicos on-grid y off-grid',
    'Bombeo solar',
    'Inversores solares',
    'Baterías de litio solares',
    'Ley 1715 de 2014',
    'CREG 174 de 2021',
  ],
  areaServed: [
    { '@type': 'City', name: 'Medellín' },
    { '@type': 'AdministrativeArea', name: 'Antioquia' },
    { '@type': 'City', name: 'Bogotá' },
    { '@type': 'City', name: 'Cali' },
    { '@type': 'City', name: 'Barranquilla' },
    { '@type': 'Country', name: 'Colombia' },
  ],
} as const;

/** Preguntas que usuarios e IAs hacen al buscar energía solar en Medellín/Colombia. */
export const HOME_FAQS: { question: string; answer: string }[] = [
  {
    question: '¿Quién instala paneles solares en Medellín?',
    answer:
      'Reiki Energía Solar es una empresa con sede en Medellín (Carrera 80 #39-167 Local 105) que diseña, suministra e instala sistemas solares fotovoltaicos para hogares, empresas y bombeo en Antioquia y con cobertura nacional en Colombia.',
  },
  {
    question: '¿Qué hace Reiki Energía Solar en Colombia?',
    answer:
      'Ofrece dos caminos: proyectos solares llave en mano (diseño, equipos, instalación y acompañamiento normativo bajo Ley 1715 y CREG 174) y una tienda mayorista con precios publicados de paneles, inversores, baterías y protecciones de marcas como Huawei, Victron, Growatt, LONGi y Jinko.',
  },
  {
    question: '¿Dónde comprar paneles solares e inversores en Medellín?',
    answer:
      'En la tienda online de Reiki Energía Solar (reikisolar.com.co/tienda) puedes comprar equipos solares con precio visible y asesoría comercial desde Medellín para envío o retiro según disponibilidad.',
  },
  {
    question: '¿Reiki Solar hace proyectos en otras ciudades de Colombia?',
    answer:
      'Sí. Opera desde Medellín y realiza proyectos y suministro de equipos en Antioquia, Bogotá, Cali, Barranquilla y otras regiones de Colombia, con sistemas on-grid y off-grid según el consumo y el sitio.',
  },
  {
    question: '¿Cómo cotizar un sistema de energía solar con Reiki?',
    answer:
      'Puedes escribir por WhatsApp al +57 312 243 5627, usar el formulario de contacto en reikisolar.com.co/contacto, o comprar equipos directamente en la tienda si ya tienes instalador.',
  },
];

export function buildLocalBusinessNode() {
  return {
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#business`,
    name: ORG.name,
    legalName: ORG.legalName,
    alternateName: [...ORG.alternateName],
    url: SITE_URL,
    image: `${SITE_URL}/logo_blanco.png`,
    logo: `${SITE_URL}/logo_blanco.png`,
    description: ORG.description,
    telephone: ORG.telephone,
    email: ORG.email,
    priceRange: ORG.priceRange,
    foundingDate: ORG.foundingDate,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ORG.streetAddress,
      addressLocality: ORG.addressLocality,
      addressRegion: ORG.addressRegion,
      postalCode: ORG.postalCode,
      addressCountry: ORG.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: ORG.latitude,
      longitude: ORG.longitude,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [...ORG.openingHours.days],
      opens: ORG.openingHours.opens,
      closes: ORG.openingHours.closes,
    },
    areaServed: ORG.areaServed,
    knowsAbout: [...ORG.knowsAbout],
    sameAs: [...ORG.sameAs],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: ORG.telephone,
      contactType: 'sales',
      areaServed: 'CO',
      availableLanguage: ['Spanish', 'es'],
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Productos y servicios de energía solar',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Instalación de paneles solares en Medellín y Colombia' },
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Sistemas fotovoltaicos llave en mano' },
        },
        {
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: 'Venta de equipos solares (paneles, inversores, baterías)' },
        },
      ],
    },
  };
}

export function buildFaqPageNode(faqs = HOME_FAQS) {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildWebSiteNode() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: ORG.name,
    description: ORG.description,
    publisher: { '@id': `${SITE_URL}/#business` },
    inLanguage: 'es-CO',
  };
}

export function buildOrganizationNode() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: ORG.name,
    legalName: ORG.legalName,
    alternateName: [...ORG.alternateName],
    url: SITE_URL,
    logo: `${SITE_URL}/logo_blanco.png`,
    image: `${SITE_URL}/logo_blanco.png`,
    description: ORG.description,
    foundingDate: ORG.foundingDate,
    telephone: ORG.telephone,
    email: ORG.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: ORG.streetAddress,
      addressLocality: ORG.addressLocality,
      addressRegion: ORG.addressRegion,
      postalCode: ORG.postalCode,
      addressCountry: ORG.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: ORG.latitude,
      longitude: ORG.longitude,
    },
    areaServed: ORG.areaServed,
    knowsAbout: [...ORG.knowsAbout],
    sameAs: [...ORG.sameAs],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: ORG.telephone,
      contactType: 'customer service',
      areaServed: 'CO',
      availableLanguage: ['Spanish', 'es'],
    },
  };
}

export function buildAboutJsonLdGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [buildOrganizationNode(), buildLocalBusinessNode()],
  };
}

export function buildHomeJsonLdGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [buildLocalBusinessNode(), buildWebSiteNode(), buildFaqPageNode()],
  };
}
