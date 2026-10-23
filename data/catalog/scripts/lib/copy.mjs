// Polish copy for product titles and descriptions.
//
// Templates use:
//   {Nazwa}   product name without colour, sentence-initial ("Sweter z golfem Mira")
//   {nazwa}   the same, mid-sentence ("sweter z golfem Mira")
//   {kolor}   colour phrase ("w kolorze kremowym", "w paski")
//   {sklad}   material composition ("70% bawełna, 30% wełna")
//   [[m|f|pl]] word forms chosen by the noun's grammatical gender
//
// Only features visible in the reviewed photo are passed in as tokens, so the
// copy never describes a cut or detail the picture contradicts.

export const FAMILY = {
  tshirt: 'tops', longsleeve: 'tops', tank: 'tops', croptop: 'tops', top: 'tops', polo: 'tops',
  shirt: 'shirts', blouse: 'shirts', flannel: 'shirts', 'denim-shirt': 'shirts', 'linen-shirt': 'shirts',
  hoodie: 'sweats', 'zip-hoodie': 'sweats', sweatshirt: 'sweats',
  sweater: 'knit', turtleneck: 'knit', cardigan: 'knit', 'knit-vest': 'knit',
  jeans: 'bottoms', trousers: 'bottoms', chinos: 'bottoms', shorts: 'bottoms', joggers: 'bottoms', 'wide-pants': 'bottoms',
  skirt: 'skirts',
  dress: 'dresses', jumpsuit: 'dresses',
  'denim-jacket': 'outer', 'leather-jacket': 'outer', bomber: 'outer', jacket: 'outer', puffer: 'outer', parka: 'outer', coat: 'outer', trench: 'outer', blazer: 'outer', vest: 'outer', raincoat: 'outer',
  'sports-top': 'sport', 'sports-leggings': 'sport', 'sports-shirt': 'sport', 'track-jacket': 'sport', 'sports-shorts': 'sport', 'track-pants': 'sport',
  beanie: 'headwear', cap: 'headwear', hat: 'headwear', scarf: 'scarves', gloves: 'gloves',
  bag: 'bags', backpack: 'bags', sunglasses: 'eyewear', belt: 'belts',
}

// Visible features recorded during photo review. `title` is appended to the
// product name (an object = adjective forms by gender), `say` are sentences.
export const TOKENS = {
  oversize: { title: 'oversize', say: ['Luźny krój oversize daje swobodę ruchu i nowoczesny, nonszalancki efekt.', 'Fason oversize sprawia, że całość wygląda swobodnie, ale wciąż starannie.'] },
  slim: { title: 'slim fit', say: ['Dopasowany krój slim fit podkreśla sylwetkę, nie krępując ruchów.', 'Wąski, dopasowany fason dobrze sprawdza się pod marynarką lub płaszczem.'] },
  regular: { title: 'regular fit', say: ['Klasyczny krój regular fit leży swobodnie, ale nie jest workowaty.'] },
  relaxed: { title: 'relaxed fit', say: ['Luźniejszy krój relaxed fit zapewnia wygodę przez cały dzień.'] },
  straight: { title: 'straight', say: ['Proste nogawki to fason, który pasuje do większości sylwetek i butów.', 'Prosty krój nogawki wygląda równie dobrze z trampkami, jak i z botkami.'] },
  wideleg: { title: 'wide leg', say: ['Szerokie nogawki optycznie wydłużają nogi i nadają stylizacji lekkości.', 'Fason wide leg jest wygodny i świetnie wygląda z dopasowaną górą.'] },
  skinny: { title: 'skinny', say: ['Wąskie nogawki ściśle przylegają do nóg i dobrze komponują się z dłuższymi swetrami.'] },
  mom: { title: 'mom fit', say: ['Krój mom fit z luźniejszymi biodrami i zwężaną nogawką nawiązuje do mody lat 90.'] },
  highwaist: { title: 'z wysokim stanem', say: ['Wysoki stan wysmukla talię i ładnie współgra z wpuszczoną bluzką.'] },
  distressed: { title: 'z przetarciami', say: ['Delikatne przetarcia dodają casualowego charakteru.'] },
  hood: { title: 'z kapturem', say: ['Kaptur ze ściągaczem przydaje się w wietrzne dni.', 'Obszerny kaptur chroni przed chłodem i wiatrem.'] },
  zip: { title: 'na zamek', say: ['Zapięcie na zamek pozwala łatwo regulować ciepło.', 'Wygodny zamek błyskawiczny ułatwia zakładanie i zdejmowanie.'] },
  buttons: { title: 'na guziki', say: ['Zapinan[[y|a|e]] na guziki, pozwala nosić się zarówno zapięt[[y|a|e]], jak i rozpięt[[y|a|e]].'] },
  vneck: { title: 'z dekoltem w serek', say: ['Dekolt w serek optycznie wysmukla szyję.'] },
  crew: { title: 'z okrągłym dekoltem', say: ['Klasyczny okrągły dekolt pasuje zarówno solo, jak i pod koszulę czy marynarkę.'] },
  turtle: { title: 'z golfem', say: ['Wysoki golf otula szyję i zastępuje szalik w chłodniejsze dni.'] },
  longsl: { title: 'z długim rękawem', say: ['Długie rękawy sprawdzają się w przejściowe dni.'] },
  shortsl: { title: 'z krótkim rękawem', say: ['Krótkie rękawy sprawiają, że to dobry wybór na ciepłe dni.'] },
  sleeveless: { title: 'bez rękawów', say: ['Fason bez rękawów zapewnia przewiewność w upalne dni.'] },
  straps: { title: 'na ramiączkach', say: ['Cienkie ramiączka nadają lekkości i dobrze wyglądają z narzuconą kurtką.'] },
  belt: { title: 'z paskiem', say: ['Wiązany pasek pozwala podkreślić talię.', 'Pasek w talii pomaga dopasować fason do sylwetki.'] },
  pockets: { title: 'z kieszeniami', say: ['Praktyczne kieszenie pomieszczą telefon i klucze.', 'Pojemne kieszenie to wygodny dodatek na co dzień.'] },
  cable: { title: 'z warkoczowym splotem', say: ['Warkoczowy splot dodaje dzianinie plastyczności i ciepła.', 'Wyrazisty splot w warkocze nadaje klasycznemu fasonowi charakteru.'] },
  ribbed: { title: 'w prążek', say: ['Prążkowana struktura ładnie układa się na sylwetce.'] },
  collar: { title: 'z kołnierzykiem', say: ['Kołnierzyk dodaje stylizacji schludnego wykończenia.'] },
  mini: { title: 'mini', say: ['Długość mini dobrze wygląda z płaskimi butami i botkami.'] },
  midi: { title: 'midi', say: ['Długość midi sięga za kolano i jest uniwersalna o każdej porze roku.'] },
  maxi: { title: 'maxi', say: ['Długość maxi tworzy smukłą, zwiewną linię.'] },
  doublebreasted: { title: { m: 'dwurzędowy', f: 'dwurzędowa', pl: 'dwurzędowe' }, say: ['Dwurzędowe zapięcie nadaje fasonowi klasycznego, eleganckiego charakteru.'] },
  corduroy: { title: { m: 'sztruksowy', f: 'sztruksowa', pl: 'sztruksowe' }, say: ['Sztruks ma miękki, aksamitny chwyt i ciekawą fakturę.'] },
  quilted: { title: { m: 'pikowany', f: 'pikowana', pl: 'pikowane' }, say: ['Pikowanie utrzymuje ocieplinę równomiernie rozłożoną.'] },
  pleated: { title: { m: 'plisowany', f: 'plisowana', pl: 'plisowane' }, say: ['Plisy pięknie poruszają się przy każdym kroku.'] },
  flared: { title: { m: 'rozkloszowany', f: 'rozkloszowana', pl: 'rozkloszowane' }, say: ['Rozkloszowany dół dodaje lekkości i kobiecego charakteru.'] },
  wrap: { title: { m: 'kopertowy', f: 'kopertowa', pl: 'kopertowe' }, say: ['Kopertowy krój łatwo dopasować do sylwetki.'] },
  shirtstyle: { title: { m: 'koszulowy', f: 'koszulowa', pl: 'koszulowe' }, say: ['Koszulowy fason z kołnierzykiem wygląda schludnie i swobodnie zarazem.'] },
  knitted: { title: { m: 'dzianinowy', f: 'dzianinowa', pl: 'dzianinowe' }, say: ['Miękka dzianina jest przyjemna w dotyku i nie krępuje ruchów.'] },
  long: { title: { m: 'długi', f: 'długa', pl: 'długie' }, say: ['Dłuższa długość lepiej chroni przed chłodem.'] },
  short: { title: { m: 'krótki', f: 'krótka', pl: 'krótkie' }, say: ['Krótsza długość dobrze wygląda z wysokim stanem.'] },
  lace: { title: 'z koronką', say: ['Koronkowe wykończenie dodaje subtelności.'] },
  fauxfur: { title: 'ze sztucznym futerkiem', say: ['Wykończenie ze sztucznego futerka dodaje ciepła i miękkości.'] },
  puff: { title: 'z bufiastymi rękawami', say: ['Bufiaste rękawy nadają romantycznego charakteru.'] },
  graphic: { title: 'z nadrukiem', say: ['Nadruk z przodu ożywia prosty fason.'] },
  pompom: { title: 'z pomponem', say: ['Pompon na czubku dodaje zabawnego akcentu.'] },
  // Features that also fix the material, so the composition matches the photo.
  straw: { title: { m: 'słomkowy', f: 'słomkowa', pl: 'słomkowe' }, say: ['Lekka plecionka przepuszcza powietrze w upalne dni.'], material: /słom/ },
  felt: { title: { m: 'filcowy', f: 'filcowa', pl: 'filcowe' }, say: ['Sztywniejszy filc dobrze trzyma kształt ronda.'], material: /filc/ },
  crochet: { title: { m: 'szydełkowy', f: 'szydełkowa', pl: 'szydełkowe' }, say: ['Ażurowy, szydełkowy splot nadaje rzemieślniczego charakteru.'], material: /bawełna|akryl/ },
  // Material features: the material sentence already describes them, so they
  // add no sentence of their own (empty `say`).
  linen: { title: { m: 'lniany', f: 'lniana', pl: 'lniane' }, say: [], material: /len/ },
  wool: { title: { m: 'wełniany', f: 'wełniana', pl: 'wełniane' }, say: [], material: /(?<!ba)wełn|merino|alpak/ },
  denim: { title: { m: 'jeansowy', f: 'jeansowa', pl: 'jeansowe' }, say: [], material: /denim/ },
  ecoleather: { title: 'ze skóry ekologicznej', say: [], material: /poliuretan/ },
  canvas: { title: { m: 'płócienny', f: 'płócienna', pl: 'płócienne' }, say: [], material: /canvas/ },
  logo: { title: null, say: [] }, // visible third-party branding: never mentioned
}

export const INTRO = {
  tops: [
    '{Nazwa} {kolor} to wygodna baza codziennych stylizacji.',
    '{Nazwa} {kolor} łatwo połączyć z jeansami, spódnicą albo spodniami materiałowymi.',
    'Prost[[y|a|e]] w formie, ale dopracowan[[y|a|e]] w szczegółach – {nazwa} {kolor} sprawdzi się na co dzień.',
    'Na co dzień i na weekend: {nazwa} {kolor} pasuje do niemal każdej garderoby.',
    '{Nazwa} {kolor} to jedna z tych rzeczy, po które sięga się najczęściej.',
    'Lekk[[i|a|ie]] i przyjemn[[y|a|e]] w noszeniu {nazwa} {kolor} dobrze sprawdza się solo lub jako warstwa pod sweter.',
    'Klasyka w nowoczesnym wydaniu: {nazwa} {kolor}.',
    '{Nazwa} {kolor} to propozycja dla osób, które cenią wygodę i prostą formę.',
  ],
  shirts: [
    '{Nazwa} {kolor} pasuje zarówno do biura, jak i do swobodnych stylizacji po pracy.',
    '{Nazwa} {kolor} to ponadczasowy element garderoby, który łatwo dopasować do okazji.',
    'Schludn[[y|a|e]], ale niesztywn[[y|a|e]] – {nazwa} {kolor} dobrze wygląda wpuszczon[[y|a|e]] w spodnie i noszon[[y|a|e]] luźno.',
    '{Nazwa} {kolor} pozwala łatwo zbudować zarówno elegancki, jak i casualowy zestaw.',
    '{Nazwa} {kolor} to wybór na dni, kiedy chcesz wyglądać starannie bez wysiłku.',
    'Uniwersaln[[y|a|e]] i wygodn[[y|a|e]] {nazwa} {kolor} sprawdzi się od poniedziałku do weekendu.',
    '{Nazwa} {kolor} doda lekkości każdej stylizacji.',
  ],
  sweats: [
    '{Nazwa} {kolor} to wygodna propozycja na chłodniejsze poranki i leniwe weekendy.',
    'Miękk[[i|a|ie]] i ciepł[[y|a|e]] {nazwa} {kolor} sprawdzi się na spacerze, w podróży i w domu.',
    '{Nazwa} {kolor} łączy sportowy charakter z codzienną wygodą.',
    'Na uczelnię, do pracy zdalnej czy na wypad za miasto – {nazwa} {kolor} pasuje wszędzie.',
    '{Nazwa} {kolor} to casualowa klasyka, która nie wychodzi z mody.',
    'Przyjemn[[y|a|e]] w dotyku {nazwa} {kolor} szybko stanie się ulubioną warstwą na co dzień.',
    'Wygoda przede wszystkim: {nazwa} {kolor} świetnie wygląda z jeansami i spodniami dresowymi.',
  ],
  knit: [
    '{Nazwa} {kolor} to ciepła warstwa na jesień i zimę.',
    'Miękk[[i|a|ie]] w dotyku {nazwa} {kolor} doda przytulności chłodnym dniom.',
    '{Nazwa} {kolor} to dzianinowa klasyka, która dobrze wygląda solo i na koszuli.',
    'Na chłodniejsze dni: {nazwa} {kolor} łączy wygodę z ponadczasowym wyglądem.',
    '{Nazwa} {kolor} sprawdzi się zarówno w biurze, jak i podczas weekendowego spaceru.',
    'Ciepł[[y|a|e]] i [[elegancki|elegancka|eleganckie]] zarazem – {nazwa} {kolor} to dobra inwestycja na kilka sezonów.',
    '{Nazwa} {kolor} to dobry punkt wyjścia do przytulnej, warstwowej stylizacji.',
  ],
  bottoms: [
    '{Nazwa} {kolor} to praktyczna podstawa codziennej garderoby.',
    '{Nazwa} {kolor} łatwo zestawić z T-shirtem, koszulą albo swetrem.',
    'Wygodne i uniwersalne {nazwa} {kolor} sprawdzą się w pracy i po godzinach.',
    '{Nazwa} {kolor} to fason, do którego wraca się sezon po sezonie.',
    'Na co dzień i na wyjście: {nazwa} {kolor} pasują do wielu stylizacji.',
    '{Nazwa} {kolor} łączą wygodę z dopracowanym krojem.',
    '{Nazwa} {kolor} pasują zarówno do swobodnych, jak i bardziej eleganckich zestawów.',
  ],
  skirts: [
    '{Nazwa} {kolor} to kobieca propozycja na co dzień i na wyjście.',
    '{Nazwa} {kolor} pięknie wygląda z bluzką, swetrem albo T-shirtem.',
    'Lekka i wygodna {nazwa} {kolor} sprawdzi się w biurze i na weekendowym spacerze.',
    '{Nazwa} {kolor} łatwo dopasować do pory roku – latem z sandałami, jesienią z botkami.',
    '{Nazwa} {kolor} to sposób na stylizację, która wygląda starannie bez wysiłku.',
    '{Nazwa} {kolor} to element garderoby, który dodaje lekkości każdemu zestawowi.',
  ],
  dresses: [
    '{Nazwa} {kolor} to gotowa stylizacja w jednym elemencie.',
    '{Nazwa} {kolor} sprawdzi się na co dzień, w pracy i na letnim przyjęciu.',
    'Kobiec[[y|a|e]] i wygodn[[y|a|e]] {nazwa} {kolor} to propozycja na dni, kiedy chcesz wyglądać dobrze bez zastanawiania się.',
    '{Nazwa} {kolor} łatwo przenieść z dziennej stylizacji do wieczornej – wystarczy zmienić buty i dodatki.',
    '{Nazwa} {kolor} nie wymaga długiego komponowania zestawu – wystarczą ulubione buty.',
    '{Nazwa} {kolor} to wybór na ciepłe dni i specjalne okazje.',
    'Zwiewn[[y|a|e]] i wygodn[[y|a|e]] – {nazwa} {kolor} szybko stanie się ulubionym elementem garderoby.',
  ],
  outer: [
    '{Nazwa} {kolor} to wierzchnia warstwa, która dopełni wiele stylizacji.',
    '{Nazwa} {kolor} sprawdzi się w chłodniejsze dni i podczas zmiennej pogody.',
    'Ponadczasow[[y|a|e]] {nazwa} {kolor} to inwestycja na kilka sezonów.',
    '{Nazwa} {kolor} pasuje zarówno do eleganckich, jak i swobodnych zestawów.',
    'Na miasto, do pracy i w podróż – {nazwa} {kolor} towarzyszy przez cały sezon.',
    '{Nazwa} {kolor} pomaga wyglądać dobrze nawet w pochmurny dzień.',
    '{Nazwa} {kolor} to praktyczny i stylowy wybór na okres przejściowy.',
  ],
  sport: [
    '{Nazwa} {kolor} to wygodny wybór na trening, bieganie i jogę.',
    '{Nazwa} {kolor} [[nie krępuje|nie krępuje|nie krępują]] ruchów i dobrze [[sprawdza|sprawdza|sprawdzają]] się podczas aktywności.',
    'Na siłownię, matę i poranny jogging – {nazwa} {kolor} [[towarzyszy|towarzyszy|towarzyszą]] w każdym treningu.',
    '{Nazwa} {kolor} [[łączy|łączy|łączą]] funkcjonalność z nowoczesnym wyglądem.',
    'Lekk[[i|a|ie]] i elastyczn[[y|a|e]] {nazwa} {kolor} to dobry wybór na intensywne treningi.',
    '{Nazwa} {kolor} [[sprawdzi|sprawdzi|sprawdzą]] się podczas treningu i w codziennych, aktywnych stylizacjach.',
  ],
  gloves: [
    '{Nazwa} {kolor} to ciepły dodatek na chłodne dni.',
    '{Nazwa} {kolor} ochronią dłonie przed mrozem i wiatrem.',
    'Miękkie i ciepłe {nazwa} {kolor} sprawdzą się na zimowych spacerach i w drodze do pracy.',
  ],
  headwear: [
    '{Nazwa} {kolor} to dodatek, który wykończy każdą stylizację.',
    '{Nazwa} {kolor} chroni przed chłodem lub słońcem i dodaje zestawowi charakteru.',
    'Prost[[y|a|e]] i uniwersaln[[y|a|e]] {nazwa} {kolor} pasuje zarówno do sportowych, jak i miejskich stylizacji.',
    '{Nazwa} {kolor} to szybki sposób na odświeżenie codziennego zestawu.',
  ],
  scarves: [
    '{Nazwa} {kolor} to ciepły dodatek na chłodne dni.',
    '{Nazwa} {kolor} doda przytulności płaszczom i kurtkom.',
    '[[Miękki|Miękka|Miękkie]] i [[ciepły|ciepła|ciepłe]] {nazwa} {kolor} [[sprawdzi|sprawdzi|sprawdzą]] się na jesiennych i zimowych spacerach.',
    '{Nazwa} {kolor} to praktyczny dodatek, który łatwo dopasować do okrycia wierzchniego.',
  ],
  bags: [
    '{Nazwa} {kolor} to praktyczny dodatek na co dzień.',
    '{Nazwa} {kolor} pomieści najpotrzebniejsze rzeczy do pracy, na uczelnię i na zakupy.',
    'Pojemn[[y|a|e]] i wygodn[[y|a|e]] {nazwa} {kolor} sprawdzi się w mieście i w podróży.',
    '{Nazwa} {kolor} łączy funkcjonalność z prostym, ponadczasowym wyglądem.',
  ],
  eyewear: [
    '{Nazwa} {kolor} to dodatek, który od razu nadaje stylizacji charakteru.',
    '{Nazwa} {kolor} sprawdzą się w mieście, na plaży i w podróży.',
    'Ponadczasowy kształt sprawia, że {nazwa} {kolor} pasują do wielu typów urody.',
  ],
  belts: [
    '{Nazwa} {kolor} to dodatek, który wykończy zarówno jeansy, jak i spodnie materiałowe.',
    '{Nazwa} {kolor} pozwala podkreślić talię i dopełnić stylizację.',
    'Prosty i uniwersalny {nazwa} {kolor} pasuje do codziennych i bardziej eleganckich zestawów.',
  ],
}

export const STYLING = {
  tops: [
    'Noś z jeansami i trampkami albo pod rozpiętą koszulą.',
    'Dobrze wygląda z marynarką i spodniami chino.',
    'Połącz z szerokimi spodniami i sneakersami na luźny, miejski look.',
    'Świetnie komponuje się ze spódnicą midi i białymi trampkami.',
    'Na chłodniejsze dni narzuć na wierzch kardigan lub kurtkę jeansową.',
    'Wpuść w spodnie z wysokim stanem i dodaj pasek.',
  ],
  shirts: [
    'Noś wpuszczoną w spodnie materiałowe albo luźno do jeansów.',
    'Rozpiętą możesz narzucić na T-shirt jak lekką kurtkę.',
    'Dobrze wygląda z chinosami i mokasynami.',
    'Pod sweter z dekoltem w serek sprawdzi się w biurze.',
    'Z podwiniętymi rękawami nabiera swobodnego charakteru.',
    'Połącz z marynarką na bardziej formalne okazje.',
  ],
  sweats: [
    'Noś z jeansami, joggerami albo szortami.',
    'Pasuje do sneakersów i plecaka – idealna na miasto.',
    'Na chłodniejsze dni narzuć na nią kurtkę puchową lub parkę.',
    'Dobrze wygląda z legginsami i grubymi skarpetami.',
    'Połącz ze spódnicą midi i botkami, aby uzyskać ciekawy kontrast.',
  ],
  knit: [
    'Noś solo do jeansów albo z kołnierzykiem koszuli wystającym spod dekoltu.',
    'Dobrze wygląda ze spódnicą plisowaną i botkami.',
    'Połącz ze spodniami materiałowymi i płaszczem na elegancki look.',
    'Pasuje do szerokich spodni i masywnych butów.',
    'Na weekend zestaw z jeansami i sneakersami.',
    'Pod płaszczem stworzy ciepłą i stylową warstwę.',
  ],
  bottoms: [
    'Zestaw z białym T-shirtem i trampkami na co dzień.',
    'Z koszulą i marynarką sprawdzą się w pracy.',
    'Dobrze wyglądają ze swetrem i botkami.',
    'Połącz z bluzą i sneakersami na weekendowy look.',
    'Pasują do mokasynów, sandałów i sportowych butów.',
    'Wpuść w nie koszulę i dodaj skórzany pasek.',
  ],
  skirts: [
    'Zestaw z wpuszczoną koszulą i baletkami.',
    'Jesienią noś z grubym swetrem, rajstopami i botkami.',
    'Latem połącz z topem na ramiączkach i sandałami.',
    'Dobrze wygląda z T-shirtem i białymi trampkami.',
    'Z marynarką i czółenkami sprawdzi się w biurze.',
  ],
  dresses: [
    'Na co dzień noś z trampkami i kurtką jeansową.',
    'Na wieczór dodaj sandałki na obcasie i drobną biżuterię.',
    'W chłodniejsze dni narzuć kardigan lub trencz.',
    'Dobrze wygląda z botkami i skórzaną kurtką.',
    'Z marynarką i mokasynami sprawdzi się w biurze.',
    'Dodaj pasek, aby mocniej zaakcentować talię.',
  ],
  outer: [
    'Noś do jeansów i swetra albo do eleganckich spodni.',
    'Dobrze wygląda z bluzą z kapturem i sneakersami.',
    'Połącz z golfem i botkami na jesienny look.',
    'Pasuje do sukienek midi i spódnic.',
    'Z szalikiem i czapką sprawdzi się w chłodniejsze dni.',
    'Narzuć na marynarkę lub koszulę w drodze do pracy.',
  ],
  sport: [
    'Zestaw z legginsami lub spodenkami i ulubionymi butami do biegania.',
    'Po treningu narzuć bluzę i wróć do domu wygodnie.',
    'Dobrze wygląda także poza siłownią – z jeansami i sneakersami.',
    'Pasuje do zajęć fitness, jogi i domowych treningów.',
  ],
  headwear: [
    'Dobierz kolor do kurtki lub szalika.',
    'Pasuje do sportowych i codziennych stylizacji.',
    'Świetnie wygląda z płaszczem i z bluzą.',
  ],
  gloves: [
    'Dopasuj do czapki lub szalika w podobnym odcieniu.',
    'Pasują zarówno do płaszcza, jak i do kurtki puchowej.',
  ],
  scarves: [
    'Owiń dwukrotnie wokół szyi albo zawiąż luźno na płaszczu.',
    'Dopasuj do czapki lub rękawiczek w podobnym odcieniu.',
    'Dobrze wygląda z kurtką puchową i z wełnianym płaszczem.',
  ],
  bags: [
    'Pasuje do codziennych i bardziej eleganckich stylizacji.',
    'Dobrze wygląda z płaszczem, kurtką i sukienką.',
    'Sprawdzi się w drodze do pracy i podczas weekendowych wyjazdów.',
  ],
  eyewear: [
    'Pasują do letnich sukienek, jeansów i lnianych koszul.',
    'Dobrze wyglądają zarówno w mieście, jak i na wakacjach.',
  ],
  belts: [
    'Noś do jeansów, chinosów lub w talii sukienki.',
    'Dopasuj kolor do butów lub torby.',
  ],
}

// Material classes, detected from the composition string.
export function materialClass(composition) {
  const first = composition.toLowerCase()
  if (/poliuretan|skóra ekologiczna/.test(first)) return 'ecoleather'
  if (/skóra bydlęca/.test(first)) return 'leather'
  if (/acetat|metal/.test(first)) return 'frames'
  if (/słoma|filc/.test(first)) return 'hat'
  if (/denim/.test(first)) return 'denim'
  if (/^(100% len|55% len)/.test(first)) return 'linen'
  // "bawełna" (cotton) contains "wełn", so wool needs a lookbehind.
  if (/(?<!ba)wełn|alpak|merino/.test(first)) return 'wool'
  if (/^(100% wiskoza|9\d% wiskoza|70% wiskoza|50% bawełna, 50% modal)/.test(first)) return 'viscose'
  if (/^(100% bawełna|9\d% bawełna|8\d% bawełna|7\d% bawełna|6\d% bawełna)/.test(first)) return 'cotton'
  return 'synthetic'
}

export const MATERIAL = {
  cotton: [
    '[[Uszyty|Uszyta|Uszyte]] z materiału o składzie {sklad}, [[jest przyjemny|jest przyjemna|są przyjemne]] w dotyku i dobrze [[przepuszcza|przepuszcza|przepuszczają]] powietrze.',
    'Skład: {sklad} – bawełna jest miękka, oddychająca i łatwa w pielęgnacji.',
    'Bawełniany materiał ({sklad}) zapewnia komfort przez cały dzień.',
    'Miękka bawełna ({sklad}) dobrze sprawdza się w codziennym noszeniu.',
    'Materiał ({sklad}) jest przyjemny dla skóry i nie gromadzi ciepła.',
  ],
  wool: [
    'Dzianina o składzie {sklad} dobrze trzyma ciepło i jest miękka w dotyku.',
    'Skład: {sklad}. Domieszka wełny zapewnia ciepło bez nadmiernej grubości.',
    'Materiał ({sklad}) jest ciepły, a przy tym przyjemny dla skóry.',
    'Ciepła dzianina ({sklad}) sprawdzi się w chłodne dni.',
  ],
  linen: [
    'Len ({sklad}) jest przewiewny i świetnie sprawdza się w upalne dni.',
    'Skład: {sklad}. Naturalne zagniecenia lnu to część jego uroku.',
  ],
  viscose: [
    'Lekka, płynnie układająca się tkanina ({sklad}) przyjemnie chłodzi w ciepłe dni.',
    'Skład: {sklad} – materiał jest miękki, gładki i ładnie się układa.',
    'Gładka tkanina ({sklad}) pięknie się układa i nie krępuje ruchów.',
  ],
  denim: [
    'Wytrzymały denim ({sklad}) z czasem nabiera indywidualnego charakteru.',
    'Skład: {sklad}. Jeansowy materiał jest trwały i wygodny w noszeniu.',
  ],
  synthetic: [
    'Skład: {sklad}. Materiał jest lekki, szybko schnie i dobrze zachowuje kształt.',
    'Materiał o składzie {sklad} jest trwały i łatwy w pielęgnacji.',
    'Skład: {sklad} – praktyczny materiał, który nie gniecie się w podróży.',
    'Lekki materiał ({sklad}) zachowuje kształt nawet po wielu praniach.',
  ],
  ecoleather: [
    '[[Wykonany|Wykonana|Wykonane]] ze skóry ekologicznej, łatw[[y|a|e]] w utrzymaniu czystości. Skład: {sklad}.',
    'Skład: {sklad}. Skóra ekologiczna ma gładkie wykończenie i nie wymaga specjalnej pielęgnacji.',
  ],
  leather: [
    '[[Wykonany|Wykonana|Wykonane]] ze skóry bydlęcej, z czasem nabiera szlachetnej patyny.',
  ],
  frames: [
    'Oprawki: {sklad}.',
  ],
  hat: [
    'Materiał: {sklad}.',
  ],
}

export const CARE = {
  cotton: ['Pierz w 30–40°C, najlepiej na lewej stronie.', 'Pierz w 30°C z podobnymi kolorami.', 'Pierz w 40°C, prasuj w średniej temperaturze.', 'Zalecamy pranie w 30°C i suszenie w naturalnych warunkach.'],
  wool: ['Pierz ręcznie lub w programie do wełny i susz na płasko.', 'Zalecamy pranie w 30°C w programie do wełny.', 'Pierz ręcznie w letniej wodzie, nie wykręcaj.'],
  linen: ['Pierz w 30°C i prasuj lekko wilgotne.'],
  viscose: ['Pierz delikatnie w 30°C, nie wykręcaj.', 'Pierz ręcznie lub w programie delikatnym, prasuj na lewej stronie.'],
  denim: ['Pierz na lewej stronie w 30°C, aby dłużej zachować kolor.', 'Pierz rzadko i na lewej stronie, aby zachować kolor denimu.'],
  synthetic: ['Pierz w 30°C, nie używaj suszarki bębnowej.', 'Pierz w 30°C w programie delikatnym, susz na wieszaku.'],
  ecoleather: ['Czyść wilgotną ściereczką.'],
  leather: ['Czyść suchą ściereczką i chroń przed wilgocią.'],
  frames: ['Przechowuj w etui i czyść miękką ściereczką.'],
  hat: ['Przechowuj w suchym miejscu, chroń przed zgnieceniem.'],
}

export const MODEL_NAMES = {
  w: ['Ada', 'Alba', 'Alicja', 'Amelia', 'Aurora', 'Basia', 'Bianka', 'Celina', 'Dalia', 'Daria', 'Diana', 'Dora', 'Edyta', 'Elza', 'Ema', 'Ewa', 'Felicja', 'Fiona', 'Gaja', 'Greta', 'Hana', 'Hela', 'Iga', 'Ilona', 'Inga', 'Irena', 'Iza', 'Jagoda', 'Jana', 'Julia', 'Kaja', 'Kalina', 'Kamila', 'Karina', 'Klara', 'Kora', 'Lara', 'Laura', 'Lea', 'Lena', 'Lidia', 'Lila', 'Liwia', 'Luiza', 'Magda', 'Maja', 'Malwina', 'Marta', 'Matylda', 'Mila', 'Mira', 'Nadia', 'Nela', 'Nina', 'Noemi', 'Ola', 'Oliwia', 'Pola', 'Rita', 'Roma', 'Róża', 'Sara', 'Sonia', 'Stella', 'Tola', 'Tosia', 'Ula', 'Wanda', 'Wera', 'Wiktoria', 'Zara', 'Zoja', 'Zuza', 'Hanna', 'Józefina', 'Lucja', 'Marcelina', 'Natalia', 'Paula', 'Sabina'],
  m: ['Adam', 'Albert', 'Aleks', 'Antek', 'Artur', 'Bartek', 'Borys', 'Bruno', 'Cezary', 'Damian', 'Dawid', 'Emil', 'Feliks', 'Filip', 'Franek', 'Gabriel', 'Gustaw', 'Henryk', 'Hubert', 'Ignacy', 'Igor', 'Iwo', 'Jakub', 'Jan', 'Julian', 'Kacper', 'Karol', 'Kazimierz', 'Konrad', 'Leon', 'Leszek', 'Ludwik', 'Maks', 'Marcel', 'Marek', 'Michał', 'Mikołaj', 'Miłosz', 'Nikodem', 'Olaf', 'Oskar', 'Patryk', 'Piotr', 'Rafał', 'Robert', 'Roch', 'Sebastian', 'Stefan', 'Szymon', 'Tadeusz', 'Teodor', 'Tomasz', 'Tymon', 'Wiktor', 'Witold', 'Wojtek', 'Zenon', 'Alan', 'Bogdan', 'Eryk'],
  u: ['Bałtyk', 'Tatra', 'Wisła', 'Odra', 'Hel', 'Mazury', 'Bieszczady', 'Sopot', 'Gdynia', 'Toruń', 'Lublin', 'Opole', 'Karpacz', 'Łeba', 'Ustka', 'Sudety', 'Pieniny', 'Warta', 'Narew', 'San', 'Dunajec', 'Rysy', 'Giewont', 'Śnieżka', 'Babia', 'Mazowsze', 'Kaszuby', 'Podhale', 'Roztocze', 'Polesie', 'Jura', 'Wawel', 'Rozewie', 'Puck', 'Jastarnia', 'Kłodzko', 'Biebrza', 'Drawa', 'Wigry', 'Hańcza', 'Mamry', 'Śniardwy', 'Wolin', 'Kazimierz', 'Sandomierz', 'Wieliczka', 'Bóbr', 'Kwisa', 'Pilica', 'Rega'],
}
