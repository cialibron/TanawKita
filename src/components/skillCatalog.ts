import { SKILLS } from '../rules'

// Pre-placed job skills for type-to-add pickers. Each one counts toward one or more of the existing match skills
// (SKILLS in rules.ts), so "Cashier" on a skill card still matches a job that asks for "Sales".
// Names are English; a common local word can be shown in brackets. Hand-built for the demo, not an official list.

export interface CatalogSkill {
  name: string
  sector: string
  // Match skills (from SKILLS) this one counts toward. Empty means it is shown but not used for matching.
  groups: string[]
  // Extra search words.
  aliases: string[]
  // Common local word, shown in brackets after the English name.
  local?: string
}

const G: Record<string, string> = {
  C: 'Carpentry',
  M: 'Masonry',
  E: 'Electrical',
  W: 'Welding',
  F: 'Food preparation',
  S: 'Sewing',
  D: 'Driving',
  L: 'Sales',
  CS: 'Customer service',
  PC: 'Computer literacy',
  A: 'Agriculture',
  H: 'Housekeeping',
}

// [name, match-skill codes, search words]
type Row = [string, string, string?]

const SECTORS: Record<string, Row[]> = {
  'Retail and sales': [
    ['Cashier', 'L CS', 'kahera cash register pos counter'],
    ['Cash handling', 'L CS', 'kwarta money change sukli'],
    ['Sales clerk', 'L CS', 'saleslady salesman tindera tindero'],
    ['Store attendant', 'L CS', 'tindahan store crew'],
    ['Sari-sari store keeping', 'L', 'tindahan tindera'],
    ['Merchandising', 'L', 'merchandiser display shelf'],
    ['Stock keeping', 'L', 'inventory stockman bodega warehouse'],
    ['Inventory counting', 'L PC', 'stocks audit'],
    ['Product promotion', 'L CS', 'promodiser promo demo'],
    ['Market vendor', 'L', 'tindera merkado palengke bangketa'],
    ['Pharmacy assistant', 'L CS', 'botika drugstore'],
    ['Hardware store sales', 'L', 'hardware materials'],
    ['Mobile load and e-wallet', 'L PC', 'load gcash maya eload'],
    ['Price tagging', 'L', 'presyo label'],
    ['Online selling', 'L PC', 'shopee lazada facebook marketplace live selling'],
    ['Sales', 'L', 'baligya benta'],
  ],
  'Food and drinks': [
    ['Food preparation', 'F', 'luto kusina prep'],
    ['Cooking', 'F', 'luto magluto cook kusinero kusinera'],
    ['Line cook', 'F', 'kusina restaurant'],
    ['Prep cook', 'F', 'hiwa slicing kitchen'],
    ['Carinderia cooking', 'F', 'karinderya ulam turo-turo'],
    ['Barbecue and grilling', 'F', 'ihaw inihaw bbq'],
    ['Baking', 'F', 'bake pan bakery panadero'],
    ['Pastry making', 'F', 'cake kakanin dessert'],
    ['Kakanin making', 'F', 'suman puto bibingka'],
    ['Barista', 'F CS', 'coffee kape cafe'],
    ['Barista service', 'F CS', 'coffee kape cafe'],
    ['Bartending', 'F CS', 'bar drinks'],
    ['Waiter or waitress', 'F CS', 'server serbidor serbidora'],
    ['Food service crew', 'F CS', 'fast food crew service crew'],
    ['Dishwashing', 'F H', 'hugas plato dishwasher'],
    ['Kitchen helper', 'F H', 'kitchen aide'],
    ['Food packaging', 'F', 'pack putos packaging'],
    ['Food safety and handling', 'F', 'sanitation food handler'],
    ['Catering', 'F CS', 'event food handaan'],
    ['Street food vending', 'F L', 'fishball kwek-kwek'],
    ['Fruit stand selling', 'F L', 'durian prutas'],
    ['Meat cutting', 'F', 'butcher karne magkakarne'],
    ['Fish vending', 'F L', 'isda tindera'],
  ],
  'Customer service and office': [
    ['Customer service', 'CS', 'serbisyo client'],
    ['Call center agent', 'CS PC', 'bpo csr voice'],
    ['Chat support', 'CS PC', 'bpo non-voice email support'],
    ['Technical support', 'CS PC', 'tech support helpdesk'],
    ['Receptionist', 'CS PC', 'front desk'],
    ['Front desk', 'CS', 'reception hotel'],
    ['Secretary', 'CS PC', 'sekretarya office'],
    ['Office clerk', 'PC', 'clerk office staff'],
    ['Filing and records', 'PC', 'papers documents'],
    ['Data entry', 'PC', 'encoder encoding type'],
    ['Encoding', 'PC', 'encoder data entry'],
    ['Bookkeeping', 'PC', 'accounting records libro'],
    ['Payroll assistant', 'PC', 'sweldo salary'],
    ['Collection agent', 'CS', 'kolektor collector'],
    ['Telemarketing', 'CS L', 'phone sales'],
    ['Virtual assistant', 'PC CS', 'va online freelance'],
    ['Translation (Bisaya, Tagalog, English)', 'CS', 'interpreter language'],
    ['Phone etiquette', 'CS', 'telepono calls'],
    ['Complaint handling', 'CS', 'reklamo'],
  ],
  'Computers and digital': [
    ['Computer literacy', 'PC', 'kompyuter'],
    ['Computer basics', 'PC', 'kompyuter typing'],
    ['Microsoft Word', 'PC', 'ms word documents'],
    ['Spreadsheets', 'PC', 'excel google sheets'],
    ['Microsoft Excel', 'PC', 'excel spreadsheet'],
    ['Presentations', 'PC', 'powerpoint slides'],
    ['Typing', 'PC', 'keyboard wpm'],
    ['Email and online forms', 'PC', 'gmail'],
    ['Social media management', 'PC L', 'facebook tiktok page admin'],
    ['Graphic design', 'PC', 'canva photoshop layout'],
    ['Photo editing', 'PC', 'photoshop lightroom'],
    ['Video editing', 'PC', 'capcut premiere'],
    ['Photography', 'PC', 'camera litrato'],
    ['Printing and photocopying', 'PC CS', 'print xerox photocopy'],
    ['Computer shop attendant', 'PC CS', 'internet cafe pisonet'],
    ['Computer repair', 'PC E', 'pc repair technician'],
    ['Cellphone repair', 'E', 'cellphone technician'],
    ['Basic networking', 'PC E', 'wifi lan cable'],
    ['Web design', 'PC', 'website html'],
    ['Programming', 'PC', 'coding developer'],
    ['Python', 'PC', 'programming coding'],
    ['Data cleaning', 'PC', 'data spreadsheet'],
    ['Online research', 'PC', 'internet search'],
  ],
  'Construction and building': [
    ['Carpentry', 'C', 'karpintero panday'],
    ['Furniture making', 'C', 'muwebles furniture'],
    ['Cabinet making', 'C', 'kabinet'],
    ['Formworks', 'C M', 'forms shuttering'],
    ['Roofing', 'C', 'atop bubong'],
    ['Masonry', 'M', 'mason panday bato'],
    ['Hollow block laying', 'M', 'hollow blocks chb'],
    ['Concrete pouring', 'M', 'buhos semento'],
    ['Plastering', 'M', 'palitada'],
    ['Tile setting', 'M', 'tiles tile setter'],
    ['Rebar work', 'M W', 'bakal steelman'],
    ['Painting', 'C M', 'pintor pintura'],
    ['Plumbing', 'M', 'tubero tubo'],
    ['Pipe fitting', 'M W', 'pipefitter'],
    ['Construction helper', 'M C', 'helper labor peon'],
    ['Heavy lifting', 'M', 'karga kargador'],
    ['Scaffolding', 'C', 'scaffold'],
    ['Ceiling installation', 'C', 'kisame gypsum'],
    ['Glass and aluminum installation', 'C', 'aluminum windows salamin'],
    ['Steel framing', 'W C', 'metal frame'],
    ['Welding', 'W', 'welder soldador hinang'],
    ['Arc welding (SMAW)', 'W', 'smaw stick'],
    ['MIG welding', 'W', 'gmaw'],
    ['Metal fabrication', 'W', 'fabricator'],
    ['Grill and gate making', 'W', 'rehas gate'],
    ['Heavy equipment operation', 'D', 'backhoe operator'],
    ['Surveying assistant', 'PC', 'survey'],
  ],
  'Electrical and repair': [
    ['Electrical', 'E', 'electrician elektrisyan kuryente'],
    ['House wiring', 'E', 'wiring kuryente'],
    ['Electrical installation', 'E', 'install'],
    ['Solar panel installation', 'E', 'solar'],
    ['Aircon servicing', 'E', 'aircon refrigeration'],
    ['Refrigeration repair', 'E', 'ref ref repair'],
    ['Appliance repair', 'E', 'appliance technician'],
    ['Electronics repair', 'E', 'electronics technician'],
    ['Motorcycle repair', 'E', 'mekaniko motor'],
    ['Auto mechanic', 'E D', 'mekaniko car'],
    ['Vulcanizing', 'D', 'vulcanizing tires gulong'],
    ['Small engine repair', 'E', 'engine makina'],
    ['Bicycle repair', '', 'bike bisikleta'],
    ['Shoe repair', 'S', 'sapatos cobbler'],
    ['Watch repair', '', 'relo'],
    ['Locksmith', '', 'yawe susi'],
    ['Maintenance work', 'E C', 'maintenance utility'],
  ],
  'Driving and delivery': [
    ['Driving', 'D', 'driver drayber'],
    ['Professional driver license', 'D', 'license lisensya'],
    ['Delivery rider', 'D CS', 'rider motor delivery'],
    ['Food delivery', 'D CS', 'foodpanda grab rider'],
    ['Courier', 'D CS', 'parcel package'],
    ['Motorcycle driving', 'D', 'motor habal-habal'],
    ['Tricycle driving', 'D', 'traysikol'],
    ['Jeepney driving', 'D', 'dyip jeep'],
    ['Truck driving', 'D', 'trak truck'],
    ['Taxi or ride-hailing driving', 'D CS', 'grab taxi'],
    ['Forklift operation', 'D', 'forklift'],
    ['Warehouse helper', 'D L', 'bodega warehouse'],
    ['Loading and unloading', 'D', 'kargador karga'],
    ['Route planning', 'D PC', 'map navigation'],
    ['Dispatching', 'D PC', 'dispatcher'],
    ['Parking attendant', 'D CS', 'parking'],
  ],
  'Cleaning and household': [
    ['Housekeeping', 'H', 'limpyo linis'],
    ['House cleaning', 'H', 'limpyo linis kasambahay'],
    ['Kasambahay', 'H F', 'house helper maid'],
    ['Laundry', 'H', 'labada laba'],
    ['Laundry shop attendant', 'H CS', 'labada laundromat'],
    ['Ironing', 'H', 'plantsa'],
    ['Janitorial work', 'H', 'janitor utility'],
    ['Hotel room attendant', 'H CS', 'room attendant hotel'],
    ['Office cleaning', 'H', 'janitress'],
    ['Window cleaning', 'H', 'bintana'],
    ['Carwash', 'H D', 'car wash'],
    ['Pest control', 'H', 'termite peste'],
    ['Gardening', 'A H', 'tanom garden hardin'],
    ['Landscaping', 'A', 'garden design'],
    ['Pool cleaning', 'H', 'swimming pool'],
    ['Waste segregation', 'H', 'basura recycling'],
  ],
  'Care and health': [
    ['Caregiving', 'H CS', 'caregiver alaga'],
    ['Elderly care', 'H CS', 'alaga lolo lola'],
    ['Childcare', 'H CS', 'yaya nanny bata'],
    ['Daycare assistant', 'CS', 'daycare bata'],
    ['Tutoring', 'CS', 'tutor tudlo'],
    ['Teaching assistant', 'CS', 'teacher aide'],
    ['First aid', 'CS', 'first aider'],
    ['Health aide', 'CS', 'barangay health worker bhw'],
    ['Massage therapy', 'CS', 'masahe hilot'],
    ['Pharmacy aide', 'L CS', 'botika'],
    ['Patient transport', 'CS', 'orderly'],
  ],
  'Beauty and wellness': [
    ['Haircutting', 'CS', 'barber gupit barbero'],
    ['Barbering', 'CS', 'barber barbero gupit'],
    ['Hairdressing', 'CS', 'salon hair'],
    ['Hair coloring', 'CS', 'hair color'],
    ['Manicure and pedicure', 'CS', 'nail nails manikyur'],
    ['Makeup', 'CS', 'make-up artist'],
    ['Spa attendant', 'CS', 'spa'],
    ['Eyelash and brow services', 'CS', 'lashes kilay'],
  ],
  'Tailoring and crafts': [
    ['Sewing', 'S', 'tahi mananahi'],
    ['Dressmaking', 'S', 'modista tahi'],
    ['Tailoring', 'S', 'sastre tahi'],
    ['Alterations', 'S', 'repair tahi'],
    ['Embroidery', 'S', 'burda'],
    ['Industrial sewing machine', 'S', 'makina garments'],
    ['Garment pressing', 'S H', 'plantsa garments'],
    ['Bag making', 'S', 'bag'],
    ['Upholstery', 'S C', 'sofa upholstery'],
    ['Weaving', 'S', 'habol hablon banig'],
    ['Handicraft making', 'S', 'crafts souvenir'],
    ['Screen printing', 'S PC', 'silkscreen t-shirt print'],
  ],
  'Farming and fishing': [
    ['Agriculture', 'A', 'uma farming agrikultura'],
    ['Farm work', 'A', 'mag-uuma farmer'],
    ['Fruit picking', 'A', 'harvest ani'],
    ['Banana farm work', 'A', 'saging plantation'],
    ['Durian and pomelo farming', 'A', 'durian pomelo'],
    ['Cacao farming', 'A', 'cacao chocolate'],
    ['Coconut farming', 'A', 'lubi niyog copra'],
    ['Rice farming', 'A', 'humay palay'],
    ['Vegetable growing', 'A', 'utanon gulay'],
    ['Plant nursery work', 'A', 'seedlings nursery'],
    ['Organic farming', 'A', 'organic'],
    ['Livestock raising', 'A', 'baboy manok hayop'],
    ['Poultry raising', 'A', 'manok chicken'],
    ['Fishing', 'A', 'mangingisda isda'],
    ['Fish pond work', 'A', 'fishpond tilapia bangus'],
    ['Farm machinery', 'A D', 'tractor kuliglig'],
    ['Packing house work', 'A', 'packing sorting'],
    ['Pesticide application', 'A', 'spray'],
  ],
  'Hospitality and events': [
    ['Hotel front desk', 'CS PC', 'hotel reception'],
    ['Bellhop', 'CS', 'bellboy'],
    ['Tour guiding', 'CS', 'tour guide'],
    ['Event setup', 'C CS', 'events setup'],
    ['Event host', 'CS', 'emcee host'],
    ['Sound system operation', 'E', 'sounds lights'],
    ['Decorating', 'CS', 'decor'],
    ['Flower arrangement', 'L', 'florist bulak'],
    ['Resort attendant', 'CS H', 'resort'],
    ['Lifeguard', 'CS', 'swimming'],
  ],
  'Security and safety': [
    ['Security guard', 'CS', 'guwardiya guard sg'],
    ['CCTV monitoring', 'PC', 'cctv'],
    ['Traffic aide', 'D CS', 'traffic enforcer'],
    ['Watchman', '', 'bantay'],
    ['Fire safety', '', 'fire'],
    ['Occupational safety', '', 'safety officer'],
  ],
  'Everyday skills': [
    ['Communication in English', 'CS', 'english'],
    ['Communication in Bisaya', 'CS', 'cebuano binisaya'],
    ['Communication in Tagalog', 'CS', 'filipino'],
    ['Basic math', '', 'math kwenta'],
    ['Teamwork', '', 'team'],
    ['Time management', '', 'oras'],
    ['Problem solving', '', 'problema'],
    ['Leadership', '', 'leader lider supervisor'],
    ['Supervising staff', 'CS', 'supervisor team leader'],
    ['Handling money', 'L', 'kwarta cash'],
  ],
}

// Common local word shown in brackets after the English name, e.g. "Cooking (luto)". Skills are saved in English.
const LOCAL: Record<string, string> = {
  Cashier: 'kahera',
  'Cash handling': 'sukli',
  'Sales clerk': 'tindera',
  'Store attendant': 'tindera',
  'Sari-sari store keeping': 'tindahan',
  'Market vendor': 'palengke',
  'Pharmacy assistant': 'botika',
  Sales: 'benta',
  'Food preparation': 'luto',
  Cooking: 'luto',
  'Carinderia cooking': 'karinderya',
  'Barbecue and grilling': 'ihaw',
  Baking: 'panadero',
  'Kakanin making': 'kakanin',
  Barista: 'kape',
  'Waiter or waitress': 'serbidor',
  Dishwashing: 'hugas plato',
  'Kitchen helper': 'katabang sa kusina',
  Catering: 'handaan',
  'Meat cutting': 'magkakarne',
  'Fish vending': 'tindera sa isda',
  Secretary: 'sekretarya',
  Bookkeeping: 'libro',
  'Payroll assistant': 'sweldo',
  'Collection agent': 'kolektor',
  'Complaint handling': 'reklamo',
  'Computer literacy': 'kompyuter',
  'Computer basics': 'kompyuter',
  Photography: 'litrato',
  'Printing and photocopying': 'xerox',
  Carpentry: 'karpintero',
  'Furniture making': 'muwebles',
  Roofing: 'atop',
  Masonry: 'mason',
  'Concrete pouring': 'buhos',
  Plastering: 'palitada',
  Painting: 'pintor',
  Plumbing: 'tubero',
  'Construction helper': 'peon',
  'Heavy lifting': 'karga',
  'Ceiling installation': 'kisame',
  Welding: 'hinang',
  'Grill and gate making': 'rehas',
  Electrical: 'kuryente',
  'House wiring': 'kuryente',
  'Motorcycle repair': 'mekaniko',
  'Auto mechanic': 'mekaniko',
  Vulcanizing: 'gulong',
  'Small engine repair': 'makina',
  'Bicycle repair': 'bisikleta',
  'Shoe repair': 'sapatos',
  'Watch repair': 'relo',
  Locksmith: 'yawe',
  Driving: 'drayber',
  'Professional driver license': 'lisensya',
  'Motorcycle driving': 'habal-habal',
  'Tricycle driving': 'traysikol',
  'Jeepney driving': 'dyip',
  'Truck driving': 'trak',
  'Warehouse helper': 'bodega',
  'Loading and unloading': 'kargador',
  Housekeeping: 'limpyo',
  'House cleaning': 'limpyo',
  Kasambahay: 'katabang',
  Laundry: 'labada',
  'Laundry shop attendant': 'labada',
  Ironing: 'plantsa',
  'Garment pressing': 'plantsa',
  Gardening: 'tanom',
  'Waste segregation': 'basura',
  Caregiving: 'alaga',
  'Elderly care': 'alaga',
  Childcare: 'yaya',
  Tutoring: 'tudlo',
  'Massage therapy': 'hilot',
  Haircutting: 'gupit',
  Barbering: 'barbero',
  'Manicure and pedicure': 'manikyur',
  'Eyelash and brow services': 'kilay',
  Sewing: 'tahi',
  Dressmaking: 'modista',
  Tailoring: 'sastre',
  Alterations: 'tahi',
  Embroidery: 'burda',
  Weaving: 'habol',
  'Screen printing': 'silkscreen',
  Agriculture: 'uma',
  'Farm work': 'mag-uuma',
  'Fruit picking': 'ani',
  'Banana farm work': 'saging',
  'Coconut farming': 'lubi',
  'Rice farming': 'palay',
  'Vegetable growing': 'utanon',
  'Livestock raising': 'hayop',
  'Poultry raising': 'manok',
  Fishing: 'mangingisda',
  'Fish pond work': 'bangus',
  'Farm machinery': 'kuliglig',
  'Flower arrangement': 'bulak',
  'Security guard': 'guwardiya',
  Watchman: 'bantay',
  'Communication in Bisaya': 'binisaya',
  'Communication in Tagalog': 'Filipino',
  'Basic math': 'kwenta',
  'Handling money': 'kwarta',
}

export const SKILL_CATALOG: CatalogSkill[] = Object.entries(SECTORS).flatMap(([sector, rows]) =>
  rows.map(([name, codes, words]) => ({
    name,
    sector,
    groups: codes.split(' ').filter(Boolean).map((code) => G[code]),
    aliases: [...(words ? words.split(' ') : []), ...(LOCAL[name] ? LOCAL[name].split(' ') : [])],
    local: LOCAL[name],
  })),
)

// English name with the local word in brackets when there is one: "Cooking (luto)".
export function skillLabel(name: string): string {
  const local = findSkill(name)?.local
  return local ? `${name} (${local})` : name
}

const BY_NAME = new Map(SKILL_CATALOG.map((skill) => [skill.name.toLowerCase(), skill]))

export function findSkill(name: string): CatalogSkill | undefined {
  return BY_NAME.get(name.trim().toLowerCase())
}

// Match skills a set of chosen skills counts toward.
export function matchGroups(names: string[]): string[] {
  return [...new Set(names.flatMap((name) => findSkill(name)?.groups ?? []))]
}

// What gets saved: the chosen skills plus the match skills they count toward, so matching keeps working.
export function withMatchGroups(names: string[]): string[] {
  return [...new Set([...names, ...matchGroups(names)])]
}

// The reverse for display and editing: hide match skills that were only added because of another chosen skill.
export function chosenSkills(saved: string[]): string[] {
  const detailed = saved.filter((name) => !(SKILLS as readonly string[]).includes(name))
  const implied = new Set(matchGroups(detailed))
  return saved.filter((name) => !implied.has(name))
}

export function isCustomSkill(name: string): boolean {
  return !findSkill(name)
}

const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Best catalog matches for what was typed: name starts with it, then a word in the name, then search words.
export function searchSkills(query: string, exclude: string[] = [], limit = 8): CatalogSkill[] {
  const q = fold(query.trim())
  if (!q) return []
  const skip = new Set(exclude.map((name) => name.toLowerCase()))
  const scored: { skill: CatalogSkill; score: number }[] = []
  for (const skill of SKILL_CATALOG) {
    if (skip.has(skill.name.toLowerCase())) continue
    const name = fold(skill.name)
    const words = name.split(/[^a-z0-9]+/)
    let score = 0
    if (name.startsWith(q)) score = 4
    else if (words.some((word) => word.startsWith(q))) score = 3
    else if (skill.aliases.some((alias) => fold(alias).startsWith(q))) score = 2
    else if (name.includes(q) || fold(skill.sector).includes(q)) score = 1
    if (score) scored.push({ skill, score })
  }
  const found = scored
    .sort((a, b) => b.score - a.score || a.skill.name.length - b.skill.name.length)
    .slice(0, limit)
    .map((entry) => entry.skill)
  // Fill the rest with related skills: same sector and sharing a match skill with the best match
  // ("cashier" also offers Cash handling, Sales clerk, Store attendant…).
  const best = found[0]
  if (!best) return found
  const related = SKILL_CATALOG.filter(
    (skill) =>
      !found.includes(skill) &&
      !skip.has(skill.name.toLowerCase()) &&
      skill.sector === best.sector &&
      skill.groups.some((group) => best.groups.includes(group)),
  )
  return [...found, ...related].slice(0, limit)
}
