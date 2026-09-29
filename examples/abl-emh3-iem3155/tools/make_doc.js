const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, ImageRun, LevelFormat, PageOrientation, BorderStyle, TableOfContents,
  Footer, PageNumber,
} = require('docx');

const FONT = 'Calibri';
const p = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: runs(text) });
function runs(text) {
  // **vet** en `code` ondersteuning
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun(text.slice(last, m.index)));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(new TextRun({ text: tok.slice(2, -2), bold: true }));
    else out.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', size: 20, color: '9B2C2C' }));
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun(text.slice(last)));
  return out;
}
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: runs(t) });
let numRef = 0;
const steps = (items) => { const ref = `num${numRef++}`; numCfg.push(ref); return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: runs(t) })); };
const numCfg = [];
const code = (lines) => lines.map((l, i) => new Paragraph({
  spacing: { after: 0, line: 240 },
  shading: { type: ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' },
  children: [new TextRun({ text: l.length ? l : ' ', font: 'Consolas', size: 16 })],
}));
const note = (t, fill = 'FFF4CE', border = 'E0A800') => new Paragraph({
  spacing: { before: 120, after: 160 },
  shading: { type: ShadingType.CLEAR, fill, color: 'auto' },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: border, space: 8 } },
  indent: { left: 200, right: 200 },
  children: runs(t),
});

function table(widths, rows) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BFC5CC' };
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((c, ci) => new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: '1F5FA8', color: 'auto' } : (ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: 'F3F6FA', color: 'auto' } : undefined),
        borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: ri === 0 ? [new TextRun({ text: c, bold: true, color: 'FFFFFF' })] : runs(c) })],
      })),
    })),
  });
}

const yaml = fs.readFileSync('abl-emh3-wallbox.yaml', 'utf8').replace(/\r/g, '').split('\n');
const img = fs.readFileSync('aansluitschema.png');

// ---------------- Inhoud ----------------
const intro = [
  new Paragraph({ spacing: { before: 1800, after: 200 }, children: [new TextRun({ text: 'ABL eMH3 laadpaal + Schneider iEM3155', size: 52, bold: true, color: '1F3A5F' })] }),
  new Paragraph({ spacing: { after: 400 }, children: [new TextRun({ text: 'ESPHome op ESP32 met 2× RS485 — aansluitschema en handleiding', size: 30, color: '52606D' })] }),
  p('Dit document beschrijft hoe je een ESP32 met twee RS485-modules aansluit op een ABL eMH3 laadpaal (Modbus-ASCII) en een Schneider iEM3155 kWh-meter (Modbus-RTU), en hoe je het geheel met ESPHome in Home Assistant krijgt. Het hoort bij het configuratiebestand `abl-emh3-wallbox.yaml` (volledig opgenomen in bijlage A).'),
  note('**Veiligheid:** de laadpaal en de kWh-meter zitten aan 230/400V. Maak de installatie altijd spanningsloos (groep en aardlekschakelaar uit) voordat je iets aansluit. Twijfel je? Laat het deel in de laadpaal en de meterkast door een erkend installateur doen.', 'FDECEC', 'D62828'),
  new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Inhoud', bold: true, size: 28, color: '1F3A5F' })] }),
  new TableOfContents('Inhoud', { hyperlink: true, headingStyleRange: '1-2' }),
];

const body1 = [
  h1('1. Overzicht'),
  p('De ESP32 heeft twee aparte seriële poorten (UART) in gebruik, elk met een eigen RS485-module. Zo zitten de laadpaal en de meter op een eigen bus met eigen snelheid en protocol:'),
  table([2200, 2300, 2300, 2226], [
    ['Bus', 'Apparaat', 'Protocol', 'Instelling'],
    ['`uart_bus`', 'ABL eMH3 laadpaal', 'Modbus-ASCII', '38400 baud, 8E1'],
    ['`uart_iem3155`', 'Schneider iEM3155', 'Modbus-RTU, adres 2', '19200 baud, 8E1'],
  ]),
  h1('2. Benodigdheden'),
  bullet('**ESP32 DevKit** (ESP32-WROOM-32, 30- of 38-pins). Let op: geen WROVER-variant, want daar zijn GPIO16/17 bezet door PSRAM.'),
  bullet('**2× RS485-module voor 3,3V**, bijvoorbeeld met MAX3485 of SP3485 chip en DE/RE-pinnen. Een klassieke MAX485-module (5V) liever niet gebruiken, of alleen op 3,3V voeden.'),
  bullet('**Voeding** voor de ESP32: 5V USB-adapter of een 230V→5V printvoeding (bv. HLK-PM01) in een behuizing.'),
  bullet('**Dupont-kabels** of soldeerdraad voor ESP32 ↔ modules.'),
  bullet('**Twisted pair kabel** voor de bus (bv. een aderpaar uit UTP Cat5e/Cat6), één paar per bus.'),
  bullet('Optioneel: **120 Ω weerstand** per bus als afsluiting (zit vaak al op de module).'),
  bullet('Behuizing (DIN-rail of klein kastje), kleine schroevendraaier, multimeter.'),
];

const schemaSection = [
  h1('3. Aansluitschema'),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: img, transformation: { width: 870, height: 576 } })] }),
  p('Draden met dezelfde kleur hebben dezelfde functie. De voeding is als net-label getekend: alle 3V3-labels zijn met elkaar verbonden, en alle GND-labels ook.', { alignment: AlignmentType.CENTER }),
];

const body2 = [
  h1('4. Pintabel'),
  h2('4.1 ESP32 → RS485-modules'),
  table([2000, 2600, 2400, 2026], [
    ['ESP32-pin', 'Functie in YAML', 'Module 1 (ABL)', 'Module 2 (iEM3155)'],
    ['GPIO17 (TX2)', '`abl_tx_pin`', 'DI', '–'],
    ['GPIO16 (RX2)', '`abl_rx_pin`', 'RO', '–'],
    ['GPIO4', '`abl_flow_control_pin`', 'DE + RE (doorverbonden)', '–'],
    ['GPIO19', '`iem_tx_pin`', '–', 'DI'],
    ['GPIO18', '`iem_rx_pin`', '–', 'RO'],
    ['GPIO21', '`iem_flow_control_pin`', '–', 'DE + RE (doorverbonden)'],
    ['3V3', 'voeding', 'VCC', 'VCC'],
    ['GND', 'massa', 'GND', 'GND'],
  ]),
  h2('4.2 RS485-modules → apparaten'),
  table([2600, 3200, 3226], [
    ['Module-klem', 'ABL eMH3 (controllerprint)', 'Schneider iEM3155'],
    ['A', 'A (+)', 'D1 / +'],
    ['B', 'B (−)', 'D0 / −'],
    ['GND (optioneel)', '–', '0V'],
  ]),
  note('De namen A en B worden niet door iedere fabrikant hetzelfde gebruikt. Werkt de communicatie niet, dan is het omwisselen van A en B de eerste en meest voorkomende oplossing. Er gaat niets kapot door ze verkeerd om te zetten.'),

  h1('5. Stap-voor-stap handleiding'),
  h2('5.1 Voorbereiding'),
  ...steps([
    'Controleer of je RS485-modules op 3,3V werken (chip MAX3485/SP3485, of opgave verkoper). Bij een 5V MAX485-module: voed hem met 3,3V, niet met 5V — anders krijgt de ESP32 5V op de RX-pinnen.',
    'Kijk op de modules of er een 120 Ω weerstand (vaak gemarkeerd als R7 of "121") tussen A en B zit. Die is bedoeld als busafsluiting en is prima bij één apparaat per bus.',
    'Bepaal de plek: de ESP32 in een behuizing in de buurt van de laadpaal of meterkast, met WiFi-bereik. Houd de RS485-kabels bij voorkeur kort (enkele meters is geen probleem; RS485 kan tot honderden meters).',
  ]),
  h2('5.2 ESP32 aansluiten op de RS485-modules'),
  ...steps([
    'Sluit bij **beide** modules VCC aan op 3V3 en GND op GND van de ESP32.',
    'Module 1 (laadpaal): GPIO17 → DI, GPIO16 → RO, GPIO4 → DE én RE. Verbind DE en RE op de module met een draadbrug en sluit GPIO4 daarop aan.',
    'Module 2 (kWh-meter): GPIO19 → DI, GPIO18 → RO, GPIO21 → DE én RE (ook hier DE en RE doorverbinden).',
    'Heeft je module geen DE/RE-pinnen maar alleen TXD/RXD (automatische richtingsomschakeling)? Sluit dan TX → TXD en RX → RXD aan (bij sommige modules gekruist, zie opdruk) en verwijder de regels `flow_control_pin` uit de YAML.',
    'Controleer alles met het schema in hoofdstuk 3 voordat je de ESP32 van spanning voorziet.',
  ]),
  h2('5.3 Aansluiten op de Schneider iEM3155'),
  ...steps([
    'Maak de meter spanningsloos.',
    'Zoek de communicatieklemmen van de meter (Modbus): **D1/+**, **D0/−** en **0V** (met afscherming).',
    'Sluit een getwist aderpaar aan: A van module 2 → D1/+, B van module 2 → D0/−.',
    'Optioneel maar aanbevolen: verbind 0V van de meter met GND van module 2 via een derde ader.',
    'Stel op de meter via het menu (Communicatie) in: **adres 2**, **19200 baud**, **pariteit Even**. Dit moet overeenkomen met de YAML (`iem_address`, `baud_rate`, `parity`).',
  ]),
  h2('5.4 Aansluiten op de ABL eMH3'),
  ...steps([
    'Schakel de laadpaal spanningsloos (groep én aardlek uit) en open de behuizing volgens de installatiehandleiding van ABL.',
    'Zoek op de controllerprint de RS485/Modbus-aansluiting (A/B). De exacte positie en connector (klemmen of RJ-aansluiting) verschilt per uitvoering — raadpleeg de installatiehandleiding van jouw eMH3.',
    'Sluit een getwist aderpaar aan: A van module 1 → A (+), B van module 1 → B (−).',
    'Leid de kabel netjes weg van de 230/400V-bedrading en sluit de laadpaal weer volgens de handleiding.',
    'De laadpaal communiceert standaard met 38400 baud, 8E1 (Modbus-ASCII). Dat staat al zo in de YAML.',
  ]),
  h2('5.5 ESPHome configureren en flashen'),
  ...steps([
    'Open de ESPHome Device Builder in Home Assistant (Instellingen → Add-ons → ESPHome).',
    'Maak een nieuw apparaat aan en plak de inhoud van `abl-emh3-wallbox.yaml` (bijlage A) erin.',
    'Voeg de benodigde geheimen toe in `secrets.yaml` (zie hieronder). De sleutel voor `api_encryption_key` genereer je op de ESPHome-website (32 bytes, base64).',
    'Sluit de ESP32 via USB aan op je computer en kies **Install → Plug into this computer** voor de eerste installatie. Houd zo nodig de BOOT-knop ingedrukt als het flashen niet start.',
    'Volgende updates kunnen draadloos (OTA) via **Install → Wirelessly**.',
  ]),
  p('Voorbeeld `secrets.yaml`:'),
  ...code([
    'wifi_ssid: "JouwWiFi"',
    'wifi_password: "JouwWiFiWachtwoord"',
    'ap_fb_pw: "fallbackwachtwoord"',
    'api_encryption_key: "<32-byte base64 sleutel>"',
    'ota_password: "eenOTAwachtwoord"',
  ]),
  new Paragraph({ spacing: { after: 120 }, children: [] }),
  h2('5.6 Toevoegen aan Home Assistant'),
  ...steps([
    'Na het opstarten verschijnt het apparaat automatisch onder Instellingen → Apparaten & diensten als "ontdekt". Klik op **Configureren**.',
    'Voer indien gevraagd de API-encryptiesleutel in.',
    'Het apparaat "ABL eMH3 Laadpaal" verschijnt met alle entiteiten (status, stromen, spanningen, vermogen, energie, schakelaars en Max Amps).',
    'Voeg "IEM3155 Total Energy" toe aan het Energie-dashboard (Instellingen → Dashboards → Energie → Elektrische auto of Individueel apparaat).',
  ]),
  h2('5.7 Testen'),
  ...steps([
    'Open de logs van het apparaat in ESPHome. Je hoort elke 5 seconden gegevens van beide bussen te zien, zonder time-outs of CRC-fouten.',
    'Controleer in Home Assistant of de spanningen rond 230V liggen en de totale energie overeenkomt met het display van de meter.',
    'Controleer of "Status" van de laadpaal een logische waarde toont (bv. wachten op auto).',
    'Test "Max Amps" (bv. van 6 naar 10A) en kijk of "Max current" meeloopt. Test "Allow charging" uit/aan terwijl de auto is aangesloten.',
  ]),

  h1('6. Probleemoplossing'),
  table([3000, 6026], [
    ['Symptoom', 'Oplossing'],
    ['Geen data van de laadpaal of meter', 'A en B omwisselen; bekabeling DI/RO controleren; controleren of DE en RE doorverbonden zijn en aan de juiste GPIO hangen.'],
    ['Alleen iEM3155 werkt niet', 'Meterinstellingen controleren: adres 2, 19200 baud, pariteit Even. 0V van de meter met GND verbinden.'],
    ['CRC-fouten of af en toe time-outs', 'Getwist aderpaar gebruiken, kabel weg van stroomkabels leggen, afsluitweerstand controleren (niet dubbel bij korte kabels), GND/0V verbinden.'],
    ['ESP32 herstart of flash mislukt', 'Andere USB-kabel/voeding proberen; bij flashen BOOT ingedrukt houden. Geen WROVER-bord gebruiken (GPIO16/17).'],
    ['Waarden "Onbekend" direct na opstarten', 'Normaal: de eerste Modbus-antwoorden komen na enkele seconden binnen.'],
    ['Energie telt verkeerd / reset', 'Controleer dat "IEM3155 Total Energy" register 45099 (FP32) gebruikt, zoals in de YAML.'],
    ['Log is erg druk', 'Logger staat op DEBUG. Voor diepgaand debuggen tijdelijk op VERBOSE zetten.'],
  ]),

  h1('7. Wijzigingen in de YAML'),
  p('Ten opzichte van de oorspronkelijke configuratie zijn de volgende aanpassingen gedaan:'),
  table([3000, 6026], [
    ['Onderdeel', 'Wijziging'],
    ['substitutions', 'Pinnen, adres en naam staan nu centraal bovenaan en worden overal gebruikt (voorheen stonden ze er wel maar werden ze niet gebruikt).'],
    ['esphome', '`comment` toegevoegd met de apparaatbeschrijving; naam via substitutions.'],
    ['ota', '`encryption:` vervangen door `password: !secret ota_password`. Voeg `ota_password` toe aan secrets.yaml.'],
    ['logger', 'Van VERBOSE naar DEBUG om de log leesbaar te houden.'],
    ['captive_portal', 'Toegevoegd, zodat de fallback-hotspot een WiFi-instelpagina heeft.'],
    ['IEM3155 Active Power', 'Register 3053 is alleen fase L1. Totaalvermogen gebruikt nu register 3059; L1/L2/L3 zijn als aparte sensoren toegevoegd.'],
    ['iEM3155 sensoren', '`device_class` en `state_class` toegevoegd voor correcte weergave en statistieken in HA.'],
    ['Max Amps', 'Stap van 0,1 naar 1 A (de waarde werd al afgerond), eenheid A toegevoegd, en geen waarde publiceren als de laadpaal nog niets heeft gemeld.'],
    ['Enable / Allow charging', 'Status wordt niet meer als "aan" gemeld zolang de laadpaalstatus onbekend is.'],
    ['Allow charging (aan)', 'Gebruikt nu de ingestelde "Max Amps" i.p.v. altijd het maximum; valt terug op het maximum als er nog geen waarde is.'],
    ['Extra', 'Sensor WiFi-signaal, binaire sensor "Online" en knop "Herstart ESP" toegevoegd.'],
  ]),
];

const appendix = [
  h1('Bijlage A — abl-emh3-wallbox.yaml'),
  ...code(yaml),
];

// ---------------- Document ----------------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ABL eMH3 + iEM3155 · pagina ', color: '7B8794', size: 18 }), new TextRun({ children: [PageNumber.CURRENT], color: '7B8794', size: 18 })] })] });
const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } };
const landscape = { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 900, bottom: 900, left: 900, right: 900 } } };

const doc = new Document({
  creator: 'ESPHome laadpaal',
  title: 'ABL eMH3 + Schneider iEM3155 — aansluitschema en handleiding',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, color: '1F3A5F' }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, color: '1F5FA8' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      ...Array.from({ length: 20 }, (_, i) => ({ reference: `num${i}`, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
    ],
  },
  sections: [
    { properties: portrait, footers: { default: footer }, children: [...intro] },
    { properties: portrait, footers: { default: footer }, children: body1 },
    { properties: landscape, footers: { default: footer }, children: schemaSection },
    { properties: portrait, footers: { default: footer }, children: [...body2, ...appendix] },
  ],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync('ABL-eMH3-iEM3155-handleiding.docx', b); console.log('ok'); });

