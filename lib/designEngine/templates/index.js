import { generate as fullBleedImage }     from './full-bleed-image.js';
import { generate as editorialDark }      from './editorial-dark.js';
import { generate as editorialLight }     from './editorial-light.js';
import { generate as minimalCentered }    from './minimal-centered.js';
import { generate as splitLayout }        from './split-layout.js';
import { generate as listCard }           from './list-card.js';
import { generate as ctaBold }            from './cta-bold.js';
import { generate as quoteCard }          from './quote-card.js';
import { generate as dataVisual }         from './data-visual.js';
import { generate as announcement }       from './announcement.js';
import { generate as presentationSlide }  from './presentation-slide.js';

export const TEMPLATES = {
  'full-bleed-image':   { fn: fullBleedImage,    label: 'Full Bleed Image',    desc: 'Imagen de fondo con texto sobre overlay — para slides con imágenes FLUX' },
  'editorial-dark':     { fn: editorialDark,     label: 'Editorial Dark',      desc: 'Fondo oscuro, tipografía dominante, acento de color' },
  'editorial-light':    { fn: editorialLight,    label: 'Editorial Light',     desc: 'Fondo claro, tipografía en colores de marca' },
  'minimal-centered':   { fn: minimalCentered,   label: 'Minimal Centered',    desc: 'Fondo sólido, contenido centrado, mucho espacio en blanco' },
  'split-layout':       { fn: splitLayout,       label: 'Split Layout',        desc: '50% imagen / 50% texto en columnas o filas' },
  'list-card':          { fn: listCard,          label: 'List Card',           desc: 'Lista numerada con items visuales' },
  'cta-bold':           { fn: ctaBold,           label: 'CTA Bold',            desc: 'Call to action dominante, botón grande — para último slide' },
  'quote-card':         { fn: quoteCard,         label: 'Quote Card',          desc: 'Cita destacada con atribución' },
  'data-visual':        { fn: dataVisual,        label: 'Data Visual',         desc: 'Número grande / estadística + descriptor' },
  'announcement':       { fn: announcement,      label: 'Announcement',        desc: 'Evento/fecha prominente — conciertos, lanzamientos' },
  'presentation-slide': { fn: presentationSlide, label: 'Presentation Slide',  desc: 'Formato 16:9 — YouTube thumbnails, presentaciones, pantallas grandes' },
};

/**
 * Genera un DesignSpec usando un template por nombre.
 * @param {string} name        Nombre del template
 * @param {object} brand       Brand Profile de projectAnalyzer
 * @param {object} contents    Contenido para el slide
 * @param {string} format      Formato de destino
 * @returns {object} DesignSpec
 */
export function fromTemplate(name, brand, contents, format) {
  const tpl = TEMPLATES[name];
  if (!tpl) throw new Error(`Template desconocido: "${name}". Disponibles: ${Object.keys(TEMPLATES).join(', ')}`);
  return tpl.fn(brand, contents, format);
}

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([name, { label, desc }]) => ({ name, label, desc }));
}
