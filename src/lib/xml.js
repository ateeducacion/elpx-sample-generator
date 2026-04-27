export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function keyValue(tag, key, value, depth = 0) {
  const indent = '  '.repeat(depth);
  return `${indent}<${tag}>\n${indent}  <key>${escapeXml(key)}</key>\n${indent}  <value>${escapeXml(value)}</value>\n${indent}</${tag}>`;
}

function makeHtmlView(html, jsonProperties) {
  return [
    `          <htmlView><![CDATA[${html}]]></htmlView>`,
    `          <jsonProperties><![CDATA[${JSON.stringify(jsonProperties || {})}]]></jsonProperties>`,
  ].join('\n');
}

export function buildContentXml(config, project) {
  const meta = project.meta;
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE ode SYSTEM "content.dtd">');
  lines.push('<ode xmlns="http://www.intef.es/xsd/ode" version="2.0">');
  lines.push('  <userPreferences>');
  lines.push(keyValue('userPreference', 'theme', meta.theme, 2));
  lines.push('  </userPreferences>');

  // odeResources — v4 emits exactly three entries, in this order, via
  // generateOdeResourcesXml() (OdeXmlGenerator.ts:97). The legacy keys
  // odeVersionName, isDownload, and the misspelling eXeVersion are accepted
  // by the importer for backward compatibility but are no longer produced.
  lines.push('  <odeResources>');
  lines.push(keyValue('odeResource', 'odeId', project.odeId, 2));
  lines.push(keyValue('odeResource', 'odeVersionId', project.odeVersionId, 2));
  lines.push(keyValue('odeResource', 'exe_version', '3.0', 2));
  lines.push('  </odeResources>');

  // odeProperties — keys come from metadata-properties.ts. License lives
  // under pp_license (not the bare "license" used by v3 fixtures).
  lines.push('  <odeProperties>');
  lines.push(keyValue('odeProperty', 'pp_title', meta.title, 2));
  lines.push(keyValue('odeProperty', 'pp_subtitle', meta.subtitle || '', 2));
  lines.push(keyValue('odeProperty', 'pp_lang', meta.language, 2));
  lines.push(keyValue('odeProperty', 'pp_author', meta.author, 2));
  lines.push(keyValue('odeProperty', 'pp_license', meta.license || 'creative commons: attribution - share alike 4.0', 2));
  lines.push(keyValue('odeProperty', 'pp_description', meta.description || '', 2));
  lines.push(keyValue('odeProperty', 'exportSource', String(meta.exportSource), 2));
  lines.push(keyValue('odeProperty', 'pp_addExeLink', String(meta.exeLink), 2));
  lines.push(keyValue('odeProperty', 'pp_addPagination', String(meta.pagination), 2));
  lines.push(keyValue('odeProperty', 'pp_addSearchBox', String(meta.searchBox), 2));
  lines.push(keyValue('odeProperty', 'pp_addAccessibilityToolbar', String(meta.accessibility), 2));
  lines.push(keyValue('odeProperty', 'pp_addMathJax', String(meta.mathjax), 2));
  lines.push(keyValue('odeProperty', 'pp_globalFont', 'default', 2));
  lines.push(keyValue('odeProperty', 'pp_extraHeadContent', meta.extraHeadContent, 2));
  lines.push(keyValue('odeProperty', 'footer', meta.footerHtml || '', 2));
  lines.push('  </odeProperties>');

  lines.push('  <odeNavStructures>');
  for (const page of project.pages) {
    lines.push(generatePageXml(page, 2));
  }
  lines.push('  </odeNavStructures>');
  lines.push('</ode>');
  return lines.join('\n');
}

function generatePageXml(page, depth = 0) {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);
  const grandChildIndent = '  '.repeat(depth + 2);
  const lines = [];

  lines.push(`${indent}<odeNavStructure>`);
  lines.push(`${childIndent}<odePageId>${escapeXml(page.id)}</odePageId>`);
  lines.push(`${childIndent}<odeParentPageId>${escapeXml(page.parentId || '')}</odeParentPageId>`);
  lines.push(`${childIndent}<pageName>${escapeXml(page.title)}</pageName>`);
  lines.push(`${childIndent}<odeNavStructureOrder>${page.order}</odeNavStructureOrder>`);
  lines.push(`${childIndent}<odeNavStructureProperties>`);
  lines.push(keyValue('odeNavStructureProperty', 'titlePage', page.title, depth + 2));
  lines.push(keyValue('odeNavStructureProperty', 'hidePageTitle', 'false', depth + 2));
  lines.push(keyValue('odeNavStructureProperty', 'editableInPage', 'false', depth + 2));
  lines.push(keyValue('odeNavStructureProperty', 'visibility', 'true', depth + 2));
  lines.push(keyValue('odeNavStructureProperty', 'highlight', 'false', depth + 2));
  lines.push(keyValue('odeNavStructureProperty', 'description', page.description || '', depth + 2));
  lines.push(`${childIndent}</odeNavStructureProperties>`);
  lines.push(`${childIndent}<odePagStructures>`);

  for (const block of page.blocks) {
    lines.push(`${grandChildIndent}<odePagStructure>`);
    lines.push(`${grandChildIndent}  <odePageId>${escapeXml(page.id)}</odePageId>`);
    lines.push(`${grandChildIndent}  <odeBlockId>${escapeXml(block.id)}</odeBlockId>`);
    lines.push(`${grandChildIndent}  <blockName>${escapeXml(block.name)}</blockName>`);
    lines.push(`${grandChildIndent}  <iconName>${escapeXml(block.iconName || '')}</iconName>`);
    lines.push(`${grandChildIndent}  <odePagStructureOrder>${block.order}</odePagStructureOrder>`);
    // Block-level properties — match the keys emitted by the v4 generator
    // (OdeXmlGenerator.ts:213): visibility, teacherOnly, allowToggle,
    // minimized, cssClass. The legacy "identifier" key is no longer emitted.
    lines.push(`${grandChildIndent}  <odePagStructureProperties>`);
    lines.push(keyValue('odePagStructureProperty', 'visibility', 'true', depth + 3));
    lines.push(keyValue('odePagStructureProperty', 'teacherOnly', 'false', depth + 3));
    lines.push(keyValue('odePagStructureProperty', 'allowToggle', 'true', depth + 3));
    lines.push(keyValue('odePagStructureProperty', 'minimized', 'false', depth + 3));
    lines.push(keyValue('odePagStructureProperty', 'cssClass', '', depth + 3));
    lines.push(`${grandChildIndent}  </odePagStructureProperties>`);
    lines.push(`${grandChildIndent}  <odeComponents>`);

    for (const component of block.components) {
      lines.push(`${grandChildIndent}    <odeComponent>`);
      lines.push(`${grandChildIndent}      <odePageId>${escapeXml(page.id)}</odePageId>`);
      lines.push(`${grandChildIndent}      <odeBlockId>${escapeXml(block.id)}</odeBlockId>`);
      lines.push(`${grandChildIndent}      <odeIdeviceId>${escapeXml(component.id)}</odeIdeviceId>`);
      lines.push(`${grandChildIndent}      <odeIdeviceTypeName>${escapeXml(component.type)}</odeIdeviceTypeName>`);
      lines.push(`${grandChildIndent}${makeHtmlView(component.htmlView, component.jsonProperties)}`);
      lines.push(`${grandChildIndent}      <odeComponentsOrder>${component.order}</odeComponentsOrder>`);
      // Component-level properties — match the keys emitted by the v4
      // generator (OdeXmlGenerator.ts:285): visibility, teacherOnly,
      // cssClass. The legacy "identifier" key is no longer emitted.
      lines.push(`${grandChildIndent}      <odeComponentsProperties>`);
      lines.push(keyValue('odeComponentsProperty', 'visibility', 'true', depth + 4));
      lines.push(keyValue('odeComponentsProperty', 'teacherOnly', 'false', depth + 4));
      lines.push(keyValue('odeComponentsProperty', 'cssClass', '', depth + 4));
      lines.push(`${grandChildIndent}      </odeComponentsProperties>`);
      lines.push(`${grandChildIndent}    </odeComponent>`);
    }

    lines.push(`${grandChildIndent}  </odeComponents>`);
    lines.push(`${grandChildIndent}</odePagStructure>`);
  }

  lines.push(`${childIndent}</odePagStructures>`);
  lines.push(`${indent}</odeNavStructure>`);
  return lines.join('\n');
}

export function buildContentDtd() {
  // Mirror of the canonical v4 DTD (ODE_DTD_CONTENT in
  // src/shared/export/constants.ts in the upstream eXeLearning repo).
  // Used as a fallback when the synced upstream DTD is not available.
  // The canonical version marks several elements as optional that the
  // older fallback in this file required — match upstream exactly so
  // packages produced offline still validate against the real importer.
  return `<!ELEMENT ode (userPreferences?, odeResources?, odeProperties?, odeNavStructures)>
<!ATTLIST ode
    xmlns CDATA #FIXED "http://www.intef.es/xsd/ode"
    version CDATA #IMPLIED>

<!-- User Preferences -->
<!ELEMENT userPreferences (userPreference*)>
<!ELEMENT userPreference (key, value)>

<!-- ODE Resources -->
<!ELEMENT odeResources (odeResource*)>
<!ELEMENT odeResource (key, value)>

<!-- ODE Properties -->
<!ELEMENT odeProperties (odeProperty*)>
<!ELEMENT odeProperty (key, value)>

<!-- Shared Key-Value Elements -->
<!ELEMENT key (#PCDATA)>
<!ELEMENT value (#PCDATA)>

<!-- Navigation Structures (Pages) -->
<!ELEMENT odeNavStructures (odeNavStructure*)>
<!ELEMENT odeNavStructure (odePageId, odeParentPageId, pageName, odeNavStructureOrder, odeNavStructureProperties?, odePagStructures?)>

<!ELEMENT odePageId (#PCDATA)>
<!ELEMENT odeParentPageId (#PCDATA)>
<!ELEMENT pageName (#PCDATA)>
<!ELEMENT odeNavStructureOrder (#PCDATA)>

<!ELEMENT odeNavStructureProperties (odeNavStructureProperty*)>
<!ELEMENT odeNavStructureProperty (key, value)>

<!-- Block Structures -->
<!ELEMENT odePagStructures (odePagStructure*)>
<!ELEMENT odePagStructure (odePageId, odeBlockId, blockName, iconName?, odePagStructureOrder, odePagStructureProperties?, odeComponents?)>

<!ELEMENT odeBlockId (#PCDATA)>
<!ELEMENT blockName (#PCDATA)>
<!ELEMENT iconName (#PCDATA)>
<!ELEMENT odePagStructureOrder (#PCDATA)>

<!ELEMENT odePagStructureProperties (odePagStructureProperty*)>
<!ELEMENT odePagStructureProperty (key, value)>

<!-- Components (iDevices) -->
<!ELEMENT odeComponents (odeComponent*)>
<!ELEMENT odeComponent (odePageId, odeBlockId, odeIdeviceId, odeIdeviceTypeName, htmlView?, jsonProperties?, odeComponentsOrder, odeComponentsProperties?)>

<!ELEMENT odeIdeviceId (#PCDATA)>
<!ELEMENT odeIdeviceTypeName (#PCDATA)>
<!ELEMENT htmlView (#PCDATA)>
<!ELEMENT jsonProperties (#PCDATA)>
<!ELEMENT odeComponentsOrder (#PCDATA)>

<!ELEMENT odeComponentsProperties (odeComponentsProperty*)>
<!ELEMENT odeComponentsProperty (key, value)>
`;
}

export function buildThemeConfigXml(theme) {
  const normalizedTheme = String(theme || 'base').trim().toLowerCase();
  const themeAliases = {
    default: 'base',
    base: 'base',
    flux: 'flux',
    neo: 'neo',
    nova: 'nova',
    universal: 'universal',
    zen: 'zen',
  };
  const safeTheme = themeAliases[normalizedTheme] || 'base';
  const titles = {
    base: 'Base',
    flux: 'Flux',
    neo: 'Neo',
    nova: 'Nova',
    universal: 'Universal',
    zen: 'Zen',
  };
  const descriptions = {
    base: 'Base eXeLearning theme synced from the upstream repository.',
    flux: 'Bright, energetic theme generated for sample packages.',
    neo: 'Neo theme synced from the upstream repository.',
    nova: 'Nova theme synced from the upstream repository.',
    universal: 'Accessible, high-contrast theme generated for sample packages.',
    zen: 'Zen theme synced from the upstream repository.',
  };
  return `<?xml version="1.0"?>\n<theme>\n  <name>${escapeXml(safeTheme)}</name>\n  <title>${escapeXml(titles[safeTheme] || 'Base')}</title>\n  <version>2026</version>\n  <compatibility>3.0</compatibility>\n  <author>elpx-sample-generator</author>\n  <license>MIT</license>\n  <description>${escapeXml(descriptions[safeTheme] || descriptions.base)}</description>\n  <downloadable>1</downloadable>\n</theme>`;
}
